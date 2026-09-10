<?php

namespace Database\Seeders;

use App\Models\WorkLocation;
use App\Models\WorkUnit;
use Illuminate\Database\Seeder;

class WorkUnitLocationSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->units() as $unit) {
            WorkUnit::updateOrCreate(
                ['code' => $unit['code']],
                [
                    'name' => $unit['name'],
                    'type' => $unit['type'],
                    'attendance_mode' => 'reguler',
                    'wfh_allowed' => true,
                    'max_wfh_per_month' => 8,
                    'is_active' => true,
                ],
            );
        }

        $locations = [
            [
                'name' => 'Gedung Test',
                'address' => 'Lokasi test presensi',
                'latitude' => -0.8315696,
                'longitude' => 119.8807247,
                'radius_meters' => 1000,
            ],
            [
                'name' => 'Kantor Pokja BAK',
                'address' => 'Universitas Tadulako',
                'latitude' => -0.8370000,
                'longitude' => 119.8950000,
                'radius_meters' => 1000,
            ],
        ];

        foreach ($locations as $location) {
            WorkLocation::updateOrCreate(
                [
                    'work_unit_id' => null,
                    'name' => $location['name'],
                    'latitude' => $location['latitude'],
                    'longitude' => $location['longitude'],
                ],
                [
                    'address' => $location['address'],
                    'radius_meters' => $location['radius_meters'],
                    'is_active' => true,
                ],
            );
        }
    }

    private function units(): array
    {
        return [
            ['code' => 'BAK-MOCK', 'name' => 'Pokja BAK', 'type' => 'bagian'],
            ['code' => 'A', 'name' => 'FKIP', 'type' => 'fakultas'],
            ['code' => 'B', 'name' => 'FISIP', 'type' => 'fakultas'],
            ['code' => 'C', 'name' => 'FEKON', 'type' => 'fakultas'],
            ['code' => 'D', 'name' => 'FAKUM', 'type' => 'fakultas'],
            ['code' => 'E', 'name' => 'FAPERTA', 'type' => 'fakultas'],
            ['code' => 'F', 'name' => 'FATEK', 'type' => 'fakultas'],
            ['code' => 'G', 'name' => 'FMIPA', 'type' => 'fakultas'],
            ['code' => 'H', 'name' => 'PASCASARJANA', 'type' => 'pascasarjana'],
            ['code' => 'L', 'name' => 'FAHUT', 'type' => 'fakultas'],
            ['code' => 'N', 'name' => 'FK', 'type' => 'fakultas'],
            ['code' => 'O', 'name' => 'FAPETKAN', 'type' => 'fakultas'],
            ['code' => 'P', 'name' => 'FKM', 'type' => 'fakultas'],
            ['code' => 'ZA', 'name' => 'BKU', 'type' => 'biro'],
            ['code' => 'ZB', 'name' => 'BAK', 'type' => 'biro'],
            ['code' => 'ZC', 'name' => 'LPPM', 'type' => 'lembaga'],
            ['code' => 'ZR', 'name' => 'Dewan Pertimbangan', 'type' => 'lainnya'],
            ['code' => 'ZE', 'name' => 'LPMPP', 'type' => 'lembaga'],
            ['code' => 'ZF', 'name' => 'UPA TIK', 'type' => 'upt'],
            ['code' => 'ZG', 'name' => 'PUSAT BAHASA', 'type' => 'upt'],
            ['code' => 'ZH', 'name' => 'UPT. Perpustakaan', 'type' => 'upt'],
            ['code' => 'ZI', 'name' => 'Sumber Daya Hasil Sulawesi', 'type' => 'lainnya'],
            ['code' => 'ZJ', 'name' => 'Pusat Pengelolaan Usaha', 'type' => 'lainnya'],
            ['code' => 'ZM', 'name' => 'UPT. NATALITA', 'type' => 'upt'],
            ['code' => 'ZN', 'name' => 'Kampus II UNTAD Morowali', 'type' => 'lainnya'],
            ['code' => 'ZO', 'name' => 'UPT Laboratorium Dasar', 'type' => 'laboratorium'],
            ['code' => 'ZP', 'name' => 'Biro Perencanaan dan Kerjasama', 'type' => 'biro'],
            ['code' => 'ZQ', 'name' => 'Kampus II UNTAD Touna', 'type' => 'lainnya'],
            ['code' => 'ZV', 'name' => 'SPI', 'type' => 'lainnya'],
            ['code' => 'ZS', 'name' => 'RS PENDIDIKAN TADULAKO', 'type' => 'rumah_sakit'],
            ['code' => 'ZU', 'name' => 'UPA BK', 'type' => 'upt'],
            ['code' => 'ZW', 'name' => 'SENAT UNIVERSITAS', 'type' => 'universitas'],
            ['code' => 'ZZ', 'name' => 'Universitas', 'type' => 'universitas'],
        ];
    }
}
