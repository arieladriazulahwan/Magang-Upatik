<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LinkEmployeeUserRequest;
use App\Http\Requests\StoreEmployeeRequest;
use App\Http\Requests\UpdateEmployeeRequest;
use App\Models\ActivityLog;
use App\Models\Employee;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Master data pegawai (PRD 5.1).
 *
 * SCOPING index/show (lihat komentar routes/api.php — TIDAK dibatasi
 * middleware 'role:' di route, controller ini yang menegakkan):
 *   - super_admin, admin_kepegawaian : global (semua pegawai)
 *   - pimpinan, admin_unit           : unit yang di-scope role tsb + SELURUH
 *                                       unit turunannya (mis. Dekan lihat
 *                                       semua Jurusan di bawah fakultasnya)
 *   - selain itu (pegawai murni)     : hanya data dirinya sendiri
 *   - tidak match satupun            : 403
 *
 * 'admin_unit' disertakan dalam kelompok pimpinan atas dasar README PRD
 * bagian 3 ("Admin Unit ... kelola data pegawai unitnya") — dikonfirmasi
 * user, BUKAN asumsi sepihak.
 *
 * store/update/destroy/link-user: HANYA super_admin/admin_kepegawaian,
 * sudah cukup dijaga middleware 'role:' di route — TIDAK ada scoping
 * tambahan di sini (sesuai keputusan yang sama dipakai untuk endpoint
 * shift/holiday: operasi tulis di modul ini tidak scoped per unit).
 */
