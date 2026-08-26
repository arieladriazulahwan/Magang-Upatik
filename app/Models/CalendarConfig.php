<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarConfig extends Model
{
    protected $table = 'calendar_config';

    protected $fillable = [
        'work_unit_id', 'target', 'google_calendar_id', 'name', 'timezone', 'is_active',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function workUnit(): BelongsTo
    {
        return $this->belongsTo(WorkUnit::class);
    }
}
