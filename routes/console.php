<?php

use App\Models\Employee;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\StructuralPosition;
use App\Models\User;
use App\Models\WorkUnit;
use App\Services\Attendance\AttendanceReconciliationService;
use App\Services\Calendar\GoogleCalendarService;
use App\Services\Leave\LeaveBalanceService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('holidays:sync-google {--year=} {--direction=push} {--preview=0}', function (GoogleCalendarService $calendar) {
    $year = $this->option('year') ? (int) $this->option('year') : now('Asia/Makassar')->year;
    $direction = (string) $this->option('direction');
    $preview = (int) $this->option('preview');

    try {
        if ($preview > 0) {
            $events = $calendar->previewHolidayEvents($year, $preview);
            $this->table(['Tanggal', 'Nama', 'Format', 'Masuk holiday?'], $events);

            return self::SUCCESS;
        }

        $result = match ($direction) {
            'pull' => $calendar->pullHolidays($year),
            'push' => $calendar->syncHolidays($year),
            default => throw new InvalidArgumentException('Direction harus push atau pull.'),
        };
    } catch (Throwable $e) {
        $this->error($e->getMessage());

        return self::FAILURE;
    }

    $this->info('Sinkronisasi Google Calendar selesai.');
    $this->table(['Item', 'Jumlah'], collect($result)->map(fn ($value, $key) => [$key, $value])->all());

    return self::SUCCESS;
})->purpose('Sinkronisasi hari libur dari/ke Google Calendar');

Artisan::command('calendar:sync-google {--year=} {--type=all} {--retry} {--limit=50}', function (GoogleCalendarService $calendar) {
    $year = $this->option('year') ? (int) $this->option('year') : now('Asia/Makassar')->year;
    $type = (string) $this->option('type');
    $limit = max(1, (int) $this->option('limit'));
    $result = [];

    try {
        if ((bool) $this->option('retry')) {
            $result['retry'] = $calendar->retryPendingSyncs($limit);
        }

        if (in_array($type, ['all', 'holidays', 'libur'], true)) {
            $result['hari_libur'] = $calendar->syncHolidays($year);
        }

        if (in_array($type, ['all', 'leaves', 'cuti', 'pengajuan'], true)) {
            $result['cuti_disetujui'] = $calendar->syncApprovedLeaveRequests($year);
        }

        if ($result === []) {
            throw new InvalidArgumentException('Type harus all, holidays/libur, atau leaves/cuti/pengajuan.');
        }
    } catch (Throwable $e) {
        $this->error($e->getMessage());

        return self::FAILURE;
    }

    $this->info('Sinkronisasi Google Calendar selesai.');

    foreach ($result as $section => $items) {
        $this->line('');
        $this->line(str_replace('_', ' ', strtoupper($section)));
        $this->table(['Item', 'Jumlah'], collect($items)->map(fn ($value, $key) => [$key, $value])->all());
    }

    return self::SUCCESS;
})->purpose('Sinkronisasi ulang hari libur, cuti disetujui, dan retry antrean Google Calendar');

Artisan::command('calendar:retry-google {--limit=50}', function (GoogleCalendarService $calendar) {
    $result = $calendar->retryPendingSyncs(max(1, (int) $this->option('limit')));

    $this->info('Retry sinkronisasi Google Calendar selesai.');
    $this->table(['Item', 'Jumlah'], collect($result)->map(fn ($value, $key) => [$key, $value])->all());

    return self::SUCCESS;
})->purpose('Retry antrean Google Calendar yang tertunda atau gagal');

Artisan::command('calendar:attendance-reminders {date?} {--popup=15}', function (GoogleCalendarService $calendar) {
    $date = $this->argument('date') ?: now('Asia/Makassar')->toDateString();
    $popupMinutes = max(0, (int) $this->option('popup'));
    $result = $calendar->syncAttendanceReminders($date, $popupMinutes);

    $this->info('Sinkronisasi reminder presensi selesai untuk '.$date.'.');
    $this->table(['Item', 'Jumlah'], collect($result)->map(fn ($value, $key) => [$key, $value])->all());

    return ($result['gagal'] ?? 0) > 0 ? self::FAILURE : self::SUCCESS;
})->purpose('Buat reminder Google Calendar untuk jangan lupa absen masuk dan pulang');

