<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalFlow extends Model
{
    protected $table = 'approval_flow';

    public $timestamps = false;

    protected $fillable = ['leave_type_id', 'sequence', 'approver_role', 'required', 'description'];

    protected $casts = ['required' => 'boolean'];

    public function leaveType(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class);
    }
}
