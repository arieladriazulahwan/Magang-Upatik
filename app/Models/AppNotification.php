<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AppNotification extends Model
{
    protected $table = 'notification';

    const UPDATED_AT = null;

    protected $fillable = [
        'employee_id', 'title', 'message', 'type', 'target_url', 'read_at',
    ];

    protected $casts = ['read_at' => 'datetime'];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
