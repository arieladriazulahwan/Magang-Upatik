<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AttendanceCorrectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date', 'before_or_equal:today'],
            'check_in' => ['nullable', 'date'],
            'check_out' => ['nullable', 'date'],
            'correction_reason' => ['required', 'string', 'min:10', 'max:500'],
        ];
    }

    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            if (! $this->filled('check_in') && ! $this->filled('check_out')) {
                $validator->errors()->add(
                    'check_in',
                    'Jam masuk atau jam pulang yang diajukan wajib diisi.'
                );
            }

            if (
                $this->filled('check_in') &&
                $this->filled('check_out') &&
                strtotime((string) $this->input('check_out')) <= strtotime((string) $this->input('check_in'))
            ) {
                $validator->errors()->add(
                    'check_out',
                    'Jam pulang harus setelah jam masuk.'
                );
            }
        });
    }
}
