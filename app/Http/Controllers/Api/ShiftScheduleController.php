<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\BulkStoreShiftScheduleRequest;
use App\Http\Requests\StoreShiftScheduleRequest;
use App\Models\ActivityLog;
use App\Models\Shift;
use App\Models\ShiftSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ShiftScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $filters = $request->validate([
            'employee_id' => ['sometimes', 'integer'],
            'shift_id' => ['sometimes', 'integer'],
            'date_from' => ['sometimes', 'date'],
            'date_to' => ['sometimes', 'date', 'after_or_equal:date_from'],
        ]);

        $query = ShiftSchedule::query()->with(['employee:id,name,nip', 'shift:id,name,work_unit_id']);

        if (isset($filters['employee_id'])) {
            $query->where('employee_id', $filters['employee_id']);
        }
        if (isset($filters['shift_id'])) {
            $query->where('shift_id', $filters['shift_id']);
        }
        if (isset($filters['date_from'])) {
            $query->where('date', '>=', $filters['date_from']);
        }
        if (isset($filters['date_to'])) {
            $query->where('date', '<=', $filters['date_to']);
        }

        $schedules = $query->orderBy('date')->get();

        return response()->json([
            'data' => $schedules->map(fn (ShiftSchedule $s) => $this->serialize($s)),
        ]);
    }

    public function store(StoreShiftScheduleRequest $request): JsonResponse
    {
        $data = $request->validated();

        $this->assertNoExistingScheduleOtherShift($data['employee_id'], $data['date'], $data['shift_id']);

        $schedule = ShiftSchedule::create($data);

        ActivityLog::record('shift_schedule.create', $schedule, $data);

        $schedule->load(['employee:id,name,nip', 'shift:id,name,work_unit_id']);

        return response()->json(['data' => $this->serialize($schedule)], 201);
    }

    public function bulkStore(BulkStoreShiftScheduleRequest $request): JsonResponse
    {
        $data = $request->validated();
        $shift = Shift::findOrFail($data['shift_id']);

        $created = [];
        $skipped = [];

        DB::transaction(function () use ($data, $shift, &$created, &$skipped) {
            foreach ($data['employee_ids'] as $employeeId) {
                foreach ($data['dates'] as $date) {
                    $existing = ShiftSchedule::where('employee_id', $employeeId)
                        ->where('date', $date)
                        ->first();

                    if ($existing && $existing->shift_id === $shift->id) {
                        continue;
                    }

                    if ($existing) {
                        $skipped[] = [
                            'employee_id' => $employeeId,
                            'date' => $date,
                            'reason' => 'already_scheduled_other_shift',
                        ];

                        continue;
                    }

                    $schedule = ShiftSchedule::create([
                        'employee_id' => $employeeId,
                        'shift_id' => $shift->id,
                        'date' => $date,
                        'description' => $data['description'] ?? null,
                    ]);

                    $created[] = $schedule->id;
                }
            }

            ActivityLog::record('shift_schedule.bulk_create', $shift, [
                'employee_ids' => $data['employee_ids'],
                'dates' => $data['dates'],
                'created_count' => count($created),
                'skipped_count' => count($skipped),
            ]);
        });

        return response()->json([
            'created_count' => count($created),
            'skipped' => $skipped,
        ], 201);
    }

    public function destroy(Request $request, ShiftSchedule $shiftSchedule): JsonResponse
    {
        ActivityLog::record('shift_schedule.delete', $shiftSchedule);
        $shiftSchedule->delete();

        return response()->json(['message' => 'Jadwal shift berhasil dihapus.']);
    }

    private function assertNoExistingScheduleOtherShift(int $employeeId, string $date, int $shiftId): void
    {
        $existing = ShiftSchedule::where('employee_id', $employeeId)->where('date', $date)->first();

        if ($existing && $existing->shift_id !== $shiftId) {
            abort(409, 'Pegawai ini sudah dijadwalkan ke shift lain pada tanggal tersebut.');
        }

        if ($existing) {
            abort(409, 'Pegawai ini sudah dijadwalkan ke shift yang sama pada tanggal tersebut.');
        }
    }

    private function serialize(ShiftSchedule $schedule): array
    {
        return [
            'id' => $schedule->id,
            'employee' => $schedule->employee?->only(['id', 'name', 'nip']),
            'shift' => $schedule->shift?->only(['id', 'name']),
            'date' => $schedule->date?->toDateString(),
            'description' => $schedule->description,
        ];
    }
}