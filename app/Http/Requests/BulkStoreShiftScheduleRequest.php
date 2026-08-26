<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkStoreShiftScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'employee_ids' => ['required', 'array', 'min:1', 'max:200'],
            'employee_ids.*' => ['integer', 'exists:employee,id'],
            'shift_id' => ['required', 'integer', 'exists:shift,id'],
            'dates' => ['required', 'array', 'min:1', 'max:62'], // batasi ~2 bulan sekali kirim
            'dates.*' => ['date'],
            'description' => ['nullable', 'string', 'max:150'],
        ];
    }
}
