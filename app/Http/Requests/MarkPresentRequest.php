<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MarkPresentRequest extends FormRequest
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
            'check_out' => ['nullable', 'date', 'after:check_in'],
            'status' => ['required', Rule::in([
                'hadir', 'terlambat', 'pulang_cepat', 'tidak_lengkap', 'alpha', 'dinas',
            ])],
            'correction_reason' => ['required', 'string', 'min:10', 'max:500'],
        ];
    }
}
