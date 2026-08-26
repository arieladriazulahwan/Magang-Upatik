<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Memetakan tabel `request` (nama di SQL). Diberi nama kelas LeaveRequest,
 * BUKAN Request, agar tidak bentrok dengan Illuminate\Http\Request.
 * Menaungi 4 kategori pengajuan: cuti, izin, sakit, dinas_luar (PRD 5.7-5.8).
 */
class LeaveRequest extends Model
{
    use SoftDeletes;

    protected $table = 'request';

    protected $fillable = [
        'number', 'employee_id', 'leave_type_id', 'start_date', 'end_date',
        'total_days', 'start_time', 'end_time', 'reason', 'address_during_leave',
        'child_number', 'doctor_letter_type', 'doctor_letter_number',
        'doctor_facility_name', 'sub_category', 'status',
        'gcal_event_id', 'gcal_status', 'gcal_synced_at',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'gcal_synced_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }

    public function approvalLogs(): HasMany
    {
        return $this->hasMany(ApprovalLog::class)->orderBy('sequence');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class, 'attachable_id')
            ->where('attachable_type', self::class);
    }
}
