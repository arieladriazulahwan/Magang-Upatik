<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\StructuralPosition;
use App\Models\User;
use App\Models\WorkUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UnitScopedTestAccountSeeder extends Seeder
{
    public function run(): void
    {
        $scopedKepegawaianUsers = User::where('siga8_user_id', 'like', 'dummy-unit-admin_kepegawaian-%')->pluck('id');
        $scopedKepegawaianEmployees = User::where('siga8_user_id', 'like', 'dummy-unit-admin_kepegawaian-%')
            ->whereNotNull('employee_id')
            ->pluck('employee_id');

        if ($scopedKepegawaianUsers->isNotEmpty()) {
            RoleUser::whereIn('user_id', $scopedKepegawaianUsers)->delete();
            DB::table('personal_access_tokens')->whereIn('tokenable_id', $scopedKepegawaianUsers)->delete();
            User::whereIn('id', $scopedKepegawaianUsers)->delete();
        }

        if ($scopedKepegawaianEmployees->isNotEmpty()) {
            Employee::whereIn('id', $scopedKepegawaianEmployees)->delete();
        }

        $position = StructuralPosition::updateOrCreate(
            ['name' => 'Akun Testing Unit'],
            ['level' => 2, 'is_active' => true],
        );

        $roles = [
            'pimpinan' => 'Pimpinan',
            'admin_unit' => 'Admin Unit',
        ];

        $roleIds = Role::whereIn('name', array_keys($roles))->pluck('id', 'name');

        WorkUnit::where('is_active', true)
            ->orderBy('code')
            ->each(function (WorkUnit $unit) use ($position, $roles, $roleIds) {
                $unitSlug = Str::slug($unit->code ?: $unit->name) ?: 'unit-'.$unit->id;
                $unitSlug = Str::limit($unitSlug, 42, '');

                foreach ($roles as $roleName => $roleLabel) {
                    if (! isset($roleIds[$roleName])) {
                        continue;
                    }

                    $prefix = match ($roleName) {
                        'admin_unit' => 'unit',
                        default => 'pimpinan',
                    };

                    $username = "{$prefix}-{$unitSlug}";
                    $nip = 'T'.str_pad((string) $unit->id, 6, '0', STR_PAD_LEFT).match ($roleName) {
                        'pimpinan' => '01',
                        'admin_unit' => '02',
                        default => '00',
                    };

                    $employee = Employee::updateOrCreate(
                        ['nip' => $nip],
                        [
                            'name' => "{$roleLabel} {$unit->name}",
                            'employment_status' => 'non_asn',
                            'employee_type' => 'tenaga_kependidikan',
                            'work_unit_id' => $unit->id,
                            'structural_position_id' => $position->id,
                            'tmt' => '2026-01-01',
                            'is_active' => true,
                        ],
                    );

                    $user = User::updateOrCreate(
                        ['username' => $username],
                        [
                            'employee_id' => $employee->id,
                            'siga8_user_id' => 'dummy-unit-'.$roleName.'-'.$unit->id,
                            'full_name' => $employee->name,
                            'level' => 2,
                            'faculty_code' => $unit->code,
                            'faculty_name' => $unit->name,
                            'password' => Hash::make($username),
                            'is_active' => true,
                        ],
                    );

                    RoleUser::updateOrCreate(
                        [
                            'user_id' => $user->id,
                            'role_id' => $roleIds[$roleName],
                            'work_unit_id' => $unit->id,
                        ],
                        [
                            'source' => 'manual',
                            'siga8_role_id' => null,
                        ],
                    );
                }
            });
    }
}
