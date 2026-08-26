<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    protected $table = 'holiday';

    public $timestamps = false;

    protected $fillable = [
        'date', 'name', 'type', 'legal_basis',
        'gcal_event_id', 'gcal_status', 'gcal_synced_at',
    ];

    protected $casts = [
        'date' => 'date',
        'gcal_synced_at' => 'datetime',
    ];
}