class EmployeeController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'work_unit_id' => ['sometimes', 'integer'],
            'employee_type' => ['sometimes', 'in:dosen,tenaga_kependidikan'],
            'employment_status' => ['sometimes', 'in:pns,pppk,non_asn'],
            'is_active' => ['sometimes', 'boolean'],
            'search' => ['sometimes', 'string', 'max:150'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Employee::query()->with(['workUnit:id,name,code', 'structuralPosition:id,name', 'user:id,employee_id,username']);

        $this->applyVisibilityScope($query, $request->user());

        if (isset($filters['work_unit_id'])) {
            $query->where('work_unit_id', $filters['work_unit_id']);
        }
        if (isset($filters['employee_type'])) {
            $query->where('employee_type', $filters['employee_type']);
        }
        if (isset($filters['employment_status'])) {
            $query->where('employment_status', $filters['employment_status']);
        }
        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }
        if (! empty($filters['search'])) {
            $term = '%'.$filters['search'].'%';
            $query->where(fn ($q) => $q->where('name', 'ilike', $term)
                ->orWhere('nip', 'ilike', $term)
                ->orWhere('nik', 'ilike', $term)
                ->orWhere('email', 'ilike', $term));
        }

        $employees = $query->orderBy('name')->paginate($filters['per_page'] ?? 15);

        return response()->json([
            'data' => $employees->getCollection()->map(fn (Employee $e) => $this->serialize($e)),
            'meta' => [
                'current_page' => $employees->currentPage(),
                'per_page' => $employees->perPage(),
                'total' => $employees->total(),
                'last_page' => $employees->lastPage(),
            ],
        ]);
    }

    public function show(Request $request, Employee $employee): JsonResponse
    {
        $this->assertCanView($request->user(), $employee);

        $employee->load(['workUnit:id,name,code', 'structuralPosition:id,name', 'user:id,employee_id,username']);

        return response()->json(['data' => $this->serialize($employee)]);
    }

    public function store(StoreEmployeeRequest $request): JsonResponse
    {
        $employee = DB::transaction(function () use ($request) {
            $employee = Employee::create($request->validated());

            ActivityLog::record('employee.create', $employee, $request->validated());

            return $employee;
        });

        $employee->load(['workUnit:id,name,code', 'structuralPosition:id,name']);

        return response()->json(['data' => $this->serialize($employee)], 201);
    }

    public function update(UpdateEmployeeRequest $request, Employee $employee): JsonResponse
    {
        DB::transaction(function () use ($request, $employee) {
            $employee->update($request->validated());

            ActivityLog::record('employee.update', $employee, $request->validated());
        });

        $employee->load(['workUnit:id,name,code', 'structuralPosition:id,name', 'user:id,employee_id,username']);

        return response()->json(['data' => $this->serialize($employee)]);
    }

    /**
     * Soft delete (kolom deleted_at, lihat SoftDeletes di model Employee).
     *
     * CATATAN: akun User yang tertaut (jika ada) TIDAK ikut dinonaktifkan
     * di sini — PRD tidak mengatur perilaku ini secara eksplisit, dan
     * keputusan produk menyatakan tidak perlu cascade-deactivate otomatis
     * untuk saat ini. Risiko: pegawai yang di-soft-delete tapi akun
     * user-nya masih is_active=true tetap bisa login. Dicatat di bagian
     * "Remaining Issues" — perlu diputuskan modul mana yang menangani ini
     * (mis. Admin Kepegawaian menonaktifkan user secara manual/terpisah).
     */
    public function destroy(Request $request, Employee $employee): JsonResponse
    {
        DB::transaction(function () use ($request, $employee) {
            ActivityLog::record('employee.delete', $employee);
            $employee->delete();
        });

        return response()->json(['message' => 'Pegawai berhasil dihapus.']);
    }

    /**
     * Tautkan Employee ke akun User yang sudah ada (mis. akun dibuat
     * manual/di-provision sebelum data pegawai lengkap, atau sebaliknya).
     *
     * Aturan konflik (dikonfirmasi user):
     *  - user_id yang dituju sudah tertaut ke Employee LAIN -> 409, ditolak
     *    (mencegah "mencuri" akun milik pegawai lain — ini bukan preferensi,
     *    tapi konsekuensi dari UNIQUE(users.employee_id) di skema; kalau
     *    dibiarkan lolos ke DB, akan gagal dengan error 500 yang tidak jelas).
     *  - Employee ini SUDAH tertaut ke user LAIN -> link lama ditimpa
     *    (employee_id user lama di-NULL-kan, lalu ditautkan ke user baru).
     */
    public function linkUser(LinkEmployeeUserRequest $request, Employee $employee): JsonResponse
    {
        $targetUser = User::findOrFail($request->validated('user_id'));

        if ($targetUser->employee_id !== null && $targetUser->employee_id !== $employee->id) {
            return response()->json([
                'message' => 'Akun pengguna ini sudah tertaut ke pegawai lain.',
                'reason' => 'user_already_linked',
            ], 409);
        }

        DB::transaction(function () use ($employee, $targetUser) {
            // Timpa link lama employee ini (jika ada) ke user lain.
            User::where('employee_id', $employee->id)
                ->where('id', '!=', $targetUser->id)
                ->update(['employee_id' => null]);

            $targetUser->employee_id = $employee->id;
            $targetUser->save();

            ActivityLog::record('employee.link_user', $employee, ['user_id' => $targetUser->id]);
        });

        $employee->load(['workUnit:id,name,code', 'structuralPosition:id,name', 'user:id,employee_id,username']);

        return response()->json(['data' => $this->serialize($employee)]);
    }

    /**
     * @throws \Symfony\Component\HttpKernel\Exception\HttpException
     */
    private function assertCanView(User $user, Employee $employee): void
    {
        if ($user->hasRole(['super_admin', 'admin_kepegawaian'])) {
            return;
        }

        if ($user->hasRole(['pimpinan', 'admin_unit'], $employee->work_unit_id)) {
            return;
        }

        if ($user->employee_id !== null && $user->employee_id === $employee->id) {
            return;
        }

        abort(403, 'Anda tidak punya izin untuk melihat data pegawai ini.');
    }

    private function applyVisibilityScope(\Illuminate\Database\Eloquent\Builder $query, User $user): void
    {
        if ($user->hasRole(['super_admin', 'admin_kepegawaian'])) {
            return; // global, tanpa filter
        }

        $scopeUnitIds = $this->scopeUnitIdsFor($user, ['pimpinan', 'admin_unit']);

        if ($scopeUnitIds === null) {
            return; // salah satu role tsb bersifat global untuk user ini
        }

        if (! empty($scopeUnitIds)) {
            $query->whereIn('work_unit_id', $this->descendantUnitIds($scopeUnitIds));

            return;
        }

        if ($user->employee_id !== null) {
            $query->where('id', $user->employee_id);

            return;
        }

        abort(403, 'Anda tidak punya izin untuk melihat data pegawai.');
    }

    /**
     * Gabungan unit_id yang di-scope langsung (BUKAN turunan) untuk
     * sekumpulan nama role. null = salah satu role tsb global untuk user ini.
     */
    private function scopeUnitIdsFor(User $user, array $roleNames): ?array
    {
        $ids = [];

        foreach ($roleNames as $roleName) {
            $scope = $user->unitScopeFor($roleName);

            if ($scope === null) {
                return null;
            }

            $ids = array_merge($ids, $scope);
        }

        return array_values(array_unique($ids));
    }

    /**
     * Perluas daftar unit_id akar ke seluruh unit turunannya (termasuk
     * dirinya sendiri) memakai v_work_unit.ancestor_ids (lihat komentar
     * WorkUnit::ancestorIds() — pola yang sama, dibalik: di sini mencari
     * SEMUA unit yang salah satu leluhurnya ada di $rootUnitIds).
     */
    private function descendantUnitIds(array $rootUnitIds): array
    {
        if (empty($rootUnitIds)) {
            return [];
        }

        $arrayLiteral = '{'.implode(',', array_map('intval', $rootUnitIds)).'}';

        return DB::table('v_work_unit')
            ->whereRaw('ancestor_ids && ?::bigint[]', [$arrayLiteral])
            ->pluck('id')
            ->all();
    }

    private function serialize(Employee $employee): array
    {
        return [
            'id' => $employee->id,
            'nip' => $employee->nip,
            'nik' => $employee->nik,
            'name' => $employee->name,
            'email' => $employee->email,
            'phone' => $employee->phone,
            'gender' => $employee->gender,
            'employment_status' => $employee->employment_status,
            'employee_type' => $employee->employee_type,
            'work_unit' => $employee->workUnit?->only(['id', 'name', 'code']),
            'structural_position' => $employee->structuralPosition?->only(['id', 'name']),
            'tmt' => $employee->tmt?->toDateString(),
            'grade' => $employee->grade,
            'rank' => $employee->rank,
            'profile_photo' => $employee->profile_photo,
            'is_active' => $employee->is_active,
            'linked_user' => $employee->user ? [
                'id' => $employee->user->id,
                'username' => $employee->user->username,
            ] : null,
            'created_at' => $employee->created_at?->toIso8601String(),
            'updated_at' => $employee->updated_at?->toIso8601String(),
        ];
    }
}