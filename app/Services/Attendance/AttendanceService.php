<?php

namespace App\Services\Attendance;

use App\Models\Attendance;
use App\Models\User;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\Shift;
use App\Models\ShiftSchedule;
use App\Models\WfhRequest;
use App\Models\WorkHourSetting;
use App\Models\WorkLocation;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Inti logika presensi (PRD 5.4-5.6). CATATAN PENTING SOAL SCOPE SAAT INI:
 *
 * - Face recognition SENGAJA TIDAK dipanggil di sini (arahan mentor: backend
 *   fokus dulu ke luar face recognition). `photo` tetap WAJIB disimpan
 *   (kolom attendance_log.proof_photo NOT NULL di skema), tapi
 *   face_matched/similarity_score/liveness_passed diisi placeholder
 *   (false/null/null). Titik sambung ke microservice nanti ada di method
 *   `verifyFace()` — cari komentar "TODO: sambung face recognition".
 * - `type=dinas_luar` diterima tapi BELUM divalidasi terhadap surat tugas
 *   (modul Cuti/Request belum ada) — lihat komentar di checkIn().
 */
class AttendanceService
{
    /**
     * @throws AttendanceValidationException
     */
    public function checkIn(Employee $employee, array $data): Attendance
    {
        $now = Carbon::now();
        $today = $now->toDateString();
        $type = $data['type']; // wfo | wfh | shift | dinas_luar

        $mode = $employee->workUnit->effectiveAttendanceMode(); // 'reguler' | 'shift'

        $shift = null;
        if ($mode === 'shift') {
            $schedule = ShiftSchedule::with('shift')
                ->where('employee_id', $employee->id)
                ->where('date', $today)
                ->first();

            if (! $schedule) {
                throw new AttendanceValidationException(
                    'Anda belum dijadwalkan shift untuk hari ini. Hubungi admin unit.',
                    'no_shift_scheduled',
                );
            }

            $shift = $schedule->shift;
        }

        // --- Cek record ganda: WHERE employee_id=X AND date=Y AND shift_id
        // (IS NULL atau =nilai) secara EKSPLISIT, bukan andalkan UNIQUE
        // constraint di DB. Postgres menganggap NULL != NULL di unique
        // index, jadi constraint (employee_id, date, shift_id) TIDAK
        // mencegah duplikat untuk shift_id NULL (mode reguler) — DB akan
        // diam-diam menerima banyak baris. Pengecekan manual ini WAJIB.
        $existing = Attendance::where('employee_id', $employee->id)
            ->where('date', $today)
            ->where(fn ($q) => $shift ? $q->where('shift_id', $shift->id) : $q->whereNull('shift_id'))
            ->first();

        if ($existing && $existing->check_in) {
            throw new AttendanceValidationException(
                'Anda sudah melakukan presensi masuk hari ini.',
                'already_checked_in',
            );
        }

        // --- Validasi lokasi ---
        $workLocationId = null;
        $distanceMeters = null;
        $withinRadius = null;

        if ($type === 'wfh') {
            if (! $this->hasApprovedWfh($employee, $today)) {
                throw new AttendanceValidationException(
                    'Tidak ada pengajuan WFH yang disetujui untuk tanggal ini.',
                    'wfh_not_approved',
                );
            }
            // Radius DILEWATI untuk WFH (PRD 5.5), tapi lat/lng tetap
            // direkam di attendance_log sbg informasi (bukan syarat lolos).
        } elseif ($type === 'dinas_luar') {
            // TODO: begitu modul Cuti/Request ada, validasi surat tugas
            // (request kategori dinas_luar, status=disetujui) mencakup
            // tanggal ini di sini, seperti hasApprovedWfh() di atas.
            // Untuk sekarang: diterima tanpa validasi surat tugas — JANGAN
            // dianggap aman untuk production sebelum itu disambung.
        } else {
            // wfo / shift: WAJIB dalam radius salah satu lokasi unit.
            [$location, $distanceMeters, $withinRadius] = $this->resolveNearestLocation(
                $employee, (float) $data['latitude'], (float) $data['longitude'],
            );

            if (! $location) {
                throw new AttendanceValidationException(
                    'Unit kerja Anda belum memiliki lokasi presensi terdaftar. Hubungi Super Admin.',
                    'no_work_location',
                );
            }

            if (! $withinRadius) {
                throw new AttendanceValidationException(
                    "Anda berada {$distanceMeters}m dari lokasi kerja (radius maksimal {$location->radius_meters}m).",
                    'out_of_radius',
                );
            }

            $workLocationId = $location->id;
        }

        // --- Face recognition: SKIP (lihat docblock kelas ini) ---
        $faceResult = $this->verifyFace($data['photo'] ?? null);

        return DB::transaction(function () use (
            $employee, $today, $type, $shift, $workLocationId, $now,
            $data, $distanceMeters, $withinRadius, $faceResult, $existing,
        ) {
            $attendance = $existing ?? new Attendance([
                'employee_id' => $employee->id,
                'date' => $today,
                'type' => $type,
                'shift_id' => $shift?->id,
            ]);

            $attendance->work_location_id = $workLocationId;
            $attendance->check_in = $now;
            $attendance->status = $this->evaluateCheckInStatus($employee, $mode, $shift, $now);
            $attendance->save();

            AttendanceLog::create([
                'attendance_id' => $attendance->id,
                'employee_id' => $employee->id,
                'type' => 'masuk',
                'recorded_at' => $now,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'distance_meters' => $distanceMeters !== null ? (int) round($distanceMeters) : null,
                'within_radius' => $withinRadius,
                'proof_photo' => $faceResult['proof_photo'],
                'similarity_score' => $faceResult['similarity_score'],
                'face_matched' => $faceResult['face_matched'],
                'liveness_passed' => $faceResult['liveness_passed'],
                'device_info' => $data['device_info'] ?? null,
                'ip_address' => request()?->ip(),
            ]);

            return $attendance;
        });
    }

