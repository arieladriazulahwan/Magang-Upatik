<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSiga8RoleMappingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'siga8_role_id' => ['required', 'string', 'max:40', Rule::unique('siga8_role_mapping', 'siga8_role_id')],
            'siga8_role_name' => ['nullable', 'string', 'max:100'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'work_unit_id' => ['nullable', 'integer', 'exists:work_unit,id'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}