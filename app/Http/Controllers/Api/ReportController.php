<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Laporan lintas-unit untuk Admin Kepegawaian (PRD 5.13) — super_admin,
 * admin_kepegawaian saja (lihat routes/api.php).
 *
 * PRD menyebut "menandai baris yang dihadirkan manual agar dapat dibedakan
 * saat audit/penghitungan tunjangan kinerja" (5.13, catatan akhir) — kolom
 * is_manual & manual_count di bawah ini MEMENUHI itu secara eksplisit.
 *
 * EKSPOR: CSV (native PHP fputcsv, TANPA dependency baru) — dikonfirmasi
 * ke pemilik project sebagai pengganti XLSX/PDF asli (maatwebsite/excel,
 * dompdf) karena sandbox pengembangan tidak bisa akses Packagist untuk
 * instal & menguji package tsb. CSV dibuka langsung oleh Excel/LibreOffice,
 * memenuhi kebutuhan "dasar tunjangan kinerja" tanpa dependency tambahan.
 * PDF ASLI (styled, bukan CSV) TIDAK dibuat — kalau nanti dibutuhkan
 * tampilan PDF resmi (mis. kop surat), itu perlu dompdf, ditambahkan
 * terpisah kapan saja tanpa mengubah endpoint JSON/CSV yang sudah ada.
 */
class ReportController extends Controller
{
    public function attendanceRecap(Request $request): JsonResponse
    {
        [$filters, $recap] = $this->buildAttendanceRecap($request);

        return response()->json([
            'data' => $recap,
            'meta' => ['period' => ['from' => $filters['date_from'], 'to' => $filters['date_to']]],
        ]);
    }

    public function attendanceRecapCsv(Request $request): StreamedResponse
    {
        [$filters, $recap] = $this->buildAttendanceRecap($request);

        $filename = "rekap-kehadiran_{$filters['date_from']}_{$filters['date_to']}.csv";

        return $this->streamCsv($filename, [
            'NIP', 'Nama', 'Hadir', 'Terlambat', 'Pulang Cepat', 'Alpha', 'Tidak Lengkap', 'Jumlah Manual',
        ], $recap, fn ($row) => [
            $row->nip, $row->employee_name, $row->hadir, $row->terlambat,
            $row->pulang_cepat, $row->alpha, $row->tidak_lengkap, $row->manual_count,
        ]);
    }

    public function leaveUsageRecap(Request $request): JsonResponse
    {
        [$filters, $recap] = $this->buildLeaveUsageRecap($request);

        return response()->json([
            'data' => $recap,
            'meta' => [
                'year' => $filters['year'],
                'note' => 'Hanya mencakup pegawai yang sudah punya baris leave_balance untuk tahun ini (lihat catatan scope job inisialisasi saldo di LeaveRequestService).',
            ],
        ]);
    }

    public function leaveUsageRecapCsv(Request $request): StreamedResponse
    {
        [$filters, $recap] = $this->buildLeaveUsageRecap($request);

        return $this->streamCsv("penggunaan-cuti_{$filters['year']}.csv", [
            'NIP', 'Nama', 'Jenis Cuti', 'Hak', 'Sisa Thn Lalu', 'Terpakai', 'Sisa',
        ], $recap, fn ($row) => [
            $row->nip, $row->employee_name, $row->leave_type_name,
            $row->entitlement, $row->previous_year_balance, $row->used, $row->remaining,
        ]);
    }

    /**
     * @return array{0: array, 1: \Illuminate\Support\Collection}
     */
    private function buildAttendanceRecap(Request $request): array
    {
        $filters = $request->validate([
            'date_from' => ['required', 'date'],
            'date_to' => ['required', 'date', 'after_or_equal:date_from'],
            'work_unit_id' => ['sometimes', 'integer'],
        ]);

        $query = DB::table('attendance')
            ->join('employee', 'employee.id', '=', 'attendance.employee_id')
            ->whereBetween('attendance.date', [$filters['date_from'], $filters['date_to']]);

        if (isset($filters['work_unit_id'])) {
            $unitIds = $this->descendantUnitIds([$filters['work_unit_id']]);
            $query->whereIn('employee.work_unit_id', $unitIds);
        }

        $recap = $query
            ->selectRaw("
                employee.id as employee_id, employee.name as employee_name, employee.nip,
                count(*) filter (where attendance.status = 'hadir') as hadir,
                count(*) filter (where attendance.status = 'terlambat') as terlambat,
                count(*) filter (where attendance.status = 'pulang_cepat') as pulang_cepat,
                count(*) filter (where attendance.status = 'alpha') as alpha,
                count(*) filter (where attendance.status = 'tidak_lengkap') as tidak_lengkap,
                count(*) filter (where attendance.is_manual = true) as manual_count
            ")
            ->groupBy('employee.id', 'employee.name', 'employee.nip')
            ->orderBy('employee.name')
            ->get();

        return [$filters, $recap];
    }

    /**
     * @return array{0: array, 1: \Illuminate\Support\Collection}
     */
    private function buildLeaveUsageRecap(Request $request): array
    {
        $filters = $request->validate([
            'year' => ['required', 'integer', 'digits:4'],
            'work_unit_id' => ['sometimes', 'integer'],
        ]);

        $query = DB::table('leave_balance')
            ->join('employee', 'employee.id', '=', 'leave_balance.employee_id')
            ->join('leave_type', 'leave_type.id', '=', 'leave_balance.leave_type_id')
            ->where('leave_balance.year', $filters['year']);

        if (isset($filters['work_unit_id'])) {
            $unitIds = $this->descendantUnitIds([$filters['work_unit_id']]);
            $query->whereIn('employee.work_unit_id', $unitIds);
        }

        $recap = $query
            ->select([
                'employee.id as employee_id', 'employee.name as employee_name', 'employee.nip',
                'leave_type.name as leave_type_name',
                'leave_balance.entitlement', 'leave_balance.previous_year_balance',
                'leave_balance.used', 'leave_balance.remaining',
            ])
            ->orderBy('employee.name')
            ->orderBy('leave_type.name')
            ->get();

        return [$filters, $recap];
    }

    /**
     * Stream CSV native (fputcsv) — tanpa dependency baru. UTF-8 BOM
     * disisipkan di awal supaya Excel Windows tidak salah baca karakter
     * non-ASCII (nama dengan diakritik, dsb) sebagai encoding lain.
     */
    private function streamCsv(string $filename, array $header, iterable $rows, \Closure $rowMapper): StreamedResponse
    {
        return response()->streamDownload(function () use ($header, $rows, $rowMapper) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM
            fputcsv($out, $header);

            foreach ($rows as $row) {
                fputcsv($out, $rowMapper($row));
            }

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function descendantUnitIds(array $rootUnitIds): array
    {
        $arrayLiteral = '{'.implode(',', array_map('intval', $rootUnitIds)).'}';

        return DB::table('v_work_unit')
            ->whereRaw('ancestor_ids && ?::bigint[]', [$arrayLiteral])
            ->pluck('id')
            ->all();
    }
}