Artisan::command('attendance:sync-approved-leaves {--from=} {--to=} {--request-id=} {--dry-run}', function (AttendanceReconciliationService $attendance) {
    $requestId = $this->option('request-id') ? (int) $this->option('request-id') : null;
    $result = $attendance->syncApprovedLeaveRequests(
        $this->option('from') ?: null,
        $this->option('to') ?: null,
        $requestId,
        (bool) $this->option('dry-run'),
    );

    $this->info($this->option('dry-run') ? 'Preview sinkronisasi pengajuan disetujui.' : 'Sinkronisasi pengajuan disetujui selesai.');
    $this->table(['Item', 'Jumlah'], collect($result)->map(fn ($value, $key) => [$key, $value])->all());

    return self::SUCCESS;
})->purpose('Isi status cuti/izin/sakit/dinas pada attendance dari pengajuan yang sudah disetujui');

Artisan::command('attendance:mark-alpha {date?} {--work-unit-id=} {--dry-run}', function (AttendanceReconciliationService $attendance) {
    $date = $this->argument('date') ?: now('Asia/Makassar')->subDay()->toDateString();
    $workUnitId = $this->option('work-unit-id') ? (int) $this->option('work-unit-id') : null;
    $result = $attendance->markAlphaForDate($date, $workUnitId, (bool) $this->option('dry-run'));

    $this->info(($this->option('dry-run') ? 'Preview' : 'Penandaan').' alpha untuk '.$date.'.');
    $this->table(['Item', 'Jumlah'], collect($result)->map(fn ($value, $key) => [$key, $value])->all());

    return self::SUCCESS;
})->purpose('Tandai alpha untuk pegawai yang tidak punya presensi/pengajuan pada hari kerja');

Artisan::command('attendance:activate-employees {--nip=*} {--all} {--deactivate}', function () {
    $nips = array_values(array_filter(array_map('trim', (array) $this->option('nip'))));

    if (! $this->option('all') && empty($nips)) {
        $this->error('Gunakan --nip=NIP untuk pegawai tertentu atau --all untuk semua pegawai.');

        return self::FAILURE;
    }

    $query = Employee::query();

    if (! $this->option('all')) {
        $query->whereIn('nip', $nips);
    }

    $active = ! (bool) $this->option('deactivate');
    $count = $query->update(['attendance_active' => $active]);

    $this->info(($active ? 'Aktivasi' : 'Nonaktivasi').' presensi pegawai selesai.');
    $this->table(['Item', 'Jumlah'], [
        ['updated', $count],
        ['attendance_active', $active ? 'true' : 'false'],
    ]);

    return self::SUCCESS;
})->purpose('Aktifkan/nonaktifkan pegawai yang ikut sistem presensi dan alpha otomatis');

Artisan::command('leave-balances:init {year?} {--employee-id=} {--dry-run}', function (LeaveBalanceService $balances) {
    $year = $this->argument('year') ? (int) $this->argument('year') : now('Asia/Makassar')->year;
    $employeeId = $this->option('employee-id') ? (int) $this->option('employee-id') : null;
    $result = $balances->initializeYear($year, $employeeId, (bool) $this->option('dry-run'));

    $this->info(($this->option('dry-run') ? 'Preview' : 'Inisialisasi').' saldo cuti tahun '.$year.'.');
    $this->table(['Item', 'Jumlah'], collect($result)->map(fn ($value, $key) => [$key, $value])->all());

    return self::SUCCESS;
})->purpose('Inisialisasi entitlement dan carry-over saldo cuti tahunan per pegawai');

Schedule::command('attendance:mark-alpha')
    ->dailyAt('23:55')
    ->timezone('Asia/Makassar');

Schedule::command('leave-balances:init')
    ->yearlyOn(1, 1, '00:10')
    ->timezone('Asia/Makassar');

Schedule::command('calendar:retry-google')
    ->everyFifteenMinutes()
    ->timezone('Asia/Makassar');

Schedule::command('calendar:attendance-reminders')
    ->dailyAt('00:20')
    ->timezone('Asia/Makassar');

