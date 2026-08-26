<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Menjalankan schema-core.sql — SELURUH tabel/enum/fungsi/view KECUALI
 * face_data (dan tanpa CREATE EXTENSION vector sama sekali).
 *
 * KENAPA DIPISAH dari face_data (lihat migration berikutnya,
 * ..._create_face_data_table.php)?
 * Karena database yang belum punya ekstensi pgvector ter-install akan
 * gagal total pada baris "CREATE EXTENSION vector" — dan berhubung migration
 * lama menjalankan SATU file SQL sebagai satu skrip, kegagalan itu dulu
 * menggagalkan SEMUA 27+ tabel lain juga, bukan cuma face_data. Developer
 * (terutama yang masih setup pgvector di Windows/Laragon) jadi terblokir
 * total dari modul lain yang sebenarnya tidak butuh pgvector.
 *
 * Sekarang: migration ini bisa jalan sendiri tanpa pgvector, cukup untuk
 * mulai kerja di modul apa pun SELAIN face recognition (auth, master data
 * pegawai, unit kerja, cuti, dst). face_data ditambah belakangan begitu
 * pgvector siap.
 */
return new class extends Migration
{
    public function up(): void
    {
        $sql = file_get_contents(database_path('schema-core.sql'));

        if ($sql === false) {
            throw new \RuntimeException(
                'schema-core.sql tidak ditemukan. Pastikan ada di database/schema-core.sql'
            );
        }

        DB::unprepared($sql);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
            DROP VIEW IF EXISTS v_work_unit CASCADE;

            DROP TABLE IF EXISTS
                calendar_sync, calendar_config, device, activity_log, app_setting,
                notification, attachment, overtime_request, leave_balance,
                approval_log, approval_flow, request, leave_type, wfh_request,
                attendance_log, attendance, holiday, shift_schedule, shift,
                work_hour_setting, siga8_role_mapping, permission_role,
                role_user, permissions, roles, users,
                structural_position, work_location, work_unit, employee
            CASCADE;

            DROP FUNCTION IF EXISTS effective_attendance_mode(BIGINT);
            DROP FUNCTION IF EXISTS employee_work_hour_category(BIGINT);

            DROP TYPE IF EXISTS
                work_unit_type, attendance_mode, employment_status, employee_type,
                work_hour_category, gender, attendance_type, attendance_status,
                punch_type, request_category, request_status, approval_status,
                doctor_letter_type, holiday_type, wfh_status, overtime_status,
                role_source, sync_status, calendar_target, calendar_action
            CASCADE;
        SQL);
    }
};
