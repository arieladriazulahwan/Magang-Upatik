import { apiRequest } from "./api";

export const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

export const getEmployees = async () => normalizeCollection(await apiRequest("/employees"));

export const getEmployee = async (id) => {
  const payload = await apiRequest(`/employees/${id}`);
  return payload?.data || payload;
};

export const createEmployee = (employee) =>
  apiRequest("/employees", {
    method: "POST",
    body: JSON.stringify(employee),
  });

export const getWorkUnits = async () => normalizeCollection(await apiRequest("/work-units"));

// Jabatan struktural merupakan relasi opsional pada tabel employee.
export const getStructuralPositions = async () =>
  normalizeCollection(await apiRequest("/structural-positions"));
