import { Routes, Route, Navigate } from "react-router-dom";

import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
import AdminLayout from "../components/layout/AdminLayout";
import Pegawai from "../pages/pegawai/Pegawai";
import Monitoring from "../pages/monitoring/Monitoring";
import UnitKerja from "../pages/unit/UnitKerja";
import Jadwal from "../pages/jadwal/Jadwal";
import Shift from "../pages/shift/Shift";
import Pengajuan from "../pages/pengajuan/Pengajuan";
import Approval from "../pages/pengajuan/Approval";
import DetailPengajuan from "../pages/pengajuan/DetailPengajuan";
import Verifikasi from "../pages/verifikasi/Verifikasi";

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
        element={<Dashboard />}
      />

      {/* MENU */}
      <Route
            path="/monitoring"
            element={<Monitoring />}
        />

      <Route
            path="/pegawai"
            element={<Pegawai />}
    />

      <Route
    path="/unit"
     element={<UnitKerja />}
    />


     <Route
  path="/jadwal"
  element={<Jadwal />}
/>

<Route
  path="/shift"
  element={<Shift />}
/>

    <Route
        path="/pengajuan"
        element={<Pengajuan />}
    />

    <Route
       path="/pengajuan/detail"
      element={<DetailPengajuan />}
      />

      <Route
         path="/verifikasi"
          element={<Verifikasi />}
      />

      <Route
        path="/persetujuan"
        element={<Approval />}
      />

      <Route
        path="/laporan"
        element={
          <SimplePage title="Rekap & Ekspor" />
        }
      />

      <Route
        path="/siga8"
        element={
          <SimplePage title="Pemetaan SIGA8" />
        }
      />

      <Route
        path="/geofence"
        element={
          <SimplePage title="Lokasi & Geofence" />
        }
      />

      <Route
        path="/kalender"
        element={
          <SimplePage title="Google Calendar" />
        }
      />

      <Route
        path="/pengaturan"
        element={
          <SimplePage title="Pengaturan" />
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