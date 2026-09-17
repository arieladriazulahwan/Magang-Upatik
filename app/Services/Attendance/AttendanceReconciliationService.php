<?php

namespace App\Services\Attendance;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Services\WorkingDayCalculator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class AttendanceReconciliationService
{
    public function __construct(private readonly WorkingDayCalculator $workingDays) {}

    /**
     * Buat/update ringkasan presensi dari pengajuan final disetujui.
     * Presensi nyata yang sudah punya check_in/check_out tidak ditimpa.
     *
     * @return array{created:int, updated:int, skipped:int}
     */
    public function applyApprovedLeaveRequest(LeaveRequest $leaveRequest, bool $dryRun = false): array
    {
        $leaveRequest->loadMissing(['employee', 'leaveType']);

        if ($leaveRequest->status !== 'disetujui' || ! $leaveRequest->employee || ! $leaveRequest->leaveType) {
            return ['created' => 0, 'updated' => 0, 'skipped' => 1];
        }

        $status = $this->attendanceStatusFor($leaveRequest);
        $type = $status === 'dinas' ? 'dinas_luar' : 'wfo';
        $result = ['created' => 0, 'updated' => 0, 'skipped' => 0];

        foreach ($this->workingDays->datesBetween($leaveRequest->start_date, $leaveRequest->end_date) as $date) {
            $attendance = Attendance::where('employee_id', $leaveRequest->employee_id)
                ->where('date', $date)
                ->whereNull('shift_id')
                ->first();

            if ($attendance && ($attendance->check_in || $attendance->check_out)) {
                $result['skipped']++;
                continue;
            }

            $payload = [
                'employee_id' => $leaveRequest->employee_id,
                'date' => $date,
                'type' => $type,
                'shift_id' => null,
                'work_location_id' => null,
                'check_in' => null,
                'check_out' => null,
                'duration_minutes' => null,
                'status' => $status,
                'description' => "Pengajuan {$leaveRequest->leaveType->name} #{$leaveRequest->id} disetujui.",
                'is_manual' => false,
                'verified_by' => null,
                'verified_at' => null,
                'correction_reason' => null,
            ];

            if ($dryRun) {
                $attendance ? $result['updated']++ : $result['created']++;
                continue;
            }

            if ($attendance) {
                $attendance->update($payload);
                $result['updated']++;
            } else {
                Attendance::create($payload);
                $result['created']++;
            }
        }

        return $result;
    }

    /**
     * Tandai alpha untuk pegawai aktif pada hari kerja yang tidak punya
     * presensi dan tidak tercakup pengajuan cuti/izin/sakit/dinas disetujui.
     *
     * @return array{created:int, skipped:int}
     */
    public function markAlphaForDate(string $date, ?int $workUnitId = null, bool $dryRun = false): array
    {
        if ($this->workingDays->datesBetween($date, $date)->isEmpty()) {
            return ['created' => 0, 'skipped' => 0];
        }

        $employees = Employee::query()
            ->where('is_active', true)
            ->where('attendance_active', true)
            ->when($workUnitId, fn (Builder $query) => $query->where('work_unit_id', $workUnitId))
            ->get(['id']);

        $result = ['created' => 0, 'skipped' => 0];

        foreach ($employees as $employee) {
            $hasAttendance = Attendance::where('employee_id', $employee->id)
                ->where('date', $date)
                ->exists();

            if ($hasAttendance || $this->hasApprovedAbsence($employee->id, $date)) {
                $result['skipped']++;
                continue;
            }

            if (! $dryRun) {
                Attendance::create([
                    'employee_id' => $employee->id,
                    'date' => $date,
                    'type' => 'wfo',
                    'status' => 'alpha',
                    'description' => 'Tidak ada presensi atau pengajuan disetujui pada hari kerja ini.',
                ]);
            }

            $result['created']++;
        }

        return $result;
    }

    /**
     * Hapus presensi otomatis yang dibuat dari pengajuan disetujui ketika
     * pengajuan tersebut dibatalkan. Presensi nyata/manual tidak disentuh.
     *
     * @return array{deleted:int, skipped:int}
     */
    public function removeLeaveRequestRecords(LeaveRequest $leaveRequest, bool $dryRun = false): array
    {
        $leaveRequest->loadMissing(['leaveType']);

        if (! $leaveRequest->leaveType) {
            return ['deleted' => 0, 'skipped' => 1];
        }

        $status = $this->attendanceStatusFor($leaveRequest);
        $result = ['deleted' => 0, 'skipped' => 0];

        foreach ($this->workingDays->datesBetween($leaveRequest->start_date, $leaveRequest->end_date) as $date) {
            $query = Attendance::where('employee_id', $leaveRequest->employee_id)
                ->where('date', $date)
                ->where('status', $status)
                ->whereNull('check_in')
                ->whereNull('check_out')
                ->where('description', 'like', "%#{$leaveRequest->id} disetujui.%");

            $count = $query->count();

            if ($count === 0) {
                $result['skipped']++;
                continue;
            }

            if (! $dryRun) {
                $query->delete();
            }

            $result['deleted'] += $count;
        }

        return $result;
    }

    /**
     * @return array{created:int, updated:int, skipped:int}
     */
    public function syncApprovedLeaveRequests(?string $from = null, ?string $to = null, ?int $requestId = null, bool $dryRun = false): array
    {
        $query = LeaveRequest::query()
            ->with(['employee', 'leaveType'])
            ->where('status', 'disetujui');

        if ($requestId !== null) {
            $query->where('id', $requestId);
        }
        if ($from !== null) {
            $query->where('end_date', '>=', $from);
        }
        if ($to !== null) {
            $query->where('start_date', '<=', $to);
        }

        return $query->get()->reduce(function (array $carry, LeaveRequest $leaveRequest) use ($dryRun) {
            $result = $this->applyApprovedLeaveRequest($leaveRequest, $dryRun);

            return [
                'created' => $carry['created'] + $result['created'],
                'updated' => $carry['updated'] + $result['updated'],
                'skipped' => $carry['skipped'] + $result['skipped'],
            ];
        }, ['created' => 0, 'updated' => 0, 'skipped' => 0]);
    }

    private function attendanceStatusFor(LeaveRequest $leaveRequest): string
    {
        return match ($leaveRequest->leaveType->category) {
            'cuti' => 'cuti',
            'sakit' => 'sakit',
            'dinas_luar' => 'dinas',
            default => 'izin',
        };
    }

    private function hasApprovedAbsence(int $employeeId, string $date): bool
    {
        return DB::table('request')
            ->join('leave_type', 'leave_type.id', '=', 'request.leave_type_id')
            ->where('request.employee_id', $employeeId)
            ->where('request.status', 'disetujui')
            ->whereIn('leave_type.category', ['cuti', 'izin', 'sakit', 'dinas_luar'])
            ->where('request.start_date', '<=', $date)
            ->where('request.end_date', '>=', $date)
            ->exists();
    }
}
