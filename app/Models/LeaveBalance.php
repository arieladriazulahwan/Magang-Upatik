<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveBalance extends Model
{
    protected $table = 'leave_balance';

    protected $fillable = [
        'employee_id', 'leave_type_id', 'year',
        'entitlement', 'previous_year_balance', 'used',
    ];

    // 'remaining' adalah kolom GENERATED ALWAYS di Postgres: JANGAN masukkan
    // ke $fillable / coba di-set manual, DB yang menghitung otomatis.
    protected $appends = [];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }
}
