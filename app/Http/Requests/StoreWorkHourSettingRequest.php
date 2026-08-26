<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreWorkHourSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // NULL = aturan global default (PRD 5.3: "global per kategori,
            // dengan opsi override per unit kerja"). Kombinasi
            // (work_unit_id, category) unik di DB — divalidasi juga di sini
            // supaya pesan errornya jelas, bukan 500 dari constraint DB.
            'work_unit_id' => [
                'nullable', 'integer', Rule::exists('work_unit', 'id')->where('is_active', true),
            ],
            'category' => [
                'required', Rule::in(['dosen', 'dosen_tugas_tambahan', 'tenaga_kependidikan']),
                // Rule::unique dg where(): kalau work_unit_id NULL, whereNull
                // eksplisit dipakai — where('col', null) di Eloquent
                // menghasilkan "col = NULL" yang SELALU false di SQL, jadi
                // validasi unique-nya diam-diam tidak pernah ke-trigger kalau
                // dibiarkan where() biasa untuk kasus NULL.
                Rule::unique('work_hour_setting', 'category')->where(function ($q) {
                    $unitId = $this->input('work_unit_id');

                    return $unitId === null ? $q->whereNull('work_unit_id') : $q->where('work_unit_id', $unitId);
                }),
            ],
            'min_minutes' => ['required', 'integer', 'min:1'],
            'standard_check_in' => ['nullable', 'date_format:H:i'],
            'late_threshold' => ['nullable', 'date_format:H:i', 'after_or_equal:standard_check_in'],
            'standard_check_out' => ['nullable', 'date_format:H:i'],
            'work_days' => ['nullable', 'array'],
            'work_days.*' => ['integer', 'between:1,7'], // ISO: 1=Senin..7=Minggu
        ];
    }
}
