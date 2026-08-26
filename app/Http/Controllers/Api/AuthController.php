<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Services\Auth\RoleSyncService;
use App\Services\Auth\Siga8TokenStore;
use App\Services\Auth\UserProvisioningService;
use App\Services\Siga8\Siga8AuthException;
use App\Services\Siga8\Siga8AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Login TUNGGAL dipakai baik oleh Web Admin (ReactJS) maupun Mobile.
 * Kedua platform mengautentikasi via SSO SIGA8 dan menerima token Sanctum
 * yang sama; perbedaannya cuma di endpoint mana yang boleh diakses,
 * yang diatur oleh middleware role (lihat routes/api.php).
 */
class AuthController extends Controller
{
    public function __construct(
        private readonly Siga8AuthService $siga8,
        private readonly UserProvisioningService $provisioning,
        private readonly RoleSyncService $roleSync,
        private readonly Siga8TokenStore $tokenStore,
    ) {}

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'username' => ['required', 'string', 'max:100'],
            'password' => ['required', 'string'],
            // Mobile mengirim ini agar token yang diterbitkan Sanctum
            // dapat diberi label/identitas perangkat (memudahkan user
            // mencabut sesi per-perangkat lewat "kelola perangkat").
            'device_name' => ['nullable', 'string', 'max:150'],
        ]);

        // Rate limit berbasis username+IP: mencegah brute force TANPA
        // mengunci akun secara global (yang bisa disalahgunakan orang lain
        // untuk mengunci akses korban). 5 percobaan / menit selaras dengan
        // pola login SSO wajar (bukan automated).
        $throttleKey = 'login:'.$credentials['username'].'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);

            throw ValidationException::withMessages([
                'username' => "Terlalu banyak percobaan. Coba lagi dalam {$seconds} detik.",
            ]);
        }

        try {
            $siga8Result = $this->siga8->login($credentials['username'], $credentials['password']);
        } catch (Siga8AuthException $e) {
            RateLimiter::hit($throttleKey, 60);

            return response()->json([
                'message' => $e->getMessage(),
                'reason' => $e->reason,
            ], $e->reason === 'invalid_credentials' ? 401 : 503);
        }

        RateLimiter::clear($throttleKey);

        $user = $this->provisioning->upsertFromSiga8($siga8Result);
        $this->roleSync->sync($user, $siga8Result->roles);

        if (! $user->is_active) {
            return response()->json([
                'message' => 'Akun dinonaktifkan. Hubungi Admin Kepegawaian.',
                'reason' => 'inactive',
            ], 403);
        }

        $ttlMinutes = 8 * 60; // 8 jam; samakan dg kebijakan sesi kerja harian
        $token = $user->createToken(
            $credentials['device_name'] ?? 'unknown-device',
            expiresAt: now()->addMinutes($ttlMinutes),
        );

        $this->tokenStore->put($token->accessToken->id, $siga8Result->token, $ttlMinutes);

        ActivityLog::record('login', $user, ['device_name' => $credentials['device_name'] ?? null]);

        return response()->json([
            'token' => $token->plainTextToken,
            'expires_at' => now()->addMinutes($ttlMinutes)->toIso8601String(),
            'user' => $this->serializeUser($user),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->serializeUser($request->user()),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $tokenId = $request->user()->currentAccessToken()->id;
        $this->tokenStore->forget($tokenId);
        $request->user()->currentAccessToken()->delete();

        ActivityLog::record('logout', $request->user());

        return response()->json(['message' => 'Berhasil keluar.']);
    }

    private function serializeUser(\App\Models\User $user): array
    {
        $user->load(['employee.workUnit', 'roleUsers.role', 'roleUsers.workUnit']);

        return [
            'id' => $user->id,
            'username' => $user->username,
            'full_name' => $user->full_name,
            'employee' => $user->employee ? [
                'id' => $user->employee->id,
                'name' => $user->employee->name,
                'nip' => $user->employee->nip,
                'employee_type' => $user->employee->employee_type,
                'employment_status' => $user->employee->employment_status,
                'work_unit' => $user->employee->workUnit?->only(['id', 'name', 'code']),
            ] : null,
            'roles' => $user->roleUsers->map(fn ($ru) => [
                'name' => $ru->role->name,
                'work_unit_id' => $ru->work_unit_id,
                'work_unit_name' => $ru->workUnit?->name,
                'source' => $ru->source,
            ])->values(),
        ];
    }
}
