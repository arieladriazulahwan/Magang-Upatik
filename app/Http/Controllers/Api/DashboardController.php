<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\OvertimeRequest;
use App\Models\User;
use App\Models\WfhRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Dashboard (PRD 5.13) — DUA endpoint sesuai 2 dari 3 sudut pandang yang
 * disebut PRD (Pegawai, Pimpinan/Admin Unit). Sudut pandang ketiga (Admin
 * Kepegawaian: rekap universitas + ekspor Excel/PDF) ada di ReportController
 * — dipisah karena sifatnya beda (laporan lintas-unit terfilter, bukan
 * ringkasan personal/unit).
 *
 * SCOPE PASS INI: data JSON saja. Ekspor Excel/PDF PRD sebutkan eksplisit
 * ("ekspor Excel/PDF untuk dasar tunjangan kinerja") TIDAK dibangun di sini
 * — butuh dependency baru (mis. maatwebsite/excel, dompdf) yang belum ada
 * di composer.json, di luar scope "dashboard data" murni. Dicatat di
 * Remaining Issues, bukan diam-diam diabaikan.
 */
class DashboardController extends Controller
{
    /**
     * Ringkasan pegawai: kehadiran bulan berjalan, saldo cuti, status
     * pengajuan yang masih berjalan.
     */
    public function me(Request $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request->user());
        $monthStart = Carbon::now()->startOfMonth()->toDateString();
        $monthEnd = Carbon::now()->endOfMonth()->toDateString();

        $attendanceSummary = Attendance::where('employee_id', $employee->id)
            ->whereBetween('date', [$monthStart, $monthEnd])
            ->selectRaw("
                count(*) filter (where status = 'hadir') as hadir,
                count(*) filter (where status = 'terlambat') as terlambat,
                count(*) filter (where status = 'pulang_cepat') as pulang_cepat,
                count(*) filter (where status = 'alpha') as alpha,
                count(*) filter (where status = 'tidak_lengkap') as tidak_lengkap
            ")
            ->first();

        $leaveBalances = LeaveBalance::where('employee_id', $employee->id)
            ->where('year', Carbon::now()->year)
            ->with('leaveType:id,name,code')
            ->get()
            ->map(fn (LeaveBalance $b) => [
                'leave_type' => $b->leaveType?->only(['id', 'name', 'code']),
                'entitlement' => $b->entitlement,
                'used' => $b->used,
                'remaining' => $b->remaining,
            ]);

        $pendingRequests = [
            'wfh' => WfhRequest::where('employee_id', $employee->id)->where('status', 'diajukan')->count(),
            'leave' => LeaveRequest::where('employee_id', $employee->id)->whereIn('status', ['diajukan', 'diproses'])->count(),
            'overtime' => OvertimeRequest::where('employee_id', $employee->id)->where('status', 'diajukan')->count(),
        ];

        return response()->json([
            'data' => [
                'period' => ['from' => $monthStart, 'to' => $monthEnd],
                'attendance_summary' => [
                    'hadir' => (int) $attendanceSummary->hadir,
                    'terlambat' => (int) $attendanceSummary->terlambat,
                    'pulang_cepat' => (int) $attendanceSummary->pulang_cepat,
                    'alpha' => (int) $attendanceSummary->alpha,
                    'tidak_lengkap' => (int) $attendanceSummary->tidak_lengkap,
                ],
                'leave_balances' => $leaveBalances,
                'pending_requests' => $pendingRequests,
            ],
        ]);
    }

