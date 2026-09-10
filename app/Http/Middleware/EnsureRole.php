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

        if (! $user || (! $user->hasRole($roles) && ! $user->hasPermission($this->permissionsFor($request)))) {
            abort(403, 'Anda tidak punya izin untuk mengakses sumber daya ini.');
        }

        return $next($request);
    }

    private function permissionsFor(Request $request): array
    {
        $method = $request->method();
        $action = match ($method) {
            'GET', 'HEAD' => 'view',
            'POST' => 'create',
            'PUT', 'PATCH' => 'edit',
            'DELETE' => 'delete',
            default => 'view',
        };

        $pathPermissions = [
            'api/dashboard*' => ['dashboard'],
            'api/monitoring*' => ['monitoring'],
            'api/employees*' => ['pegawai.'.$action],
            'api/work-units*' => ['unit.'.$action],
            'api/shifts*' => ['shift.'.$action],
            'api/shift-schedules*' => ['jadwal.'.($action === 'view' ? 'view' : 'edit')],
            'api/attendance-locations*' => ['lokasi.'.$action],
            'api/attendances*' => ['monitoring', 'verifikasi.view'],
            'api/attendance-corrections*' => ['verifikasi.view', 'verifikasi.approve'],
            'api/leave-requests*' => ['pengajuan.view', 'persetujuan.view'],
            'api/wfh-requests*' => ['pengajuan.view', 'persetujuan.view'],
            'api/overtime-requests*' => ['pengajuan.view', 'persetujuan.view'],
            'api/official-travel-requests*' => ['pengajuan.view', 'persetujuan.view'],
            'api/reports*' => ['laporan.view'],
            'api/holidays*' => ['kalender.'.($action === 'view' ? 'view' : 'edit')],
            'api/settings*' => ['pengaturan.'.($action === 'view' ? 'view' : 'edit')],
            'api/app-settings*' => ['pengaturan.'.($action === 'view' ? 'view' : 'edit')],
            'api/siga8-role-mappings*' => ['siga8.'.($action === 'view' ? 'view' : 'edit')],
            'api/roles*' => [$action === 'view' ? 'role.view' : 'role.manage'],
            'api/permissions*' => ['role.view', 'role.manage'],
            'api/admin-users*' => ['role.manage'],
        ];

        foreach ($pathPermissions as $pattern => $permissions) {
            if ($request->is($pattern)) {
                return $permissions;
            }
        }

        return [];
    }
}
