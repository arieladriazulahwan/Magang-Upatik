<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveLeaveRequestRequest;
use App\Http\Requests\RejectLeaveRequestRequest;
use App\Http\Requests\StoreLeaveRequestRequest;
use App\Models\ActivityLog;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\Leave\LeaveRequestService;
use App\Services\Leave\LeaveValidationException;
use App\Services\Notification\NotificationService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LeaveRequestController extends Controller
{
    public function __construct(
        private readonly LeaveRequestService $service,
        private readonly NotificationService $notifications,
    ) {}

    public function store(StoreLeaveRequestRequest $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request->user());

        try {
            $leaveRequest = $this->service->submit(
                $employee,
                $request->validated(),
                $request->file('attachment'),
            );
        } catch (LeaveValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        ActivityLog::record('leave_request.create', $leaveRequest, $request->except('attachment'));

        $firstStep = $this->service->currentPendingStep($leaveRequest);
        if ($firstStep) {
            $this->notifications->leaveRequestSubmitted($leaveRequest, $firstStep->approver_role);
        }

        $leaveRequest->load(['leaveType:id,name,category', 'approvalLogs']);

        return response()->json(['data' => $this->serialize($leaveRequest)], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'employee_id' => ['sometimes', 'integer'],
            'leave_type_id' => ['sometimes', 'integer'],
            'status' => ['sometimes', 'string'],
        ]);

        $query = LeaveRequest::query()->with(['employee:id,name,nip,work_unit_id', 'leaveType:id,name,category']);

        $this->applyVisibilityScope($query, $request->user());

        if (isset($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }
        if (isset($filters['leave_type_id'])) {
            $query->where('leave_type_id', $filters['leave_type_id']);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $requests = $query->orderByDesc('start_date')->get();

        return response()->json(['data' => $requests->map(fn (LeaveRequest $r) => $this->serialize($r))]);
    }

    public function show(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $leaveRequest->load(['employee:id,name,nip,work_unit_id', 'leaveType:id,name,category', 'approvalLogs.approver:id,name', 'attachments']);
        $this->assertCanView($request->user(), $leaveRequest->employee);

        return response()->json(['data' => $this->serialize($leaveRequest)]);
    }

    public function approve(ApproveLeaveRequestRequest $request, LeaveRequest $leaveRequest): JsonResponse
    {
        return $this->decide($request, $leaveRequest, fn () => $this->service->approve($leaveRequest, $request->user(), $request->validated('note')));
    }

    public function reject(RejectLeaveRequestRequest $request, LeaveRequest $leaveRequest): JsonResponse
    {
        return $this->decide($request, $leaveRequest, fn () => $this->service->reject($leaveRequest, $request->user(), $request->validated('note')));
    }

    public function cancel(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $leaveRequest->loadMissing('employee');
        $actingEmployee = $this->resolveActingEmployee($request->user());

        $isOwner = $leaveRequest->employee_id === $actingEmployee->id;
        $isGlobalAdmin = $request->user()->hasRole(['super_admin', 'admin_kepegawaian']);

        if (! $isOwner && ! $isGlobalAdmin) {
            abort(403, 'Anda tidak punya izin untuk membatalkan pengajuan ini.');
        }

        try {
            $leaveRequest = $this->service->cancel($leaveRequest);
        } catch (LeaveValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        ActivityLog::record('leave_request.cancel', $leaveRequest);

        return response()->json(['data' => $this->serialize($leaveRequest)]);
    }

    private function decide(Request $request, LeaveRequest $leaveRequest, \Closure $action): JsonResponse
    {
        $leaveRequest->loadMissing('employee');

        $step = $this->service->currentPendingStep($leaveRequest);

        if (! $step) {
            return response()->json([
                'message' => 'Pengajuan ini sudah selesai diproses.',
                'reason' => 'already_finalized',
            ], 409);
        }

        if (! $this->service->canDecide($step->approver_role, $request->user(), $leaveRequest->employee)) {
            abort(403, 'Anda tidak punya wewenang memproses langkah persetujuan ini.');
        }

        try {
            $leaveRequest = $action();
        } catch (LeaveValidationException $e) {
            return $this->validationErrorResponse($e);
        }

        ActivityLog::record('leave_request.'.$leaveRequest->status, $leaveRequest);

        // status 'diproses' berarti naik ke langkah approval berikutnya
        // (belum final) — cari approver_role langkah itu utk diberi tahu.
        // status 'disetujui'/'ditolak' -> notifikasi ke pemohon (ditangani
        // di dalam leaveRequestDecided() berdasar $leaveRequest->status).
        $nextStep = $leaveRequest->status === 'diproses'
            ? $this->service->currentPendingStep($leaveRequest)
            : null;

        $this->notifications->leaveRequestDecided($leaveRequest, $nextStep?->approver_role);

        $leaveRequest->load(['leaveType:id,name,category', 'approvalLogs.approver:id,name']);

        return response()->json(['data' => $this->serialize($leaveRequest)]);
    }

    private function resolveActingEmployee(User $user): Employee
    {
        $employee = $user->employee;

        if (! $employee) {
            abort(422, 'Akun Anda belum tertaut ke data pegawai. Hubungi Admin Kepegawaian.');
        }

        return $employee;
    }

    private function validationErrorResponse(LeaveValidationException $e): JsonResponse
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

        abort(403, 'Anda tidak punya izin untuk melihat pengajuan ini.');
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

        abort(403, 'Anda tidak punya izin untuk melihat data pengajuan.');
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

    private function serialize(LeaveRequest $leaveRequest): array
    {
        return [
            'id' => $leaveRequest->id,
            'number' => $leaveRequest->number,
            'employee' => $leaveRequest->employee ? [
                'id' => $leaveRequest->employee->id,
                'name' => $leaveRequest->employee->name,
                'nip' => $leaveRequest->employee->nip,
            ] : null,
            'leave_type' => $leaveRequest->leaveType?->only(['id', 'name', 'category']),
            'start_date' => $leaveRequest->start_date?->toDateString(),
            'end_date' => $leaveRequest->end_date?->toDateString(),
            'total_days' => $leaveRequest->total_days,
            'start_time' => $leaveRequest->start_time,
            'end_time' => $leaveRequest->end_time,
            'reason' => $leaveRequest->reason,
            'address_during_leave' => $leaveRequest->address_during_leave,
            'child_number' => $leaveRequest->child_number,
            'doctor_letter_type' => $leaveRequest->doctor_letter_type,
            'doctor_letter_number' => $leaveRequest->doctor_letter_number,
            'sub_category' => $leaveRequest->sub_category,
            'status' => $leaveRequest->status,
            'approval_steps' => $leaveRequest->relationLoaded('approvalLogs')
                ? $leaveRequest->approvalLogs->map(fn ($log) => [
                    'sequence' => $log->sequence,
                    'approver_role' => $log->approver_role,
                    'status' => $log->status,
                    'approver' => $log->relationLoaded('approver') ? $log->approver?->only(['id', 'name']) : null,
                    'note' => $log->note,
                    'recorded_at' => $log->recorded_at?->toIso8601String(),
                ])
                : null,
            'created_at' => $leaveRequest->created_at?->toIso8601String(),
        ];
    }
}