    /**
     * Rekap unit untuk Pimpinan/Admin Unit: kehadiran unit bulan berjalan
     * + daftar pengajuan menunggu persetujuan di unit tsb.
     *
     * Pimpinan/admin_unit: otomatis di-scope ke unit mereka (+ turunan).
     * super_admin/admin_kepegawaian: WAJIB kirim ?work_unit_id= (tidak ada
     * "default unit" yang masuk akal untuk role global).
     */
    public function unit(Request $request): JsonResponse
    {
        $user = $request->user();
        $workUnitIds = $this->resolveViewableUnitIds($request, $user);

        $monthStart = Carbon::now()->startOfMonth()->toDateString();
        $monthEnd = Carbon::now()->endOfMonth()->toDateString();

        $attendanceByEmployee = Attendance::query()
            ->join('employee', 'employee.id', '=', 'attendance.employee_id')
            ->whereIn('employee.work_unit_id', $workUnitIds)
            ->whereBetween('attendance.date', [$monthStart, $monthEnd])
            ->selectRaw("
                employee.id as employee_id, employee.name as employee_name,
                count(*) filter (where attendance.status = 'hadir') as hadir,
                count(*) filter (where attendance.status = 'terlambat') as terlambat,
                count(*) filter (where attendance.status = 'alpha') as alpha
            ")
            ->groupBy('employee.id', 'employee.name')
            ->orderBy('employee.name')
            ->get();

        $pendingWfh = WfhRequest::with('employee:id,name')
            ->whereHas('employee', fn (Builder $q) => $q->whereIn('work_unit_id', $workUnitIds))
            ->where('status', 'diajukan')
            ->get(['id', 'employee_id', 'start_date', 'end_date']);

        $pendingLeave = LeaveRequest::with(['employee:id,name', 'leaveType:id,name'])
            ->whereHas('employee', fn (Builder $q) => $q->whereIn('work_unit_id', $workUnitIds))
            ->whereIn('status', ['diajukan', 'diproses'])
            ->get(['id', 'employee_id', 'leave_type_id', 'start_date', 'end_date', 'status']);

        $pendingOvertime = OvertimeRequest::with('employee:id,name')
            ->whereHas('employee', fn (Builder $q) => $q->whereIn('work_unit_id', $workUnitIds))
            ->where('status', 'diajukan')
            ->get(['id', 'employee_id', 'date']);

        return response()->json([
            'data' => [
                'period' => ['from' => $monthStart, 'to' => $monthEnd],
                'attendance_recap' => $attendanceByEmployee,
                'pending_approvals' => [
                    'wfh' => $pendingWfh->map(fn (WfhRequest $w) => [
                        'id' => $w->id, 'employee' => $w->employee?->only(['id', 'name']),
                        'start_date' => $w->start_date?->toDateString(), 'end_date' => $w->end_date?->toDateString(),
                    ]),
                    'leave' => $pendingLeave->map(fn (LeaveRequest $l) => [
                        'id' => $l->id, 'employee' => $l->employee?->only(['id', 'name']),
                        'leave_type' => $l->leaveType?->only(['id', 'name']), 'status' => $l->status,
                    ]),
                    'overtime' => $pendingOvertime->map(fn (OvertimeRequest $o) => [
                        'id' => $o->id, 'employee' => $o->employee?->only(['id', 'name']),
                        'date' => $o->date?->toDateString(),
                    ]),
                ],
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

    /**
     * @return array<int, int>
     */
    private function resolveViewableUnitIds(Request $request, User $user): array
    {
        if ($user->hasRole(['super_admin', 'admin_kepegawaian'])) {
            $workUnitId = $request->validate(['work_unit_id' => ['required', 'integer']])['work_unit_id'];

            return $this->descendantUnitIds([$workUnitId]);
        }

        $scopeUnitIds = $this->scopeUnitIdsFor($user, ['pimpinan', 'admin_unit']);

        if ($scopeUnitIds === null) {
            // pimpinan/admin_unit dg scope global — sama dg admin, tetap
            // wajib pilih unit spesifik utk dashboard unit (tidak masuk
            // akal merekap "seluruh universitas" sebagai satu "unit").
            $workUnitId = $request->validate(['work_unit_id' => ['required', 'integer']])['work_unit_id'];

            return $this->descendantUnitIds([$workUnitId]);
        }

        if (empty($scopeUnitIds)) {
            abort(403, 'Anda tidak punya unit kerja yang dipimpin/dikelola.');
        }

        return $this->descendantUnitIds($scopeUnitIds);
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
        $arrayLiteral = '{'.implode(',', array_map('intval', $rootUnitIds)).'}';

        return DB::table('v_work_unit')
            ->whereRaw('ancestor_ids && ?::bigint[]', [$arrayLiteral])
            ->pluck('id')
            ->all();
    }
}