Artisan::command('employees:import-fkip {--sheet=FKIP_Lengkap} {--csv=}', function () {
    $path = database_path('data pegawai/Data_Pegawai_FKIP_2026.xlsx');
    $csvOption = trim((string) $this->option('csv'));
    $csvPath = $csvOption !== '' ? $csvOption : database_path('data pegawai/FKIP_Lengkap.csv');

    if (is_file($csvPath)) {
        $rows = readCsvRows($csvPath);
    } elseif (is_file($path) && class_exists(ZipArchive::class)) {
        $rows = readXlsxSheetRows($path, (string) $this->option('sheet'));
    } else {
        $this->error("File CSV tidak ditemukan: {$csvPath}");
        $this->warn('PHP ZipArchive juga tidak aktif, jadi .xlsx belum bisa dibaca langsung.');

        return self::FAILURE;
    }

    if (count($rows) < 2) {
        $this->warn('Tidak ada data pegawai yang dapat diimport.');

        return self::SUCCESS;
    }

    $headers = array_map(fn ($value) => strtolower(trim((string) $value)), array_shift($rows));
    $employeeRole = Role::where('name', 'employee')->firstOrFail();

    $result = [
        'employees_created' => 0,
        'employees_updated' => 0,
        'users_created' => 0,
        'users_updated' => 0,
        'skipped' => 0,
    ];

    DB::transaction(function () use ($rows, $headers, $employeeRole, &$result) {
        foreach ($rows as $row) {
            $item = array_combine($headers, array_pad($row, count($headers), null));
            $nip = onlyDigits($item['nip'] ?? null);

            if ($nip === '') {
                $result['skipped'] += 1;
                continue;
            }

            $unitCode = trim((string) ($item['kode_unit'] ?? 'FKIP')) ?: 'FKIP';
            $unitName = trim((string) ($item['nama_unit'] ?? 'FKIP')) ?: 'FKIP';
            $positionName = trim((string) ($item['jabatan'] ?? ''));

            $workUnit = WorkUnit::updateOrCreate(
                ['code' => $unitCode],
                [
                    'name' => $unitName,
                    'type' => unitTypeFromName($unitName),
                    'attendance_mode' => 'reguler',
                    'wfh_allowed' => true,
                    'max_wfh_per_month' => 8,
                    'is_active' => true,
                ],
            );

            $position = $positionName !== ''
                ? StructuralPosition::updateOrCreate(
                    ['name' => $positionName],
                    ['is_active' => true],
                )
                : null;

            $employee = Employee::updateOrCreate(
                ['nip' => $nip],
                [
                    'name' => trim((string) ($item['nama'] ?? 'Pegawai '.$nip)),
                    'email' => uniqueEmployeeEmail(normalizeEmail($item['email'] ?? null), $nip),
                    'phone' => normalizePhone($item['phone_number'] ?? null),
                    'employment_status' => employmentStatusFromGrade($item['golongan'] ?? null),
                    'employee_type' => employeeTypeFromExcel($item['tipe_pegawai'] ?? null),
                    'work_unit_id' => $workUnit->id,
                    'structural_position_id' => $position?->id,
                    'tmt' => '2026-01-01',
                    'grade' => trim((string) ($item['golongan'] ?? '')) ?: null,
                    'rank' => limitString($positionName, 50),
                    'is_active' => true,
                ],
            );

            $result[$employee->wasRecentlyCreated ? 'employees_created' : 'employees_updated'] += 1;

            $user = User::updateOrCreate(
                ['username' => $nip],
                [
                    'employee_id' => $employee->id,
                    'siga8_user_id' => 'excel-employee-'.$nip,
                    'full_name' => $employee->name,
                    'email' => uniqueUserEmail($employee->email, $nip),
                    'level' => 1,
                    'faculty_code' => $unitCode,
                    'faculty_name' => $unitName,
                    'password' => Hash::make($nip),
                    'is_active' => true,
                ],
            );

            $result[$user->wasRecentlyCreated ? 'users_created' : 'users_updated'] += 1;

            RoleUser::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'role_id' => $employeeRole->id,
                    'work_unit_id' => null,
                ],
                [
                    'source' => 'manual',
                    'siga8_role_id' => null,
                ],
            );
        }
    });

    $this->info('Import FKIP selesai.');
    $this->table(['Item', 'Jumlah'], collect($result)->map(fn ($value, $key) => [$key, $value])->all());

    return self::SUCCESS;
})->purpose('Import data pegawai FKIP dari Excel dan buat akun username/password NIP');

