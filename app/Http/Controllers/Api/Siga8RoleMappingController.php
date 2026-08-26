<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSiga8RoleMappingRequest;
use App\Http\Requests\UpdateSiga8RoleMappingRequest;
use App\Models\ActivityLog;
use App\Models\Siga8RoleMapping;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class Siga8RoleMappingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'is_active' => ['sometimes', 'boolean'],
            'role_id' => ['sometimes', 'integer'],
        ]);

        $query = Siga8RoleMapping::query()->with(['role:id,name', 'workUnit:id,name,code']);

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }
        if (isset($filters['role_id'])) {
            $query->where('role_id', $filters['role_id']);
        }

        $mappings = $query->orderBy('siga8_role_name')->get();

        return response()->json(['data' => $mappings->map(fn (Siga8RoleMapping $m) => $this->serialize($m))]);
    }

    public function store(StoreSiga8RoleMappingRequest $request): JsonResponse
    {
        $mapping = Siga8RoleMapping::create($request->validated());

        ActivityLog::record('siga8_role_mapping.create', $mapping, $request->validated());

        $mapping->load(['role:id,name', 'workUnit:id,name,code']);

        return response()->json(['data' => $this->serialize($mapping)], 201);
    }

    public function update(UpdateSiga8RoleMappingRequest $request, Siga8RoleMapping $siga8RoleMapping): JsonResponse
    {
        $siga8RoleMapping->update($request->validated());

        ActivityLog::record('siga8_role_mapping.update', $siga8RoleMapping, $request->validated());

        $siga8RoleMapping->load(['role:id,name', 'workUnit:id,name,code']);

        return response()->json(['data' => $this->serialize($siga8RoleMapping)]);
    }

    public function destroy(Request $request, Siga8RoleMapping $siga8RoleMapping): JsonResponse
    {
        ActivityLog::record('siga8_role_mapping.delete', $siga8RoleMapping);
        $siga8RoleMapping->delete();

        return response()->json(['message' => 'Pemetaan role berhasil dihapus.']);
    }

    private function serialize(Siga8RoleMapping $mapping): array
    {
        return [
            'id' => $mapping->id,
            'siga8_role_id' => $mapping->siga8_role_id,
            'siga8_role_name' => $mapping->siga8_role_name,
            'role' => $mapping->role?->only(['id', 'name']),
            'work_unit' => $mapping->workUnit?->only(['id', 'name', 'code']),
            'is_active' => $mapping->is_active,
            'description' => $mapping->description,
        ];
    }
}