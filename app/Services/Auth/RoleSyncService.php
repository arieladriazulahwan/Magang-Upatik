<?php

namespace App\Services\Auth;

use App\Models\RoleUser;
use App\Models\Siga8RoleMapping;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Inti pencocokan peran SIGA8 -> peran presensi (PRD 5.15 langkah 4).
 *
 * Untuk SETIAP roles[].id dari respons SIGA8, cari di siga8_role_mapping.
 * Kecocokan -> upsert role_user (source='siga8'). Peran SIGA8 yang TIDAK
 * punya pemetaan diabaikan (bukan error) — Super Admin yang belum memetakan
 * suatu role SIGA8 baru tidak boleh membuat login pengguna lain gagal.
 *
 * PENTING (kebersihan data): role_user milik sumber SIGA8 yang TIDAK lagi
 * ada di roles[] terbaru dihapus di sini. Ini menegakkan SIGA8 sebagai
 * satu-satunya sumber kebenaran untuk role bersumber SSO — kalau admin
 * mencabut suatu role di SIGA8, presensi ikut mencabutnya di login
 * berikutnya. role_user dengan source='manual' TIDAK PERNAH disentuh
 * fungsi ini (itu hak Super Admin, dikelola terpisah).
 */
class RoleSyncService
{
    /**
     * @param array<int, array{id: string, name: string, level: int}> $siga8Roles
     */
    public function sync(User $user, array $siga8Roles): void
    {
        DB::transaction(function () use ($user, $siga8Roles) {
            $siga8RoleIds = array_column($siga8Roles, 'id');

            $mappings = Siga8RoleMapping::query()
                ->whereIn('siga8_role_id', $siga8RoleIds)
                ->where('is_active', true)
                ->get();

            $matchedSiga8RoleIds = [];

            foreach ($mappings as $mapping) {
                RoleUser::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'role_id' => $mapping->role_id,
                        // work_unit_id ikut kunci unik composite di DB (lihat
                        // uq_role_user); NULL dianggap "global" oleh index itu.
                        'work_unit_id' => $mapping->work_unit_id,
                    ],
                    [
                        'source' => 'siga8',
                        'siga8_role_id' => $mapping->siga8_role_id,
                    ],
                );

                $matchedSiga8RoleIds[] = $mapping->siga8_role_id;
            }

            // Cabut role_user bersumber SIGA8 yang siga8_role_id-nya sudah
            // tidak ada di daftar terbaru (dicabut di SIGA8, atau mapping
            // dinonaktifkan Super Admin). Tidak menyentuh source='manual'.
            RoleUser::where('user_id', $user->id)
                ->where('source', 'siga8')
                ->whereNotIn('siga8_role_id', $matchedSiga8RoleIds ?: ['__none__'])
                ->delete();
        });
    }
}
