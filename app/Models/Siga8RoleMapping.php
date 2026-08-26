<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Siga8RoleMapping extends Model
{
    protected $table = 'siga8_role_mapping';

    protected $fillable = [
        'siga8_role_id', 'siga8_role_name', 'role_id', 'work_unit_id',
        'is_active', 'description',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function workUnit(): BelongsTo
    {
        return $this->belongsTo(WorkUnit::class);
    }
}
