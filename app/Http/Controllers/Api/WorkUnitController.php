<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\WorkUnit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Contoh endpoint pertama di luar auth, untuk membuktikan pola RBAC +
 * struktur pohon unit kerja jalan end-to-end. Dipakai Web Admin untuk
 * tampilan pohon organisasi (PRD 4.3, 5.1) dan Mobile untuk dropdown
 * unit saat, mis., melihat lokasi presensi.
 */
class WorkUnitController extends Controller
{
    /** Pohon lengkap via v_work_unit (breadcrumb, level, ancestor_ids sudah dihitung DB). */
    public function tree(Request $request): JsonResponse
    {
        $query = DB::table('v_work_unit')->orderBy('path');
        $unitIds = $request->user()?->scopedUnitIds();

        if ($unitIds !== null) {
            $query->whereIn('id', $unitIds);
        }

        $rows = $query->get();

        return response()->json(['data' => $rows]);
    }

    public function show(Request $request, WorkUnit $workUnit): JsonResponse
    {
        $unitIds = $request->user()?->scopedUnitIds();

        if ($unitIds !== null && ! in_array($workUnit->id, $unitIds, true)) {
            abort(403, 'Anda tidak punya izin untuk melihat unit kerja ini.');
        }

        $workUnit->load('locations');

        return response()->json([
            'data' => [
                ...$workUnit->toArray(),
                'attendance_mode_effective' => $workUnit->effectiveAttendanceMode(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'parent_id' => ['nullable', 'integer', 'exists:work_unit,id'],
            'code' => ['sometimes', 'nullable', 'string', 'max:30', 'unique:work_unit,code'],
            'kode' => ['sometimes', 'nullable', 'string', 'max:30', 'unique:work_unit,code'],
            'name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'nama' => ['sometimes', 'nullable', 'string', 'max:150'],
            'type' => ['sometimes', 'nullable', 'in:universitas,rektorat,fakultas,pascasarjana,biro,lembaga,upt,rumah_sakit,jurusan,program_studi,bagian,sub_bagian,laboratorium,instalasi,ruangan,koordinator,lainnya'],
            'attendance_mode' => ['sometimes', 'nullable', 'in:reguler,shift'],
            'wfh_allowed' => ['sometimes', 'boolean'],
            'max_wfh_per_month' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:31'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $name = trim((string) ($data['name'] ?? $data['nama'] ?? ''));
        $code = strtoupper(trim((string) ($data['code'] ?? $data['kode'] ?? '')));

        if ($name === '') {
            return response()->json([
                'message' => 'Nama unit kerja wajib diisi.',
            ], 422);
        }

        if ($code === '') {
            return response()->json([
                'message' => 'Kode unit kerja wajib diisi.',
            ], 422);
        }

        $workUnit = WorkUnit::create([
            'parent_id' => $data['parent_id'] ?? null,
            'code' => $code,
            'name' => $name,
            'type' => $data['type'] ?? 'lainnya',
            'attendance_mode' => $data['attendance_mode'] ?? null,
            'wfh_allowed' => $data['wfh_allowed'] ?? false,
            'max_wfh_per_month' => $data['max_wfh_per_month'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        ActivityLog::record('work_unit.create', $workUnit, $data);

        return response()->json(['data' => $workUnit], 201);
    }
}
