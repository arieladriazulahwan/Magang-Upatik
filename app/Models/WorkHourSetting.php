<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkHourSetting extends Model
{
    protected $table = 'work_hour_setting';

    protected $fillable = [
        'work_unit_id', 'category', 'min_minutes', 'standard_check_in',
        'late_threshold', 'standard_check_out', 'work_days', 'is_active',
    ];

    protected $casts = [
        'work_days' => 'array', // SMALLINT[] Postgres <-> array PHP
        'is_active' => 'boolean',
    ];

    public function workUnit(): BelongsTo
    {
        return $this->belongsTo(WorkUnit::class);
    }

    /**
     * Resolusi aturan jam kerja: cari override spesifik unit dulu,
     * fallback ke aturan global (work_unit_id NULL). Lihat PRD 5.3.
     */
    public static function resolveFor(int $workUnitId, string $category): ?self
    {
        return self::where('category', $category)
            ->where('is_active', true)
            ->where(fn ($q) => $q->where('work_unit_id', $workUnitId)->orWhereNull('work_unit_id'))
            ->orderByRaw('work_unit_id IS NULL') // baris unit spesifik diprioritaskan (false < true)
            ->first();
    }
}
