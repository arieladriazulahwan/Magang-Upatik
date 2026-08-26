<?php

namespace App\Services\Notification;

use App\Models\AppNotification;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\User;
use App\Models\WfhRequest;
use App\Models\WorkUnit;
use Illuminate\Support\Collection;

/**
 * Notifikasi in-app (PRD 5.14). Kanal in-app SAJA untuk sekarang — kolom
 * `type` di skema cuma VARCHAR bebas (bukan enum), jadi nilai yang dipakai
 * di sini ('pengajuan_baru', 'disetujui', 'ditolak') adalah KONVENSI kode,
 * bukan constraint DB. Kalau nanti nambah nilai baru, tetap konsisten sama
 * 4 nilai contoh yang sudah ada di komentar skema (pengajuan_baru,
 * disetujui, ditolak, pengingat).
 *
 * CAKUPAN YANG SUDAH DISAMBUNG (dipanggil dari controller):
 * - Cuti/Izin/Sakit/Dinas Luar: pengajuan baru -> approver langkah aktif;
 *   hasil akhir (disetujui/ditolak) -> pemohon; naik ke langkah berikutnya
 *   -> approver langkah berikutnya.
 * - WFH: pengajuan baru -> Pimpinan/Admin Unit unit terkait; hasil ->
 *   pemohon.
 *
 * BELUM DISAMBUNG (perlu scheduled command/job terpisah, bukan dipicu
 * request HTTP — PRD 5.14 menyebutnya tapi ini di luar cakupan "modul
 * notifikasi" murni, butuh `php artisan schedule` + Laravel Task
 * Scheduling yang belum ada di project ini sama sekali):
 * - "pengingat presensi belum check-out"
 * - "saldo cuti akan hangus"
 * Method untuk kedua trigger ini SENGAJA belum ditulis di sini — menulis
 * method yang tidak pernah dipanggil siapa pun cuma menambah kode mati.
 * Begitu modul scheduled job dibuat, baru tambahkan method + job pemanggilnya.
 *
 * target_url YANG DIKIRIM adalah PATH RELATIF (mis. "/leave-requests/12"),
 * BUKAN URL lengkap — backend tidak tahu domain frontend Web/Mobile Anda.
 * Frontend yang gabungkan dgn base URL-nya sendiri.
 */
class NotificationService
{
    public function leaveRequestSubmitted(LeaveRequest $leaveRequest, string $approverRole): void
    {
        $leaveRequest->loadMissing(['employee', 'leaveType']);

        $approvers = $this->resolveApproversForRole($approverRole, $leaveRequest->employee->work_unit_id);

        $this->notifyMany(
            $approvers,
            'Pengajuan Menunggu Persetujuan',
            "{$leaveRequest->employee->name} mengajukan {$leaveRequest->leaveType->name} ({$leaveRequest->total_days} hari), menunggu persetujuan Anda.",
            'pengajuan_baru',
            "/leave-requests/{$leaveRequest->id}",
        );
    }

    /** Dipanggil setelah decide() — baca status TERKINI dari $leaveRequest utk tentukan siapa yang perlu tahu. */
    public function leaveRequestDecided(LeaveRequest $leaveRequest, ?string $nextApproverRole = null): void
    {
        $leaveRequest->loadMissing(['employee', 'leaveType']);

        if ($leaveRequest->status === 'diproses' && $nextApproverRole) {
            // Belum final — masih naik ke langkah approval berikutnya,
            // beri tahu approver BERIKUTNYA, bukan pemohon dulu.
            $this->leaveRequestSubmitted($leaveRequest, $nextApproverRole);

            return;
        }

        if (! in_array($leaveRequest->status, ['disetujui', 'ditolak'], true)) {
            return; // status lain (mis. dibatalkan) tidak lewat method ini
        }

        $label = $leaveRequest->status === 'disetujui' ? 'Disetujui' : 'Ditolak';

        $this->send(
            $leaveRequest->employee,
            "Pengajuan {$label}",
            "Pengajuan {$leaveRequest->leaveType->name} Anda ({$leaveRequest->total_days} hari) telah {$leaveRequest->status}.",
            $leaveRequest->status,
            "/leave-requests/{$leaveRequest->id}",
        );
    }

