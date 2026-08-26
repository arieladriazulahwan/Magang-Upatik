<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Koreksi/penghadiran manual oleh Pimpinan/Verifikator (PRD 5.17).
 * correction_reason WAJIB — ditegakkan juga oleh CHECK constraint di DB
 * (attendance.is_manual => verified_by & correction_reason NOT NULL),
 * jadi validasi di sini adalah lapisan pertama yang kasih pesan error
 * jelas SEBELUM sempat kena error mentah dari database.
 */
class CorrectAttendanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'check_in' => ['nullable', 'date'],
            'check_out' => ['nullable', 'date', 'after:check_in'],
            'status' => ['nullable', Rule::in([
                'hadir', 'terlambat', 'pulang_cepat', 'tidak_lengkap', 'alpha', 'dinas',
            ])],
            'correction_reason' => ['required', 'string', 'min:10', 'max:500'],
        ];
    }
}
