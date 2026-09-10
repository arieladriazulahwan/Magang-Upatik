<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreShiftRequest;
use App\Http\Requests\UpdateShiftRequest;
use App\Models\ActivityLog;
use App\Models\Shift;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ShiftController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'work_unit_id' => ['sometimes', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $query = Shift::query()->with('workUnit:id,name,code');

        if (isset($filters['work_unit_id'])) {
            $query->where('work_unit_id', $filters['work_unit_id']);
        }

        $allowedUnitIds = $request->user()?->scopedUnitIds();
        if ($allowedUnitIds !== null) {
            $query->whereIn('work_unit_id', $allowedUnitIds);
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        $shifts = $query->orderBy('name')->get();

        return response()->json([
            'data' => $shifts->map(fn (Shift $s) => $this->serialize($s)),
        ]);
    }

    public function store(StoreShiftRequest $request): JsonResponse
    {
        $data = $request->validated();
        $this->assertUnitInScope($request, $data['work_unit_id']);

        $shift = Shift::create($data);

        ActivityLog::record('shift.create', $shift, $data);

        return response()->json(['data' => $this->serialize($shift)], 201);
    }

    public function update(UpdateShiftRequest $request, Shift $shift): JsonResponse
    {
        $data = $request->validated();
        $this->assertUnitInScope($request, $shift->work_unit_id);

        if (isset($data['work_unit_id'])) {
            $this->assertUnitInScope($request, $data['work_unit_id']);
        }

        $shift->update($data);

        ActivityLog::record('shift.update', $shift, $data);

        return response()->json(['data' => $this->serialize($shift)]);
    }

    private function assertUnitInScope(Request $request, ?int $workUnitId): void
    {
        if ($workUnitId === null) {
            return;
        }

        $allowedUnitIds = $request->user()?->scopedUnitIds();
        if ($allowedUnitIds !== null && ! in_array($workUnitId, $allowedUnitIds, true)) {
            abort(403, 'Anda tidak punya izin mengelola shift unit lain.');
        }
    }

    private function serialize(Shift $shift): array
    {
        return [
            'id' => $shift->id,
            'work_unit' => $shift->workUnit?->only(['id', 'name', 'code']),
            'name' => $shift->name,
            'start_time' => $shift->start_time,
            'end_time' => $shift->end_time,
            'is_overnight' => $shift->is_overnight,
            'tolerance_minutes' => $shift->tolerance_minutes,
            'is_active' => $shift->is_active,
        ];
    }
}
