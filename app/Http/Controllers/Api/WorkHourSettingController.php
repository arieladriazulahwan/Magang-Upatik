<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreWorkHourSettingRequest;
use App\Http\Requests\UpdateWorkHourSettingRequest;
use App\Models\ActivityLog;
use App\Models\WorkHourSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkHourSettingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'work_unit_id' => ['sometimes', 'integer'],
            'category' => ['sometimes', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $query = WorkHourSetting::query()->with('workUnit:id,name,code');

        if (array_key_exists('work_unit_id', $filters)) {
            $query->where('work_unit_id', $filters['work_unit_id']);
        }
        if (isset($filters['category'])) {
            $query->where('category', $filters['category']);
        }
        if (isset($filters['is_active'])) {
            $query->where('is_active', $filters['is_active']);
        }

        $settings = $query->orderByRaw('work_unit_id IS NULL DESC')->orderBy('category')->get();

        return response()->json([
            'data' => $settings->map(fn (WorkHourSetting $s) => $this->serialize($s)),
        ]);
    }

    public function store(StoreWorkHourSettingRequest $request): JsonResponse
    {
        $setting = WorkHourSetting::create($request->validated());

        ActivityLog::record('work_hour_setting.create', $setting, $request->validated());

        return response()->json(['data' => $this->serialize($setting)], 201);
    }

    public function update(UpdateWorkHourSettingRequest $request, WorkHourSetting $workHourSetting): JsonResponse
    {
        $workHourSetting->update($request->validated());

        ActivityLog::record('work_hour_setting.update', $workHourSetting, $request->validated());

        return response()->json(['data' => $this->serialize($workHourSetting)]);
    }

    private function serialize(WorkHourSetting $setting): array
    {
        return [
            'id' => $setting->id,
            'work_unit' => $setting->workUnit?->only(['id', 'name', 'code']),
            'category' => $setting->category,
            'min_minutes' => $setting->min_minutes,
            'standard_check_in' => $setting->standard_check_in,
            'late_threshold' => $setting->late_threshold,
            'standard_check_out' => $setting->standard_check_out,
            'work_days' => $setting->work_days,
            'is_active' => $setting->is_active,
        ];
    }
}