<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveOvertimeRequestRequest;
use App\Http\Requests\RejectOvertimeRequestRequest;
use App\Http\Requests\StoreOvertimeRequestRequest;
use App\Models\Employee;
use App\Models\OvertimeRequest;
use App\Models\User;
use App\Services\Overtime\OvertimeService;
use App\Services\Overtime\OvertimeValidationException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OvertimeController extends Controller
{
    public function __construct(private readonly OvertimeService $service) {}

    public function store(StoreOvertimeRequestRequest $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request->user());
        $overtime = $this->service->submit($employee, $request->validated());

        return response()->json(['data' => $this->serialize($overtime)], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'employee_id' => ['sometimes', 'integer'],
            'status' => ['sometimes', 'string'],
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date', 'after_or_equal:date_from'],
        ]);

        $query = OvertimeRequest::query()->with(['employee:id,name,nip,work_unit_id', 'approver:id,name']);

        $this->applyVisibilityScope($query, $request->user());

        if (isset($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (isset($filters['date_from'])) {
            $query->where('date', '>=', $filters['date_from']);
        }
        if (isset($filters['date_to'])) {
            $query->where('date', '<=', $filters['date_to']);
        }

        $requests = $query->orderByDesc('date')->get();

        return response()->json(['data' => $requests->map(fn (OvertimeRequest $o) => $this->serialize($o))]);
    }

    public function show(Request $request, OvertimeRequest $overtimeRequest): JsonResponse
    {
        $overtimeRequest->load(['employee:id,name,nip,work_unit_id', 'approver:id,name']);

        if (! $this->service->canView($request->user(), $overtimeRequest->employee)) {
            abort(403, 'Anda tidak punya izin untuk melihat pengajuan lembur ini.');
        }

        return response()->json(['data' => $this->serialize($overtimeRequest)]);
    }

    public function approve(ApproveOvertimeRequestRequest $request, OvertimeRequest $overtimeRequest): JsonResponse
    {
        $overtimeRequest->loadMissing('employee');
        $this->assertCanDecide($request->user(), $overtimeRequest->employee);

        try {
            $overtimeRequest = $this->service->approve($overtimeRequest, $request->user(), $request->validated('note'));
        } catch (OvertimeValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        return response()->json(['data' => $this->serialize($overtimeRequest)]);
    }

    public function reject(RejectOvertimeRequestRequest $request, OvertimeRequest $overtimeRequest): JsonResponse
    {
        $overtimeRequest->loadMissing('employee');
        $this->assertCanDecide($request->user(), $overtimeRequest->employee);

        try {
            $overtimeRequest = $this->service->reject($overtimeRequest, $request->user(), $request->validated('note'));
        } catch (OvertimeValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        return response()->json(['data' => $this->serialize($overtimeRequest)]);
    }

    public function realize(Request $request, OvertimeRequest $overtimeRequest): JsonResponse
    {
        $overtimeRequest->loadMissing('employee');
        $this->assertCanDecide($request->user(), $overtimeRequest->employee);

        try {
            $overtimeRequest = $this->service->realize($overtimeRequest);
        } catch (OvertimeValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        return response()->json(['data' => $this->serialize($overtimeRequest)]);
    }

    public function cancel(Request $request, OvertimeRequest $overtimeRequest): JsonResponse
    {
        $overtimeRequest->loadMissing('employee');
        $actingEmployee = $this->resolveActingEmployee($request->user());

        $isOwner = $overtimeRequest->employee_id === $actingEmployee->id;
        $isGlobalAdmin = $request->user()->hasRole(['super_admin', 'admin_kepegawaian']);

        if (! $isOwner && ! $isGlobalAdmin) {
            abort(403, 'Anda tidak punya izin untuk membatalkan pengajuan ini.');
        }

        try {
            $overtimeRequest = $this->service->cancel($overtimeRequest);
        } catch (OvertimeValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        return response()->json(['data' => $this->serialize($overtimeRequest)]);
    }

    private function resolveActingEmployee(User $user): Employee
    {
        $employee = $user->employee;

        if (! $employee) {
            abort(422, 'Akun Anda belum tertaut ke data pegawai. Hubungi Admin Kepegawaian.');
        }

        return $employee;
    }

    private function assertCanDecide(User $user, Employee $employee): void
    {
        if (! $this->service->canDecide($user, $employee)) {
            abort(403, 'Anda tidak punya wewenang memproses lembur pegawai ini.');
        }
    }

    private function validationErrorResponse(OvertimeValidationException $e): JsonResponse
    {
        return response()->json([
            'message' => $e->getMessage(),
            'reason' => $e->errorKey,
        ], $e->errorKey === 'already_decided' ? 409 : 422);
    }

    private function applyVisibilityScope(Builder $query, User $user): void
    {
        if ($user->hasRole(['super_admin', 'admin_kepegawaian'])) {
            return;
        }

        $scopeUnitIds = $user->unitScopeFor('pimpinan');

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

        abort(403, 'Anda tidak punya izin untuk melihat data lembur.');
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

    private function serialize(OvertimeRequest $overtime): array
    {
        return [
            'id' => $overtime->id,
            'employee' => $overtime->employee ? [
                'id' => $overtime->employee->id,
                'name' => $overtime->employee->name,
                'nip' => $overtime->employee->nip,
            ] : null,
            'date' => $overtime->date?->toDateString(),
            'planned_start_time' => $overtime->planned_start_time,
            'planned_end_time' => $overtime->planned_end_time,
            'work_description' => $overtime->work_description,
            'actual_start_time' => $overtime->actual_start_time?->toIso8601String(),
            'actual_end_time' => $overtime->actual_end_time?->toIso8601String(),
            'duration_minutes' => $overtime->duration_minutes,
            'status' => $overtime->status,
            'approver' => $overtime->relationLoaded('approver') ? $overtime->approver?->only(['id', 'name']) : null,
            'approved_at' => $overtime->approved_at?->toIso8601String(),
            'note' => $overtime->note,
            'created_at' => $overtime->created_at?->toIso8601String(),
        ];
    }
}