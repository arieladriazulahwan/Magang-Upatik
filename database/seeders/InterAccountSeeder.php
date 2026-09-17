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

class InterAccountSeeder extends Seeder
{
    public function run(): void
    {
        $unit = WorkUnit::where('code', 'BAK-MOCK')->firstOrFail();
        $employeeRoleId = Role::where('name', 'employee')->value('id');
        $leaderRoleId = Role::where('name', 'pimpinan')->value('id');
        $additionalPosition = StructuralPosition::updateOrCreate(
            ['name' => 'Dosen Tugas Tambahan'],
            ['level' => 2, 'is_active' => true],
        );

        $accounts = [];

        for ($number = 1; $number <= 5; $number += 1) {
            $accounts[] = [
                'username' => "inter{$number}",
                'name' => "Inter {$number} Dosen Biasa",
                'employee_type' => 'dosen',
                'structural_position_id' => null,
                'role_id' => $employeeRoleId,
                'role_scope_unit_id' => null,
            ];
        }

        for ($number = 6; $number <= 10; $number += 1) {
            $accounts[] = [
                'username' => "inter{$number}",
                'name' => "Inter {$number} Pimpinan",
                'employee_type' => 'dosen',
                'structural_position_id' => $additionalPosition->id,
                'role_id' => $leaderRoleId,
                'role_scope_unit_id' => $unit->id,
            ];
        }

        for ($number = 11; $number <= 15; $number += 1) {
            $accounts[] = [
                'username' => "inter{$number}",
                'name' => "Inter {$number} Tenaga Kependidikan",
                'employee_type' => 'tenaga_kependidikan',
                'structural_position_id' => null,
                'role_id' => $employeeRoleId,
                'role_scope_unit_id' => null,
            ];
        }

        DB::transaction(function () use ($accounts, $unit): void {
            foreach ($accounts as $index => $account) {
                $employee = Employee::updateOrCreate(
                    ['nip' => $account['username']],
                    [
                        'name' => $account['name'],
                        'email' => "{$account['username']}@example.test",
                        'employment_status' => 'pns',
                        'employee_type' => $account['employee_type'],
                        'work_unit_id' => $unit->id,
                        'structural_position_id' => $account['structural_position_id'],
                        'tmt' => '2025-01-01',
                        'is_active' => true,
                        'attendance_active' => true,
                    ],
                );

                $user = User::updateOrCreate(
                    ['username' => $account['username']],
                    [
                        'employee_id' => $employee->id,
                        'siga8_user_id' => "mock-{$account['username']}",
                        'full_name' => $account['name'],
                        'email' => "{$account['username']}@example.test",
                        'level' => $index + 1,
                        'faculty_code' => $unit->code,
                        'faculty_name' => $unit->name,
                        'password' => Hash::make('password'),
                        'is_active' => true,
                    ],
                );

                RoleUser::where('user_id', $user->id)->delete();
                RoleUser::create([
                    'user_id' => $user->id,
                    'role_id' => $account['role_id'],
                    'work_unit_id' => $account['role_scope_unit_id'],
                    'source' => 'manual',
                    'siga8_role_id' => null,
                ]);
            }
        });
    }
}
