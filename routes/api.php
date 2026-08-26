<?php

use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\HolidayController;
use App\Http\Controllers\Api\ShiftController;
use App\Http\Controllers\Api\ShiftScheduleController;
use App\Http\Controllers\Api\StructuralPositionController;
use App\Http\Controllers\Api\WorkHourSettingController;
use App\Http\Controllers\Api\WorkUnitController;
use App\Http\Controllers\Api\LeaveRequestController;
use App\Http\Controllers\Api\WfhController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\OvertimeController;
use App\Http\Controllers\Api\Siga8RoleMappingController;
use App\Http\Controllers\Api\AppSettingController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ReportController;
use Illuminate\Support\Facades\Route;


/*
|--------------------------------------------------------------------------
| API Routes — dipakai bersama oleh Web Admin (ReactJS) dan Mobile.
|--------------------------------------------------------------------------
| Satu backend, satu set route. Perbedaan Web vs Mobile diatur lewat
| middleware 'role:' per endpoint (PRD 5.0), BUKAN prefix/route terpisah,
| supaya tidak ada logika otorisasi yang terduplikasi di dua tempat.
*/

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Master data unit kerja — dibaca semua peran terautentikasi (mobile
    // & web sama-sama butuh utk dropdown/tampilan pohon), makanya TANPA
    // middleware role: tambahan, cukup harus login.
    Route::get('/work-units', [WorkUnitController::class, 'tree']);
    Route::get('/work-units/{workUnit}', [WorkUnitController::class, 'show']);

    // ---- Master data pegawai (PRD 5.1) ----
    // index/show TIDAK dibatasi middleware 'role:' di sini — controller-nya
    // sendiri yang menangani scoping (super_admin/admin_kepegawaian = global,
    // pimpinan = unit yang dipimpin + turunannya, pegawai = data dirinya
    // sendiri). Kalau dibatasi role: di route, Pimpinan/Pegawai akan 403
    // sebelum sempat masuk logika scoping controller.
    Route::get('/employees', [EmployeeController::class, 'index']);
    Route::get('/employees/{employee}', [EmployeeController::class, 'show']);

    // store/update/destroy/link-user: HANYA admin (tidak ada scoping
    // per-baris yang masuk akal untuk operasi tulis ini, jadi middleware
    // role: di route sudah cukup, tidak perlu duplikasi cek di controller).
    Route::middleware('role:super_admin,admin_kepegawaian')->group(function () {
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::patch('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy']);
        Route::post('/employees/{employee}/link-user', [EmployeeController::class, 'linkUser']);
    });

    Route::get('/structural-positions', [StructuralPositionController::class, 'index']);
    Route::middleware('role:super_admin')->group(function () {
        Route::post('/structural-positions', [StructuralPositionController::class, 'store']);
    });

    // ---- Jam kerja, shift, hari libur (PRD 5.2-5.3, 5.6, 5.10) ----
    Route::get('/work-hour-settings', [WorkHourSettingController::class, 'index']);
    Route::get('/shifts', [ShiftController::class, 'index']);
    Route::get('/shift-schedules', [ShiftScheduleController::class, 'index']);
    Route::get('/holidays', [HolidayController::class, 'index']);

    Route::middleware('role:super_admin')->group(function () {
        Route::post('/work-hour-settings', [WorkHourSettingController::class, 'store']);
        Route::patch('/work-hour-settings/{workHourSetting}', [WorkHourSettingController::class, 'update']);
        Route::post('/holidays', [HolidayController::class, 'store']);
        Route::delete('/holidays/{holiday}', [HolidayController::class, 'destroy']);
    });

    // admin_unit ikut boleh kelola shift & jadwal unitnya sendiri (PRD 5.1:
    // "Admin Unit ... kelola ... shift unit"), tidak dibatasi super_admin saja.
    Route::middleware('role:super_admin,admin_unit')->group(function () {
        Route::post('/shifts', [ShiftController::class, 'store']);
        Route::patch('/shifts/{shift}', [ShiftController::class, 'update']);
    });

    Route::middleware('role:super_admin,admin_unit,admin_kepegawaian')->group(function () {
        Route::post('/shift-schedules', [ShiftScheduleController::class, 'store']);
        Route::post('/shift-schedules/bulk', [ShiftScheduleController::class, 'bulkStore']);
        Route::delete('/shift-schedules/{shiftSchedule}', [ShiftScheduleController::class, 'destroy']);
    });

    // ---- Presensi (PRD 5.4-5.6, 5.17) — face recognition BELUM disambung,
    // lihat docblock AttendanceService untuk detail ----
    Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut']);
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::get('/attendance/{attendance}', [AttendanceController::class, 'show']);

    // correct/mark-present: tidak dibatasi role: di route (scoping unit
    // ditangani di controller, sama alasannya dg EmployeeController@index).
    Route::patch('/attendance/{attendance}/correct', [AttendanceController::class, 'correct']);
    Route::post('/attendance/{employee}/mark-present', [AttendanceController::class, 'markPresent']);


        // ---- WFH (PRD 5.5) ----
    Route::post('/wfh-requests', [WfhController::class, 'store']);
    Route::get('/wfh-requests', [WfhController::class, 'index']);
    Route::get('/wfh-requests/{wfhRequest}', [WfhController::class, 'show']);
    Route::post('/wfh-requests/{wfhRequest}/approve', [WfhController::class, 'approve']);
    Route::post('/wfh-requests/{wfhRequest}/reject', [WfhController::class, 'reject']);
    Route::post('/wfh-requests/{wfhRequest}/cancel', [WfhController::class, 'cancel']);
    // ---- Placeholder modul berikut, akan diisi bertahap ----
    // WFH, Cuti/Izin/Sakit, Lembur, Dashboard, Notifikasi, Face Enrollment,
    // Admin Global (siga8-role-mappings, app-settings) — lihat docs/API_CONTRACT.md

    // ---- Cuti/Izin/Sakit/Dinas Luar (PRD 5.7-5.8, 5.12) ----
    Route::post('/leave-requests', [LeaveRequestController::class, 'store']);
    Route::get('/leave-requests', [LeaveRequestController::class, 'index']);
    Route::get('/leave-requests/{leaveRequest}', [LeaveRequestController::class, 'show']);
    Route::post('/leave-requests/{leaveRequest}/approve', [LeaveRequestController::class, 'approve']);
    Route::post('/leave-requests/{leaveRequest}/reject', [LeaveRequestController::class, 'reject']);
    Route::post('/leave-requests/{leaveRequest}/cancel', [LeaveRequestController::class, 'cancel']);

     // ---- Notifikasi (PRD 5.14) ----
    // Trigger "pengingat presensi belum check-out" & "saldo cuti akan
    // hangus" BELUM ada endpoint/job-nya (butuh scheduled command, lihat
    // docblock NotificationService) — baru pengajuan baru & hasil keputusan
    // (Cuti + WFH) yang sudah aktif mengirim notifikasi.
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead']);

        // ---- Lembur (PRD 5.9) ----
    Route::post('/overtime-requests', [OvertimeController::class, 'store']);
    Route::get('/overtime-requests', [OvertimeController::class, 'index']);
    Route::get('/overtime-requests/{overtimeRequest}', [OvertimeController::class, 'show']);
    Route::post('/overtime-requests/{overtimeRequest}/approve', [OvertimeController::class, 'approve']);
    Route::post('/overtime-requests/{overtimeRequest}/reject', [OvertimeController::class, 'reject']);
    Route::post('/overtime-requests/{overtimeRequest}/realize', [OvertimeController::class, 'realize']);
    Route::post('/overtime-requests/{overtimeRequest}/cancel', [OvertimeController::class, 'cancel']);
        // ---- Admin Global (PRD 5.15) — super_admin saja ----
    Route::middleware('role:super_admin')->group(function () {
        Route::get('/siga8-role-mappings', [Siga8RoleMappingController::class, 'index']);
        Route::post('/siga8-role-mappings', [Siga8RoleMappingController::class, 'store']);
        Route::patch('/siga8-role-mappings/{siga8RoleMapping}', [Siga8RoleMappingController::class, 'update']);
        Route::delete('/siga8-role-mappings/{siga8RoleMapping}', [Siga8RoleMappingController::class, 'destroy']);

        Route::get('/app-settings', [AppSettingController::class, 'index']);
        Route::post('/app-settings', [AppSettingController::class, 'upsert']);
    });

        // ---- Dashboard (PRD 5.13) ----
    Route::get('/dashboard/me', [DashboardController::class, 'me']);
    Route::get('/dashboard/unit', [DashboardController::class, 'unit']);

    // ---- Laporan lintas-unit (PRD 5.13) — super_admin & admin_kepegawaian ----
    
    Route::middleware('role:super_admin,admin_kepegawaian')->group(function () {
        Route::get('/reports/attendance-recap', [ReportController::class, 'attendanceRecap']);
        Route::get('/reports/attendance-recap/csv', [ReportController::class, 'attendanceRecapCsv']);   // <- baru
        Route::get('/reports/leave-usage-recap', [ReportController::class, 'leaveUsageRecap']);
        Route::get('/reports/leave-usage-recap/csv', [ReportController::class, 'leaveUsageRecapCsv']);   // <- baru
    });
    

});



