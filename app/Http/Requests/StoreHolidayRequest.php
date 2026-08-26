<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreHolidayRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date', Rule::unique('holiday', 'date')],
            'name' => ['required', 'string', 'max:150'],
            'type' => ['required', Rule::in(['nasional', 'cuti_bersama', 'khusus_kampus'])],
            'legal_basis' => ['nullable', 'string', 'max:150'],
        ];
    }
}
