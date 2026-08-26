<?php

namespace App\Services\Overtime;

use Exception;

class OvertimeValidationException extends Exception
{
    public function __construct(string $message, public readonly string $errorKey)
    {
        parent::__construct($message);
    }
}