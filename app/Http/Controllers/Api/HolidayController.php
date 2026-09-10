<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHolidayRequest;
use App\Models\ActivityLog;
use App\Models\Holiday;
use App\Services\Calendar\GoogleCalendarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HolidayController extends Controller
{
    public function __construct(private readonly GoogleCalendarService $calendar) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'year' => ['sometimes', 'integer', 'digits:4'],
            'type' => ['sometimes', 'string'],
        ]);

        $query = Holiday::query();

        if (isset($filters['year'])) {
            $query->whereYear('date', $filters['year']);
        }
        if (isset($filters['type'])) {
            $query->where('type', $filters['type']);
        }

        $holidays = $query->orderBy('date')->get();

        return response()->json([
            'data' => $holidays->map(fn (Holiday $h) => $this->serialize($h)),
        ]);
    }

    public function store(StoreHolidayRequest $request): JsonResponse
    {
        $holiday = Holiday::create($request->validated());

        ActivityLog::record('holiday.create', $holiday, $request->validated());
        $this->calendar->syncHoliday($holiday);

        return response()->json(['data' => $this->serialize($holiday)], 201);
    }

    public function destroy(Request $request, Holiday $holiday): JsonResponse
    {
        ActivityLog::record('holiday.delete', $holiday);
        $this->calendar->syncHoliday($holiday, 'hapus');
        $holiday->delete();

        return response()->json(['message' => 'Hari libur berhasil dihapus.']);
    }

    public function syncFromGoogle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => ['sometimes', 'integer', 'digits:4'],
        ]);

        $year = $validated['year'] ?? now('Asia/Makassar')->year;
        $result = $this->calendar->pullHolidays((int) $year);

        ActivityLog::record('holiday.sync_from_google', null, ['year' => $year] + $result);

        return response()->json([
            'message' => 'Sinkronisasi dari Google Calendar selesai.',
            'data' => $result,
        ]);
    }

    public function syncToGoogle(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'year' => ['sometimes', 'integer', 'digits:4'],
        ]);

        $year = isset($validated['year']) ? (int) $validated['year'] : null;
        $result = $this->calendar->syncHolidays($year);

        ActivityLog::record('holiday.sync_to_google', null, ['year' => $year] + $result);

        return response()->json([
            'message' => 'Sinkronisasi ke Google Calendar selesai.',
            'data' => $result,
        ]);
    }

    private function serialize(Holiday $holiday): array
    {
        return [
            'id' => $holiday->id,
            'date' => $holiday->date?->toDateString(),
            'name' => $holiday->name,
            'type' => $holiday->type,
            'legal_basis' => $holiday->legal_basis,
            'gcal_status' => $holiday->gcal_status,
            'gcal_synced_at' => $holiday->gcal_synced_at?->toIso8601String(),
        ];
    }
}
