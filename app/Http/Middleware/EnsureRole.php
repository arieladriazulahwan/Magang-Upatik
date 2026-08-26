<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Middleware RBAC dasar: user harus punya SALAH SATU peran yang diminta,
 * di UNIT MANAPUN (cek global, belum scoped ke unit tertentu).
 *
 * Pemakaian di route:
 *   Route::get('/pegawai', ...)->middleware('role:super_admin,admin_kepegawaian');
 *
 * PENTING — ini BUKAN pengecekan cakupan unit. Middleware route berjalan
 * SEBELUM route model binding resolve resource spesifik (mis. :employee
 * di /pegawai/{employee}), jadi ia tak bisa tahu unit resource tsb.
 * Untuk endpoint yang membatasi ke unit yang dipimpin (mis. Pimpinan
 * hanya boleh mengoreksi presensi stafnya sendiri — PRD 5.17), TAMBAHKAN
 * pengecekan eksplisit di controller:
 *
 *   if (! $request->user()->hasRole(['pimpinan','admin_kepegawaian'], $employee->work_unit_id)) {
 *       abort(403, 'Di luar cakupan unit Anda.');
 *   }
 *
 * $user->hasRole() (lihat App\Models\User) sudah menangani warisan pohon
 * unit (Dekan men-scope semua Jurusan di bawah fakultasnya).
 */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! $user->hasRole($roles)) {
            abort(403, 'Anda tidak punya izin untuk mengakses sumber daya ini.');
        }

        return $next($request);
    }
}
