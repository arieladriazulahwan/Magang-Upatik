<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Facades\DB;

class Employee extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'employee';

    protected $fillable = [
        'nip', 'nik', 'name', 'email', 'phone', 'gender',
        'employment_status', 'employee_type', 'work_unit_id',
        'structural_position_id', 'tmt', 'grade', 'rank',
        'profile_photo', 'is_active',
    ];

    protected $casts = [
        'tmt' => 'date',
        'is_active' => 'boolean',
    ];

    public function workUnit(): BelongsTo
    {
        return $this->belongsTo(WorkUnit::class);
    }

    public function structuralPosition(): BelongsTo
    {
        return $this->belongsTo(StructuralPosition::class);
    }

    public function user(): HasOne
    {
        return $this->hasOne(User::class);
    }

    public function faceData(): HasMany
    {
        return $this->hasMany(FaceData::class);
    }

    public function activeFaceData(): HasMany
    {
        return $this->faceData()->where('is_active', true);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function shiftSchedules(): HasMany
    {
        return $this->hasMany(ShiftSchedule::class);
    }

    public function wfhRequests(): HasMany
    {
        return $this->hasMany(WfhRequest::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function overtimeRequests(): HasMany
    {
        return $this->hasMany(OvertimeRequest::class);
    }

    /**
     * Kategori jam kerja (dosen / dosen_tugas_tambahan / tenaga_kependidikan),
     * diturunkan via fungsi Postgres agar SELALU konsisten dengan aturan
     * PRD 5.3 (bukan kolom statis yang bisa basi).
     */
    public function workHourCategory(): string
    {
        return DB::selectOne(
            'SELECT employee_work_hour_category(?) AS category',
            [$this->id]
        )->category;
    }

    /** Masa kerja (bulan penuh) dihitung dari tmt — dasar syarat cuti (PRD 5.8). */
    public function serviceMonths(): int
    {
        return (int) $this->tmt->diffInMonths(now());
    }
}
