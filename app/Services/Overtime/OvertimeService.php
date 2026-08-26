<?php

namespace App\Services\Overtime;

use App\Models\ActivityLog;
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
        $overtime = OvertimeRequest::create([
            'employee_id' => $employee->id,
            'date' => $data['date'],
            'planned_start_time' => $data['planned_start_time'],
            'planned_end_time' => $data['planned_end_time'],
            'work_description' => $data['work_description'],
            'status' => 'diajukan',
        ]);

        ActivityLog::record('overtime_request.create', $overtime, $data);

        $this->notifications->notifyApprovers(
            'atasan_langsung',
            $employee,
            'Pengajuan Lembur Baru',
            "{$employee->name} mengajukan lembur tanggal {$data['date']}, menunggu persetujuan Anda.",
            "/overtime-requests/{$overtime->id}",
        );

        return $overtime;
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
        if ($user->hasRole(['super_admin', 'admin_kepegawaian'])) {
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

            $overtime->loadMissing('employee');

            $this->notifications->notify(
                $overtime->employee,
                $status === 'disetujui' ? 'Pengajuan Lembur Disetujui' : 'Pengajuan Lembur Ditolak',
                $status === 'disetujui'
                    ? "Pengajuan lembur Anda tanggal {$overtime->date->toDateString()} disetujui."
                    : "Pengajuan lembur Anda ditolak. Alasan: {$note}",
                $status,
                "/overtime-requests/{$overtime->id}",
            );

            return $overtime;
        });
    }
}