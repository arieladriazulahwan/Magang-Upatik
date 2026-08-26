<?php

namespace App\Services\Siga8;

use Exception;

/**
 * Dilempar untuk SEMUA kegagalan yang berasal dari sisi SIGA8: kredensial
 * salah, layanan timeout/down, atau respons berbentuk tak terduga.
 * Controller cukup tangkap satu exception ini dan balas 401/503 sesuai kode.
 */
class Siga8AuthException extends Exception
{
    public function __construct(
        string $message,
        public readonly string $reason, // 'invalid_credentials' | 'unavailable' | 'unexpected_response'
    ) {
        parent::__construct($message);
    }
}