    /**
     * @throws AttendanceValidationException
     */
    public function checkOut(Employee $employee, array $data): Attendance
    {
        $now = Carbon::now();
        $today = $now->toDateString();

        $attendance = Attendance::where('employee_id', $employee->id)
            ->where('date', $today)
            ->whereNotNull('check_in')
            ->whereNull('check_out')
            ->orderByDesc('check_in')
            ->first();

        if (! $attendance) {
            throw new AttendanceValidationException(
                'Tidak ditemukan presensi masuk yang menunggu presensi keluar hari ini.',
                'no_open_check_in',
            );
        }

        $mode = $employee->workUnit->effectiveAttendanceMode();
        $shift = $attendance->shift_id ? Shift::find($attendance->shift_id) : null;

        // Lokasi untuk check-out: aturan berdasar type yang SUDAH ditetapkan
        // saat check-in (tidak boleh ganti type di tengah hari kerja).
        $distanceMeters = null;
        $withinRadius = null;

        if (in_array($attendance->type, ['wfo', 'shift'], true)) {
            [$location, $distanceMeters, $withinRadius] = $this->resolveNearestLocation(
                $employee, (float) $data['latitude'], (float) $data['longitude'],
            );

            if (! $location || ! $withinRadius) {
                throw new AttendanceValidationException(
                    'Anda harus berada di lokasi kerja untuk presensi keluar.',
                    'out_of_radius',
                );
            }
        }

        $faceResult = $this->verifyFace($data['photo'] ?? null);

        $durationMinutes = (int) $attendance->check_in->diffInMinutes($now);

        return DB::transaction(function () use (
            $employee, $attendance, $now, $mode, $shift, $durationMinutes,
            $data, $distanceMeters, $withinRadius, $faceResult,
        ) {
            $attendance->check_out = $now;
            $attendance->duration_minutes = $durationMinutes;
            $attendance->status = $this->evaluateFinalStatus($employee, $mode, $shift, $attendance, $now);
            $attendance->save();

            AttendanceLog::create([
                'attendance_id' => $attendance->id,
                'employee_id' => $employee->id,
                'type' => 'keluar',
                'recorded_at' => $now,
                'latitude' => $data['latitude'] ?? null,
                'longitude' => $data['longitude'] ?? null,
                'distance_meters' => $distanceMeters !== null ? (int) round($distanceMeters) : null,
                'within_radius' => $withinRadius,
                'proof_photo' => $faceResult['proof_photo'],
                'similarity_score' => $faceResult['similarity_score'],
                'face_matched' => $faceResult['face_matched'],
                'liveness_passed' => $faceResult['liveness_passed'],
                'device_info' => $data['device_info'] ?? null,
                'ip_address' => request()?->ip(),
            ]);

            return $attendance;
        });
    }

