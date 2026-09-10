<?php

namespace App\Services\Calendar;

use App\Models\AppSetting;
use App\Models\CalendarConfig;
use App\Models\CalendarSync;
use App\Models\Holiday;
use App\Models\LeaveRequest;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class GoogleCalendarService
{
    private const SCOPE = 'https://www.googleapis.com/auth/calendar';
    private const EVENTS_API = 'https://www.googleapis.com/calendar/v3/calendars/%s/events';

    public function syncHoliday(Holiday $holiday, string $action = 'buat'): void
    {
        if (! $this->enabled()) {
            return;
        }

        $config = $this->resolveConfig('libur');

        if (! $config) {
            $this->markSourceFailed($holiday, 'Konfigurasi kalender libur belum tersedia.');
            return;
        }

        $this->syncAllDayEvent(
            sourceType: 'hari_libur',
            source: $holiday,
            config: $config,
            action: $action,
            summary: $holiday->name,
            description: trim(implode("\n", array_filter([
                'Jenis: '.$holiday->type,
                $holiday->legal_basis ? 'Dasar hukum: '.$holiday->legal_basis : null,
                'Sumber: SI Presensi UNTAD',
            ]))),
            startDate: $holiday->date,
            endDate: $holiday->date,
        );
    }

    public function syncHolidays(?int $year = null): array
    {
        $query = Holiday::query()->orderBy('date');

        if ($year !== null) {
            $query->whereYear('date', $year);
        }

        $result = [
            'total' => 0,
            'terkirim' => 0,
            'gagal' => 0,
        ];

        $query->get()->each(function (Holiday $holiday) use (&$result) {
            $result['total'] += 1;

            $this->syncHoliday($holiday);
            $holiday->refresh();

            if ($holiday->gcal_status === 'terkirim') {
                $result['terkirim'] += 1;
                return;
            }

            if ($holiday->gcal_status === 'gagal') {
                $result['gagal'] += 1;
            }
        });

        return $result;
    }

    public function pullHolidays(int $year): array
    {
        if (! $this->enabled()) {
            return [
                'created' => 0,
                'updated' => 0,
                'skipped' => 0,
                'message' => 'Sinkronisasi Google Calendar sedang nonaktif.',
            ];
        }

        $config = $this->resolveConfig('libur');

        if (! $config) {
            throw new \RuntimeException('Konfigurasi kalender libur belum tersedia.');
        }

        $calendarId = $this->calendarId($config);
        $events = $this->listEvents(
            calendarId: $calendarId,
            timeMin: CarbonImmutable::create($year, 1, 1, 0, 0, 0, $config->timezone ?: $this->defaultTimezone()),
            timeMax: CarbonImmutable::create($year + 1, 1, 1, 0, 0, 0, $config->timezone ?: $this->defaultTimezone()),
        );

        $result = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'skipped_empty_date' => 0,
            'skipped_empty_name' => 0,
            'skipped_non_holiday' => 0,
        ];

        foreach ($events as $event) {
            $date = $this->eventStartDate($event, $config->timezone ?: $this->defaultTimezone());
            $name = trim((string) ($event['summary'] ?? ''));

            if ($date === null) {
                $result['skipped'] += 1;
                $result['skipped_empty_date'] += 1;
                continue;
            }

            if ($name === '') {
                $result['skipped'] += 1;
                $result['skipped_empty_name'] += 1;
                continue;
            }

            if (! $this->shouldImportHolidayEvent($event, $name)) {
                $result['skipped'] += 1;
                $result['skipped_non_holiday'] += 1;
                continue;
            }

            $existing = Holiday::query()
                ->whereDate('date', $date)
                ->first();

            $data = [
                'date' => $date,
                'name' => $name,
                'type' => $this->holidayTypeFromName($name),
                'legal_basis' => 'Google Calendar',
                'gcal_event_id' => $event['id'] ?? null,
                'gcal_status' => 'terkirim',
                'gcal_synced_at' => now(),
            ];

            if ($existing) {
                $existing->forceFill($data)->save();
                $result['updated'] += 1;
                continue;
            }

            Holiday::create($data);
            $result['created'] += 1;
        }

        return $result;
    }

    public function previewHolidayEvents(int $year, int $limit = 20): array
    {
        $config = $this->resolveConfig('libur');

        if (! $config) {
            throw new \RuntimeException('Konfigurasi kalender libur belum tersedia.');
        }

        $timezone = $config->timezone ?: $this->defaultTimezone();
        $calendarId = $this->calendarId($config);
        $events = $this->listEvents(
            calendarId: $calendarId,
            timeMin: CarbonImmutable::create($year, 1, 1, 0, 0, 0, $timezone),
            timeMax: CarbonImmutable::create($year + 1, 1, 1, 0, 0, 0, $timezone),
        );

        return collect($events)
            ->take($limit)
            ->map(function (array $event) use ($timezone) {
                $name = trim((string) ($event['summary'] ?? ''));
                $date = $this->eventStartDate($event, $timezone);
                $allDay = ! empty($event['start']['date']);

                return [
                    'date' => $date ?? '-',
                    'name' => $name !== '' ? $name : '-',
                    'format' => $allDay ? 'all-day' : 'dateTime',
                    'importable' => $date !== null && $name !== '' && $this->shouldImportHolidayEvent($event, $name) ? 'ya' : 'tidak',
                ];
            })
            ->values()
            ->all();
    }

    private function eventStartDate(array $event, string $timezone): ?string
    {
        $allDayDate = $event['start']['date'] ?? null;

        if (is_string($allDayDate) && $allDayDate !== '') {
            return $allDayDate;
        }

        $dateTime = $event['start']['dateTime'] ?? null;

        if (! is_string($dateTime) || $dateTime === '') {
            return null;
        }

        return CarbonImmutable::parse($dateTime)->setTimezone($timezone)->toDateString();
    }

    private function shouldImportHolidayEvent(array $event, string $name): bool
    {
        if (! empty($event['start']['date'])) {
            return true;
        }

        return preg_match(
            '/\b(libur|cuti|natal|tahun baru|isra|imlek|nyepi|idul|wafat|paskah|buruh|kenaikan|waisak|pancasila|islam|kemerdekaan|maulid|yesus|kristus)\b/i',
            $name,
        ) === 1;
    }

    public function syncLeaveRequest(LeaveRequest $leaveRequest, string $action = 'buat'): void
    {
        if (! $this->enabled()) {
            return;
        }

        $leaveRequest->loadMissing(['employee.workUnit', 'leaveType']);
        $config = $this->resolveConfig('cuti', $leaveRequest->employee?->work_unit_id);

        if (! $config) {
            $this->markSourceFailed($leaveRequest, 'Konfigurasi kalender cuti belum tersedia.');
            return;
        }

        $employeeName = $leaveRequest->employee?->name ?? 'Pegawai';
        $leaveTypeName = $leaveRequest->leaveType?->name ?? 'Pengajuan';

        $this->syncAllDayEvent(
            sourceType: 'pengajuan',
            source: $leaveRequest,
            config: $config,
            action: $action,
            summary: "{$leaveTypeName} - {$employeeName}",
            description: trim(implode("\n", array_filter([
                'Pegawai: '.$employeeName,
                $leaveRequest->employee?->workUnit?->name ? 'Unit: '.$leaveRequest->employee->workUnit->name : null,
                'Status: '.$leaveRequest->status,
                'Total hari kerja: '.$leaveRequest->total_days,
                'Alasan: '.$leaveRequest->reason,
                'Sumber: SI Presensi UNTAD',
            ]))),
            startDate: $leaveRequest->start_date,
            endDate: $leaveRequest->end_date,
        );
    }

    private function syncAllDayEvent(
        string $sourceType,
        Holiday|LeaveRequest $source,
        CalendarConfig $config,
        string $action,
        string $summary,
        string $description,
        CarbonInterface $startDate,
        CarbonInterface $endDate,
    ): void {
        $calendarId = $this->calendarId($config);

        $sync = CalendarSync::create([
            'source_type' => $sourceType,
            'source_id' => $source->id,
            'calendar_config_id' => $config->id,
            'google_calendar_id' => $calendarId,
            'gcal_event_id' => $source->gcal_event_id,
            'action' => $action,
            'status' => 'tertunda',
        ]);

        try {
            if ($action === 'hapus') {
                $this->deleteEvent($calendarId, $source->gcal_event_id);

                $source->forceFill([
                    'gcal_event_id' => null,
                    'gcal_status' => 'dihapus',
                    'gcal_synced_at' => now(),
                ])->save();

                $sync->update([
                    'status' => 'dihapus',
                    'attempts' => $sync->attempts + 1,
                    'processed_at' => now(),
                ]);

                return;
            }

            $event = $this->upsertEvent(
                calendarId: $calendarId,
                eventId: $source->gcal_event_id,
                payload: [
                    'summary' => $summary,
                    'description' => $description,
                    'start' => [
                        'date' => $startDate->toDateString(),
                        'timeZone' => $config->timezone ?: $this->defaultTimezone(),
                    ],
                    'end' => [
                        'date' => $endDate->copy()->addDay()->toDateString(),
                        'timeZone' => $config->timezone ?: $this->defaultTimezone(),
                    ],
                ],
            );

            $source->forceFill([
                'gcal_event_id' => $event['id'] ?? $source->gcal_event_id,
                'gcal_status' => 'terkirim',
                'gcal_synced_at' => now(),
            ])->save();

            $sync->update([
                'gcal_event_id' => $event['id'] ?? $source->gcal_event_id,
                'status' => 'terkirim',
                'attempts' => $sync->attempts + 1,
                'processed_at' => now(),
            ]);
        } catch (\Throwable $e) {
            Log::warning('google_calendar.sync_failed', [
                'source_type' => $sourceType,
                'source_id' => $source->id,
                'action' => $action,
                'message' => $e->getMessage(),
            ]);

            $source->forceFill([
                'gcal_status' => 'gagal',
                'gcal_synced_at' => now(),
            ])->save();

            $sync->update([
                'status' => 'gagal',
                'attempts' => $sync->attempts + 1,
                'error_message' => $e->getMessage(),
                'processed_at' => now(),
            ]);
        }
    }

    private function upsertEvent(string $calendarId, ?string $eventId, array $payload): array
    {
        $eventId ??= $this->findMatchingEventId($calendarId, $payload);

        $request = Http::withToken($this->accessToken())
            ->timeout($this->timeout())
            ->connectTimeout($this->connectTimeout())
            ->acceptJson();

        $response = $eventId
            ? $request->patch($this->eventUrl($calendarId, $eventId), $payload)
            : $request->post($this->eventsUrl($calendarId), $payload);

        if (! $response->successful()) {
            throw new \RuntimeException($this->messageFromGoogle($response->json(), $response->body()));
        }

        return $response->json();
    }

    private function findMatchingEventId(string $calendarId, array $payload): ?string
    {
        $date = $payload['start']['date'] ?? null;
        $summary = $payload['summary'] ?? null;

        if (! is_string($date) || ! is_string($summary)) {
            return null;
        }

        foreach ($this->listEventsForDate($calendarId, $date) as $event) {
            $eventDate = $event['start']['date'] ?? null;
            $eventSummary = $event['summary'] ?? null;

            if ($eventDate === $date && $this->normalizeEventName($eventSummary) === $this->normalizeEventName($summary)) {
                return $event['id'] ?? null;
            }
        }

        return null;
    }

    private function listEventsForDate(string $calendarId, string $date): array
    {
        $timezone = $this->defaultTimezone();

        return $this->listEvents(
            calendarId: $calendarId,
            timeMin: CarbonImmutable::parse($date, $timezone)->startOfDay(),
            timeMax: CarbonImmutable::parse($date, $timezone)->addDay()->startOfDay(),
        );
    }

    private function listEvents(string $calendarId, CarbonInterface $timeMin, CarbonInterface $timeMax): array
    {
        $request = Http::withToken($this->accessToken())
            ->timeout($this->timeout())
            ->connectTimeout($this->connectTimeout())
            ->acceptJson();

        $events = [];
        $pageToken = null;

        do {
            $response = $request->get($this->eventsUrl($calendarId), array_filter([
                'timeMin' => $timeMin->toRfc3339String(),
                'timeMax' => $timeMax->toRfc3339String(),
                'singleEvents' => 'true',
                'orderBy' => 'startTime',
                'showDeleted' => 'false',
                'maxResults' => 2500,
                'pageToken' => $pageToken,
            ]));

            if (! $response->successful()) {
                throw new \RuntimeException($this->messageFromGoogle($response->json(), $response->body()));
            }

            $payload = $response->json();
            $events = array_merge($events, is_array($payload['items'] ?? null) ? $payload['items'] : []);
            $pageToken = $payload['nextPageToken'] ?? null;
        } while (is_string($pageToken) && $pageToken !== '');

        return $events;
    }

    private function deleteEvent(string $calendarId, ?string $eventId): void
    {
        if (! $eventId) {
            return;
        }

        $response = Http::withToken($this->accessToken())
            ->timeout($this->timeout())
            ->connectTimeout($this->connectTimeout())
            ->delete($this->eventUrl($calendarId, $eventId));

        if ($response->status() === 404 || $response->status() === 410) {
            return;
        }

        if (! $response->successful() && $response->status() !== 204) {
            throw new \RuntimeException($this->messageFromGoogle($response->json(), $response->body()));
        }
    }

    private function accessToken(): string
    {
        return Cache::remember(
            'google_calendar:access_token',
            $this->tokenCacheSeconds(),
            fn () => $this->requestAccessToken(),
        );
    }

    private function requestAccessToken(): string
    {
        $credentials = $this->credentials();
        $now = time();
        $tokenUri = $credentials['token_uri'] ?? 'https://oauth2.googleapis.com/token';

        $header = $this->base64UrlEncode(json_encode([
            'alg' => 'RS256',
            'typ' => 'JWT',
        ], JSON_THROW_ON_ERROR));

        $claims = $this->base64UrlEncode(json_encode([
            'iss' => $credentials['client_email'],
            'scope' => self::SCOPE,
            'aud' => $tokenUri,
            'iat' => $now,
            'exp' => $now + 3600,
        ], JSON_THROW_ON_ERROR));

        $unsignedJwt = "{$header}.{$claims}";
        $signature = '';

        if (! openssl_sign($unsignedJwt, $signature, $credentials['private_key'], OPENSSL_ALGO_SHA256)) {
            throw new \RuntimeException('Gagal membuat tanda tangan service account Google Calendar.');
        }

        $jwt = "{$unsignedJwt}.".$this->base64UrlEncode($signature);

        $response = Http::asForm()
            ->timeout($this->timeout())
            ->connectTimeout($this->connectTimeout())
            ->post($tokenUri, [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

        if (! $response->successful()) {
            throw new \RuntimeException($this->messageFromGoogle($response->json(), $response->body()));
        }

        $token = $response->json('access_token');

        if (! is_string($token) || $token === '') {
            throw new \RuntimeException('Google Calendar tidak mengembalikan access_token.');
        }

        return $token;
    }

    private function credentials(): array
    {
        $path = (string) config('services.google_calendar.credentials_path');

        if ($path === '') {
            throw new \RuntimeException('GOOGLE_CALENDAR_CREDENTIALS_PATH belum diatur.');
        }

        $absolutePath = str_starts_with($path, DIRECTORY_SEPARATOR) || preg_match('/^[A-Za-z]:[\/\\\\]/', $path)
            ? $path
            : base_path($path);

        if (! is_file($absolutePath)) {
            throw new \RuntimeException('File credential Google Calendar tidak ditemukan.');
        }

        $credentials = json_decode((string) file_get_contents($absolutePath), true);

        if (! is_array($credentials) || empty($credentials['client_email']) || empty($credentials['private_key'])) {
            throw new \RuntimeException('File credential Google Calendar tidak valid.');
        }

        return $credentials;
    }

    private function resolveConfig(string $target, ?int $workUnitId = null): ?CalendarConfig
    {
        $query = CalendarConfig::query()
            ->where('is_active', true)
            ->whereIn('target', [$target, 'keduanya']);

        if ($workUnitId !== null) {
            $query->where(fn ($q) => $q
                ->where('work_unit_id', $workUnitId)
                ->orWhereNull('work_unit_id'))
                ->orderByRaw('work_unit_id IS NULL');
        } else {
            $query->whereNull('work_unit_id');
        }

        $config = $query->first();

        if ($config) {
            return $config;
        }

        $defaultCalendarId = config('services.google_calendar.default_calendar_id');

        if (! $defaultCalendarId) {
            return null;
        }

        return new CalendarConfig([
            'google_calendar_id' => $defaultCalendarId,
            'target' => 'keduanya',
            'timezone' => $this->defaultTimezone(),
            'is_active' => true,
        ]);
    }

    private function markSourceFailed(Holiday|LeaveRequest $source, string $message): void
    {
        $source->forceFill([
            'gcal_status' => 'gagal',
            'gcal_synced_at' => now(),
        ])->save();

        CalendarSync::create([
            'source_type' => $source instanceof Holiday ? 'hari_libur' : 'pengajuan',
            'source_id' => $source->id,
            'action' => 'buat',
            'status' => 'gagal',
            'attempts' => 1,
            'error_message' => $message,
            'processed_at' => now(),
        ]);
    }

    private function eventsUrl(string $calendarId): string
    {
        return sprintf(self::EVENTS_API, rawurlencode($calendarId));
    }

    private function eventUrl(string $calendarId, string $eventId): string
    {
        return $this->eventsUrl($calendarId).'/'.rawurlencode($eventId);
    }

    private function calendarId(CalendarConfig $config): string
    {
        $calendarId = trim((string) $config->google_calendar_id);

        if ($calendarId === '' || str_contains($calendarId, 'ganti-dengan-id')) {
            return (string) config('services.google_calendar.default_calendar_id', 'primary');
        }

        return $calendarId;
    }

    private function holidayTypeFromName(string $name): string
    {
        $lower = strtolower($name);

        if (str_contains($lower, 'cuti bersama') || str_contains($lower, 'joint holiday')) {
            return 'cuti_bersama';
        }

        return 'nasional';
    }

    private function normalizeEventName(mixed $value): string
    {
        $text = strtolower(trim((string) $value));
        $text = preg_replace('/\s+/', ' ', $text) ?? $text;

        return $text;
    }

    private function enabled(): bool
    {
        return filter_var(config('services.google_calendar.enabled', true), FILTER_VALIDATE_BOOLEAN)
            && (bool) AppSetting::get('gcal_aktif', true);
    }

    private function defaultTimezone(): string
    {
        return (string) config('services.google_calendar.default_timezone', 'Asia/Makassar');
    }

    private function timeout(): int
    {
        return (int) config('services.google_calendar.timeout', 15);
    }

    private function connectTimeout(): int
    {
        return (int) config('services.google_calendar.connect_timeout', 5);
    }

    private function tokenCacheSeconds(): int
    {
        return (int) config('services.google_calendar.token_cache_seconds', 3300);
    }

    private function base64UrlEncode(string $value): string
    {
        return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
    }

    private function messageFromGoogle(mixed $payload, string $fallback): string
    {
        if (is_array($payload)) {
            $message = $payload['error_description']
                ?? $payload['error']['message']
                ?? $payload['error']
                ?? null;

            if (is_string($message) && $message !== '') {
                return $message;
            }
        }

        return $fallback ?: 'Google Calendar API gagal dipanggil.';
    }
}
