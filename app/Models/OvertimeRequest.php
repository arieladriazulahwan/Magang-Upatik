<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OvertimeRequest extends Model
{
    protected $table = 'overtime_request';

    protected $fillable = [
        'employee_id', 'attendance_id', 'date', 'planned_start_time',
        'planned_end_time', 'work_description', 'actual_start_time',
        'actual_end_time', 'duration_minutes', 'status', 'approved_by',
        'approved_at', 'note',
    ];

    protected $casts = [
        'date' => 'date',
        'actual_start_time' => 'datetime',
        'actual_end_time' => 'datetime',
        'approved_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'approved_by');
    }
}
