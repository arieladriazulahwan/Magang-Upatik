<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class WorkUnit extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'work_unit';

    protected $fillable = [
        'parent_id', 'code', 'name', 'type', 'attendance_mode',
        'wfh_allowed', 'max_wfh_per_month', 'is_active',
    ];

    protected $casts = [
        'wfh_allowed' => 'boolean',
        'is_active' => 'boolean',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    public function locations(): HasMany
    {
        return $this->hasMany(WorkLocation::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function shifts(): HasMany
    {
        return $this->hasMany(Shift::class);
    }

    /**
     * Mode presensi efektif (reguler/shift), menelusuri pohon ke atas via
     * fungsi Postgres effective_attendance_mode(). Lihat PRD 4.3 & 5.2.
     */
    public function effectiveAttendanceMode(): string
    {
        return DB::selectOne(
            'SELECT effective_attendance_mode(?) AS mode',
            [$this->id]
        )->mode;
    }

    /**
     * Semua id leluhur + diri sendiri, dari view v_work_unit.
     * Dipakai untuk cek scope role_user: "apakah unit X berada di bawah
     * unit Y yang dipimpin user ini?"
     */
    public function ancestorIds(): array
    {
        $row = DB::table('v_work_unit')->where('id', $this->id)->first();

        return $row?->ancestor_ids ?? [$this->id];
    }
}
