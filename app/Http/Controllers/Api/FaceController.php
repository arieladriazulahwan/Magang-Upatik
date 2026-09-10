<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Employee;
use App\Models\FaceData;
use App\Models\User;
use App\Services\Face\FaceRecognitionException;
use App\Services\Face\FaceRecognitionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class FaceController extends Controller
{
    public function __construct(private readonly FaceRecognitionService $faceRecognition) {}

    public function status(Request $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request->user());
        $faces = $employee->activeFaceData()->orderByDesc('created_at')->get();

        return response()->json([
            'data' => [
                'registered' => $faces->isNotEmpty(),
                'sample_count' => $faces->count(),
                'minimum_samples' => (int) config('services.face.enroll_min_samples', 5),
                'latest_enrolled_at' => $faces->first()?->created_at?->toIso8601String(),
            ],
        ]);
    }

    public function enroll(Request $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request->user());

        $data = $request->validate([
            'photos' => ['required', 'array', 'min:'.((int) config('services.face.enroll_min_samples', 5)), 'max:5'],
            'photos.*' => ['required', 'image', 'max:5120'],
            'poses' => ['sometimes', 'array', 'size:'.count($request->file('photos', []))],
            'poses.*' => ['required', 'string', 'in:front,left,right,up,down'],
            'replace' => ['sometimes', 'boolean'],
        ]);

        try {
            $samples = $this->faceRecognition->enroll($request->file('photos', []), $data['poses'] ?? []);
        } catch (FaceRecognitionException $e) {
            return $this->faceErrorResponse($e);
        }

        $faces = DB::transaction(function () use ($request, $employee, $data, $samples) {
            if ((bool) ($data['replace'] ?? true)) {
                FaceData::where('employee_id', $employee->id)->update(['is_active' => false]);
            }

            $storedFaces = collect();

            foreach ($request->file('photos', []) as $index => $photo) {
                $path = $photo->store('face-photos/'.$employee->id, 'local');
                $sample = $samples[$index] ?? null;

                $storedFaces->push(FaceData::create([
                    'employee_id' => $employee->id,
                    'embedding' => $this->faceRecognition->formatVector($sample['embedding'] ?? []),
                    'reference_photo' => $path,
                    'quality' => $sample['quality'] ?? 1.0,
                    'is_active' => true,
                ]));
            }

            return $storedFaces;
        });

        ActivityLog::record('face.enroll', $employee, [
            'sample_count' => $faces->count(),
        ]);

        return response()->json([
            'data' => [
                'registered' => true,
                'sample_count' => $employee->activeFaceData()->count(),
                'minimum_samples' => (int) config('services.face.enroll_min_samples', 5),
                'latest_enrolled_at' => $faces->last()?->created_at?->toIso8601String(),
            ],
        ], 201);
    }

    public function verify(Request $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request->user());

        $request->validate([
            'photo' => ['required', 'image', 'max:5120'],
        ]);

        $registeredFaces = $employee->activeFaceData()->get();
        $registered = $registeredFaces->isNotEmpty();
        $path = $request->file('photo')->store('face-verification-photos/'.$employee->id, 'local');
        $result = null;

        if ($registered) {
            try {
                $result = $this->faceRecognition->verify($path, $registeredFaces);
            } catch (FaceRecognitionException $e) {
                return $this->faceErrorResponse($e);
            }
        }

        return response()->json([
            'data' => [
                'registered' => $registered,
                'matched' => $result['matched'] ?? false,
                'similarity_score' => $result['similarity_score'] ?? null,
                'liveness_passed' => $result['liveness_passed'] ?? null,
                'proof_photo' => $path,
                'message' => $registered ? ($result['message'] ?? 'Wajah terverifikasi.') : 'Wajah belum terdaftar.',
            ],
        ]);
    }

    private function resolveActingEmployee(User $user): Employee
    {
        $employee = $user->employee;

        if (! $employee) {
            abort(422, 'Akun Anda belum tertaut ke data pegawai. Hubungi Admin Kepegawaian.');
        }

        return $employee;
    }

    private function faceErrorResponse(FaceRecognitionException $e): JsonResponse
    {
        $status = $e->errorKey === 'face_service_error' ? 503 : 422;

        return response()->json([
            'message' => $e->getMessage(),
            'reason' => $e->errorKey,
        ], $status);
    }
}
