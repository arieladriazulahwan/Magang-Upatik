<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Siga8RoleMapping;
use App\Models\WorkUnit;
use Illuminate\Database\Seeder;

class Siga8RoleMappingSeeder extends Seeder
{
    public function run(): void
    {
        $mappings = [
            ['siga8_role_id' => '01kafz9y3v1w55pyfs719pe97d', 'siga8_role_name' => 'BAK', 'role' => 'admin_kepegawaian', 'unit' => null, 'description' => 'Contoh: BAK -> admin kepegawaian'],
            ['siga8_role_id' => '01k723k4csfpstqyshgcnpym4k', 'siga8_role_name' => 'Pokja BAK', 'role' => 'employee', 'unit' => null, 'description' => 'Contoh: Pokja BAK -> employee'],
            ['siga8_role_id' => '01k7273msxcsn6ycwmahrgqswn', 'siga8_role_name' => 'Help Desk', 'role' => 'super_admin', 'unit' => null, 'description' => 'Contoh: Help Desk (UPA TIK) -> super admin'],
            ['siga8_role_id' => 'mock-role-admin-kepegawaian', 'siga8_role_name' => 'Admin Kepegawaian', 'role' => 'admin_kepegawaian', 'unit' => null, 'description' => 'Mock SIGA8 local testing'],
            ['siga8_role_id' => 'mock-role-admin-unit', 'siga8_role_name' => 'Admin Unit', 'role' => 'admin_unit', 'unit' => 'BAK-MOCK', 'description' => 'Mock SIGA8 local testing'],
            ['siga8_role_id' => 'mock-role-pimpinan', 'siga8_role_name' => 'Pimpinan', 'role' => 'pimpinan', 'unit' => 'BAK-MOCK', 'description' => 'Mock SIGA8 local testing'],
        ];

        foreach ($mappings as $mapping) {
            Siga8RoleMapping::updateOrCreate(
                ['siga8_role_id' => $mapping['siga8_role_id']],
                [
                    'siga8_role_name' => $mapping['siga8_role_name'],
                    'role_id' => Role::where('name', $mapping['role'])->value('id'),
                    'work_unit_id' => $mapping['unit'] ? WorkUnit::where('code', $mapping['unit'])->value('id') : null,
                    'is_active' => true,
                    'description' => $mapping['description'],
                ],
            );
        }
    }
}
