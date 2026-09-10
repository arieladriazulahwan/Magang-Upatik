<?php

namespace App\Services\Face;

use RuntimeException;

class FaceRecognitionException extends RuntimeException
{
    public function __construct(string $message, public readonly string $errorKey = 'face_service_error')
    {
        parent::__construct($message);
    }
}
