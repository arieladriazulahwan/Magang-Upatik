<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $shift = $this->route('shift');

        return [
            'name' => [
                'sometimes', 'string', 'max:60',
                Rule::unique('shift', 'name')
                    ->where(fn ($q) => $q->where('work_unit_id', $shift->work_unit_id))
                    ->ignore($shift->id),
            ],
            'start_time' => ['sometimes', 'date_format:H:i'],
            'end_time' => ['sometimes', 'date_format:H:i'],
            'is_overnight' => ['sometimes', 'boolean'],
            'tolerance_minutes' => ['sometimes', 'integer', 'min:0', 'max:120'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}