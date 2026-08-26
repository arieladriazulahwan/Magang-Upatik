<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarSync extends Model
{
    protected $table = 'calendar_sync';

    protected $fillable = [
        'source_type', 'source_id', 'calendar_config_id', 'google_calendar_id',
        'gcal_event_id', 'action', 'status', 'attempts', 'error_message', 'processed_at',
    ];

    protected $casts = ['processed_at' => 'datetime'];

    public function calendarConfig(): BelongsTo
    {
        return $this->belongsTo(CalendarConfig::class);
    }
}
