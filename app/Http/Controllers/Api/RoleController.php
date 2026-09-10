<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\Role;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    private const SYSTEM_ROLES = [
        'super_admin',
        'admin_kepegawaian',
        'admin_unit',
        'pimpinan',
        'employee',
    ];

    public function index(): JsonResponse
    {
        $roles = Role::with('permissions:id,name')->orderBy('name')->get();

        return response()->json([
            'data' => $roles->map(fn (Role $role) => $this->serialize($role)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:80', 'regex:/^[a-z0-9_]+$/', Rule::unique('roles', 'name')],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'max:120'],
        ]);

        $role = Role::create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
        ]);

        $this->syncPermissions($role, $data['permissions'] ?? []);

        ActivityLog::record('role.create', $role, $data);

        return response()->json(['data' => $this->serialize($role->load('permissions:id,name'))], 201);
    }

    public function update(Request $request, Role $role): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:80', 'regex:/^[a-z0-9_]+$/', Rule::unique('roles', 'name')->ignore($role->id)],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $updates = collect($data)->only(['name', 'description'])->all();

        if ($this->isSystemRole($role)) {
            unset($updates['name']);
        }

        if (! empty($updates)) {
            $role->update($updates);
        }

        if (array_key_exists('permissions', $data)) {
            $this->syncPermissions($role, $data['permissions']);
        }

        ActivityLog::record('role.update', $role, $data);

        return response()->json(['data' => $this->serialize($role->load('permissions:id,name'))]);
    }

    public function destroy(Request $request, Role $role): JsonResponse
    {
        if ($this->isSystemRole($role)) {
            abort(422, 'Role sistem tidak bisa dihapus.');
        }

        ActivityLog::record('role.delete', $role);
        $role->delete();

        return response()->json(['message' => 'Role berhasil dihapus.']);
    }

    private function syncPermissions(Role $role, array $permissionNames): void
    {
        $ids = collect($permissionNames)
            ->filter(fn ($name) => is_string($name) && trim($name) !== '')
            ->map(fn ($name) => trim($name))
            ->unique()
            ->map(fn ($name) => Permission::firstOrCreate(['name' => $name])->id)
            ->all();

        $role->permissions()->sync($ids);
    }

    private function serialize(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'description' => $role->description,
            'is_system' => $this->isSystemRole($role),
            'is_active' => true,
            'permissions' => $role->permissions->pluck('name')->values()->all(),
        ];
    }

    private function isSystemRole(Role $role): bool
    {
        return in_array($role->name, self::SYSTEM_ROLES, true);
    }
}
