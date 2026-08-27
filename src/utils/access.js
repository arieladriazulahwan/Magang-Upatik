export const ROLE_ACCESS = {
  super_admin: [
    "/dashboard", "/monitoring", "/pegawai", "/unit", "/jadwal", "/shift",
    "/pegawai/tambah", "/pegawai/:id", "/verifikasi", "/persetujuan", "/laporan", "/siga8", "/geofence",
    "/kalender", "/pengaturan",
  ],
  developer: [
    "/dashboard", "/monitoring", "/pegawai", "/unit", "/jadwal", "/shift",
    "/pegawai/tambah", "/pegawai/:id", "/verifikasi", "/persetujuan", "/laporan", "/siga8", "/geofence",
    "/kalender", "/pengaturan",
  ],
  admin_kepegawaian: [
    "/dashboard", "/monitoring", "/pegawai", "/unit", "/jadwal", "/shift",
    "/pegawai/tambah", "/pegawai/:id", "/pengajuan", "/pengajuan/detail", "/verifikasi", "/persetujuan", "/laporan",
  ],
  admin_unit: [
    "/dashboard", "/monitoring", "/pegawai", "/unit", "/jadwal", "/shift",
    "/pegawai/:id", "/pengajuan", "/pengajuan/detail", "/verifikasi", "/laporan",
  ],
  pimpinan: [
    "/dashboard", "/monitoring", "/pegawai", "/pegawai/:id", "/verifikasi",
    "/pengajuan", "/pengajuan/detail", "/persetujuan", "/laporan",
  ],
  pegawai: ["/dashboard"],
};

export const getAllowedPaths = (role) => ROLE_ACCESS[role] || ROLE_ACCESS.pegawai;

export const getAllowedRoles = (path) =>
  Object.entries(ROLE_ACCESS)
    .filter(([, paths]) => paths.includes(path))
    .map(([role]) => role);

export const hasAnyRole = (roles) => {
  const currentRole = String(localStorage.getItem("role") || "").toLowerCase();
  return roles.includes(currentRole);
};

export const canManageEmployees = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "developer"]);

export const canManageShifts = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "admin_unit", "developer"]);
