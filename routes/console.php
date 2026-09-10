<?php

use App\Models\Employee;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\StructuralPosition;
use App\Models\User;
use App\Models\WorkUnit;
use App\Services\Calendar\GoogleCalendarService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

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
