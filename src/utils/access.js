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
    "/dashboard", "/pegawai", "/pegawai/tambah", "/pegawai/:id",
  ],
  admin_unit: [
    "/dashboard", "/monitoring", "/pegawai", "/pegawai/tambah", "/pegawai/:id",
  ],
  pimpinan: [
    "/dashboard", "/monitoring", "/pengajuan/detail", "/persetujuan", "/laporan",
  ],
  pegawai: ["/dashboard", "/pegawai", "/pegawai/:id"],
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
  hasAnyRole(["super_admin", "admin_kepegawaian", "admin_unit", "developer"]) ||
  hasPermission("pegawai.edit");

export const canDeleteEmployee = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "developer"]) ||
  hasPermission("pegawai.delete");

export const canAddEmployee = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "admin_unit", "developer"]) ||
  hasPermission("pegawai.create");

export const canApproveRequests = () =>
  hasAnyRole(["super_admin", "pimpinan", "developer"]);

export const getUserUnit = () => 
  localStorage.getItem("userUnit") || localStorage.getItem("unit") || "";