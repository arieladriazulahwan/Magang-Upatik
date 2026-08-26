<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreShiftRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'work_unit_id' => ['required', 'integer', Rule::exists('work_unit', 'id')->where('is_active', true)],
            'name' => [
                'required', 'string', 'max:60',
                Rule::unique('shift', 'name')->where(fn ($q) => $q->where('work_unit_id', $this->input('work_unit_id'))),
            ],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i'],
            // TIDAK divalidasi end_time > start_time di sini — shift malam
            // lintas hari (PRD 5.6) justru punya end_time < start_time secara
            // jam (mis. 21:00 -> 07:00). is_overnight yang membedakan makna
            // "lintas tengah malam" vs "salah input", bukan urutan jam.
            'is_overnight' => ['required', 'boolean'],
            'tolerance_minutes' => ['nullable', 'integer', 'min:0', 'max:120'],
        ];
    }
}
