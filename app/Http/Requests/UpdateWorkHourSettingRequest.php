<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateWorkHourSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'min_minutes' => ['sometimes', 'integer', 'min:1'],
            'standard_check_in' => ['nullable', 'date_format:H:i'],
            'late_threshold' => ['nullable', 'date_format:H:i', 'after_or_equal:standard_check_in'],
            'standard_check_out' => ['nullable', 'date_format:H:i'],
            'work_days' => ['sometimes', 'array'],
            'work_days.*' => ['integer', 'between:1,7'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}