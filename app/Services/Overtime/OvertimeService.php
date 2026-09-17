<?php

namespace App\Services\Overtime;

use App\Models\ActivityLog;
use App\Models\AppSetting;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\OvertimeRequest;
use App\Models\User;
use App\Services\Notification\NotificationService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class OvertimeService
{
    public function __construct(private readonly NotificationService $notifications) {}

    /**
     * @throws OvertimeValidationException
     */
    public function submit(Employee $employee, array $data): OvertimeRequest
    {
        $this->validatePlannedWindow($data['date'], $data['planned_start_time'], $data['planned_end_time']);

        $overtime = OvertimeRequest::create([
            'employee_id' => $employee->id,
            'date' => $data['date'],
            'planned_start_time' => $data['planned_start_time'],
            'planned_end_time' => $data['planned_end_time'],
            'work_description' => $data['work_description'],
            'status' => 'diajukan',
        ]);

        ActivityLog::record('overtime_request.create', $overtime, $data);

        $this->notifications->overtimeRequestSubmitted($overtime);

        return $overtime;
    }

    /**
     * @throws OvertimeValidationException
     */
    private function validatePlannedWindow(string $date, string $plannedStartTime, string $plannedEndTime): void
    {
        $overtimeDate = Carbon::parse($date);
        $plannedStart = Carbon::parse($overtimeDate->toDateString().' '.$plannedStartTime);
        $plannedEnd = Carbon::parse($overtimeDate->toDateString().' '.$plannedEndTime);
        $policy = $this->overtimePolicy();

        if ($plannedEnd->lessThanOrEqualTo($plannedStart)) {
            throw new OvertimeValidationException(
                'Jam selesai lembur harus setelah jam mulai lembur.',
                'invalid_overtime_time_range',
            );
        }

        if ($overtimeDate->isWeekend()) {
            if (! $policy['weekend_allowed']) {
                throw new OvertimeValidationException(
                    'Pengajuan lembur Sabtu dan Minggu sedang tidak diizinkan.',
                    'overtime_weekend_not_allowed',
                );
            }

            return;
        }

        $minimumStart = $overtimeDate->isFriday() ? $policy['friday_start'] : $policy['weekday_start'];
        $minimumStartAt = Carbon::parse($overtimeDate->toDateString().' '.$minimumStart);

        if ($plannedStart->lessThan($minimumStartAt)) {
            throw new OvertimeValidationException(
                "Lembur hari kerja hanya dapat diajukan mulai pukul {$minimumStart} WITA atau setelahnya.",
                'overtime_before_allowed_start_time',
            );
        }
    }

    private function overtimePolicy(): array
    {
        $settings = AppSetting::whereIn('key', [
            'overtime_weekday_start',
            'overtime_friday_start',
            'overtime_weekend_allowed',
        ])->pluck('value', 'key');

        return [
            'weekday_start' => $this->validTime($settings->get('overtime_weekday_start')) ?? '16:00',
            'friday_start' => $this->validTime($settings->get('overtime_friday_start')) ?? '16:30',
            'weekend_allowed' => $settings->has('overtime_weekend_allowed')
                ? filter_var($settings->get('overtime_weekend_allowed'), FILTER_VALIDATE_BOOLEAN)
                : true,
        ];
    }

    private function validTime(?string $value): ?string
    {
        return is_string($value) && preg_match('/^\d{2}:\d{2}$/', $value) ? $value : null;
    }

    /**
     * @throws OvertimeValidationException
     */
    public function approve(OvertimeRequest $overtime, User $actor, ?string $note): OvertimeRequest
    {
        return $this->decide($overtime, $actor, 'disetujui', $note);
    }

    /**
     * @throws OvertimeValidationException
     */
    public function reject(OvertimeRequest $overtime, User $actor, string $note): OvertimeRequest
    {
        return $this->decide($overtime, $actor, 'ditolak', $note);
    }

    /**
     * Realisasi: cari attendance pegawai pada tanggal yg sama, ambil IRISAN
     * jam rencana dg jam presensi aktual sbg durasi lembur final.
     *
     * @throws OvertimeValidationException
     */
    public function realize(OvertimeRequest $overtime): OvertimeRequest
    {
        if ($overtime->status !== 'disetujui') {
            throw new OvertimeValidationException(
                'Hanya lembur berstatus "disetujui" yang dapat direalisasikan.',
                'invalid_status_for_realize',
            );
        }

        $attendance = Attendance::where('employee_id', $overtime->employee_id)
            ->where('date', $overtime->date->toDateString())
            ->whereNotNull('check_in')
            ->whereNotNull('check_out')
            ->first();

        if (! $attendance) {
            throw new OvertimeValidationException(
                'Belum ada data presensi (check-in & check-out) pegawai pada tanggal ini untuk memvalidasi realisasi.',
                'no_attendance_record_found',
            );
        }

        $plannedStart = Carbon::parse($overtime->date->toDateString().' '.$overtime->planned_start_time);
        $plannedEnd = Carbon::parse($overtime->date->toDateString().' '.$overtime->planned_end_time);

        $actualStart = $attendance->check_in->greaterThan($plannedStart) ? $attendance->check_in : $plannedStart;
        $actualEnd = $attendance->check_out->lessThan($plannedEnd) ? $attendance->check_out : $plannedEnd;

        if ($actualEnd->lessThanOrEqualTo($actualStart)) {
            throw new OvertimeValidationException(
                'Data presensi pegawai tidak beririsan dengan jam lembur yang direncanakan pada tanggal ini.',
                'no_attendance_overlap',
            );
        }

        return DB::transaction(function () use ($overtime, $attendance, $actualStart, $actualEnd) {
            $overtime->update([
                'attendance_id' => $attendance->id,
                'actual_start_time' => $actualStart,
                'actual_end_time' => $actualEnd,
                'duration_minutes' => $actualStart->diffInMinutes($actualEnd),
                'status' => 'selesai',
            ]);

            ActivityLog::record('overtime_request.realize', $overtime, [
                'attendance_id' => $attendance->id,
                'duration_minutes' => $overtime->duration_minutes,
            ]);

            return $overtime;
        });
    }

    /**
     * @throws OvertimeValidationException
     */
    public function cancel(OvertimeRequest $overtime): OvertimeRequest
    {
        if ($overtime->status !== 'diajukan') {
            throw new OvertimeValidationException(
                'Hanya lembur berstatus "diajukan" (belum diproses atasan) yang dapat dibatalkan.',
                'invalid_status_for_cancel',
            );
        }

        $overtime->update(['status' => 'dibatalkan']);

        ActivityLog::record('overtime_request.cancel', $overtime);

        return $overtime;
    }

    public function canDecide(User $user, Employee $employee): bool
    {
        if ($user->hasGlobalRole(['super_admin', 'admin_kepegawaian'])) {
            return true;
        }

        return $user->hasRole(['pimpinan'], $employee->work_unit_id);
    }

    public function canView(User $user, Employee $employee): bool
    {
        if ($this->canDecide($user, $employee)) {
            return true;
        }

        return $user->employee_id !== null && $user->employee_id === $employee->id;
    }

    /**
     * @throws OvertimeValidationException
     */
    private function decide(OvertimeRequest $overtime, User $actor, string $status, ?string $note): OvertimeRequest
    {
        if ($overtime->status !== 'diajukan') {
            throw new OvertimeValidationException('Pengajuan lembur ini sudah diproses sebelumnya.', 'already_decided');
        }

        $approverEmployee = $actor->employee;

        if (! $approverEmployee) {
            throw new OvertimeValidationException(
                'Akun Anda tidak tertaut ke data pegawai, tidak dapat mencatat persetujuan.',
                'approver_not_linked_to_employee',
            );
        }

        return DB::transaction(function () use ($overtime, $status, $note, $approverEmployee) {
            $overtime->update([
                'status' => $status,
                'approved_by' => $approverEmployee->id,
                'approved_at' => now(),
                'note' => $note,
            ]);

            ActivityLog::record('overtime_request.'.$status, $overtime, ['note' => $note]);

            $overtime->refresh()->load(['employee', 'approver']);

            $this->notifications->overtimeRequestDecided($overtime);

            return $overtime;
        });
    }
}
