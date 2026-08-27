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
import { getAllowedRoles } from "../utils/access";

const guarded = (path, element) => (
  <ProtectedRoute allowedRoles={getAllowedRoles(path)}>{element}</ProtectedRoute>
);

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={guarded("/dashboard", <Dashboard />)} />
      <Route path="/monitoring" element={guarded("/monitoring", <Monitoring />)} />
      <Route path="/pegawai" element={guarded("/pegawai", <Pegawai />)} />
      <Route path="/pegawai/tambah" element={guarded("/pegawai/tambah", <TambahPegawai />)} />
      <Route path="/pegawai/:id" element={guarded("/pegawai/:id", <DetailPegawai />)} />
      <Route path="/unit" element={guarded("/unit", <UnitKerja />)} />
      <Route path="/jadwal" element={guarded("/jadwal", <Jadwal />)} />
      <Route path="/shift" element={guarded("/shift", <Shift />)} />
      <Route path="/pengajuan" element={guarded("/pengajuan", <Pengajuan />)} />
      <Route path="/pengajuan/detail" element={guarded("/pengajuan/detail", <DetailPengajuan />)} />
      <Route path="/verifikasi" element={guarded("/verifikasi", <Verifikasi />)} />
      <Route path="/persetujuan" element={guarded("/persetujuan", <Approval />)} />
      <Route path="/laporan" element={guarded("/laporan", <LaporanKehadiran />)} />
      <Route path="/siga8" element={guarded("/siga8", <PemetaanSIGA8 />)} />
      <Route path="/geofence" element={guarded("/geofence", <Lokasi />)} />
      <Route path="/kalender" element={guarded("/kalender", <Kalender />)} />
      <Route path="/pengaturan" element={guarded("/pengaturan", <Pengaturan />)} />
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default AppRoutes;
