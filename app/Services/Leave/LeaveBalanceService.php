<?php

namespace App\Services\Leave;

use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use Illuminate\Support\Facades\DB;

class LeaveBalanceService
{
    public function initializeYear(int $year, ?int $employeeId = null, bool $dryRun = false): array
    {
        $employees = Employee::query()
            ->where('is_active', true)
            ->when($employeeId, fn ($query) => $query->where('id', $employeeId))
            ->orderBy('id')
            ->get();

        $leaveTypes = LeaveType::query()
            ->where('is_active', true)
            ->where('category', 'cuti')
            ->get()
            ->filter(fn (LeaveType $leaveType) => $this->isBalanceManaged($leaveType));

        $result = [
            'employees' => $employees->count(),
            'leave_types' => $leaveTypes->count(),
            'created' => 0,
            'updated' => 0,
            'skipped_not_applicable' => 0,
        ];

        foreach ($employees as $employee) {
            foreach ($leaveTypes as $leaveType) {
                if (! $leaveType->appliesTo($employee->employment_status)) {
                    $result['skipped_not_applicable'] += 1;
                    continue;
                }

                $attributes = [
                    'employee_id' => $employee->id,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                ];

                $values = [
                    'entitlement' => $this->entitlementFor($leaveType),
                    'previous_year_balance' => $this->previousYearBalance($employee, $leaveType, $year),
                ];

                $existing = LeaveBalance::where($attributes)->first();

                if ($dryRun) {
                    $result[$existing ? 'updated' : 'created'] += 1;
                    continue;
                }

                LeaveBalance::updateOrCreate($attributes, $values);
                $result[$existing ? 'updated' : 'created'] += 1;
            }
        }

        return $result;
    }

    public function assertAvailable(Employee $employee, LeaveType $leaveType, int $year, int $requestedDays): void
    {
        if (! $this->isBalanceManaged($leaveType)) {
            return;
        }

        $balance = $this->ensureBalance($employee, $leaveType, $year);
        $reservedDays = $this->reservedDays($employee->id, $leaveType->id, $year);
        $available = $balance->remaining - $reservedDays;

        if ($available < $requestedDays) {
            throw new LeaveValidationException(
                "Saldo '{$leaveType->name}' tahun {$year} tidak cukup (tersedia {$available} hari, diajukan {$requestedDays} hari).",
                'insufficient_leave_balance',
            );
        }
    }

    public function consume(LeaveRequest $leaveRequest): void
    {
        $leaveType = $leaveRequest->leaveType ?? LeaveType::find($leaveRequest->leave_type_id);

        if (! $leaveType || ! $this->isBalanceManaged($leaveType)) {
            return;
        }

        $employee = $leaveRequest->employee ?? Employee::find($leaveRequest->employee_id);

        if (! $employee) {
            return;
        }

        $year = (int) $leaveRequest->start_date->year;

        DB::transaction(function () use ($employee, $leaveType, $leaveRequest, $year) {
            $balance = $this->ensureBalance($employee, $leaveType, $year, true);

            if ($balance->remaining < $leaveRequest->total_days) {
                throw new LeaveValidationException(
                    "Saldo '{$leaveType->name}' tahun {$year} tidak cukup (sisa {$balance->remaining} hari, diajukan {$leaveRequest->total_days} hari).",
                    'insufficient_leave_balance',
                );
            }

            $balance->increment('used', $leaveRequest->total_days);
        });
    }

    public function refund(LeaveRequest $leaveRequest): void
    {
        $leaveType = $leaveRequest->leaveType ?? LeaveType::find($leaveRequest->leave_type_id);

        if (! $leaveType || ! $this->isBalanceManaged($leaveType)) {
            return;
        }

        $year = (int) $leaveRequest->start_date->year;

        $balance = LeaveBalance::where('employee_id', $leaveRequest->employee_id)
            ->where('leave_type_id', $leaveType->id)
            ->where('year', $year)
            ->lockForUpdate()
            ->first();

        if (! $balance) {
            return;
        }

        $balance->update([
            'used' => max(0, $balance->used - $leaveRequest->total_days),
        ]);
    }

    public function isBalanceManaged(LeaveType $leaveType): bool
    {
        if ($leaveType->category !== 'cuti') {
            return false;
        }

        if ($leaveType->code === 'cuti_bersama') {
            return false;
        }

        return $leaveType->max_days !== null || $leaveType->code === 'cuti_tahunan';
    }

    private function ensureBalance(Employee $employee, LeaveType $leaveType, int $year, bool $lock = false): LeaveBalance
    {
        $query = LeaveBalance::where('employee_id', $employee->id)
            ->where('leave_type_id', $leaveType->id)
            ->where('year', $year);

        if ($lock) {
            $query->lockForUpdate();
        }

        $balance = $query->first();

        if ($balance) {
            return $balance;
        }

        $balance = LeaveBalance::create([
            'employee_id' => $employee->id,
            'leave_type_id' => $leaveType->id,
            'year' => $year,
            'entitlement' => $this->entitlementFor($leaveType),
            'previous_year_balance' => $this->previousYearBalance($employee, $leaveType, $year),
            'used' => 0,
        ]);

        return $balance->refresh();
    }

    private function entitlementFor(LeaveType $leaveType): int
    {
        if ($leaveType->code === 'cuti_tahunan') {
            return (int) ($leaveType->max_days ?: 12);
        }

        return (int) ($leaveType->max_days ?: 0);
    }

    private function previousYearBalance(Employee $employee, LeaveType $leaveType, int $year): int
    {
        if ($leaveType->code !== 'cuti_tahunan') {
            return 0;
        }

        $previous = LeaveBalance::where('employee_id', $employee->id)
            ->where('leave_type_id', $leaveType->id)
            ->where('year', $year - 1)
            ->first();

        if (! $previous) {
            return 0;
        }

        $entitlement = $this->entitlementFor($leaveType);
        $maxAccumulated = (int) ($leaveType->max_accumulated_days ?: $entitlement);
        $carryCap = max(0, $maxAccumulated - $entitlement);

        return min((int) $previous->remaining, $carryCap);
    }

    private function reservedDays(int $employeeId, int $leaveTypeId, int $year): int
    {
        return (int) LeaveRequest::query()
            ->where('employee_id', $employeeId)
            ->where('leave_type_id', $leaveTypeId)
            ->whereIn('status', ['diajukan', 'diproses'])
            ->whereYear('start_date', $year)
            ->sum('total_days');
    }
}
