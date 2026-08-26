<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Otorisasi peran ditangani middleware 'role:' di route (super_admin,
        // admin_kepegawaian). Di sini selalu true; kalau butuh aturan
        // per-baris yang lebih halus nanti, pindah ke Policy, bukan di sini.
        return true;
    }

    public function rules(): array
    {
        return [
            'nip' => ['nullable', 'string', 'max:30', Rule::unique('employee', 'nip')],
            'nik' => ['nullable', 'string', 'max:20', Rule::unique('employee', 'nik')],
            'name' => ['required', 'string', 'max:150'],
            'email' => ['nullable', 'email', 'max:150', Rule::unique('employee', 'email')],
            'phone' => ['nullable', 'string', 'max:20'],
            'gender' => ['required', Rule::in(['L', 'P'])],
            'employment_status' => ['required', Rule::in(['pns', 'pppk', 'non_asn'])],
            'employee_type' => ['required', Rule::in(['dosen', 'tenaga_kependidikan'])],
            'work_unit_id' => ['required', 'integer', Rule::exists('work_unit', 'id')->where('is_active', true)],
            'structural_position_id' => [
                'nullable', 'integer', Rule::exists('structural_position', 'id')->where('is_active', true),
                // Jabatan struktural (=> kategori jam kerja dosen_tugas_tambahan,
                // PRD 5.3) cuma masuk akal untuk dosen. Mencegah data tidak
                // konsisten sejak dari pintu masuk, bukan cuma dipercantik di UI.
                Rule::prohibitedIf(fn () => $this->input('employee_type') !== 'dosen'),
            ],
            'tmt' => ['required', 'date', 'before_or_equal:today'],
            'grade' => ['nullable', 'string', 'max:20'],
            'rank' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'structural_position_id.prohibited_if' =>
                'Jabatan struktural hanya berlaku untuk pegawai dengan jenis "dosen".',
        ];
    }
}
