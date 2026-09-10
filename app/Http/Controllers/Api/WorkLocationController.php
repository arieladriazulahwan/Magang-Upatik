<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\WorkLocation;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WorkLocationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'work_unit_id' => ['sometimes', 'integer'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $query = WorkLocation::query()->with('workUnit:id,name,code');

        if (isset($filters['work_unit_id'])) {
            $query->where(fn ($q) => $q
                ->whereNull('work_unit_id')
                ->orWhere('work_unit_id', $filters['work_unit_id']));
        }

        $allowedUnitIds = $request->user()?->scopedUnitIds();
        if ($allowedUnitIds !== null) {
            $query->where(fn ($q) => $q
                ->whereNull('work_unit_id')
                ->orWhereIn('work_unit_id', $allowedUnitIds));
        }

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        $locations = $query->orderBy('name')->get();

        return response()->json([
            'data' => $locations->map(fn (WorkLocation $location) => $this->serialize($location)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'work_unit_id' => ['nullable', 'integer', Rule::exists('work_unit', 'id')->where('is_active', true)],
            'name' => ['required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
            'radius_meters' => ['required', 'integer', 'min:10', 'max:10000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $this->assertUnitInScope($request, isset($data['work_unit_id']) ? (int) $data['work_unit_id'] : null);

        $location = WorkLocation::create([
            ...$data,
            'is_active' => $data['is_active'] ?? true,
        ]);

        ActivityLog::record('work_location.create', $location, $data);

        return response()->json(['data' => $this->serialize($location->load('workUnit:id,name,code'))], 201);
    }

    public function update(Request $request, WorkLocation $workLocation): JsonResponse
    {
        $data = $request->validate([
            'work_unit_id' => ['sometimes', 'nullable', 'integer', Rule::exists('work_unit', 'id')->where('is_active', true)],
            'name' => ['sometimes', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'latitude' => ['sometimes', 'numeric', 'between:-90,90'],
            'longitude' => ['sometimes', 'numeric', 'between:-180,180'],
            'radius_meters' => ['sometimes', 'integer', 'min:10', 'max:10000'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $this->assertUnitInScope($request, $workLocation->work_unit_id !== null ? (int) $workLocation->work_unit_id : null);

        if (isset($data['work_unit_id'])) {
            $this->assertUnitInScope($request, $data['work_unit_id'] !== null ? (int) $data['work_unit_id'] : null);
        }

        $workLocation->update($data);

        ActivityLog::record('work_location.update', $workLocation, $data);

        return response()->json(['data' => $this->serialize($workLocation->load('workUnit:id,name,code'))]);
    }

    public function destroy(Request $request, WorkLocation $workLocation): JsonResponse
    {
        $this->assertUnitInScope($request, $workLocation->work_unit_id !== null ? (int) $workLocation->work_unit_id : null);

        ActivityLog::record('work_location.delete', $workLocation);
        $workLocation->delete();

        return response()->json(['message' => 'Lokasi presensi berhasil dihapus.']);
    }

    private function assertUnitInScope(Request $request, ?int $workUnitId): void
    {
        if ($workUnitId === null) {
            if ($request->user()?->hasGlobalRole(['super_admin'])) {
                return;
            }

            abort(403, 'Hanya Super Admin yang dapat mengelola lokasi global.');
        }

        $allowedUnitIds = $request->user()?->scopedUnitIds();

        if ($allowedUnitIds !== null && ! in_array($workUnitId, $allowedUnitIds, true)) {
            abort(403, 'Anda tidak punya izin mengelola lokasi unit lain.');
        }
    }

    private function serialize(WorkLocation $location): array
    {
        return [
            'id' => $location->id,
            'work_unit' => $location->workUnit?->only(['id', 'name', 'code']),
            'is_global' => $location->work_unit_id === null,
            'name' => $location->name,
            'address' => $location->address,
            'latitude' => (float) $location->latitude,
            'longitude' => (float) $location->longitude,
            'radius_meters' => (int) $location->radius_meters,
            'is_active' => $location->is_active,
            'created_at' => $location->created_at?->toIso8601String(),
            'updated_at' => $location->updated_at?->toIso8601String(),
        ];
    }
}