    /**
     * Penghadiran manual (PRD 5.17) untuk pegawai yang TIDAK punya catatan
     * presensi sama sekali pada tanggal tsb (mis. lupa absen total). Kalau
     * catatan untuk (employee_id, date, shift_id) sudah ada, ini SENGAJA
     * ditolak — PRD membedakan "menandai hadir" (tidak ada catatan, endpoint
     * ini) dari "melengkapi/menyunting" (catatan sudah ada, pakai
     * correctAttendance()). Otorisasi peran (pimpinan/verifikator dsb)
     * BUKAN tanggung jawab service ini — sudah dicek di controller sebelum
     * method ini dipanggil.
     *
     * TIDAK membuat baris attendance_log — PRD 5.17 eksplisit: "presensi_log
     * tidak dibuat untuk punch manual" (beda dengan checkIn/checkOut).
     *
     * @throws AttendanceValidationException
     */
    public function markPresent(Employee $employee, User $actor, array $data): Attendance
    {
        $date = $data['date'];
        $mode = $employee->workUnit->effectiveAttendanceMode();
        $shift = $mode === 'shift' ? $this->resolveShiftForDate($employee, $date) : null;

        $existing = Attendance::where('employee_id', $employee->id)
            ->where('date', $date)
            ->where(fn ($q) => $shift ? $q->where('shift_id', $shift->id) : $q->whereNull('shift_id'))
            ->first();

        if ($existing) {
            throw new AttendanceValidationException(
                'Sudah ada catatan presensi untuk pegawai & tanggal ini. Gunakan endpoint koreksi (PATCH /attendance/{attendance}/correct) untuk menyunting.',
                'attendance_already_exists',
            );
        }

        return DB::transaction(function () use ($employee, $actor, $date, $mode, $shift, $data) {
            $checkIn = $data['check_in'] ?? null;
            $checkOut = $data['check_out'] ?? null;

            return Attendance::create([
                'employee_id' => $employee->id,
                'date' => $date,
                'type' => $mode === 'shift' ? 'shift' : 'wfo',
                'shift_id' => $shift?->id,
                'check_in' => $checkIn,
                'check_out' => $checkOut,
                'duration_minutes' => ($checkIn && $checkOut)
                    ? Carbon::parse($checkIn)->diffInMinutes(Carbon::parse($checkOut))
                    : null,
                'status' => $data['status'],
                'is_manual' => true,
                'verified_by' => $actor->id,
                'verified_at' => Carbon::now(),
                'correction_reason' => $data['correction_reason'],
            ]);
        });
    }

    /**
     * Koreksi/lengkapi catatan presensi yang SUDAH ADA (PRD 5.17).
     *
     * @throws AttendanceValidationException
     */
    public function correctAttendance(Attendance $attendance, User $actor, array $data): Attendance
    {
        return DB::transaction(function () use ($attendance, $actor, $data) {
            if (array_key_exists('check_in', $data) && $data['check_in'] !== null) {
                $attendance->check_in = $data['check_in'];
            }
            if (array_key_exists('check_out', $data) && $data['check_out'] !== null) {
                $attendance->check_out = $data['check_out'];
            }

            $hasExplicitStatus = array_key_exists('status', $data) && $data['status'] !== null;

            if ($attendance->check_in && $attendance->check_out) {
                $attendance->duration_minutes = $attendance->check_in->diffInMinutes($attendance->check_out);

                if (! $hasExplicitStatus) {
                    $employee = $attendance->employee ?? Employee::findOrFail($attendance->employee_id);
                    $mode = $employee->workUnit->effectiveAttendanceMode();
                    $shift = $attendance->shift_id ? Shift::find($attendance->shift_id) : null;

                    $attendance->status = $this->evaluateFinalStatus(
                        $employee, $mode, $shift, $attendance, $attendance->check_out,
                    );
                }
            }

            if ($hasExplicitStatus) {
                $attendance->status = $data['status'];
            }

            $attendance->is_manual = true;
            $attendance->verified_by = $actor->id;
            $attendance->verified_at = Carbon::now();
            $attendance->correction_reason = $data['correction_reason'];
            $attendance->save();

            return $attendance;
        });
    }

    private function resolveShiftForDate(Employee $employee, string $date): ?Shift
    {
        return ShiftSchedule::with('shift')
            ->where('employee_id', $employee->id)
            ->where('date', $date)
            ->first()?->shift;
    }

    /**
     * Cari lokasi TERDEKAT dari semua lokasi aktif unit pegawai (bukan cuma
     * lokasi pertama yang kebetulan dalam radius) — unit dg banyak gedung
     * (PRD 4.3: "satu unit dapat memiliki banyak titik lokasi") butuh ini,
     * supaya pegawai di gedung B tidak ditolak gara-gara dihitung dari
     * gedung A yang jauh.
     *
     * @return array{0: ?WorkLocation, 1: ?float, 2: ?bool} [lokasi_terdekat, jarak_meter, dalam_radius]
     */
    private function resolveNearestLocation(Employee $employee, float $lat, float $lng): array
    {
        $locations = WorkLocation::where('work_unit_id', $employee->work_unit_id)
            ->where('is_active', true)
            ->get();

        if ($locations->isEmpty()) {
            return [null, null, null];
        }

        $best = null;
        $bestDistance = null;

        foreach ($locations as $location) {
            $distance = $location->distanceFrom($lat, $lng);

            if ($bestDistance === null || $distance < $bestDistance) {
                $best = $location;
                $bestDistance = $distance;
            }
        }

        return [$best, $bestDistance, $best->isWithinRadius($lat, $lng)];
    }

