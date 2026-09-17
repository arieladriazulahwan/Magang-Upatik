<?php

namespace App\Services\Attendance;

use App\Models\Attendance;
use App\Models\AppSetting;
use App\Models\User;
use App\Models\AttendanceLog;
use App\Models\Employee;
use App\Models\Shift;
use App\Models\ShiftSchedule;
use App\Models\WfhRequest;
use App\Models\WorkHourSetting;
use App\Models\WorkLocation;
use App\Models\WorkUnit;
use App\Services\Face\FaceRecognitionException;
use App\Services\Face\FaceRecognitionService;
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
    public function __construct(private readonly FaceRecognitionService $faceRecognition) {}

    /**
     * @throws AttendanceValidationException
     */
    public function checkIn(Employee $employee, array $data): Attendance
    {
        if (! $employee->attendance_active) {
            throw new AttendanceValidationException(
                'Akun Anda belum diaktifkan untuk presensi. Hubungi Admin Kepegawaian.',
                'attendance_not_active',
            );
        }

        $now = Carbon::now();
        $today = $now->toDateString();
        $type = $data['type']; // wfo | wfh | shift | dinas_luar

        $mode = $this->attendanceModeFor($employee); // 'reguler' | 'shift'
        $schedule = ShiftSchedule::with('shift')
            ->where('employee_id', $employee->id)
            ->where('date', $today)
            ->first();

        $shift = null;
        if ($schedule) {
            $mode = 'shift';
            $type = 'shift';
            $shift = $schedule->shift;
        } elseif ($mode === 'shift') {
            if (! $schedule) {
                throw new AttendanceValidationException(
                    'Anda belum dijadwalkan shift untuk hari ini. Hubungi admin unit.',
                    'no_shift_scheduled',
                );
            }
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
                    'Unit presensi Anda belum memiliki titik lokasi aktif. Hubungi Admin Unit.',
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

        // Face recognition biometrik belum aktif; tahap ini memastikan pegawai
        // sudah punya data wajah aktif sebelum foto presensi diterima.
        $faceResult = $this->verifyFace($employee, $data['photo'] ?? null);

        return DB::transaction(function () use (
            $employee, $today, $type, $mode, $shift, $workLocationId, $now,
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

        $mode = $this->attendanceModeFor($employee);
        $shift = $attendance->shift_id ? Shift::find($attendance->shift_id) : null;
        $durationMinutes = (int) $attendance->check_in->diffInMinutes($now);

        $this->assertMinimumWorkDurationBeforeCheckOut(
            $employee,
            $mode,
            $attendance,
            $durationMinutes,
        );

        // Check-out dapat dilakukan dari mana saja. Lokasi tetap direkam di
        // attendance_log sebagai informasi, tapi tidak menjadi syarat lolos.
        $distanceMeters = null;
        $withinRadius = null;

        $faceResult = $this->verifyFace($employee, $data['photo'] ?? null);

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
        $mode = $this->attendanceModeFor($employee);
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
     * Pengajuan koreksi dari pegawai. Data ini belum dianggap koreksi manual
     * sampai admin/pimpinan memverifikasi lewat correctAttendance().
     *
     * @throws AttendanceValidationException
     */
    public function requestCorrection(Employee $employee, User $actor, array $data): Attendance
    {
        $date = $data['date'];

        if (! $actor->hasGlobalRole('super_admin')) {
            $requestDate = Carbon::parse($date)->startOfDay();
            $oldestAllowedDate = Carbon::today()->subDays(6);

            if ($requestDate->lt($oldestAllowedDate)) {
                throw new AttendanceValidationException(
                    'Pengajuan perbaikan kehadiran hanya dapat diajukan maksimal 7 hari terakhir. Hubungi Super Admin untuk koreksi tanggal yang lebih lama.',
                    'attendance_correction_window_expired',
                );
            }
        }

        $mode = $this->attendanceModeFor($employee);
        $shift = $mode === 'shift' ? $this->resolveShiftForDate($employee, $date) : null;
        $requestedTimes = collect([
            isset($data['check_in']) && $data['check_in']
                ? 'masuk '.Carbon::parse($data['check_in'])->format('H:i')
                : null,
            isset($data['check_out']) && $data['check_out']
                ? 'pulang '.Carbon::parse($data['check_out'])->format('H:i')
                : null,
        ])->filter()->implode(', ');

        $reason = $requestedTimes
            ? "Pengajuan koreksi ({$requestedTimes}). Alasan: {$data['correction_reason']}"
            : $data['correction_reason'];

        return DB::transaction(function () use ($employee, $date, $mode, $shift, $reason) {
            $attendance = Attendance::where('employee_id', $employee->id)
                ->where('date', $date)
                ->where(fn ($q) => $shift ? $q->where('shift_id', $shift->id) : $q->whereNull('shift_id'))
                ->lockForUpdate()
                ->first();

            if (! $attendance) {
                $attendance = new Attendance([
                    'employee_id' => $employee->id,
                    'date' => $date,
                    'type' => $mode === 'shift' ? 'shift' : 'wfo',
                    'shift_id' => $shift?->id,
                    'status' => 'tidak_lengkap',
                ]);
            }

            $attendance->correction_reason = $reason;

            if (! $attendance->status || $attendance->status === 'hadir') {
                $attendance->status = 'tidak_lengkap';
            }

            $attendance->save();

            return $attendance;
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
                    $mode = $this->attendanceModeFor($employee);
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

    private function currentUnitIdFor(Employee $employee): int
    {
        $employee->loadMissing(['user.roleUsers.role']);

        $scopedRole = $employee->user?->roleUsers
            ->filter(fn ($roleUser) => $roleUser->work_unit_id !== null)
            ->first(fn ($roleUser) => in_array($roleUser->role?->name, ['pimpinan', 'admin_unit'], true));

        return (int) ($scopedRole?->work_unit_id ?: $employee->work_unit_id);
    }

    private function attendanceModeFor(Employee $employee): string
    {
        $workUnit = WorkUnit::find($this->currentUnitIdFor($employee));

        return $workUnit?->effectiveAttendanceMode() ?? 'reguler';
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
        $locations = WorkLocation::where('work_unit_id', $this->currentUnitIdFor($employee))
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
     * Mode reguler mengikuti durasi minimal kategori pegawai:
     * dosen, dosen tugas tambahan, atau tenaga kependidikan.
     * Mode shift tetap mengikuti jadwal shift dan tidak dipaksa oleh aturan
     * kategori ini karena durasi shift bisa berbeda-beda per jadwal.
     *
     * @throws AttendanceValidationException
     */
    private function assertMinimumWorkDurationBeforeCheckOut(
        Employee $employee,
        string $mode,
        Attendance $attendance,
        int $durationMinutes,
    ): void {
        if ($mode === 'shift') {
            return;
        }

        $category = $employee->workHourCategory();
        $setting = WorkHourSetting::resolveFor($this->currentUnitIdFor($employee), $category);
        $minimumMinutes = $setting?->min_minutes;

        if (! $minimumMinutes || $durationMinutes >= $minimumMinutes) {
            return;
        }

        $earliestCheckOut = $attendance->check_in->copy()->addMinutes($minimumMinutes);

        throw new AttendanceValidationException(
            sprintf(
                'Belum bisa presensi pulang. Minimal jam kerja %s sejak presensi masuk. Anda baru bekerja %s. Presensi pulang dapat dilakukan mulai %s WITA.',
                $this->formatDurationLabel($minimumMinutes),
                $this->formatDurationLabel($durationMinutes),
                $earliestCheckOut->format('H:i'),
            ),
            'minimum_work_duration_not_met',
        );
    }

    private function formatDurationLabel(int $minutes): string
    {
        $hours = intdiv($minutes, 60);
        $remainingMinutes = $minutes % 60;

        if ($hours > 0 && $remainingMinutes > 0) {
            return "{$hours} jam {$remainingMinutes} menit";
        }

        if ($hours > 0) {
            return "{$hours} jam";
        }

        return "{$remainingMinutes} menit";
    }

    /**
     * TODO: sambung face recognition di sini. Untuk sekarang: simpan foto
     * sbg bukti (proof_photo WAJIB diisi di skema), tapi similarity/liveness
     * placeholder — JANGAN dianggap terverifikasi wajahnya.
     *
     * @return array{proof_photo: string, similarity_score: ?float, face_matched: bool, liveness_passed: ?bool}
     */
    private function verifyFace(Employee $employee, ?string $photoPath): array
    {
        if (! $photoPath) {
            throw new AttendanceValidationException('Foto presensi wajib disertakan.', 'photo_required');
        }

        $registeredFaces = $employee->activeFaceData()->get();

        if ($registeredFaces->isEmpty()) {
            throw new AttendanceValidationException(
                'Wajah belum terdaftar. Silakan daftarkan wajah melalui halaman profil sebelum presensi.',
                'face_not_registered',
            );
        }

        try {
            $result = $this->faceRecognition->verify($photoPath, $registeredFaces);
        } catch (FaceRecognitionException $e) {
            throw new AttendanceValidationException($e->getMessage(), $e->errorKey);
        }

        if (! ($result['matched'] ?? false)) {
            throw new AttendanceValidationException(
                'Verifikasi wajah gagal. Pastikan wajah sesuai dengan data terdaftar dan pencahayaan cukup.',
                'face_not_matched',
            );
        }

        return [
            'proof_photo' => $photoPath,
            'similarity_score' => $result['similarity_score'],
            'face_matched' => $result['matched'],
            'liveness_passed' => $result['liveness_passed'],
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
            : WorkHourSetting::resolveFor($this->currentUnitIdFor($employee), $category)?->min_minutes;

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
        $policyDay = $this->workingDayPolicyFor($referenceDate);

        if ($policyDay) {
            if ($column === 'standard_check_in' && ! empty($policyDay['start_time'])) {
                return $referenceDate->copy()->setTimeFromTimeString($policyDay['start_time']);
            }

            if ($column === 'standard_check_out' && ! empty($policyDay['end_time'])) {
                return $referenceDate->copy()->setTimeFromTimeString($policyDay['end_time']);
            }
        }

        $category = $employee->workHourCategory();
        $setting = WorkHourSetting::resolveFor($this->currentUnitIdFor($employee), $category);

        if (! $setting || ! $setting->$column) {
            return null;
        }

        return $referenceDate->copy()->setTimeFromTimeString($setting->$column);
    }

    private function workingDayPolicyFor(Carbon $date): ?array
    {
        $setting = AppSetting::where('key', 'working_days_policy')->first();

        if (! $setting || ! $setting->value) {
            return null;
        }

        $days = json_decode((string) $setting->value, true);

        if (! is_array($days)) {
            return null;
        }

        $dayCode = strtolower($date->englishDayOfWeek);
        $day = collect($days)->first(fn ($item) => ($item['dayCode'] ?? null) === $dayCode);

        if (! is_array($day) || ! ($day['is_active'] ?? false)) {
            return null;
        }

        return $day;
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
