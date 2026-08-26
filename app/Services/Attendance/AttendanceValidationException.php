<?php

namespace App\Services\Attendance;

use Exception;

/**
 * Dilempar untuk semua kegagalan validasi bisnis presensi (di luar radius,
 * belum ada jadwal shift, sudah checkout, dst). Controller menangkap ini
 * dan mengembalikan 422 dengan $errorKey sebagai field errors.
 */
class AttendanceValidationException extends Exception
{
    public function __construct(string $message, public readonly string $errorKey)
    {
        parent::__construct($message);
    }
}
