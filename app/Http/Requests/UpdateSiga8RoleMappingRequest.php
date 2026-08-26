<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSiga8RoleMappingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'siga8_role_name' => ['nullable', 'string', 'max:100'],
            'role_id' => ['sometimes', 'integer', 'exists:roles,id'],
            'work_unit_id' => ['nullable', 'integer', 'exists:work_unit,id'],
            'is_active' => ['sometimes', 'boolean'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}