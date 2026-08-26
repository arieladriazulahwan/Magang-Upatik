<?php

namespace App\Services\Leave;

use Exception;

class LeaveValidationException extends Exception
{
    public function __construct(string $message, public readonly string $errorKey)
    {
        parent::__construct($message);
    }
}