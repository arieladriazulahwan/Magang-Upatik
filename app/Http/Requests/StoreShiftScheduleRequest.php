<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreShiftScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_id' => ['required', 'integer', 'exists:employee,id'],
            'shift_id' => ['required', 'integer', 'exists:shift,id'],
            'date' => ['required', 'date'],
            'description' => ['nullable', 'string', 'max:150'],
        ];
    }
}
