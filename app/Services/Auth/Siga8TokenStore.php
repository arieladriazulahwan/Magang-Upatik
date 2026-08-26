<?php

namespace App\Services\Auth;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;

/**
 * Menyimpan token bearer SIGA8 di sisi SERVER, terenkripsi, TIDAK PERNAH
 * di database (PRD 5.15: "Token bearer SIGA8 disimpan di sesi server
 * (terenkripsi) — bukan di basis data.").
 *
 * Karena API kita stateless (mobile + web SPA via Sanctum token, bukan
 * session cookie tradisional), "sesi server" diimplementasikan sebagai
 * entri cache terenkripsi yang di-keyed oleh ID token Sanctum milik user
 * kita sendiri — bukan disimpan di client, bukan di kolom DB manapun.
 * TTL disamakan dengan masa aktif token Sanctum kita (lihat AuthController).
 */
class Siga8TokenStore
{
    private function cacheKey(int $ourTokenId): string
    {
        return "siga8_token:$ourTokenId";
    }

    public function put(int $ourTokenId, string $siga8Token, int $ttlMinutes): void
    {
        Cache::put($this->cacheKey($ourTokenId), Crypt::encryptString($siga8Token), now()->addMinutes($ttlMinutes));
    }

    public function get(int $ourTokenId): ?string
    {
        $encrypted = Cache::get($this->cacheKey($ourTokenId));

        return $encrypted ? Crypt::decryptString($encrypted) : null;
    }

    public function forget(int $ourTokenId): void
    {
        Cache::forget($this->cacheKey($ourTokenId));
    }
}