// MOCK SIGA8 - LOCAL DEVELOPMENT ONLY
if (app()->environment('local')) {
    Route::post('/mock/siga8/login', function (\Illuminate\Http\Request $request) {

        $username = $request->input('username');
        $password = $request->input('password');

        // Mock akun SIGA8 untuk testing
        $accounts = [
            // Akun untuk mobile / employee
            'intern-test' => [
                'password' => 'dummy-password',
                'user_id' => 'mock-user-001',
                'full_name' => 'Test User',
                'level' => 1,
                'role' => [
                    'id' => '01k723k4csfpstqyshgcnpym4k',
                    'name' => 'Pokja BAK',
                    'level' => 1,
                ],
            ],

            // Akun untuk web / super admin
            'admin-test' => [
                'password' => 'dummy-password',
                'user_id' => 'mock-admin-001',
                'full_name' => 'Test Super Admin',
                'level' => 1,
                'role' => [
                    'id' => '01k7273msxcsn6ycwmahrgqswn',
                    'name' => 'Help Desk',
                    'level' => 1,
                ],
            ],
        ];

        // Username tidak ditemukan
        if (! isset($accounts[$username])) {
            return response()->json([
                'status' => false,
                'message' => 'Username atau password salah.',
            ], 401);
        }

        $account = $accounts[$username];

        // Password salah
        if ($password !== $account['password']) {
            return response()->json([
                'status' => false,
                'message' => 'Username atau password salah.',
            ], 401);
        }

        return response()->json([
            'status' => true,
            'message' => 'Login berhasil',
            'data' => [
                'token' => 'mock-siga8-token-' . $account['user_id'],
                'user' => [
                    'user_id' => $account['user_id'],
                    'username' => $username,
                    'full_name' => $account['full_name'],
                    'level' => $account['level'],
                    'faculty_code' => null,
                    'faculty_name' => null,
                    'study_programs_code' => null,
                    'roles' => [
                        $account['role'],
                    ],
                ],
            ],
        ]);
    });
}