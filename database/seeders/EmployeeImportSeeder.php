<?php

namespace Database\Seeders;

use App\Models\Employee;
use App\Models\Role;
use App\Models\RoleUser;
use App\Models\StructuralPosition;
use App\Models\User;
use App\Models\WorkUnit;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class EmployeeImportSeeder extends Seeder
{
    public function run(): void
    {
        $path = database_path('data pegawai/Data_Pegawai_Per_Fakultas_Lengkap.csv');

        if (! is_file($path)) {
            $this->command?->warn("CSV pegawai lengkap tidak ditemukan: {$path}");
            return;
        }

        $rows = $this->readCsvRows($path);

        if (count($rows) < 2) {
            return;
        }

        $headers = array_map(fn ($value) => strtolower(trim((string) $value)), array_shift($rows));
        $employeeRoleId = Role::where('name', 'employee')->value('id');

        DB::transaction(function () use ($rows, $headers, $employeeRoleId) {
            foreach ($rows as $row) {
                $item = array_combine($headers, array_pad($row, count($headers), null));
                $nip = $this->onlyDigits($item['nip'] ?? null);

                if ($nip === '') {
                    continue;
                }

                $unitCode = trim((string) ($item['kode_unit'] ?? '')) ?: 'ZZ';
                $unitName = trim((string) ($item['nama_unit'] ?? '')) ?: 'Universitas';
                $positionName = trim((string) ($item['jabatan'] ?? ''));

                $workUnit = WorkUnit::updateOrCreate(
                    ['code' => $unitCode],
                    [
                        'name' => $unitName,
                        'type' => $this->unitTypeFromName($unitName),
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
                        'email' => $this->uniqueEmployeeEmail($this->normalizeEmail($item['email'] ?? null), $nip),
                        'phone' => $this->normalizePhone($item['phone_number'] ?? null),
                        'employment_status' => $this->employmentStatusFromGrade($item['golongan'] ?? null),
                        'employee_type' => $this->employeeTypeFromExcel($item['tipe_pegawai'] ?? null),
                        'work_unit_id' => $workUnit->id,
                        'structural_position_id' => $position?->id,
                        'tmt' => '2026-01-01',
                        'grade' => trim((string) ($item['golongan'] ?? '')) ?: null,
                        'rank' => $this->limitString($positionName, 50),
                        'is_active' => true,
                    ],
                );

                $user = User::updateOrCreate(
                    ['username' => $nip],
                    [
                        'employee_id' => $employee->id,
                        'siga8_user_id' => 'excel-employee-'.$nip,
                        'full_name' => $employee->name,
                        'email' => $this->uniqueUserEmail($employee->email, $nip),
                        'level' => 1,
                        'faculty_code' => $unitCode,
                        'faculty_name' => $unitName,
                        'password' => Hash::make($nip),
                        'is_active' => true,
                    ],
                );

                RoleUser::updateOrCreate(
                    [
                        'user_id' => $user->id,
                        'role_id' => $employeeRoleId,
                        'work_unit_id' => null,
                    ],
                    [
                        'source' => 'manual',
                        'siga8_role_id' => null,
                    ],
                );
            }
        });
    }

    private function readCsvRows(string $path): array
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            return [];
        }

        $rows = [];
        while (($row = fgetcsv($handle)) !== false) {
            $rows[] = $row;
        }
        fclose($handle);

        return $rows;
    }

    private function onlyDigits(mixed $value): string
    {
        return preg_replace('/\D+/', '', (string) $value) ?? '';
    }

    private function normalizePhone(mixed $value): ?string
    {
        $digits = $this->onlyDigits($value);

        if ($digits === '') {
            return null;
        }

        return str_starts_with($digits, '0') ? $digits : '0'.$digits;
    }

    private function normalizeEmail(mixed $value): ?string
    {
        $email = strtolower(trim((string) $value));

        return filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : null;
    }

    private function uniqueEmployeeEmail(?string $email, string $nip): ?string
    {
        if ($email === null) {
            return null;
        }

        $owner = Employee::where('email', $email)->where('nip', '!=', $nip)->first();

        return $owner ? null : $email;
    }

    private function uniqueUserEmail(?string $email, string $username): ?string
    {
        if ($email === null) {
            return null;
        }

        $owner = User::where('email', $email)->where('username', '!=', $username)->first();

        return $owner ? null : $email;
    }

    private function employeeTypeFromExcel(mixed $value): string
    {
        return str_contains(strtolower((string) $value), 'dosen') ? 'dosen' : 'tenaga_kependidikan';
    }

    private function employmentStatusFromGrade(mixed $value): string
    {
        $grade = strtoupper(trim((string) $value));

        return preg_match('/^[IVX]+$/', $grade) ? 'pppk' : 'pns';
    }

    private function unitTypeFromName(string $name): string
    {
        $lower = strtolower($name);

        return match (true) {
            str_contains($lower, 'fkip'),
            str_contains($lower, 'fisip'),
            str_contains($lower, 'fekon'),
            str_contains($lower, 'fakum'),
            str_contains($lower, 'faperta'),
            str_contains($lower, 'fatek'),
            str_contains($lower, 'fmipa'),
            str_contains($lower, 'fahut'),
            str_contains($lower, 'fapetkan'),
            str_contains($lower, 'fkm') => 'fakultas',
            $name === 'FK' => 'fakultas',
            str_contains($lower, 'pascasarjana') => 'pascasarjana',
            str_contains($lower, 'biro') || $name === 'BAK' || $name === 'BKU' => 'biro',
            str_contains($lower, 'lppm') || str_contains($lower, 'lpmpp') => 'lembaga',
            str_contains($lower, 'upt') || str_contains($lower, 'upa') || str_contains($lower, 'pusat bahasa') => 'upt',
            str_contains($lower, 'laboratorium') => 'laboratorium',
            str_contains($lower, 'rs pendidikan') => 'rumah_sakit',
            str_contains($lower, 'senat') || str_contains($lower, 'universitas') => 'universitas',
            default => 'lainnya',
        };
    }

    private function limitString(?string $value, int $maxLength): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        return function_exists('mb_substr') ? mb_substr($value, 0, $maxLength) : substr($value, 0, $maxLength);
    }
}
