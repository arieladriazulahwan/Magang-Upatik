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
    "/dashboard","/monitoring","/pegawai","/pegawai/:id","/pegawai/tambah",
  ],
  admin_unit: [
    "/dashboard", "/monitoring", "/pegawai", "/pegawai/tambah", "/pegawai/:id","/laporan",
  ],
  pimpinan: [
    "/dashboard", "/monitoring", "/pengajuan/detail", "/persetujuan", "/laporan"
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
  hasAnyRole(["super_admin", "admin_kepegawaian", "admin_unit", "developer"]);

export const canManageShifts = () =>
  hasAnyRole(["super_admin", "developer"]);

export const canManageUnits = () =>
  hasAnyRole(["super_admin", "developer"]);

export const canManageLocations = () =>
  hasAnyRole(["super_admin", "developer"]);

export const isAdminUnitOrLeader = () =>
  hasAnyRole(["admin_unit", "pimpinan"]);

export const isRestrictedToUnit = () =>
  hasAnyRole(["admin_unit", "pimpinan"]);

export const canEditEmployee = () =>
  hasAnyRole(["super_admin", "admin_unit", "developer"]);

export const canDeleteEmployee = () =>
  hasAnyRole(["super_admin", "developer"]);

export const canAddEmployee = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "admin_unit", "developer"]);

export const canApproveRequests = () =>
  hasAnyRole(["super_admin", "pimpinan", "developer"]);

export const getUserUnit = () => 
  localStorage.getItem("userUnit") || localStorage.getItem("unit") || "";