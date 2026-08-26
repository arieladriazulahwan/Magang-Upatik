<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpsertAppSettingRequest;
use App\Models\ActivityLog;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;

class AppSettingController extends Controller
{
    public function index(): JsonResponse
    {
        $settings = AppSetting::orderBy('key')->get();

        return response()->json(['data' => $settings->map(fn (AppSetting $s) => $this->serialize($s))]);
    }

    public function upsert(UpsertAppSettingRequest $request): JsonResponse
    {
        $data = $request->validated();

        $setting = AppSetting::updateOrCreate(
            ['key' => $data['key']],
            [
                'value' => $data['value'] ?? null,
                'data_type' => $data['data_type'] ?? 'string',
                'description' => $data['description'] ?? null,
            ],
        );

        ActivityLog::record('app_setting.upsert', $setting, $data);

        return response()->json(['data' => $this->serialize($setting)], $setting->wasRecentlyCreated ? 201 : 200);
    }

    private function serialize(AppSetting $setting): array
    {
        return [
            'id' => $setting->id,
            'key' => $setting->key,
            'value' => $setting->value,
            'data_type' => $setting->data_type,
            'description' => $setting->description,
            'updated_at' => $setting->updated_at?->toIso8601String(),
        ];
    }
}