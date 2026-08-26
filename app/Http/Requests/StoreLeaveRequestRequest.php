<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreLeaveRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'leave_type_id' => ['required', 'integer', 'exists:leave_type,id'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'start_time' => ['nullable', 'date_format:H:i'],
            'end_time' => ['nullable', 'date_format:H:i', 'after:start_time'],
            'reason' => ['required', 'string', 'max:1000'],
            'address_during_leave' => ['nullable', 'string', 'max:255'],
            'child_number' => ['nullable', 'integer', 'min:1', 'max:3'],
            'doctor_letter_type' => ['nullable', 'in:dokter_biasa,tim_penguji_kesehatan'],
            'doctor_letter_number' => ['nullable', 'string', 'max:100'],
            'doctor_facility_name' => ['nullable', 'string', 'max:150'],
            'sub_category' => ['nullable', 'in:menikah,keluarga_sakit,keluarga_meninggal,bencana'],
            'attachment' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:5120'],
        ];
    }
}