<?php

namespace App\Services\Auth;

use App\Models\User;
use App\Services\Siga8\Siga8LoginResult;
use Illuminate\Support\Facades\DB;

/**
 * Meng-upsert baris `users` lokal berdasarkan identitas dari SIGA8.
 * PRD 5.15 langkah 3: "Presensi meng-upsert akun lokal (users) berdasarkan
 * user_id SIGA8 (ULID), menyimpan snapshot identitas & fakultas."
 *
 * CATATAN: service ini TIDAK menautkan users.employee_id secara otomatis.
 * Penautan user SSO <-> baris employee (data kepegawaian/NIP) sengaja
 * dibuat langkah terpisah (mis. oleh Admin Kepegawaian mencocokkan NIP),
 * karena username SIGA8 tidak dijamin selalu berupa NIP (contoh respons
 * PRD memakai "1010101010" untuk akun Help Desk yang bukan pegawai
 * akademik). Menebak keterkaitan di sini berisiko salah tautkan data
 * kepegawaian ke akun yang salah.
 */
class UserProvisioningService
{
    public function upsertFromSiga8(Siga8LoginResult $result): User
    {
        return DB::transaction(function () use ($result) {
            $user = User::where('siga8_user_id', $result->userId)->first()
                ?? new User(['siga8_user_id' => $result->userId]);

            $user->fill([
                'username' => $result->username,
                'full_name' => $result->fullName,
                'level' => $result->level,
                'faculty_code' => $result->facultyCode,
                'faculty_name' => $result->facultyName,
                'study_programs_code' => $result->studyProgramsCode,
                'is_active' => true,
                'last_login_at' => now(),
            ]);
            $user->save();

            return $user;
        });
    }
}
