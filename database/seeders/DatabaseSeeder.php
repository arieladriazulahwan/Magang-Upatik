<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            HolidaySeeder::class,
            WorkUnitLocationSeeder::class,
            Siga8RoleMappingSeeder::class,
            TestAccountSeeder::class,
            UnitScopedTestAccountSeeder::class,
            EmployeeImportSeeder::class,
        ]);
    }
}
