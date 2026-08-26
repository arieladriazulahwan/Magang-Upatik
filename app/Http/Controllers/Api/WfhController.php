<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ApproveWfhRequestRequest;
use App\Http\Requests\RejectWfhRequestRequest;
use App\Http\Requests\StoreWfhRequestRequest;
use App\Models\ActivityLog;
use App\Models\Employee;
use App\Models\User;
use App\Models\WfhRequest;
use App\Services\Notification\NotificationService;
use App\Services\WorkingDayCalculator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WfhController extends Controller
{
    public function __construct(
        private readonly WorkingDayCalculator $workingDays,
        private readonly NotificationService $notifications,
    ) {}

    public function store(StoreWfhRequestRequest $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request->user());
        $data = $request->validated();

        $employee->loadMissing('workUnit');

        if (! $employee->workUnit || ! $employee->workUnit->wfh_allowed) {
            return response()->json([
                'message' => 'Unit kerja Anda tidak mengizinkan WFH.',
                'reason' => 'wfh_not_allowed_for_unit',
            ], 422);
        }

        $totalDays = $this->workingDays->countBetween($data['start_date'], $data['end_date']);

        if ($totalDays < 1) {
            return response()->json([
                'message' => 'Rentang tanggal yang dipilih tidak mengandung hari kerja (akhir pekan/hari libur semua).',
                'reason' => 'no_working_days',
            ], 422);
        }

        $quota = $employee->workUnit->max_wfh_per_month;

        if ($quota !== null) {
            $monthStart = \Illuminate\Support\Carbon::parse($data['start_date'])->startOfMonth();
            $monthEnd = \Illuminate\Support\Carbon::parse($data['start_date'])->endOfMonth();

            $usedThisMonth = WfhRequest::where('employee_id', $employee->id)
                ->whereIn('status', ['diajukan', 'disetujui'])
                ->whereBetween('start_date', [$monthStart->toDateString(), $monthEnd->toDateString()])
                ->sum('total_days');

            if (($usedThisMonth + $totalDays) > $quota) {
                return response()->json([
                    'message' => "Kuota WFH bulan ini {$quota} hari kerja, sudah terpakai/diajukan {$usedThisMonth} hari.",
                    'reason' => 'wfh_quota_exceeded',
                ], 422);
            }
        }

        $wfh = WfhRequest::create([
            'employee_id' => $employee->id,
            'start_date' => $data['start_date'],
            'end_date' => $data['end_date'],
            'total_days' => $totalDays,
            'reason' => $data['reason'],
            'status' => 'diajukan',
        ]);

        ActivityLog::record('wfh_request.create', $wfh, $data);

        $this->notifications->wfhRequestSubmitted($wfh);

        return response()->json(['data' => $this->serialize($wfh)], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'employee_id' => ['sometimes', 'integer'],
            'status' => ['sometimes', 'string'],
        ]);

        $query = WfhRequest::query()->with(['employee:id,name,nip,work_unit_id', 'approver:id,name']);

        $this->applyVisibilityScope($query, $request->user());

        if (isset($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }
        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        $requests = $query->orderByDesc('start_date')->get();

        return response()->json(['data' => $requests->map(fn (WfhRequest $w) => $this->serialize($w))]);
    }

    public function show(Request $request, WfhRequest $wfhRequest): JsonResponse
    {
        $wfhRequest->load(['employee:id,name,nip,work_unit_id', 'approver:id,name']);
        $this->assertCanView($request->user(), $wfhRequest->employee);

        return response()->json(['data' => $this->serialize($wfhRequest)]);
    }

    public function approve(ApproveWfhRequestRequest $request, WfhRequest $wfhRequest): JsonResponse
    {
        return $this->decide($request, $wfhRequest, 'disetujui', $request->validated('note'));
    }

    public function reject(RejectWfhRequestRequest $request, WfhRequest $wfhRequest): JsonResponse
    {
        return $this->decide($request, $wfhRequest, 'ditolak', $request->validated('note'));
    }

    public function cancel(Request $request, WfhRequest $wfhRequest): JsonResponse
    {
        $wfhRequest->loadMissing('employee');
        $actingEmployee = $this->resolveActingEmployee($request->user());

        $isOwner = $wfhRequest->employee_id === $actingEmployee->id;
        $isGlobalAdmin = $request->user()->hasRole(['super_admin', 'admin_kepegawaian']);

        if (! $isOwner && ! $isGlobalAdmin) {
            abort(403, 'Anda tidak punya izin untuk membatalkan pengajuan ini.');
        }

        if ($wfhRequest->status !== 'diajukan') {
            return response()->json([
                'message' => 'Hanya pengajuan berstatus "diajukan" yang dapat dibatalkan.',
                'reason' => 'invalid_status_for_cancel',
            ], 422);
        }

        $wfhRequest->update(['status' => 'dibatalkan']);

        ActivityLog::record('wfh_request.cancel', $wfhRequest);

        return response()->json(['data' => $this->serialize($wfhRequest)]);
    }

    private function decide(Request $request, WfhRequest $wfhRequest, string $status, ?string $note): JsonResponse
    {
        $wfhRequest->loadMissing('employee');
        $this->assertCanDecide($request->user(), $wfhRequest->employee);

        if ($wfhRequest->status !== 'diajukan') {
            return response()->json([
                'message' => 'Pengajuan ini sudah diproses sebelumnya.',
                'reason' => 'already_decided',
            ], 409);
        }

        $approverEmployee = $request->user()->employee;

        if (! $approverEmployee) {
            abort(422, 'Akun Anda tidak tertaut ke data pegawai, tidak dapat mencatat persetujuan.');
        }

        DB::transaction(function () use ($wfhRequest, $status, $note, $approverEmployee) {
            $wfhRequest->update([
                'status' => $status,
                'approved_by' => $approverEmployee->id,
                'approved_at' => now(),
                'note' => $note,
            ]);

            ActivityLog::record('wfh_request.'.$status, $wfhRequest, ['note' => $note]);
        });

        $this->notifications->wfhRequestDecided($wfhRequest);

        return response()->json(['data' => $this->serialize($wfhRequest)]);
    }

    private function resolveActingEmployee(User $user): Employee
    {
        $employee = $user->employee;

        if (! $employee) {
            abort(422, 'Akun Anda belum tertaut ke data pegawai. Hubungi Admin Kepegawaian.');
        }

        return $employee;
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

        abort(403, 'Anda tidak punya izin untuk melihat pengajuan WFH ini.');
    }

    private function assertCanDecide(User $user, Employee $employee): void
    {
        if ($user->hasRole(['super_admin', 'admin_kepegawaian'])) {
            return;
        }
        if ($user->hasRole(['pimpinan', 'admin_unit'], $employee->work_unit_id)) {
            return;
        }

        abort(403, 'Anda tidak punya wewenang memproses pengajuan WFH ini.');
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

        abort(403, 'Anda tidak punya izin untuk melihat data WFH.');
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

    private function serialize(WfhRequest $wfh): array
    {
        return [
            'id' => $wfh->id,
            'employee' => $wfh->employee ? [
                'id' => $wfh->employee->id,
                'name' => $wfh->employee->name,
                'nip' => $wfh->employee->nip,
            ] : null,
            'start_date' => $wfh->start_date?->toDateString(),
            'end_date' => $wfh->end_date?->toDateString(),
            'total_days' => $wfh->total_days,
            'reason' => $wfh->reason,
            'status' => $wfh->status,
            'approver' => $wfh->relationLoaded('approver') ? $wfh->approver?->only(['id', 'name']) : null,
            'approved_at' => $wfh->approved_at?->toIso8601String(),
            'note' => $wfh->note,
            'created_at' => $wfh->created_at?->toIso8601String(),
        ];
    }

    
}