    private function hasApprovedWfh(Employee $employee, string $date): bool
    {
        return WfhRequest::where('employee_id', $employee->id)
            ->where('status', 'disetujui')
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->exists();
    }

    /**
     * TODO: sambung face recognition di sini. Untuk sekarang: simpan foto
     * sbg bukti (proof_photo WAJIB diisi di skema), tapi similarity/liveness
     * placeholder — JANGAN dianggap terverifikasi wajahnya.
     *
     * @return array{proof_photo: string, similarity_score: ?float, face_matched: bool, liveness_passed: ?bool}
     */
    private function verifyFace(?string $photoPath): array
    {
        if (! $photoPath) {
            throw new AttendanceValidationException('Foto presensi wajib disertakan.', 'photo_required');
        }

        return [
            'proof_photo' => $photoPath,
            'similarity_score' => null,
            'face_matched' => false, // eksplisit false, BUKAN "diasumsikan lolos"
            'liveness_passed' => null,
        ];
    }

    private function evaluateCheckInStatus(Employee $employee, string $mode, ?Shift $shift, Carbon $checkInAt): string
    {
        $lateThreshold = $mode === 'shift' && $shift
            ? $this->shiftTimeOn($checkInAt, $shift->start_time)->addMinutes($shift->tolerance_minutes)
            : $this->settingTimeOn($employee, $checkInAt, 'late_threshold');

        if ($lateThreshold && $checkInAt->gt($lateThreshold)) {
            return 'terlambat';
        }

        // Belum checkout -> tetap 'tidak_lengkap' sampai selesai, KECUALI
        // sudah pasti terlambat (baris di atas). Status final (hadir/
        // pulang_cepat) baru ditentukan setelah checkout.
        return 'tidak_lengkap';
    }

    private function evaluateFinalStatus(
        Employee $employee, string $mode, ?Shift $shift, Attendance $attendance, Carbon $checkOutAt,
    ): string {
        $category = $employee->workHourCategory();
        $minMinutes = $mode === 'shift'
            ? null // durasi minimal per kategori (PRD 5.3) berlaku mode reguler; shift dievaluasi thd jadwal shift itu sendiri.
            : WorkHourSetting::resolveFor($employee->work_unit_id, $category)?->min_minutes;

        $isLate = $attendance->status === 'terlambat';

        $standardCheckOut = $mode === 'shift' && $shift
            ? $this->shiftTimeOn($checkOutAt, $shift->end_time, $shift->is_overnight)->subMinutes($shift->tolerance_minutes)
            : $this->settingTimeOn($employee, $checkOutAt, 'standard_check_out');

        $isEarly = $standardCheckOut && $checkOutAt->lt($standardCheckOut);

        // PRD tidak eksplisit menentukan prioritas kalau terlambat DAN
        // pulang cepat terjadi bersamaan (status cuma satu nilai enum).
        // Keputusan di sini: 'terlambat' menang atas 'pulang_cepat' —
        // ASUMSI, bukan aturan tertulis PRD. Perlu dikonfirmasi ke
        // pembimbing/Admin Kepegawaian kalau prioritas sebenarnya terbalik.
        if ($isLate) {
            return 'terlambat';
        }

        if ($isEarly) {
            return 'pulang_cepat';
        }

        if ($minMinutes !== null && $attendance->duration_minutes < $minMinutes) {
            return 'tidak_lengkap';
        }

        return 'hadir';
    }

    private function settingTimeOn(Employee $employee, Carbon $referenceDate, string $column): ?Carbon
    {
        $category = $employee->workHourCategory();
        $setting = WorkHourSetting::resolveFor($employee->work_unit_id, $category);

        if (! $setting || ! $setting->$column) {
            return null;
        }

        return $referenceDate->copy()->setTimeFromTimeString($setting->$column);
    }

    private function shiftTimeOn(Carbon $referenceDate, string $time, bool $isOvernight = false): Carbon
    {
        $result = $referenceDate->copy()->setTimeFromTimeString($time);

        // Shift lintas tengah malam: kalau jam target "lebih pagi" dari jam
        // check-in/out saat ini secara angka, itu maksudnya besok paginya
        // (mis. shift malam 21:00-07:00, check-out jam 06:50 -> end_time
        // 07:00 harus dianggap +1 hari dari mulai shift, bukan hari yg sama).
        if ($isOvernight && $result->lt($referenceDate->copy()->startOfDay()->addHours(12))) {
            $result->addDay();
        }

        return $result;
    }
}
