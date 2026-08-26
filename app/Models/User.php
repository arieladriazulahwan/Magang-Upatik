<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    protected $table = 'users';

    protected $fillable = [
        'employee_id', 'siga8_user_id', 'username', 'full_name', 'email',
        'level', 'siga8_faculty_id', 'faculty_code', 'faculty_name',
        'study_programs_code', 'password', 'is_active', 'last_login_at',
    ];

    protected $hidden = ['password'];

    protected $casts = [
        'is_active' => 'boolean',
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function roleUsers(): HasMany
    {
        return $this->hasMany(RoleUser::class);
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'role_user')
            ->withPivot(['id', 'work_unit_id', 'source', 'siga8_role_id']);
    }

    /**
     * Cek apakah user punya salah satu peran dalam $roleNames.
     * Bila $workUnitId diberikan, cek juga cakupan unit (role global
     * [work_unit_id NULL] selalu lolos; role scoped harus unit itu sendiri
     * atau salah satu leluhurnya — lihat RoleUser::coversUnit()).
     */
    public function hasRole(array|string $roleNames, ?int $workUnitId = null): bool
    {
        $roleNames = (array) $roleNames;

        return $this->roleUsers()
            ->whereHas('role', fn ($q) => $q->whereIn('name', $roleNames))
            ->get()
            ->contains(fn (RoleUser $ru) => $workUnitId === null || $ru->coversUnit($workUnitId));
    }

    /** Daftar unit_id yang menjadi cakupan peran tertentu user ini (null = global/semua). */
    public function unitScopeFor(string $roleName): ?array
    {
        $rows = $this->roleUsers()
            ->whereHas('role', fn ($q) => $q->where('name', $roleName))
            ->get();

        if ($rows->contains(fn (RoleUser $r) => $r->work_unit_id === null)) {
            return null; // global, tidak dibatasi unit manapun
        }

        return $rows->pluck('work_unit_id')->filter()->unique()->values()->all();
    }
}
