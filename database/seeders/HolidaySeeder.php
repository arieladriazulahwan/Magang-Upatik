<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class HolidaySeeder extends Seeder
{
    public function run(): void
    {
        $legalBasis = 'SKB 3 Menteri Nomor 1497 Tahun 2025, Nomor 2 Tahun 2025, dan Nomor 5 Tahun 2025';

        $holidays = [
            ['date' => '2026-01-01', 'name' => 'Tahun Baru 2026 Masehi', 'type' => 'nasional'],
            ['date' => '2026-01-16', 'name' => 'Isra Mikraj Nabi Muhammad SAW', 'type' => 'nasional'],
            ['date' => '2026-02-16', 'name' => 'Cuti Bersama Tahun Baru Imlek 2577 Kongzili', 'type' => 'cuti_bersama'],
            ['date' => '2026-02-17', 'name' => 'Tahun Baru Imlek 2577 Kongzili', 'type' => 'nasional'],
            ['date' => '2026-03-18', 'name' => 'Cuti Bersama Hari Suci Nyepi Tahun Baru Saka 1948', 'type' => 'cuti_bersama'],
            ['date' => '2026-03-19', 'name' => 'Hari Suci Nyepi Tahun Baru Saka 1948', 'type' => 'nasional'],
            ['date' => '2026-03-20', 'name' => 'Cuti Bersama Hari Raya Idulfitri 1447 H', 'type' => 'cuti_bersama'],
            ['date' => '2026-03-21', 'name' => 'Hari Raya Idulfitri 1447 H', 'type' => 'nasional'],
            ['date' => '2026-03-22', 'name' => 'Hari Raya Idulfitri 1447 H', 'type' => 'nasional'],
            ['date' => '2026-03-23', 'name' => 'Cuti Bersama Hari Raya Idulfitri 1447 H', 'type' => 'cuti_bersama'],
            ['date' => '2026-03-24', 'name' => 'Cuti Bersama Hari Raya Idulfitri 1447 H', 'type' => 'cuti_bersama'],
            ['date' => '2026-04-03', 'name' => 'Wafat Yesus Kristus', 'type' => 'nasional'],
            ['date' => '2026-04-05', 'name' => 'Kebangkitan Yesus Kristus / Paskah', 'type' => 'nasional'],
            ['date' => '2026-05-01', 'name' => 'Hari Buruh Internasional', 'type' => 'nasional'],
            ['date' => '2026-05-14', 'name' => 'Kenaikan Yesus Kristus', 'type' => 'nasional'],
            ['date' => '2026-05-15', 'name' => 'Cuti Bersama Kenaikan Yesus Kristus', 'type' => 'cuti_bersama'],
            ['date' => '2026-05-27', 'name' => 'Hari Raya Iduladha 1447 H', 'type' => 'nasional'],
            ['date' => '2026-05-28', 'name' => 'Cuti Bersama Hari Raya Iduladha 1447 H', 'type' => 'cuti_bersama'],
            ['date' => '2026-05-31', 'name' => 'Hari Raya Waisak 2570 BE', 'type' => 'nasional'],
            ['date' => '2026-06-01', 'name' => 'Hari Lahir Pancasila', 'type' => 'nasional'],
            ['date' => '2026-06-16', 'name' => 'Tahun Baru Islam 1448 H', 'type' => 'nasional'],
            ['date' => '2026-08-17', 'name' => 'Proklamasi Kemerdekaan Republik Indonesia', 'type' => 'nasional'],
            ['date' => '2026-08-25', 'name' => 'Maulid Nabi Muhammad SAW', 'type' => 'nasional'],
            ['date' => '2026-12-24', 'name' => 'Cuti Bersama Natal', 'type' => 'cuti_bersama'],
            ['date' => '2026-12-25', 'name' => 'Hari Raya Natal', 'type' => 'nasional'],
        ];

        DB::table('holiday')->upsert(
            array_map(fn (array $holiday) => $holiday + [
                'legal_basis' => $legalBasis,
            ], $holidays),
            ['date'],
            ['name', 'type', 'legal_basis'],
        );
    }
}
