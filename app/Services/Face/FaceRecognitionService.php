<?php

namespace App\Services\Face;

use App\Models\FaceData;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class FaceRecognitionService
{
    public function enroll(array $photos, array $expectedPoses = []): array
    {
        if ($this->enrollPhotosField() === 'photo') {
            return $this->enrollOneByOne($photos, $expectedPoses);
        }

        $request = Http::timeout($this->timeout())
            ->connectTimeout($this->connectTimeout());

        foreach ($photos as $index => $photo) {
            if (! $photo instanceof UploadedFile) {
                continue;
            }

            $request = $request->attach(
                $this->enrollPhotosField(),
                file_get_contents($photo->getRealPath()),
                $photo->getClientOriginalName() ?: "face-sample-{$index}.jpg",
            );
        }

        try {
            $response = $request->post($this->url('/enroll'));
        } catch (\Throwable $e) {
            throw new FaceRecognitionException('Layanan pengenalan wajah tidak dapat dihubungi.');
        }

        if (! $response->successful()) {
            Log::warning('face.enroll.failed', [
                'status' => $response->status(),
                'body' => $response->json() ?? $response->body(),
                'url' => $this->url('/enroll'),
                'photos_field' => $this->enrollPhotosField(),
            ]);

            throw new FaceRecognitionException($this->messageFromResponse($response->json(), 'Layanan pengenalan wajah gagal mendaftarkan wajah.'));
        }

        $samples = $this->normalizeEnrollSamples($response->json());
        $this->validateEnrollSamples($samples, count($photos), $expectedPoses);

        return $samples;
    }

    private function enrollOneByOne(array $photos, array $expectedPoses = []): array
    {
        $samples = [];

        foreach ($photos as $index => $photo) {
            if (! $photo instanceof UploadedFile) {
                continue;
            }

            try {
                $response = Http::timeout($this->timeout())
                    ->connectTimeout($this->connectTimeout())
                    ->attach(
                        $this->enrollPhotosField(),
                        file_get_contents($photo->getRealPath()),
                        $photo->getClientOriginalName() ?: "face-sample-{$index}.jpg",
                    )
                    ->post($this->url('/enroll'));
            } catch (\Throwable $e) {
                throw new FaceRecognitionException('Layanan pengenalan wajah tidak dapat dihubungi.');
            }

            if (! $response->successful()) {
                Log::warning('face.enroll.failed', [
                    'status' => $response->status(),
                    'body' => $response->json() ?? $response->body(),
                    'url' => $this->url('/enroll'),
                    'photos_field' => $this->enrollPhotosField(),
                    'sample_index' => $index + 1,
                ]);

                throw new FaceRecognitionException($this->messageFromResponse($response->json(), 'Layanan pengenalan wajah gagal mendaftarkan wajah.'));
            }

            $normalized = $this->normalizeEnrollSamples($response->json());
            $samples[] = [
                ...$normalized[0],
                'sample_index' => $index + 1,
                'expected_pose' => $this->normalizePose($expectedPoses[$index] ?? null),
            ];
        }

        if (empty($samples)) {
            throw new FaceRecognitionException('Minimal satu foto wajah diperlukan.');
        }

        $this->validateEnrollSamples($samples, count($photos), $expectedPoses);

        return $samples;
    }

    public function verify(string $photoPath, Collection $registeredFaces): array
    {
        $candidates = $registeredFaces
            ->map(function (FaceData $face) {
                $embedding = $this->parseEmbedding($face->embedding);

                if (! $embedding) {
                    return null;
                }

                return [
                    'face_data_id' => (string) $face->id,
                    'employee_id' => (string) $face->employee_id,
                    'embedding' => $embedding,
                ];
            })
            ->filter()
            ->values()
            ->all();

        if (empty($candidates)) {
            throw new FaceRecognitionException('Data wajah terdaftar belum memiliki embedding valid.', 'face_embedding_missing');
        }

        $absolutePath = Storage::disk('local')->path($photoPath);

        if (! is_file($absolutePath)) {
            throw new FaceRecognitionException('Foto presensi tidak ditemukan untuk verifikasi wajah.', 'face_photo_missing');
        }

        try {
            $response = Http::timeout($this->timeout())
                ->connectTimeout($this->connectTimeout())
                ->attach($this->verifyPhotoField(), file_get_contents($absolutePath), basename($absolutePath))
                ->post($this->url('/verify'), [
                    $this->verifyEmbeddingsField() => json_encode($candidates),
                    $this->verifyThresholdField() => $this->threshold(),
                ]);
        } catch (\Throwable $e) {
            throw new FaceRecognitionException('Layanan pengenalan wajah tidak dapat dihubungi.');
        }

        if (! $response->successful()) {
            Log::warning('face.verify.failed', [
                'status' => $response->status(),
                'body' => $response->json() ?? $response->body(),
                'url' => $this->url('/verify'),
                'photo_field' => $this->verifyPhotoField(),
                'embeddings_field' => $this->verifyEmbeddingsField(),
                'candidates_count' => count($candidates),
                'threshold_field' => $this->verifyThresholdField(),
            ]);

            throw new FaceRecognitionException($this->messageFromResponse($response->json(), 'Layanan pengenalan wajah gagal memverifikasi wajah.'));
        }

        $data = $response->json('data', []);
        if (empty($data) && is_array($response->json())) {
            $data = $response->json();
        }

        $this->validateVerifyResponse($data);

        $similarityScore = $this->normalizeSimilarityScore($data);
        $serverMatched = $this->normalizeMatched($data);
        $matched = $serverMatched;

        if (! $matched && $similarityScore !== null) {
            $matched = $similarityScore >= $this->thresholdAsPercent();
        }

        Log::info('face.verify.result', [
            'matched' => $matched,
            'server_matched' => $serverMatched,
            'similarity_score' => $similarityScore,
            'threshold' => $this->threshold(),
            'threshold_percent' => $this->thresholdAsPercent(),
            'response_keys' => array_keys($data),
        ]);

        return [
            'matched' => $matched,
            'similarity_score' => $similarityScore,
            'liveness_passed' => $this->normalizeNullableBool(
                $data['liveness_passed']
                    ?? $data['liveness']
                    ?? $data['is_live']
                    ?? $data['live']
                    ?? $data['result']['liveness_passed']
                    ?? $data['result']['liveness']
                    ?? null,
            ),
            'message' => $data['message'] ?? null,
        ];
    }

    public function formatVector(array $embedding): string
    {
        return '['.implode(',', array_map(
            fn ($value) => number_format((float) $value, 6, '.', ''),
            $embedding,
        )).']';
    }

    private function normalizeEnrollSamples(mixed $payload): array
    {
        if (! is_array($payload)) {
            throw new FaceRecognitionException('Layanan pengenalan wajah tidak mengembalikan response valid.');
        }

        $samples = $payload['data']['samples'] ?? null;

        if (! is_array($samples) && isset($payload['data']['embedding'])) {
            $samples = [$payload['data']];
        }

        if (! is_array($samples) && isset($payload['embedding'])) {
            $samples = [[
                'embedding' => $payload['embedding'],
                'quality' => $payload['quality'] ?? $payload['detection_score'] ?? null,
                'liveness_passed' => $payload['liveness_passed'] ?? $payload['liveness'] ?? null,
                'pose' => $payload['pose'] ?? $payload['pose_label'] ?? null,
                'face_count' => $payload['face_count'] ?? $payload['faces_count'] ?? null,
            ]];
        }

        if (! is_array($samples) || empty($samples)) {
            throw new FaceRecognitionException('Layanan pengenalan wajah tidak mengembalikan data embedding.');
        }

        foreach ($samples as $sample) {
            if (! isset($sample['embedding']) || ! is_array($sample['embedding']) || count($sample['embedding']) !== $this->embeddingDim()) {
                throw new FaceRecognitionException('Layanan pengenalan wajah mengembalikan embedding tidak valid.');
            }
        }

        return collect($samples)
            ->map(fn (array $sample) => [
                'embedding' => array_map('floatval', $sample['embedding']),
                'quality' => $this->normalizeQuality($sample),
                'liveness_passed' => $this->normalizeNullableBool(
                    $sample['liveness_passed']
                        ?? $sample['liveness']
                        ?? $sample['is_live']
                        ?? $sample['live']
                        ?? null,
                ),
                'pose' => $this->normalizePose(
                    $sample['pose']
                        ?? $sample['pose_label']
                        ?? $sample['head_pose']
                        ?? $sample['direction']
                        ?? null,
                ),
                'face_count' => isset($sample['face_count']) || isset($sample['faces_count']) || isset($sample['num_faces'])
                    ? (int) ($sample['face_count'] ?? $sample['faces_count'] ?? $sample['num_faces'])
                    : null,
            ])
            ->values()
            ->all();
    }

    private function normalizeSimilarityScore(array $data): ?float
    {
        $score = $data['similarity_score']
            ?? $data['similarity']
            ?? $data['score']
            ?? $data['confidence']
            ?? $data['best_score']
            ?? $data['best_similarity']
            ?? $data['result']['similarity_score']
            ?? $data['result']['similarity']
            ?? $data['best_match']['similarity_score']
            ?? $data['best_match']['similarity']
            ?? $data['best_candidate']['similarity_score']
            ?? $data['best_candidate']['similarity']
            ?? null;

        if ($score === null) {
            return null;
        }

        $score = (float) $score;

        return $score <= 1 ? round($score * 100, 2) : round($score, 2);
    }

    private function validateEnrollSamples(array $samples, int $photoCount = 0, array $expectedPoses = []): void
    {
        if (count($samples) < $this->enrollMinSamples()) {
            throw new FaceRecognitionException(
                'Minimal '.$this->enrollMinSamples().' sampel wajah valid diperlukan.',
                'face_enroll_min_samples',
            );
        }

        if ($photoCount > 0 && count($samples) !== $photoCount) {
            throw new FaceRecognitionException(
                'Jumlah embedding wajah dari layanan tidak sesuai dengan jumlah foto yang dikirim.',
                'face_enroll_sample_count_mismatch',
            );
        }

        foreach ($samples as $index => $sample) {
            $sampleNumber = (int) ($sample['sample_index'] ?? $index + 1);
            $expectedPose = $this->normalizePose($sample['expected_pose'] ?? $expectedPoses[$index] ?? null);

            if ($this->enrollRequireSingleFace() && $sample['face_count'] !== null && (int) $sample['face_count'] !== 1) {
                throw new FaceRecognitionException(
                    "Sample wajah ke-{$sampleNumber} tidak valid: harus tepat 1 wajah dalam bingkai.",
                    'face_enroll_multiple_faces',
                );
            }

            if ($this->enrollRequireQuality() && $sample['quality'] === null) {
                throw new FaceRecognitionException(
                    "Sample wajah ke-{$sampleNumber} tidak memiliki skor kualitas dari engine.",
                    'face_enroll_quality_missing',
                );
            }

            if ($sample['quality'] !== null && $sample['quality'] < $this->enrollMinQuality()) {
                throw new FaceRecognitionException(
                    "Kualitas sample wajah ke-{$sampleNumber} terlalu rendah ({$sample['quality']}). Minimal {$this->enrollMinQuality()}.",
                    'face_enroll_quality_low',
                );
            }

            if ($expectedPose !== null && $sample['pose'] !== null && $sample['pose'] !== $expectedPose) {
                throw new FaceRecognitionException(
                    "Pose sample wajah ke-{$sampleNumber} tidak sesuai. Diminta {$expectedPose}, terbaca {$sample['pose']}.",
                    'face_enroll_pose_mismatch',
                );
            }
        }

        $requiredPoses = $this->enrollRequiredPoses();
        if (empty($requiredPoses)) {
            return;
        }

        $availablePoses = collect($samples)
            ->pluck('pose')
            ->filter()
            ->unique()
            ->values()
            ->all();

        $missingPoses = array_values(array_diff($requiredPoses, $availablePoses));

        if (! empty($missingPoses)) {
            throw new FaceRecognitionException(
                'Pose wajah belum lengkap: '.implode(', ', $missingPoses).'.',
                'face_enroll_pose_incomplete',
            );
        }
    }

    private function validateVerifyResponse(array $data): void
    {
        if (! $this->livenessRequired()) {
            return;
        }

        $liveness = $this->normalizeNullableBool(
            $data['liveness_passed']
                ?? $data['liveness']
                ?? $data['is_live']
                ?? $data['live']
                ?? $data['result']['liveness_passed']
                ?? $data['result']['liveness']
                ?? null,
        );

        if ($liveness !== true) {
            throw new FaceRecognitionException(
                'Liveness wajah gagal atau tidak dikembalikan oleh layanan pengenalan wajah.',
                'face_liveness_failed',
            );
        }
    }

    private function normalizeQuality(array $sample): ?float
    {
        $quality = $sample['quality']
            ?? $sample['detection_score']
            ?? $sample['face_quality']
            ?? $sample['confidence']
            ?? null;

        if ($quality === null || $quality === '') {
            return null;
        }

        $quality = (float) $quality;

        return $quality > 1 ? round($quality / 100, 4) : round($quality, 4);
    }

    private function normalizePose(mixed $pose): ?string
    {
        if (is_array($pose)) {
            $pose = $pose['label'] ?? $pose['name'] ?? $pose['direction'] ?? null;
        }

        if (! is_string($pose) || trim($pose) === '') {
            return null;
        }

        return strtolower(str_replace([' ', '-'], '_', trim($pose)));
    }

    private function normalizeNullableBool(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (float) $value > 0;
        }

        if (is_string($value)) {
            $normalized = strtolower(trim($value));

            if (in_array($normalized, ['1', 'true', 'yes', 'passed', 'pass', 'live'], true)) {
                return true;
            }

            if (in_array($normalized, ['0', 'false', 'no', 'failed', 'fail', 'spoof'], true)) {
                return false;
            }
        }

        return null;
    }

    private function normalizeMatched(array $data): bool
    {
        $value = $data['matched']
            ?? $data['is_match']
            ?? $data['verified']
            ?? $data['is_verified']
            ?? $data['match']
            ?? $data['success']
            ?? $data['result']['matched']
            ?? $data['result']['is_match']
            ?? $data['result']['verified']
            ?? $data['best_match']['matched']
            ?? $data['best_match']['is_match']
            ?? $data['best_candidate']['matched']
            ?? $data['best_candidate']['is_match']
            ?? null;

        if (is_bool($value)) {
            return $value;
        }

        if (is_numeric($value)) {
            return (float) $value > 0;
        }

        if (is_string($value)) {
            return in_array(strtolower($value), ['1', 'true', 'yes', 'matched', 'verified', 'success'], true);
        }

        return false;
    }

    private function parseEmbedding(mixed $embedding): ?array
    {
        if (is_array($embedding)) {
            return array_map('floatval', $embedding);
        }

        if (! is_string($embedding) || trim($embedding) === '') {
            return null;
        }

        $trimmed = trim($embedding);
        $decoded = json_decode($trimmed, true);

        if (is_array($decoded) && array_is_list($decoded)) {
            return array_map('floatval', $decoded);
        }

        if (str_starts_with($trimmed, '[') && str_ends_with($trimmed, ']')) {
            $values = explode(',', trim($trimmed, '[]'));

            return array_map('floatval', $values);
        }

        return null;
    }

    private function url(string $path): string
    {
        return rtrim((string) config('services.face.url'), '/').$path;
    }

    private function threshold(): float
    {
        return (float) config('services.face.threshold', 0.75);
    }

    private function thresholdAsPercent(): float
    {
        $threshold = $this->threshold();

        return $threshold <= 1 ? $threshold * 100 : $threshold;
    }

    private function timeout(): int
    {
        return (int) config('services.face.timeout', 15);
    }

    private function embeddingDim(): int
    {
        return (int) config('services.face.embedding_dim', 512);
    }

    private function connectTimeout(): int
    {
        return (int) config('services.face.connect_timeout', 5);
    }

    private function enrollPhotosField(): string
    {
        return (string) config('services.face.enroll_photos_field', 'photos');
    }

    private function verifyPhotoField(): string
    {
        return (string) config('services.face.verify_photo_field', 'photo');
    }

    private function verifyEmbeddingsField(): string
    {
        return (string) config('services.face.verify_embeddings_field', 'embeddings_json');
    }

    private function verifyThresholdField(): string
    {
        return (string) config('services.face.verify_threshold_field', 'threshold');
    }

    private function livenessRequired(): bool
    {
        return filter_var(config('services.face.liveness_required', true), FILTER_VALIDATE_BOOLEAN);
    }

    private function enrollRequireQuality(): bool
    {
        return filter_var(config('services.face.enroll_require_quality', true), FILTER_VALIDATE_BOOLEAN);
    }

    private function enrollMinQuality(): float
    {
        return (float) config('services.face.enroll_min_quality', 0.65);
    }

    private function enrollRequireSingleFace(): bool
    {
        return filter_var(config('services.face.enroll_require_single_face', true), FILTER_VALIDATE_BOOLEAN);
    }

    private function enrollMinSamples(): int
    {
        return max(1, (int) config('services.face.enroll_min_samples', 5));
    }

    private function enrollRequiredPoses(): array
    {
        $raw = (string) config('services.face.enroll_required_poses', '');

        if (trim($raw) === '') {
            return [];
        }

        return collect(explode(',', $raw))
            ->map(fn (string $pose) => $this->normalizePose($pose))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function messageFromResponse(mixed $payload, string $fallback): string
    {
        if (is_array($payload)) {
            $detail = $payload['detail'] ?? $payload['message'] ?? null;

            if (is_string($detail) && $detail !== '') {
                return $detail;
            }

            if (is_array($detail)) {
                $messages = collect($detail)
                    ->map(function ($item) {
                        if (is_string($item)) {
                            return $item;
                        }

                        if (is_array($item)) {
                            $location = isset($item['loc']) && is_array($item['loc'])
                                ? implode('.', $item['loc'])
                                : null;
                            $message = $item['msg'] ?? null;

                            return trim(($location ? "{$location}: " : '').(is_string($message) ? $message : ''));
                        }

                        return null;
                    })
                    ->filter()
                    ->values()
                    ->all();

                if (! empty($messages)) {
                    return implode('; ', $messages);
                }
            }
        }

        return $fallback;
    }
}
