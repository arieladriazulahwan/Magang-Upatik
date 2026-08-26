<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FaceData extends Model
{
    protected $table = 'face_data';

    public $timestamps = false; // hanya created_at pada tabel ini

    protected $fillable = [
        'employee_id', 'embedding', 'reference_photo', 'quality', 'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'quality' => 'float',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
