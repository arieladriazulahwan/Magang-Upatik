<?php

namespace App\Services\Leave;

use App\Models\ApprovalFlow;
use App\Models\ApprovalLog;
use App\Models\Attachment;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use App\Models\User;
use App\Services\WorkingDayCalculator;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;

class LeaveRequestService
{
    public function __construct(private readonly WorkingDayCalculator $workingDays) {}

    public function submit(Employee $employee, array $data, ?UploadedFile $attachment): LeaveRequest
    {
        $leaveType = LeaveType::findOrFail($data['leave_type_id']);

        if (! $leaveType->is_active) {
            throw new LeaveValidationException('Jenis pengajuan ini sedang tidak aktif.', 'leave_type_inactive');
        }

        if (! $leaveType->appliesTo($employee->employment_status)) {
            throw new LeaveValidationException(
                "Jenis pengajuan '{$leaveType->name}' tidak berlaku untuk status kepegawaian Anda.",
                'leave_type_not_applicable',
            );
        }

        if ($leaveType->min_service_months !== null && $employee->serviceMonths() < $leaveType->min_service_months) {
            throw new LeaveValidationException(
                "Jenis pengajuan '{$leaveType->name}' memerlukan minimal masa kerja {$leaveType->min_service_months} bulan.",
                'insufficient_service_months',
            );
        }

        $totalDays = $this->workingDays->countBetween($data['start_date'], $data['end_date']);

        if ($totalDays < 1) {
            throw new LeaveValidationException(
                'Rentang tanggal yang dipilih tidak mengandung hari kerja.',
                'no_working_days',
            );
        }

        if ($leaveType->max_days !== null && $totalDays > $leaveType->max_days) {
            throw new LeaveValidationException(
                "Durasi maksimal untuk '{$leaveType->name}' adalah {$leaveType->max_days} hari kerja.",
                'exceeds_max_days',
            );
        }

        if ($leaveType->requires_doctor_letter
            && (empty($data['doctor_letter_type']) || empty($data['doctor_letter_number']))) {
            throw new LeaveValidationException(
                "Jenis pengajuan '{$leaveType->name}' wajib melampirkan info surat dokter (jenis & nomor surat).",
                'doctor_letter_required',
            );
        }

        if ($leaveType->requires_attachment && ! $attachment) {
            throw new LeaveValidationException(
                "Jenis pengajuan '{$leaveType->name}' wajib melampirkan berkas pendukung.",
                'attachment_required',
            );
        }

        if ($leaveType->code === 'cuti_melahirkan' && empty($data['child_number'])) {
            throw new LeaveValidationException(
                'Cuti Melahirkan wajib mengisi anak ke berapa (child_number).',
                'child_number_required',
            );
        }

        if ($leaveType->code === 'cuti_alasan_penting' && empty($data['sub_category'])) {
            throw new LeaveValidationException(
                'Cuti Alasan Penting wajib mengisi sub_category (menikah/keluarga_sakit/keluarga_meninggal/bencana).',
                'sub_category_required',
            );
        }

        $this->assertSufficientBalance($employee, $leaveType, $data['start_date'], $totalDays);

        return DB::transaction(function () use ($employee, $leaveType, $data, $totalDays, $attachment) {
            $leaveRequest = LeaveRequest::create([
                'employee_id' => $employee->id,
                'leave_type_id' => $leaveType->id,
                'start_date' => $data['start_date'],
                'end_date' => $data['end_date'],
                'total_days' => $totalDays,
                'start_time' => $data['start_time'] ?? null,
                'end_time' => $data['end_time'] ?? null,
                'reason' => $data['reason'],
                'address_during_leave' => $data['address_during_leave'] ?? null,
                'child_number' => $data['child_number'] ?? null,
                'doctor_letter_type' => $data['doctor_letter_type'] ?? null,
                'doctor_letter_number' => $data['doctor_letter_number'] ?? null,
                'doctor_facility_name' => $data['doctor_facility_name'] ?? null,
                'sub_category' => $data['sub_category'] ?? null,
                'status' => 'diajukan',
            ]);

            $this->createApprovalLogSteps($leaveRequest, $leaveType);

            if ($attachment) {
                $path = $attachment->store('leave-attachments/'.$employee->id, 'local');

                Attachment::create([
                    'attachable_type' => LeaveRequest::class,
                    'attachable_id' => $leaveRequest->id,
                    'file_name' => $attachment->getClientOriginalName(),
                    'path' => $path,
                    'mime_type' => $attachment->getMimeType(),
                    'size_bytes' => $attachment->getSize(),
                ]);
            }

            return $leaveRequest;
        });
    }

    public function approve(LeaveRequest $leaveRequest, User $actor, ?string $note): LeaveRequest
    {
        return $this->decide($leaveRequest, $actor, 'disetujui', $note);
    }

    public function reject(LeaveRequest $leaveRequest, User $actor, string $note): LeaveRequest
    {
        return $this->decide($leaveRequest, $actor, 'ditolak', $note);
    }

