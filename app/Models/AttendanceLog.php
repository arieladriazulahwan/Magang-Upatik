<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceLog extends Model
{
    protected $table = 'attendance_log';

    const UPDATED_AT = null; // tabel ini hanya punya created_at

    protected $fillable = [
        'attendance_id', 'employee_id', 'type', 'recorded_at',
        'latitude', 'longitude', 'distance_meters', 'within_radius',
        'proof_photo', 'similarity_score', 'face_matched', 'liveness_passed',
        'device_info', 'ip_address',
    ];

    protected $casts = [
        'recorded_at' => 'datetime',
        'latitude' => 'decimal:7',
        'longitude' => 'decimal:7',
        'within_radius' => 'boolean',
        'face_matched' => 'boolean',
        'liveness_passed' => 'boolean',
        'similarity_score' => 'float',
    ];

    public function attendance(): BelongsTo
    {
        return $this->belongsTo(Attendance::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
