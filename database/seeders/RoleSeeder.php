<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            'super_admin' => 'Tim UPA TIK - konfigurasi global, semua unit, integrasi, audit',
            'admin_kepegawaian' => 'Biro Umum & Keuangan (Bagian SDM) - manajemen pegawai, kehadiran, cuti, saldo, validasi akhir, laporan universitas',
            'pimpinan' => 'Pimpinan / Verifikator - approval bawahan, verifikasi presensi, penghadiran manual, laporan unit',
            'admin_unit' => 'Admin Unit / Operator - kelola pegawai, lokasi, shift, dan rekap unit',
            'employee' => 'Pegawai - mobile presensi, pengajuan, riwayat, dan saldo',
        ];

        foreach ($roles as $name => $description) {
            Role::updateOrCreate(
                ['name' => $name],
                ['description' => $description],
            );
        }

        $permissions = [
            'dashboard',
            'monitoring',
            'pegawai.view',
            'pegawai.create',
            'pegawai.edit',
            'pegawai.delete',
            'unit.view',
            'unit.create',
            'unit.edit',
            'unit.delete',
            'jadwal.view',
            'jadwal.edit',
            'shift.view',
            'shift.create',
            'shift.edit',
            'shift.delete',
            'lokasi.view',
            'lokasi.create',
            'lokasi.edit',
            'lokasi.delete',
            'verifikasi.view',
            'verifikasi.approve',
            'pengajuan.view',
            'pengajuan.create',
            'pengajuan.edit',
            'pengajuan.delete',
            'persetujuan.view',
            'persetujuan.approve',
            'persetujuan.reject',
            'laporan.view',
            'laporan.export',
            'kalender.view',
            'kalender.edit',
            'pengaturan.view',
            'pengaturan.edit',
            'role.view',
            'role.manage',
            'siga8.view',
            'siga8.edit',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        Permission::whereIn('name', [
            'kinerja.view',
            'kinerja.create',
            'kinerja.edit',
            'kinerja.delete',
            'pengaturan.role',
        ])->delete();

        $this->syncRolePermissions('super_admin', $permissions);
        $this->syncRolePermissions('admin_kepegawaian', [
            'dashboard', 'monitoring',
            'pegawai.view', 'pegawai.create', 'pegawai.edit', 'pegawai.delete',
            'unit.view',
            'jadwal.view', 'shift.view',
            'verifikasi.view', 'verifikasi.approve',
            'pengajuan.view', 'pengajuan.edit',
            'persetujuan.view', 'persetujuan.approve', 'persetujuan.reject',
            'laporan.view', 'laporan.export',
        ]);
        $this->syncRolePermissions('pimpinan', [
            'dashboard', 'monitoring',
            'pegawai.view',
            'verifikasi.view', 'verifikasi.approve',
            'pengajuan.view',
            'persetujuan.view', 'persetujuan.approve', 'persetujuan.reject',
            'laporan.view', 'laporan.export',
        ]);
        $this->syncRolePermissions('admin_unit', [
            'dashboard', 'monitoring',
            'pegawai.view', 'pegawai.create', 'pegawai.edit',
            'unit.view',
            'jadwal.view', 'jadwal.edit',
            'shift.view', 'shift.create', 'shift.edit', 'shift.delete',
            'lokasi.view', 'lokasi.create', 'lokasi.edit', 'lokasi.delete',
            'pengajuan.view',
            'laporan.view',
        ]);
        $this->syncRolePermissions('employee', [
            'dashboard',
            'pengajuan.view', 'pengajuan.create',
        ]);
    }

    private function syncRolePermissions(string $roleName, array $permissionNames): void
    {
        $role = Role::where('name', $roleName)->first();

        if (! $role) {
            return;
        }

        $permissionIds = Permission::whereIn('name', $permissionNames)->pluck('id')->all();
        $role->permissions()->sync($permissionIds);
    }
}
