<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkUnit;
use Illuminate\Http\JsonResponse;
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
    public function tree(): JsonResponse
    {
        $rows = DB::table('v_work_unit')->orderBy('path')->get();

        return response()->json(['data' => $rows]);
    }

    public function show(WorkUnit $workUnit): JsonResponse
    {
        $workUnit->load('locations');

        return response()->json([
            'data' => [
                ...$workUnit->toArray(),
                'attendance_mode_effective' => $workUnit->effectiveAttendanceMode(),
            ],
        ]);
    }
}
