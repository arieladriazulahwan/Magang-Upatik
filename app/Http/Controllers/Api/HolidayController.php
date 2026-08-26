<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHolidayRequest;
use App\Models\ActivityLog;
use App\Models\Holiday;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HolidayController extends Controller
{
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

        return response()->json(['data' => $this->serialize($holiday)], 201);
    }

    public function destroy(Request $request, Holiday $holiday): JsonResponse
    {
        ActivityLog::record('holiday.delete', $holiday);
        $holiday->delete();

        return response()->json(['message' => 'Hari libur berhasil dihapus.']);
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
        ];
    }
}