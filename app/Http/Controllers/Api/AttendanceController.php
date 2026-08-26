<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckInRequest;
use App\Http\Requests\CheckOutRequest;
use App\Http\Requests\CorrectAttendanceRequest;
use App\Http\Requests\MarkPresentRequest;
use App\Models\ActivityLog;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\User;
use App\Services\Attendance\AttendanceService;
use App\Services\Attendance\AttendanceValidationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceController extends Controller
{
    public function __construct(private readonly AttendanceService $service) {}

    public function checkIn(CheckInRequest $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request->user());
        $photoPath = $this->storeProofPhoto($request, $employee);

        try {
            $attendance = $this->service->checkIn($employee, [
                ...$request->validated(),
                'photo' => $photoPath,
            ]);
        } catch (AttendanceValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        ActivityLog::record('attendance.check_in', $attendance, ['type' => $request->validated('type')]);

        return response()->json(['data' => $this->serialize($attendance)], 201);
    }

    public function checkOut(CheckOutRequest $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request->user());
        $photoPath = $this->storeProofPhoto($request, $employee);

        try {
            $attendance = $this->service->checkOut($employee, [
                ...$request->validated(),
                'photo' => $photoPath,
            ]);
        } catch (AttendanceValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        ActivityLog::record('attendance.check_out', $attendance);

        return response()->json(['data' => $this->serialize($attendance)]);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'employee_id' => ['sometimes', 'integer'],
            'work_unit_id' => ['sometimes', 'integer'],
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date', 'after_or_equal:date_from'],
            'status' => ['sometimes', 'string'],
            'type' => ['sometimes', 'string'],
            'is_manual' => ['sometimes', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Attendance::query()->with(['employee:id,name,nip,work_unit_id', 'shift:id,name', 'workLocation:id,name']);

        $this->applyVisibilityScope($query, $request->user());

        if (isset($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }
        if (isset($filters['work_unit_id'])) {
            $query->whereHas('employee', fn (Builder $q) => $q->where('work_unit_id', $filters['work_unit_id']));
        }
        if (isset($filters['date_from'])) {
            $query->where('date', '>=', $filters['date_from']);
        }
        if (isset($filters['date_to'])) {
            $query->where('date', '<=', $filters['date_to']);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (isset($filters['is_manual'])) {
            $query->where('is_manual', $filters['is_manual']);
        }

        $attendances = $query->orderByDesc('date')->orderByDesc('check_in')->paginate($filters['per_page'] ?? 15);

        return response()->json([
            'data' => $attendances->getCollection()->map(fn (Attendance $a) => $this->serialize($a)),
            'meta' => [
                'current_page' => $attendances->currentPage(),
                'per_page' => $attendances->perPage(),
                'total' => $attendances->total(),
                'last_page' => $attendances->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, Attendance $attendance): JsonResponse
    {
        $attendance->load(['employee:id,name,nip,work_unit_id', 'shift:id,name', 'workLocation:id,name', 'verifiedBy:id,username,full_name']);

        $this->assertCanView($request->user(), $attendance->employee);

        return response()->json(['data' => $this->serialize($attendance)]);
    }

    public function correct(CorrectAttendanceRequest $request, Attendance $attendance): JsonResponse
    {
        $attendance->loadMissing('employee');
        $this->assertCanCorrect($request->user(), $attendance->employee);

        try {
            $attendance = $this->service->correctAttendance($attendance, $request->user(), $request->validated());
        } catch (AttendanceValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        ActivityLog::record('attendance.correct', $attendance, $request->validated());

        return response()->json(['data' => $this->serialize($attendance)]);
    }

    public function markPresent(MarkPresentRequest $request, Employee $employee): JsonResponse
    {
        $this->assertCanCorrect($request->user(), $employee);

        try {
            $attendance = $this->service->markPresent($employee, $request->user(), $request->validated());
        } catch (AttendanceValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        ActivityLog::record('attendance.mark_present', $attendance, $request->validated());

        return response()->json(['data' => $this->serialize($attendance)], 201);
    }

    private function resolveActingEmployee(User $user): Employee
    {
        $employee = $user->employee;

        if (! $employee) {
            abort(422, 'Akun Anda belum tertaut ke data pegawai. Hubungi Admin Kepegawaian.');
        }

        return $employee;
    }

    private function storeProofPhoto(Request $request, Employee $employee): string
    {
        return $request->file('photo')->store('attendance-photos/'.$employee->id, 'local');
    }

    private function validationErrorResponse(AttendanceValidationException $e): JsonResponse
    {
        return response()->json([
            'message' => $e->getMessage(),
            'reason' => $e->errorKey,
        ], 422);
    }

    private function assertCanView(User $user, Employee $employee): void
    {
        if ($user->hasRole(['super_admin', 'admin_kepegawaian'])) {
            return;
        }

        if ($user->hasRole(['pimpinan', 'admin_unit'], $employee->work_unit_id)) {
            return;
        }

        if ($user->employee_id !== null && $user->employee_id === $employee->id) {
            return;
        }

        abort(403, 'Anda tidak punya izin untuk melihat presensi pegawai ini.');
    }

    private function assertCanCorrect(User $user, Employee $employee): void
    {
        if ($user->hasRole(['super_admin', 'admin_kepegawaian'])) {
            return;
        }

        if ($user->hasRole(['pimpinan'], $employee->work_unit_id)) {
            return;
        }

        abort(403, 'Anda tidak punya wewenang untuk menghadirkan/mengoreksi presensi pegawai ini.');
    }

    private function applyVisibilityScope(Builder $query, User $user): void
    {
        if ($user->hasRole(['super_admin', 'admin_kepegawaian'])) {
            return;
        }

        $scopeUnitIds = $this->scopeUnitIdsFor($user, ['pimpinan', 'admin_unit']);

        if ($scopeUnitIds === null) {
            return;
        }

        if (! empty($scopeUnitIds)) {
            $unitIds = $this->descendantUnitIds($scopeUnitIds);
            $query->whereHas('employee', fn (Builder $q) => $q->whereIn('work_unit_id', $unitIds));

            return;
        }

        if ($user->employee_id !== null) {
            $query->where('employee_id', $user->employee_id);

            return;
        }

        abort(403, 'Anda tidak punya izin untuk melihat data presensi.');
    }

    private function scopeUnitIdsFor(User $user, array $roleNames): ?array
    {
        $ids = [];

        foreach ($roleNames as $roleName) {
            $scope = $user->unitScopeFor($roleName);

            if ($scope === null) {
                return null;
            }

            $ids = array_merge($ids, $scope);
        }

        return array_values(array_unique($ids));
    }

    private function descendantUnitIds(array $rootUnitIds): array
    {
        if (empty($rootUnitIds)) {
            return [];
        }

        $arrayLiteral = '{'.implode(',', array_map('intval', $rootUnitIds)).'}';

        return DB::table('v_work_unit')
            ->whereRaw('ancestor_ids && ?::bigint[]', [$arrayLiteral])
            ->pluck('id')
            ->all();
    }

    private function serialize(Attendance $attendance): array
    {
        return [
            'id' => $attendance->id,
            'employee' => $attendance->employee ? [
                'id' => $attendance->employee->id,
                'name' => $attendance->employee->name,
                'nip' => $attendance->employee->nip,
            ] : null,
            'date' => $attendance->date?->toDateString(),
            'type' => $attendance->type,
            'shift' => $attendance->shift?->only(['id', 'name']),
            'work_location' => $attendance->workLocation?->only(['id', 'name']),
            'check_in' => $attendance->check_in?->toIso8601String(),
            'check_out' => $attendance->check_out?->toIso8601String(),
            'duration_minutes' => $attendance->duration_minutes,
            'status' => $attendance->status,
            'description' => $attendance->description,
            'is_manual' => $attendance->is_manual,
            'verified_by' => $attendance->relationLoaded('verifiedBy') ? $attendance->verifiedBy?->only(['id', 'username', 'full_name']) : null,
            'verified_at' => $attendance->verified_at?->toIso8601String(),
            'correction_reason' => $attendance->correction_reason,
            'created_at' => $attendance->created_at?->toIso8601String(),
            'updated_at' => $attendance->updated_at?->toIso8601String(),
        ];
    }
}