export const ROLE_ACCESS = {
  super_admin: [
    "/dashboard", "/monitoring", "/pegawai", "/unit", "/unit/tambah", "/unit/:id", "/jadwal", "/shift", "/shift/tambah",
    "/pegawai/tambah", "/pegawai/:id", "/verifikasi", "/verifikasi/tambah", "/persetujuan", "/laporan", "/siga8", "/geofence",
    "/kalender", "/pengaturan",
  ],
  developer: [
    "/dashboard", "/monitoring", "/pegawai", "/unit", "/unit/tambah", "/unit/:id", "/jadwal", "/shift", "/shift/tambah",
    "/pegawai/tambah", "/pegawai/:id", "/verifikasi", "/verifikasi/tambah", "/persetujuan", "/laporan", "/siga8", "/geofence",
    "/kalender", "/pengaturan",
  ],
  admin_kepegawaian: [
    "/dashboard", "/monitoring", "/pegawai", "/pegawai/tambah", "/pegawai/:id",
    "/verifikasi", "/verifikasi/tambah", "/persetujuan", "/laporan", "/kalender",
    "/pengaturan", "/pengaturan/permission",
  ],
  admin_unit: [
    "/dashboard", "/monitoring", "/pegawai", "/pegawai/tambah", "/pegawai/:id",
    "/shift", "/shift/tambah", "/jadwal", "/geofence", "/laporan",
  ],
  pimpinan: [
    "/dashboard", "/monitoring", "/pegawai", "/pegawai/:id", "/verifikasi", "/verifikasi/tambah",
    "/pengajuan/detail", "/persetujuan", "/laporan",
  ],
  pegawai: ["/dashboard"],
};

const getStoredPermissions = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const directPermissions = Array.isArray(user.permissions) ? user.permissions : [];
    const rolePermissions = Array.isArray(user.roles)
      ? user.roles.flatMap((role) => (Array.isArray(role?.permissions) ? role.permissions : []))
      : [];

    return [...new Set([...directPermissions, ...rolePermissions])];
  } catch {
    return [];
  }
};

export const hasPermission = (permission) => getStoredPermissions().includes(permission);

export const hasAnyPermission = (permissions) =>
  permissions.some((permission) => hasPermission(permission));

export const getAllowedPaths = (role) => {
  const paths = new Set(ROLE_ACCESS[role] || ROLE_ACCESS.pegawai);

  if (hasAnyPermission(["pegawai.view", "pegawai.create", "pegawai.edit", "pegawai.delete"])) {
    paths.add("/pegawai");
    paths.add("/pegawai/:id");
  }

  if (hasPermission("pegawai.create")) {
    paths.add("/pegawai/tambah");
  }

  if (hasAnyPermission(["unit.view", "unit.create", "unit.edit", "unit.delete"])) {
    paths.add("/unit");
    paths.add("/unit/:id");
  }

  if (hasPermission("unit.create")) {
    paths.add("/unit/tambah");
  }

  return [...paths];
};

export const getAllowedRoles = (path) =>
  Object.entries(ROLE_ACCESS)
    .filter(([, paths]) => paths.includes(path))
    .map(([role]) => role);

export const hasAnyRole = (roles) => {
  const currentRole = String(localStorage.getItem("role") || "").toLowerCase();
  return roles.includes(currentRole);
};

export const canManageEmployees = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "admin_unit", "developer"]) ||
  hasAnyPermission(["pegawai.view", "pegawai.create", "pegawai.edit", "pegawai.delete"]);

export const canManageShifts = () =>
  hasAnyRole(["super_admin", "admin_unit", "developer"]);

export const canManageWorkPolicy = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "developer"]);

export const canManageUnits = () =>
  hasAnyRole(["super_admin", "developer"]);

export const canManageLocations = () =>
  hasAnyRole(["super_admin", "admin_unit", "developer"]);

export const isAdminUnitOrLeader = () =>
  hasAnyRole(["admin_unit", "pimpinan"]);

export const isRestrictedToUnit = () =>
  hasAnyRole(["admin_unit", "pimpinan"]);

export const canEditEmployee = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "admin_unit", "developer"]) ||
  hasPermission("pegawai.edit");

export const canDeleteEmployee = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "developer"]) ||
  hasPermission("pegawai.delete");

export const canAddEmployee = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "admin_unit", "developer"]) ||
  hasPermission("pegawai.create");

export const canApproveRequests = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "pimpinan", "developer"]);

export const getUserUnit = () => 
  localStorage.getItem("userUnit") || localStorage.getItem("unit") || "";