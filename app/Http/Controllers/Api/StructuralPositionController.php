<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStructuralPositionRequest;
use App\Models\ActivityLog;
use App\Models\StructuralPosition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StructuralPositionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $query = StructuralPosition::query();

        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        $positions = $query->orderBy('level')->orderBy('name')->get();

        return response()->json([
            'data' => $positions->map(fn (StructuralPosition $p) => $this->serialize($p)),
        ]);
    }

    public function store(StoreStructuralPositionRequest $request): JsonResponse
    {
        $position = StructuralPosition::create($request->validated());

        ActivityLog::record('structural_position.create', $position, $request->validated());

        return response()->json(['data' => $this->serialize($position)], 201);
    }

    private function serialize(StructuralPosition $position): array
    {
        return [
            'id' => $position->id,
            'name' => $position->name,
            'level' => $position->level,
            'description' => $position->description,
            'is_active' => $position->is_active,
        ];
    }
}