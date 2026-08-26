<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LinkEmployeeUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Otorisasi peran ditangani middleware 'role:' di route
        // (super_admin, admin_kepegawaian) — sama seperti Store/UpdateEmployeeRequest.
        return true;
    }

    public function rules(): array
    {
        return [
            'user_id' => ['required', 'integer', Rule::exists('users', 'id')],
        ];
    }
}