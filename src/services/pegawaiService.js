import { apiRequest } from "./api";

export const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
};

const getPagination = (payload) => payload?.meta || payload?.pagination || payload || {};

const uniqueEmployees = (employees) => [
  ...new Map(employees.map((employee, index) => [String(employee.id ?? employee.nip ?? index), employee])).values(),
];

// Endpoint Laravel biasanya memaginasi daftar pegawai (15 data per halaman).
// Seluruh halaman diperlukan untuk statistik dan pilihan pegawai di web admin.
export const getEmployees = async () => {
  const firstPayload = await apiRequest("/employees?per_page=100");
  const firstPage = normalizeCollection(firstPayload);
  const pagination = getPagination(firstPayload);
  const lastPage = Number(pagination.last_page || pagination.lastPage || 1);

  if (!Number.isFinite(lastPage) || lastPage <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: lastPage - 1 }, (_, index) =>
      apiRequest(`/employees?page=${index + 2}&per_page=100`).then(normalizeCollection)
    )
  );

  return uniqueEmployees([...firstPage, ...remainingPages.flat()]);
};

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