if (! function_exists('readCsvRows')) {
function readCsvRows(string $path): array
{
    $handle = fopen($path, 'rb');

    if ($handle === false) {
        throw new RuntimeException('File CSV tidak dapat dibuka.');
    }

    $rows = [];

    while (($row = fgetcsv($handle)) !== false) {
        $rows[] = $row;
    }

    fclose($handle);

    return $rows;
}

function readXlsxSheetRows(string $path, string $sheetName): array
{
    $zip = new ZipArchive();

    if ($zip->open($path) !== true) {
        throw new RuntimeException('File Excel tidak dapat dibuka.');
    }

    $namespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
    $relationshipNamespace = 'http://schemas.openxmlformats.org/package/2006/relationships';
    $documentRelationshipNamespace = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
    $strings = [];

    if (($sharedStringsXml = $zip->getFromName('xl/sharedStrings.xml')) !== false) {
        $sharedStrings = simplexml_load_string($sharedStringsXml);
        $sharedStrings->registerXPathNamespace('x', $namespace);

        foreach ($sharedStrings->xpath('//x:si') as $item) {
            $item->registerXPathNamespace('x', $namespace);
            $parts = array_map(fn ($text) => (string) $text, $item->xpath('.//x:t'));
            $strings[] = implode('', $parts);
        }
    }

    $workbook = simplexml_load_string($zip->getFromName('xl/workbook.xml'));
    $workbook->registerXPathNamespace('x', $namespace);
    $workbook->registerXPathNamespace('r', $documentRelationshipNamespace);

    $targetRelationshipId = null;
    foreach ($workbook->xpath('//x:sheet') as $sheet) {
        if ((string) $sheet['name'] === $sheetName) {
            $attributes = $sheet->attributes($documentRelationshipNamespace);
            $targetRelationshipId = (string) $attributes['id'];
            break;
        }
    }

    if (! $targetRelationshipId) {
        throw new RuntimeException("Sheet {$sheetName} tidak ditemukan.");
    }

    $rels = simplexml_load_string($zip->getFromName('xl/_rels/workbook.xml.rels'));
    $sheetPath = null;

    foreach ($rels->children($relationshipNamespace) as $relationship) {
        if ((string) $relationship['Id'] === $targetRelationshipId) {
            $target = ltrim((string) $relationship['Target'], '/');
            $sheetPath = str_starts_with($target, 'xl/') ? $target : 'xl/'.$target;
            break;
        }
    }

    if (! $sheetPath || ($sheetXml = $zip->getFromName($sheetPath)) === false) {
        throw new RuntimeException("File sheet {$sheetName} tidak dapat dibaca.");
    }

    $sheet = simplexml_load_string($sheetXml);
    $sheet->registerXPathNamespace('x', $namespace);
    $rows = [];

    foreach ($sheet->xpath('//x:sheetData/x:row') as $row) {
        $values = [];

        foreach ($row->children($namespace)->c as $cell) {
            $index = columnIndexFromCellRef((string) $cell['r']);
            $raw = isset($cell->v) ? (string) $cell->v : '';
            $value = ((string) $cell['t'] === 's' && $raw !== '') ? ($strings[(int) $raw] ?? '') : $raw;
            $values[$index] = trim((string) $value);
        }

        if ($values !== []) {
            ksort($values);
            $rows[] = array_values($values);
        }
    }

    $zip->close();

    return $rows;
}

function columnIndexFromCellRef(string $cellRef): int
{
    preg_match('/^[A-Z]+/', $cellRef, $matches);
    $letters = $matches[0] ?? 'A';
    $index = 0;

    foreach (str_split($letters) as $letter) {
        $index = ($index * 26) + (ord($letter) - 64);
    }

    return $index - 1;
}

function onlyDigits(mixed $value): string
{
    return preg_replace('/\D+/', '', (string) $value) ?? '';
}

function normalizePhone(mixed $value): ?string
{
    $digits = onlyDigits($value);

    if ($digits === '') {
        return null;
    }

    return str_starts_with($digits, '0') ? $digits : '0'.$digits;
}

function normalizeEmail(mixed $value): ?string
{
    $email = strtolower(trim((string) $value));

    return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
}

function limitString(?string $value, int $maxLength): ?string
{
    $value = trim((string) $value);

    if ($value === '') {
        return null;
    }

    return mb_substr($value, 0, $maxLength);
}

function uniqueEmployeeEmail(?string $email, string $nip): ?string
{
    if ($email === null) {
        return null;
    }

    $owner = Employee::where('email', $email)->where('nip', '!=', $nip)->first();

    return $owner ? null : $email;
}

function uniqueUserEmail(?string $email, string $username): ?string
{
    if ($email === null) {
        return null;
    }

    $owner = User::where('email', $email)->where('username', '!=', $username)->first();

    return $owner ? null : $email;
}

function employeeTypeFromExcel(mixed $value): string
{
    return str_contains(strtolower((string) $value), 'dosen') ? 'dosen' : 'tenaga_kependidikan';
}

function employmentStatusFromGrade(mixed $value): string
{
    $grade = strtoupper(trim((string) $value));

    return preg_match('/^[IVX]+$/', $grade) ? 'pppk' : 'pns';
}

function unitTypeFromName(string $name): string
{
    return str_contains(strtolower($name), 'fkip') ? 'fakultas' : 'lainnya';
}
}
