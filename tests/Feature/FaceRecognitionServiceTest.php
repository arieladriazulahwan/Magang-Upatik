<?php

namespace Tests\Feature;

use App\Models\FaceData;
use App\Services\Face\FaceRecognitionException;
use App\Services\Face\FaceRecognitionService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class FaceRecognitionServiceTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.face.url' => 'http://face.test',
            'services.face.embedding_dim' => 3,
            'services.face.enroll_photos_field' => 'photos',
            'services.face.verify_photo_field' => 'photo',
            'services.face.verify_embeddings_field' => 'candidates',
            'services.face.verify_threshold_field' => 'threshold',
            'services.face.threshold' => 0.75,
            'services.face.liveness_required' => true,
            'services.face.enroll_require_quality' => true,
            'services.face.enroll_min_quality' => 0.65,
            'services.face.enroll_require_single_face' => true,
            'services.face.enroll_min_samples' => 1,
            'services.face.enroll_required_poses' => '',
        ]);
    }

    public function test_enroll_rejects_low_quality_sample(): void
    {
        Http::fake([
            'face.test/enroll' => Http::response([
                'data' => [
                    'samples' => [
                        [
                            'embedding' => [0.1, 0.2, 0.3],
                            'quality' => 0.4,
                            'face_count' => 1,
                            'liveness_passed' => true,
                        ],
                    ],
                ],
            ]),
        ]);

        $this->expectException(FaceRecognitionException::class);
        $this->expectExceptionMessage('Kualitas sample wajah ke-1 terlalu rendah');

        app(FaceRecognitionService::class)->enroll([
            UploadedFile::fake()->create('face.jpg', 100, 'image/jpeg'),
        ]);
    }

    public function test_enroll_rejects_multiple_faces(): void
    {
        Http::fake([
            'face.test/enroll' => Http::response([
                'embedding' => [0.1, 0.2, 0.3],
                'quality' => 0.9,
                'face_count' => 2,
            ]),
        ]);

        $this->expectException(FaceRecognitionException::class);
        $this->expectExceptionMessage('harus tepat 1 wajah');

        app(FaceRecognitionService::class)->enroll([
            UploadedFile::fake()->create('face.jpg', 100, 'image/jpeg'),
        ]);
    }

    public function test_enroll_can_require_pose_labels_from_engine(): void
    {
        config(['services.face.enroll_required_poses' => 'front,left']);

        Http::fake([
            'face.test/enroll' => Http::response([
                'data' => [
                    'samples' => [
                        [
                            'embedding' => [0.1, 0.2, 0.3],
                            'quality' => 0.9,
                            'face_count' => 1,
                            'pose' => 'front',
                        ],
                    ],
                ],
            ]),
        ]);

        $this->expectException(FaceRecognitionException::class);
        $this->expectExceptionMessage('Pose wajah belum lengkap: left.');

        app(FaceRecognitionService::class)->enroll([
            UploadedFile::fake()->create('face.jpg', 100, 'image/jpeg'),
        ]);
    }

    public function test_enroll_rejects_less_than_minimum_valid_samples(): void
    {
        config(['services.face.enroll_min_samples' => 5]);

        Http::fake([
            'face.test/enroll' => Http::response([
                'data' => [
                    'samples' => [
                        [
                            'embedding' => [0.1, 0.2, 0.3],
                            'quality' => 0.9,
                            'face_count' => 1,
                        ],
                    ],
                ],
            ]),
        ]);

        $this->expectException(FaceRecognitionException::class);
        $this->expectExceptionMessage('Minimal 5 sampel wajah valid diperlukan.');

        app(FaceRecognitionService::class)->enroll([
            UploadedFile::fake()->create('face.jpg', 100, 'image/jpeg'),
        ]);
    }

    public function test_enroll_rejects_pose_mismatch_when_engine_returns_pose(): void
    {
        Http::fake([
            'face.test/enroll' => Http::response([
                'data' => [
                    'samples' => [
                        [
                            'embedding' => [0.1, 0.2, 0.3],
                            'quality' => 0.9,
                            'face_count' => 1,
                            'pose' => 'front',
                        ],
                    ],
                ],
            ]),
        ]);

        $this->expectException(FaceRecognitionException::class);
        $this->expectExceptionMessage('Pose sample wajah ke-1 tidak sesuai');

        app(FaceRecognitionService::class)->enroll([
            UploadedFile::fake()->create('face.jpg', 100, 'image/jpeg'),
        ], ['left']);
    }

    public function test_verify_rejects_missing_or_failed_liveness(): void
    {
        Storage::fake('local');
        Storage::disk('local')->put('face-verification-photos/1/test.jpg', 'fake-image');

        Http::fake([
            'face.test/verify' => Http::response([
                'matched' => true,
                'similarity_score' => 0.91,
                'liveness_passed' => false,
            ]),
        ]);

        $registeredFaces = new Collection([
            new FaceData([
                'employee_id' => 1,
                'embedding' => '[0.1,0.2,0.3]',
                'is_active' => true,
            ]),
        ]);

        $this->expectException(FaceRecognitionException::class);
        $this->expectExceptionMessage('Liveness wajah gagal');

        app(FaceRecognitionService::class)->verify('face-verification-photos/1/test.jpg', $registeredFaces);
    }
}
