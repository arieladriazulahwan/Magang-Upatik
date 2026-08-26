<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\AppNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request);

        $filters = $request->validate([
            'unread_only' => ['sometimes', 'boolean'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        $query = AppNotification::where('employee_id', $employee->id);

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        $notifications = $query->orderByDesc('created_at')->paginate($filters['per_page'] ?? 20);

        return response()->json([
            'data' => $notifications->getCollection()->map(fn (AppNotification $n) => $this->serialize($n)),
            'meta' => [
                'current_page' => $notifications->currentPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
                'last_page' => $notifications->lastPage(),
                'unread_count' => AppNotification::where('employee_id', $employee->id)->whereNull('read_at')->count(),
            ],
        ]);
    }

    public function markRead(Request $request, AppNotification $notification): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request);

        if ($notification->employee_id !== $employee->id) {
            abort(403, 'Notifikasi ini bukan milik Anda.');
        }

        if (! $notification->read_at) {
            $notification->update(['read_at' => now()]);
        }

        return response()->json(['data' => $this->serialize($notification)]);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $employee = $this->resolveActingEmployee($request);

        $count = AppNotification::where('employee_id', $employee->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        ActivityLog::record('notification.mark_all_read', $employee, ['count' => $count]);

        return response()->json(['message' => "{$count} notifikasi ditandai sudah dibaca."]);
    }

    private function resolveActingEmployee(Request $request): \App\Models\Employee
    {
        $employee = $request->user()->employee;

        if (! $employee) {
            abort(422, 'Akun Anda belum tertaut ke data pegawai. Hubungi Admin Kepegawaian.');
        }

        return $employee;
    }

    private function serialize(AppNotification $notification): array
    {
        return [
            'id' => $notification->id,
            'title' => $notification->title,
            'message' => $notification->message,
            'type' => $notification->type,
            'target_url' => $notification->target_url,
            'is_read' => $notification->read_at !== null,
            'read_at' => $notification->read_at?->toIso8601String(),
            'created_at' => $notification->created_at?->toIso8601String(),
        ];
    }
}