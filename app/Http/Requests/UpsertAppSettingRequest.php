<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpsertAppSettingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'key' => ['required', 'string', 'max:100'],
            'value' => ['nullable', 'string'],
            'data_type' => ['sometimes', 'in:string,boolean,int,float'],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}