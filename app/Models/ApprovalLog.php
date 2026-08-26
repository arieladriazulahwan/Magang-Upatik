<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalLog extends Model
{
    protected $table = 'approval_log';

    const UPDATED_AT = null;

    protected $fillable = [
        'request_id', 'sequence', 'approver_role', 'approver_id',
        'status', 'note', 'recorded_at',
    ];

    protected $casts = ['recorded_at' => 'datetime'];

    public function request(): BelongsTo
    {
        return $this->belongsTo(LeaveRequest::class, 'request_id');
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'approver_id');
    }
}
