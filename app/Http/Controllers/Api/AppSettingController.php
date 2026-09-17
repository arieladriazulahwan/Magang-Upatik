<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpsertAppSettingRequest;
use App\Models\ActivityLog;
use App\Models\AppSetting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AppSettingController extends Controller
{
    private const WORKING_DAYS_KEY = 'working_days_policy';

    public function index(): JsonResponse
    {
        $settings = AppSetting::orderBy('key')->get();

        return response()->json(['data' => $settings->map(fn (AppSetting $s) => $this->serialize($s))]);
    }

    public function upsert(UpsertAppSettingRequest $request): JsonResponse
    {
        $data = $request->validated();

        return $this->saveSetting($data);
    }

    public function updateByKey(Request $request, string $key): JsonResponse
    {
        $data = $request->validate([
            'value' => ['nullable', 'string'],
            'data_type' => ['sometimes', 'in:string,boolean,int,float'],
            'description' => ['nullable', 'string', 'max:255'],
        ]);

        $data['key'] = $key;

        return $this->saveSetting($data);
    }

    public function workingDaysPolicy(): JsonResponse
    {
        $setting = AppSetting::where('key', self::WORKING_DAYS_KEY)->first();
        $days = $setting ? json_decode((string) $setting->value, true) : [];

        return response()->json(['data' => is_array($days) ? $days : []]);
    }

    public function saveWorkingDaysPolicy(Request $request): JsonResponse
    {
        $data = $request->validate([
            'working_days' => ['required', 'array', 'size:7'],
            'working_days.*.day' => ['required', 'string', 'max:20'],
            'working_days.*.dayCode' => ['required', 'string', 'max:20'],
            'working_days.*.is_active' => ['required', 'boolean'],
            'working_days.*.start_time' => ['nullable', 'date_format:H:i'],
            'working_days.*.end_time' => ['nullable', 'date_format:H:i'],
        ]);

        $setting = AppSetting::updateOrCreate(
            ['key' => self::WORKING_DAYS_KEY],
            [
                'value' => json_encode($data['working_days']),
                'data_type' => 'string',
                'description' => 'Kebijakan hari kerja mingguan untuk tampilan pengaturan web.',
            ],
        );

        ActivityLog::record('app_setting.working_days.upsert', $setting, $data);

        return response()->json(['data' => $data['working_days']]);
    }

    private function saveSetting(array $data): JsonResponse
    {
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
