import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import AdminLayout from "../components/layout/AdminLayout";
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
import ProtectedRoute from "./ProtectedRoute";

function SimplePage({ title }) {
  return (
    <AdminLayout>
      <div>
        <h2>{title}</h2>
        <p>Halaman {title} sedang dikembangkan.</p>
      </div>
    </AdminLayout>
  );
}

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
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <Monitoring />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pegawai"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <Pegawai />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pegawai/tambah"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <TambahPegawai />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pegawai/:id"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <DetailPegawai />
          </ProtectedRoute>
        }
      />

      <Route
        path="/unit"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <UnitKerja />
          </ProtectedRoute>
        }
      />

      <Route
        path="/jadwal"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <Jadwal />
          </ProtectedRoute>
        }
      />

      <Route
        path="/shift"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <Shift />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pengajuan"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <Pengajuan />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pengajuan/detail"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <DetailPengajuan />
          </ProtectedRoute>
        }
      />

      <Route
        path="/verifikasi"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <Verifikasi />
          </ProtectedRoute>
        }
      />

      <Route
        path="/persetujuan"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <Approval />
          </ProtectedRoute>
        }
      />

      <Route
        path="/laporan"
        element={
          <ProtectedRoute allowedRoles={["admin", "super_admin", "developer"]}>
            <LaporanKehadiran />
          </ProtectedRoute>
        }
      />

      <Route
        path="/siga8"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "developer"]}>
            <SimplePage title="Pemetaan SIGA8" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/geofence"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "developer"]}>
            <Lokasi />
          </ProtectedRoute>
        }
      />

      <Route
        path="/kalender"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "developer"]}>
            <SimplePage title="Google Calendar" />
          </ProtectedRoute>
        }
      />

      <Route
        path="/pengaturan"
        element={
          <ProtectedRoute allowedRoles={["super_admin", "developer"]}>
            <SimplePage title="Pengaturan" />
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

    </Routes>
  );
}

export default AppRoutes;