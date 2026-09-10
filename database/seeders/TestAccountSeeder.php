<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\StructuralPosition;
use App\Models\User;
use App\Models\WorkUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class TestAccountSeeder extends Seeder
{
    public function run(): void
    {
        $unit = WorkUnit::where('code', 'BAK-MOCK')->firstOrFail();
        $position = StructuralPosition::updateOrCreate(
            ['name' => 'Pegawai Testing'],
            ['level' => 1, 'is_active' => true],
        );

        $accounts = [
            ['username' => 'intern-test', 'name' => 'Test User', 'siga8_user_id' => 'mock-user-001', 'role' => 'employee', 'siga8_role_id' => '01k723k4csfpstqyshgcnpym4k'],
            ['username' => 'admin-test', 'name' => 'Test Super Admin', 'siga8_user_id' => 'mock-admin-001', 'role' => 'super_admin', 'siga8_role_id' => '01k7273msxcsn6ycwmahrgqswn'],
            ['username' => 'kepegawaian-test', 'name' => 'Test Admin Kepegawaian', 'siga8_user_id' => 'mock-kepegawaian-001', 'role' => 'admin_kepegawaian', 'siga8_role_id' => 'mock-role-admin-kepegawaian'],
            ['username' => 'unit-test', 'name' => 'Test Admin Unit', 'siga8_user_id' => 'mock-unit-001', 'role' => 'admin_unit', 'siga8_role_id' => 'mock-role-admin-unit'],
            ['username' => 'pimpinan-test', 'name' => 'Test Pimpinan', 'siga8_user_id' => 'mock-pimpinan-001', 'role' => 'pimpinan', 'siga8_role_id' => 'mock-role-pimpinan'],
        ];

        foreach ($accounts as $account) {
            $employee = Employee::updateOrCreate(
                ['nip' => $account['username']],
                [
                    'name' => $account['name'],
                    'employment_status' => 'pns',
                    'employee_type' => 'tenaga_kependidikan',
                    'work_unit_id' => $unit->id,
                    'structural_position_id' => $position->id,
                    'tmt' => '2025-01-01',
                    'is_active' => true,
                ],
            );

            $user = User::updateOrCreate(
                ['username' => $account['username']],
                [
                    'employee_id' => $employee->id,
                    'siga8_user_id' => $account['siga8_user_id'],
                    'full_name' => $account['name'],
                    'level' => 1,
                    'password' => Hash::make('dummy-password'),
                    'is_active' => true,
                ],
            );

            RoleUser::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'role_id' => Role::where('name', $account['role'])->value('id'),
                    'work_unit_id' => in_array($account['role'], ['admin_unit', 'pimpinan'], true) ? $unit->id : null,
                ],
                [
                    'source' => 'siga8',
                    'siga8_role_id' => $account['siga8_role_id'],
                ],
            );
        }
    }
}
