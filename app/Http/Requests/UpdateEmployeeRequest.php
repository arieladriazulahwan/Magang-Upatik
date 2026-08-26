<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        // route-model-binding: {employee} sudah resolve ke instance Employee
        $employeeId = $this->route('employee')?->id;

        return [
            'nip' => ['sometimes', 'nullable', 'string', 'max:30', Rule::unique('employee', 'nip')->ignore($employeeId)],
            'nik' => ['sometimes', 'nullable', 'string', 'max:20', Rule::unique('employee', 'nik')->ignore($employeeId)],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150', Rule::unique('employee', 'email')->ignore($employeeId)],
            'phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'gender' => ['sometimes', Rule::in(['L', 'P'])],
            'employment_status' => ['sometimes', Rule::in(['pns', 'pppk', 'non_asn'])],
            'employee_type' => ['sometimes', Rule::in(['dosen', 'tenaga_kependidikan'])],
            'work_unit_id' => ['sometimes', 'integer', Rule::exists('work_unit', 'id')->where('is_active', true)],
            'structural_position_id' => [
                'sometimes', 'nullable', 'integer', Rule::exists('structural_position', 'id')->where('is_active', true),
                Rule::prohibitedIf(fn () => $this->filled('employee_type') && $this->input('employee_type') !== 'dosen'),
            ],
            'tmt' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'grade' => ['sometimes', 'nullable', 'string', 'max:20'],
            'rank' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
