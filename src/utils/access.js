export const hasAnyRole = (roles) => {
  const currentRole = String(localStorage.getItem("role") || "").toLowerCase();
  return roles.includes(currentRole);
};

export const canManageEmployees = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "developer"]);

export const canManageShifts = () =>
  hasAnyRole(["super_admin", "admin_kepegawaian", "admin_unit", "developer"]);
