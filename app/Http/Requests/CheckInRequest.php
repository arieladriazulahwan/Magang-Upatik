<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CheckInRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['wfo', 'wfh', 'shift', 'dinas_luar'])],
            // lat/lng WAJIB dikirim walau type=wfh (tetap direkam sbg info,
            // PRD 5.5) — cuma tidak dipakai sbg syarat lolos untuk wfh.
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'photo' => ['required', 'image', 'max:5120'], // 5MB
            'device_info' => ['nullable', 'string', 'max:255'],
        ];
    }
}
