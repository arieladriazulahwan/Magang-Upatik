<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class AppSetting extends Model
{
    protected $table = 'app_setting';

    const CREATED_AT = null;

    protected $fillable = ['key', 'value', 'data_type', 'description'];

    /** Ambil nilai setting dg cast otomatis sesuai data_type, di-cache 10 menit. */
    public static function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("app_setting:$key", 600, function () use ($key, $default) {
            $row = self::where('key', $key)->first();

            if (! $row) {
                return $default;
            }

            return match ($row->data_type) {
                'boolean' => filter_var($row->value, FILTER_VALIDATE_BOOLEAN),
                'int' => (int) $row->value,
                'float' => (float) $row->value,
                default => $row->value,
            };
        });
    }

    protected static function booted(): void
    {
        static::saved(fn (self $s) => Cache::forget("app_setting:{$s->key}"));
    }
}