    public function wfhRequestSubmitted(WfhRequest $wfhRequest): void
    {
        $wfhRequest->loadMissing('employee');

        // WFH cuma 1 langkah (bukan approval_flow bertahap seperti Cuti —
        // lihat docblock WfhController): approver-nya pimpinan ATAU
        // admin_unit unit terkait, keduanya diberi tahu (siapa pun boleh
        // memutuskan lebih dulu).
        $approvers = $this->resolveApproversForRole('atasan_langsung', $wfhRequest->employee->work_unit_id)
            ->merge($this->usersWithRoleCoveringUnit('admin_unit', $wfhRequest->employee->work_unit_id))
            ->unique('id');

        $this->notifyMany(
            $approvers,
            'Pengajuan WFH Menunggu Persetujuan',
            "{$wfhRequest->employee->name} mengajukan WFH {$wfhRequest->total_days} hari ({$wfhRequest->start_date->toDateString()} s.d. {$wfhRequest->end_date->toDateString()}).",
            'pengajuan_baru',
            "/wfh-requests/{$wfhRequest->id}",
        );
    }

    public function wfhRequestDecided(WfhRequest $wfhRequest): void
    {
        $wfhRequest->loadMissing('employee');

        if (! in_array($wfhRequest->status, ['disetujui', 'ditolak'], true)) {
            return;
        }

        $label = $wfhRequest->status === 'disetujui' ? 'Disetujui' : 'Ditolak';

        $this->send(
            $wfhRequest->employee,
            "Pengajuan WFH {$label}",
            "Pengajuan WFH Anda ({$wfhRequest->start_date->toDateString()} s.d. {$wfhRequest->end_date->toDateString()}) telah {$wfhRequest->status}.",
            $wfhRequest->status,
            "/wfh-requests/{$wfhRequest->id}",
        );
    }

    // --- Building block umum, dipakai internal & bisa dipakai modul lain nanti ---

    public function send(Employee $employee, string $title, string $message, ?string $type = null, ?string $targetUrl = null): AppNotification
    {
        return AppNotification::create([
            'employee_id' => $employee->id,
            'title' => $title,
            'message' => $message,
            'type' => $type,
            'target_url' => $targetUrl,
        ]);
    }

    /** @param Collection<int, User> $users */
    public function notifyMany(Collection $users, string $title, string $message, ?string $type = null, ?string $targetUrl = null): void
    {
        foreach ($users as $user) {
            if (! $user->employee_id) {
                continue; // akun tanpa data pegawai (mis. akun admin murni) tidak punya "kotak masuk" notifikasi
            }

            $this->send($user->employee, $title, $message, $type, $targetUrl);
        }
    }

    /**
     * Terjemahkan approver_role SEMANTIK (dari approval_flow, mis.
     * 'atasan_langsung') ke peran RBAC sebenarnya ('pimpinan') — HARUS
     * konsisten dengan LeaveRequestService::canDecide(). Kalau salah satu
     * diubah tanpa mengubah yang lain, notifikasi bisa terkirim ke orang
     * yang sebenarnya tidak berwenang memutuskan (atau sebaliknya, approver
     * yang sah tidak diberi tahu).
     */
    private function resolveApproversForRole(string $approverRole, int $unitId): Collection
    {
        return match ($approverRole) {
            'atasan_langsung' => $this->usersWithRoleCoveringUnit('pimpinan', $unitId),
            'admin_kepegawaian' => $this->usersWithRoleCoveringUnit('admin_kepegawaian', $unitId),
            default => collect(),
        };
    }

    /**
     * Semua User yang role_user-nya "menutupi" $unitId untuk $roleName —
     * kebalikan dari RoleUser::coversUnit() (yang mengecek SATU baris
     * terhadap satu unit). Di sini kita cari SEMUA baris yang cocok.
     */
    private function usersWithRoleCoveringUnit(string $roleName, int $unitId): Collection
    {
        $role = Role::where('name', $roleName)->first();

        if (! $role) {
            return collect();
        }

        $unit = WorkUnit::find($unitId);
        $ancestorIds = $unit?->ancestorIds() ?? [$unitId];

        $userIds = RoleUser::where('role_id', $role->id)
            ->where(fn ($q) => $q->whereNull('work_unit_id')->orWhereIn('work_unit_id', $ancestorIds))
            ->pluck('user_id')
            ->unique();

        return User::whereIn('id', $userIds)->whereNotNull('employee_id')->get();
    }
}