    public function currentPendingStep(LeaveRequest $leaveRequest): ?ApprovalLog
    {
        return ApprovalLog::where('request_id', $leaveRequest->id)
            ->where('status', 'menunggu')
            ->orderBy('sequence')
            ->first();
    }

    public function canDecide(string $approverRole, User $user, Employee $requestingEmployee): bool
    {
        if ($user->hasRole(['super_admin'])) {
            return true;
        }

        return match ($approverRole) {
            'atasan_langsung' => $user->hasRole(['pimpinan'], $requestingEmployee->work_unit_id),
            'admin_kepegawaian' => $user->hasRole(['admin_kepegawaian']),
            default => false,
        };
    }

    public function cancel(LeaveRequest $leaveRequest): LeaveRequest
    {
        if (! in_array($leaveRequest->status, ['diajukan', 'diproses'], true)) {
            throw new LeaveValidationException(
                'Hanya pengajuan yang belum final (diajukan/diproses) yang dapat dibatalkan. Pengajuan yang sudah disetujui tidak didukung dibatalkan di sini.',
                'invalid_status_for_cancel',
            );
        }

        return DB::transaction(function () use ($leaveRequest) {
            ApprovalLog::where('request_id', $leaveRequest->id)
                ->where('status', 'menunggu')
                ->update(['status' => 'dilewati']);

            $leaveRequest->update(['status' => 'dibatalkan']);

            return $leaveRequest;
        });
    }

    private function decide(LeaveRequest $leaveRequest, User $actor, string $decision, ?string $note): LeaveRequest
    {
        $step = $this->currentPendingStep($leaveRequest);

        if (! $step) {
            throw new LeaveValidationException('Pengajuan ini sudah selesai diproses.', 'already_finalized');
        }

        $approverEmployee = $actor->employee;

        if (! $approverEmployee) {
            throw new LeaveValidationException(
                'Akun Anda tidak tertaut ke data pegawai, tidak dapat mencatat persetujuan.',
                'approver_not_linked_to_employee',
            );
        }

        return DB::transaction(function () use ($leaveRequest, $step, $decision, $note, $approverEmployee) {
            $step->update([
                'status' => $decision,
                'approver_id' => $approverEmployee->id,
                'note' => $note,
                'recorded_at' => now(),
            ]);

            if ($decision === 'ditolak') {
                ApprovalLog::where('request_id', $leaveRequest->id)
                    ->where('status', 'menunggu')
                    ->update(['status' => 'dilewati']);

                $leaveRequest->update(['status' => 'ditolak']);

                return $leaveRequest;
            }

            $nextStep = ApprovalLog::where('request_id', $leaveRequest->id)
                ->where('status', 'menunggu')
                ->orderBy('sequence')
                ->first();

            if ($nextStep) {
                $leaveRequest->update(['status' => 'diproses']);

                return $leaveRequest;
            }

            $leaveRequest->update(['status' => 'disetujui']);
            $this->consumeBalanceIfApplicable($leaveRequest);

            return $leaveRequest;
        });
    }

    private function createApprovalLogSteps(LeaveRequest $leaveRequest, LeaveType $leaveType): void
    {
        $steps = ApprovalFlow::where('leave_type_id', $leaveType->id)->orderBy('sequence')->get();

        if ($steps->isEmpty()) {
            $steps = ApprovalFlow::whereNull('leave_type_id')->orderBy('sequence')->get();
        }

        foreach ($steps as $step) {
            ApprovalLog::create([
                'request_id' => $leaveRequest->id,
                'sequence' => $step->sequence,
                'approver_role' => $step->approver_role,
                'status' => 'menunggu',
            ]);
        }
    }

    private function assertSufficientBalance(Employee $employee, LeaveType $leaveType, string $startDate, int $totalDays): void
    {
        if ($leaveType->category !== 'cuti') {
            return;
        }

        $year = (int) substr($startDate, 0, 4);

        $balance = LeaveBalance::where('employee_id', $employee->id)
            ->where('leave_type_id', $leaveType->id)
            ->where('year', $year)
            ->first();

        if (! $balance) {
            return;
        }

        if ($balance->remaining < $totalDays) {
            throw new LeaveValidationException(
                "Saldo '{$leaveType->name}' tahun {$year} tidak cukup (sisa {$balance->remaining} hari, diajukan {$totalDays} hari).",
                'insufficient_leave_balance',
            );
        }
    }

    private function consumeBalanceIfApplicable(LeaveRequest $leaveRequest): void
    {
        $leaveType = $leaveRequest->leaveType ?? LeaveType::find($leaveRequest->leave_type_id);

        if ($leaveType->category !== 'cuti') {
            return;
        }

        $year = (int) $leaveRequest->start_date->year;

        $balance = LeaveBalance::where('employee_id', $leaveRequest->employee_id)
            ->where('leave_type_id', $leaveType->id)
            ->where('year', $year)
            ->first();

        if (! $balance) {
            return;
        }

        $balance->increment('used', $leaveRequest->total_days);
    }
}