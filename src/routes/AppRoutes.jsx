import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import Pegawai from "../pages/pegawai/Pegawai";
import TambahPegawai from "../pages/pegawai/TambahPegawai";
import DetailPegawai from "../pages/pegawai/DetailPegawai";
import Monitoring from "../pages/monitoring/Monitoring";
import UnitKerja from "../pages/unit/UnitKerja";
import Jadwal from "../pages/jadwal/Jadwal";
import Shift from "../pages/shift/Shift";
import Pengajuan from "../pages/pengajuan/Pengajuan";
import Approval from "../pages/pengajuan/Approval";
import DetailPengajuan from "../pages/pengajuan/DetailPengajuan";
import Verifikasi from "../pages/verifikasi/Verifikasi";
import LaporanKehadiran from "../pages/laporan/LaporanKehadiran";
import Lokasi from "../pages/lokasi/Lokasi";
import Kalender from "../pages/kalender/Kalender";
import Pengaturan from "../pages/pengaturan/Pengaturan";
import PemetaanSIGA8 from "../pages/pengaturan/PemetaanSIGA8";
import ProtectedRoute from "./ProtectedRoute";

const MANAGEMENT_ROLES = ["super_admin", "admin_kepegawaian", "admin_unit", "developer"];
const APPROVAL_ROLES = [...MANAGEMENT_ROLES, "pimpinan"];
const SYSTEM_ROLES = ["super_admin", "developer"];

function AppRoutes() {
  return (
    <Routes>

      {/* LOGIN */}
      <Route
        path="/login"
        element={<Login />}
      />

      {/* DASHBOARD */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* MENU */}
      <Route
        path="/monitoring"
        element={
          <ProtectedRoute allowedRoles={APPROVAL_ROLES}>
            <Monitoring />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pegawai"
        element={
          <ProtectedRoute allowedRoles={APPROVAL_ROLES}>
            <Pegawai />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pegawai/tambah"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "admin_kepegawaian", "developer"]}>
            <TambahPegawai />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pegawai/:id"
        element={
          <ProtectedRoute allowedRoles={APPROVAL_ROLES}>
            <DetailPegawai />
          </ProtectedRoute>
        }
      />

      <Route
        path="/unit"
        element={
          <ProtectedRoute allowedRoles={APPROVAL_ROLES}>
            <UnitKerja />
          </ProtectedRoute>
        }
      />

      <Route
        path="/jadwal"
        element={
          <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
            <Jadwal />
          </ProtectedRoute>
        }
      />

      <Route
        path="/shift"
        element={
          <ProtectedRoute allowedRoles={MANAGEMENT_ROLES}>
            <Shift />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pengajuan"
        element={
          <ProtectedRoute allowedRoles={APPROVAL_ROLES}>
            <Pengajuan />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pengajuan/detail"
        element={
          <ProtectedRoute allowedRoles={APPROVAL_ROLES}>
            <DetailPengajuan />
          </ProtectedRoute>
        }
      />

      <Route
        path="/verifikasi"
        element={
          <ProtectedRoute allowedRoles={APPROVAL_ROLES}>
            <Verifikasi />
          </ProtectedRoute>
        }
      />

      <Route
        path="/persetujuan"
        element={
          <ProtectedRoute allowedRoles={APPROVAL_ROLES}>
            <Approval />
          </ProtectedRoute>
        }
      />

      <Route
        path="/laporan"
        element={
          <ProtectedRoute allowedRoles={APPROVAL_ROLES}>
            <LaporanKehadiran />
          </ProtectedRoute>
        }
      />

      <Route
        path="/siga8"
        element={
          <ProtectedRoute allowedRoles={SYSTEM_ROLES}>
            <PemetaanSIGA8 />
          </ProtectedRoute>
        }
      />

      <Route
        path="/geofence"
        element={
          <ProtectedRoute allowedRoles={SYSTEM_ROLES}>
            <Lokasi />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kalender"
        element={
          <ProtectedRoute allowedRoles={SYSTEM_ROLES}>
            <Kalender />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pengaturan"
        element={
          <ProtectedRoute allowedRoles={SYSTEM_ROLES}>
            <Pengaturan />
          </ProtectedRoute>
        }
      />

      {/* DEFAULT */}
      <Route
        path="/"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />

      <Route path="*" element={<Navigate to="/dashboard" replace />} />

    </Routes>
  );
}

export default AppRoutes;
