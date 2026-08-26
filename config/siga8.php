<?php

return [
    /*
    |--------------------------------------------------------------------
    | Konfigurasi SSO SIGA8
    |--------------------------------------------------------------------
    | Endpoint & kredensial layanan SSO Untad. Nilai default dibaca dari
    | .env; app_setting.siga8_login_url di DB HANYA dipakai untuk tampilan
    | admin (mis. Super Admin melihat endpoint aktif) — bukan sumber
    | kebenaran runtime, supaya endpoint auth tidak bisa diubah diam-diam
    | lewat DB tanpa deploy/observability.
    */
    'login_url' => env('SIGA8_LOGIN_URL', 'https://siga8.untad.ac.id/api/login'),

    // Timeout & retry saat memanggil SIGA8 (layanan eksternal, PRD 10:
    // "ketergantungan eksternal" — jangan biarkan request menggantung lama).
    'timeout' => env('SIGA8_TIMEOUT', 8),
    'connect_timeout' => env('SIGA8_CONNECT_TIMEOUT', 3),
    'retry_times' => env('SIGA8_RETRY_TIMES', 1),
    'retry_delay_ms' => env('SIGA8_RETRY_DELAY_MS', 300),
];
