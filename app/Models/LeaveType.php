<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveType extends Model
{
    protected $table = 'leave_type';

    protected $fillable = [
        'code', 'name', 'category', 'for_pns', 'for_pppk', 'for_non_asn',
        'min_service_months', 'max_days', 'max_accumulated_days',
        'expires_after_years', 'reduces_annual_leave', 'requires_attachment',
        'requires_doctor_letter', 'is_paid', 'counts_as_service',
        'description', 'is_active',
    ];

    protected $casts = [
        'for_pns' => 'boolean',
        'for_pppk' => 'boolean',
        'for_non_asn' => 'boolean',
        'reduces_annual_leave' => 'boolean',
        'requires_attachment' => 'boolean',
        'requires_doctor_letter' => 'boolean',
        'is_paid' => 'boolean',
        'counts_as_service' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function requests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function approvalFlows(): HasMany
    {
        return $this->hasMany(ApprovalFlow::class)->orderBy('sequence');
    }

    public function balances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }

    /** Jenis ini berlaku untuk status kepegawaian tertentu? (PRD 5.8) */
    public function appliesTo(string $employmentStatus): bool
    {
        return match ($employmentStatus) {
            'pns' => $this->for_pns,
            'pppk' => $this->for_pppk,
            'non_asn' => $this->for_non_asn,
            default => false,
        };
    }
}
