<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Permission;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserRoleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'q' => ['sometimes', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = User::query()
            ->with(['employee:id,name,nip,work_unit_id', 'employee.workUnit:id,name,code', 'roleUsers.role:id,name', 'roleUsers.role.permissions:id,name', 'roleUsers.workUnit:id,name,code'])
            ->orderBy('username');

        if (! empty($filters['q'])) {
            $keyword = '%'.$filters['q'].'%';
            $query->where(function ($q) use ($keyword) {
                $q->where('username', 'ilike', $keyword)
                    ->orWhere('full_name', 'ilike', $keyword)
                    ->orWhereHas('employee', fn ($employeeQuery) => $employeeQuery
                        ->where('name', 'ilike', $keyword)
                        ->orWhere('nip', 'ilike', $keyword));
            });
        }

        $users = $query->paginate($filters['per_page'] ?? 100);

        return response()->json([
            'data' => $users->getCollection()->map(fn (User $user) => $this->serialize($user)),
            'meta' => [
                'current_page' => $users->currentPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'last_page' => $users->lastPage(),
            ],
        ]);
    }

    public function sync(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'roles' => ['sometimes', 'array'],
            'roles.*.role_id' => ['required_with:roles', 'integer', Rule::exists('roles', 'id')],
            'roles.*.work_unit_id' => ['nullable', 'integer', Rule::exists('work_unit', 'id')],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'max:120'],
            'work_unit_id' => ['nullable', 'integer', Rule::exists('work_unit', 'id')],
        ]);

        if (! array_key_exists('roles', $data) && ! array_key_exists('permissions', $data)) {
            abort(422, 'Pilih minimal satu akses terlebih dahulu.');
        }

        RoleUser::where('user_id', $user->id)
            ->where('source', 'manual')
            ->delete();

        if (array_key_exists('roles', $data)) {
            foreach ($data['roles'] as $item) {
                $role = Role::find($item['role_id']);

                RoleUser::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'role_id' => $item['role_id'],
                        'work_unit_id' => $this->roleUsesScopedUnit($role?->name) ? ($item['work_unit_id'] ?? null) : null,
                    ],
                    [
                        'source' => 'manual',
                        'siga8_role_id' => null,
                    ],
                );
            }
        }

        if (array_key_exists('permissions', $data)) {
            $this->syncCustomPermissions($user, $data['permissions'], $data['work_unit_id'] ?? null);
        }

        ActivityLog::record('user_role.sync', $user, $data);

        $user->load(['employee:id,name,nip,work_unit_id', 'employee.workUnit:id,name,code', 'roleUsers.role:id,name', 'roleUsers.role.permissions:id,name', 'roleUsers.workUnit:id,name,code']);

        return response()->json(['data' => $this->serialize($user)]);
    }

    private function syncCustomPermissions(User $user, array $permissionNames, ?int $workUnitId): void
    {
        $names = collect($permissionNames)
            ->map(fn ($name) => trim((string) $name))
            ->filter()
            ->unique()
            ->values();

        if ($names->isEmpty()) {
            abort(422, 'Pilih minimal satu akses terlebih dahulu.');
        }

        $role = Role::updateOrCreate(
            ['name' => 'custom_user_'.$user->id],
            ['description' => 'Akses khusus akun '.$user->username],
        );

        $permissionIds = $names
            ->map(fn ($name) => Permission::firstOrCreate(['name' => $name])->id)
            ->values()
            ->all();

        $role->permissions()->sync($permissionIds);

        RoleUser::updateOrCreate(
            [
                'user_id' => $user->id,
                'role_id' => $role->id,
                'work_unit_id' => $workUnitId,
            ],
            [
                'source' => 'manual',
                'siga8_role_id' => null,
            ],
        );
    }

    private function roleUsesScopedUnit(?string $roleName): bool
    {
        return in_array($roleName, ['pimpinan', 'admin_unit'], true);
    }

    private function serialize(User $user): array
    {
        return [
            'id' => $user->id,
            'username' => $user->username,
            'full_name' => $user->full_name ?: $user->employee?->name,
            'is_active' => $user->is_active,
            'employee' => $user->employee ? [
                'id' => $user->employee->id,
                'name' => $user->employee->name,
                'nip' => $user->employee->nip,
                'work_unit' => $user->employee->workUnit?->only(['id', 'name', 'code']),
            ] : null,
            'roles' => $user->roleUsers->map(fn (RoleUser $roleUser) => [
                'id' => $roleUser->id,
                'role_id' => $roleUser->role_id,
                'role_name' => $roleUser->role?->name,
                'permissions' => $roleUser->role?->permissions?->pluck('name')->values()->all() ?? [],
                'work_unit_id' => $roleUser->work_unit_id,
                'work_unit' => $roleUser->workUnit?->only(['id', 'name', 'code']),
                'source' => $roleUser->source,
                'siga8_role_id' => $roleUser->siga8_role_id,
            ])->values()->all(),
            'permissions' => $user->roleUsers
                ->flatMap(fn (RoleUser $roleUser) => $roleUser->role?->permissions?->pluck('name') ?? collect())
                ->unique()
                ->values()
                ->all(),
        ];
    }
}
