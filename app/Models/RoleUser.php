<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RoleUser extends Model
{
    protected $table = 'role_user';

    public $timestamps = false;

    protected $fillable = ['user_id', 'role_id', 'work_unit_id', 'source', 'siga8_role_id'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function workUnit(): BelongsTo
    {
        return $this->belongsTo(WorkUnit::class);
    }

    /**
     * Peran ini "menutupi" unit $unitId bila: peran global (work_unit_id NULL),
     * ATAU work_unit_id peran ini adalah $unitId itu sendiri ATAU salah satu
     * LELUHURNYA (mis. Dekan dg scope=Fakultas menutupi semua Jurusan di
     * bawahnya — PRD 3: "cakupannya dibatasi pada unit yang dipimpin").
     */
    public function coversUnit(int $unitId): bool
    {
        if ($this->work_unit_id === null) {
            return true;
        }

        if ($this->work_unit_id === $unitId) {
            return true;
        }

        $target = WorkUnit::find($unitId);

        return $target !== null && in_array($this->work_unit_id, $target->ancestorIds(), true);
    }
}
