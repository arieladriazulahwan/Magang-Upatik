<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Attachment extends Model
{
    protected $table = 'attachment';

    const UPDATED_AT = null;

    protected $fillable = [
        'attachable_type', 'attachable_id', 'file_name', 'path',
        'mime_type', 'size_bytes',
    ];

    // Catatan: kolom di DB adalah attachable_type/attachable_id (bukan
    // konvensi default Laravel *_type/*_id via morphTo('attachable')).
    // Karena namanya sudah cocok, morphTo() default sebenarnya bekerja;
    // eksplisit agar jelas bagi pembaca lain.
    public function attachable(): MorphTo
    {
        return $this->morphTo(name: 'attachable', type: 'attachable_type', id: 'attachable_id');
    }
}
