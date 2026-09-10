<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $rules = [
            'dosen' => [
                'min_minutes' => 120,
                'standard_check_in' => null,
                'late_threshold' => null,
                'standard_check_out' => null,
            ],
            'dosen_tugas_tambahan' => [
                'min_minutes' => 240,
                'standard_check_in' => null,
                'late_threshold' => null,
                'standard_check_out' => null,
            ],
            'tenaga_kependidikan' => [
                'min_minutes' => 480,
                'standard_check_in' => '08:00',
                'late_threshold' => '08:30',
                'standard_check_out' => '16:00',
            ],
        ];

        foreach ($rules as $category => $rule) {
            DB::table('work_hour_setting')
                ->whereNull('work_unit_id')
                ->where('category', $category)
                ->update($rule);
        }
    }

    public function down(): void
    {
        foreach (['dosen', 'dosen_tugas_tambahan', 'tenaga_kependidikan'] as $category) {
            DB::table('work_hour_setting')
                ->whereNull('work_unit_id')
                ->where('category', $category)
                ->update([
                    'standard_check_in' => '07:30',
                    'late_threshold' => '08:00',
                    'standard_check_out' => '16:00',
                ]);
        }
    }
};
