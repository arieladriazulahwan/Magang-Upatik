<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreOvertimeRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'date' => ['required', 'date'],
            'planned_start_time' => ['required', 'date_format:H:i'],
            'planned_end_time' => ['required', 'date_format:H:i', 'after:planned_start_time'],
            'work_description' => ['required', 'string', 'max:1000'],
        ];
    }
}
