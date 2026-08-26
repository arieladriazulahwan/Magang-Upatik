<?php

namespace App\Services\Siga8;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Menangani panggilan HTTP ke web service SIGA8 (siga8.untad.ac.id).
 * Ini SATU-SATUNYA tempat kredensial pengguna disentuh — kredensial
 * diteruskan langsung ke SIGA8 dan TIDAK PERNAH disimpan di DB kita
 * (PRD 5.15: "Aplikasi presensi tidak menyimpan password").
 */
class Siga8AuthService
{
    /**
     * @throws Siga8AuthException
     */
    public function login(string $username, string $password): Siga8LoginResult
    {
        try {
            $response = Http::timeout((int) config('siga8.timeout'))
                ->connectTimeout((int) config('siga8.connect_timeout'))
                ->retry(
                    (int) config('siga8.retry_times'),
                    (int) config('siga8.retry_delay_ms'),
                    // Jangan retry pada 4xx (kredensial salah) — hanya pada
                    // masalah jaringan/5xx, agar tidak memperlambat login
                    // gagal biasa dan tidak membebani SIGA8 tanpa guna.
                    fn ($exception, $request) => ! ($exception instanceof \Illuminate\Http\Client\RequestException
                        && $exception->response?->status() < 500),
                )
                ->post(config('siga8.login_url'), [
                    'username' => $username,
                    'password' => $password,
                ]);
        } catch (Throwable $e) {
            Log::warning('siga8.login.unreachable', ['error' => $e->getMessage()]);

            throw new Siga8AuthException(
                'Layanan SIGA8 tidak dapat dihubungi. Coba beberapa saat lagi.',
                'unavailable',
            );
        }

        if ($response->status() === 401 || $response->status() === 403) {
            throw new Siga8AuthException('Username atau password salah.', 'invalid_credentials');
        }

        if ($response->failed()) {
            Log::warning('siga8.login.error_status', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            throw new Siga8AuthException(
                'Layanan SIGA8 mengembalikan kesalahan tak terduga.',
                'unavailable',
            );
        }

        $payload = $response->json();

        if (! ($payload['status'] ?? false)) {
            throw new Siga8AuthException(
                $payload['message'] ?? 'Login SIGA8 gagal.',
                'invalid_credentials',
            );
        }

        return Siga8LoginResult::fromResponseData($payload['data'] ?? []);
    }
}
