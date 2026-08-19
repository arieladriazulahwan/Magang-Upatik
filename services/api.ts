import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/**
 * ============================================================
 * API CONFIGURATION
 * ============================================================
 *
 * Backend Laravel:
 * http://10.10.16.241:8000
 *
 * API:
 * http://10.10.16.241:8000/api
 */

const DEFAULT_API_URL =
  Platform.OS === "android"
    ? "http://10.10.16.241:8000/api"
    : "http://127.0.0.1:8000/api";

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "") ||
  DEFAULT_API_URL;

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

type JsonMap = Record<string, unknown>;

/**
 * ============================================================
 * USER
 * ============================================================
 */

export type ApiUserRole = {
  name: string;
  work_unit_id: number | null;
  work_unit_name: string | null;
  source: string;
};

export type ApiEmployee = {
  id: number;
  name: string;
  nip: string;

  employee_type?: string;
  employment_status?: string;

  work_unit?: {
    id: number;
    name: string;
    code: string;
  } | null;
};

export type ApiUser = {
  id: number;
  username: string;
  full_name: string;

  /**
   * Backend saat ini dapat mengembalikan null.
   */
  employee: ApiEmployee | null;

  roles: ApiUserRole[];
};

/**
 * ============================================================
 * AUTH
 * ============================================================
 */

export type LoginPayload = {
  username: string;
  password: string;
  device_name?: string;
};

export type LoginResponse = {
  token: string;
  expires_at: string;
  user: ApiUser;
};

/**
 * ============================================================
 * ATTENDANCE
 * ============================================================
 */

export type ApiAttendance = {
  id: number;

  employee: Pick<
    ApiEmployee,
    "id" | "name" | "nip"
  > | null;

  date: string | null;

  type:
    | "wfo"
    | "wfh"
    | "shift"
    | "dinas_luar"
    | null;

  shift: {
    id: number;
    name: string;
  } | null;

  work_location: {
    id: number;
    name: string;
  } | null;

  check_in: string | null;
  check_out: string | null;

  duration_minutes: number | null;

  status: string | null;

  description: string | null;

  is_manual: boolean;

  verified_at: string | null;

  correction_reason: string | null;

  created_at: string | null;
  updated_at?: string | null;
};

/**
 * ============================================================
 * LEAVE REQUEST
 * ============================================================
 */

export type ApiLeaveRequest = {
  id: number;

  number: string | null;

  employee: Pick<
    ApiEmployee,
    "id" | "name" | "nip"
  > | null;

  leave_type: {
    id: number;
    name: string;
    category: string;
  } | null;

  start_date: string | null;
  end_date: string | null;

  total_days: number | null;

  reason: string | null;

  status: string;

  created_at: string | null;
};

/**
 * ============================================================
 * WFH
 * ============================================================
 */

export type ApiWfhRequest = {
  id: number;

  employee: Pick<
    ApiEmployee,
    "id" | "name" | "nip"
  > | null;

  start_date: string | null;
  end_date: string | null;

  total_days: number | null;

  reason: string | null;

  status: string;

  approver?: {
    id: number;
    name: string;
  } | null;

  approved_at: string | null;

  note: string | null;

  created_at: string | null;
};

/**
 * ============================================================
 * LEAVE TYPE
 * ============================================================
 */

export type ApiLeaveType = {
  id: number;
  code: string;
  name: string;
  category: string;

  requires_attachment: boolean;
  requires_doctor_letter: boolean;
};

/**
 * ============================================================
 * LEAVE BALANCE
 * ============================================================
 */

export type ApiLeaveBalance = {
  id: number;

  leave_type: {
    id: number;
    name: string;
    category: string;
  } | null;

  year: number;

  entitlement: number;
  previous_year_balance: number;
  used: number;
  remaining: number;
};

/**
 * ============================================================
 * OVERTIME
 * ============================================================
 */

export type ApiOvertimeRequest = {
  id: number;
  employee_id: number;

  date: string | null;

  planned_start_time: string | null;
  planned_end_time: string | null;

  work_description: string;

  actual_start_time: string | null;
  actual_end_time: string | null;

  duration_minutes: number | null;

  status: string;

  approved_by: number | null;
  approved_at: string | null;

  note: string | null;

  created_at: string | null;
};

/**
 * ============================================================
 * STORAGE
 * ============================================================
 */

async function setStorageItem(
  key: string,
  value: string
) {
  if (Platform.OS === "web") {
    window.localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function getStorageItem(key: string) {
  if (Platform.OS === "web") {
    return window.localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function removeStorageItem(key: string) {
  if (Platform.OS === "web") {
    window.localStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

/**
 * ============================================================
 * RESPONSE HANDLING
 * ============================================================
 */

async function parseResponse(
  response: Response
) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Response server bukan JSON yang valid."
    );
  }
}

function errorMessage(
  data: unknown,
  status: number
) {
  if (data && typeof data === "object") {
    const body = data as JsonMap;

    if (typeof body.message === "string") {
      return body.message;
    }

    if (typeof body.error === "string") {
      return body.error;
    }
  }

  return `Request gagal (${status})`;
}

/**
 * ============================================================
 * SESSION
 * ============================================================
 */

export async function getToken() {
  return getStorageItem(TOKEN_KEY);
}

export async function getStoredUser(): Promise<
  ApiUser | null
> {
  const value = await getStorageItem(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as ApiUser;
  } catch {
    return null;
  }
}

export async function clearSession() {
  await removeStorageItem(TOKEN_KEY);
  await removeStorageItem(USER_KEY);
}

/**
 * ============================================================
 * GENERIC API REQUEST
 * ============================================================
 */

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  authenticated = true
): Promise<T> {
  const token = authenticated
    ? await getToken()
    : null;

  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (!isFormData) {
    headers["Content-Type"] =
      "application/json";
  }

  if (authenticated) {
    if (!token) {
      throw new Error(
        "Token autentikasi tidak ditemukan. Silakan login kembali."
      );
    }

    headers.Authorization =
      `Bearer ${token}`;
  }

  if (options.headers) {
    Object.assign(
      headers,
      options.headers as Record<string, string>
    );
  }

  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  const data = await parseResponse(response);

  if (!response.ok) {
    throw new Error(
      errorMessage(
        data,
        response.status
      )
    );
  }

  return data as T;
}

/**
 * ============================================================
 * LOGIN
 * ============================================================
 */

export async function login(
  payload: LoginPayload
): Promise<LoginResponse> {
  const data =
    await apiRequest<LoginResponse>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      false
    );

  if (!data.token) {
    throw new Error(
      "Login berhasil tetapi token tidak ditemukan."
    );
  }

  await setStorageItem(
    TOKEN_KEY,
    data.token
  );

  await setStorageItem(
    USER_KEY,
    JSON.stringify(data.user)
  );

  return data;
}

/**
 * ============================================================
 * LOGOUT
 * ============================================================
 */

export async function logout() {
  try {
    if (await getToken()) {
      await apiRequest<{
        message: string;
      }>("/auth/logout", {
        method: "POST",
      });
    }
  } finally {
    await clearSession();
  }
}

/**
 * ============================================================
 * PROFILE
 * ============================================================
 */

export async function getProfile() {
  return apiRequest<{
    user: ApiUser;
  }>("/auth/me");
}

/**
 * ============================================================
 * QUERY BUILDER
 * ============================================================
 */

function buildQuery(
  params?: Record<
    string,
    string | number | boolean | undefined
  >
) {
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(
    ([key, value]) => {
      if (
        value !== undefined &&
        value !== null
      ) {
        query.set(
          key,
          String(value)
        );
      }
    }
  );

  const text = query.toString();

  return text
    ? `?${text}`
    : "";
}

/**
 * ============================================================
 * ATTENDANCE
 * ============================================================
 *
 * Endpoint ini hanya dipanggil oleh frontend
 * apabila user memang memiliki role yang sesuai.
 */

export async function getAttendance(
  params?: {
    employee_id?: number;
    date_from?: string;
    date_to?: string;
    status?: string;
    type?: string;
    per_page?: number;
  }
) {
  return apiRequest<{
    data: ApiAttendance[];

    meta?: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  }>(
    `/attendance${buildQuery(params)}`
  );
}

/**
 * ============================================================
 * CHECK IN
 * ============================================================
 */

export async function checkIn(
  payload: {
    type:
      | "wfo"
      | "wfh"
      | "shift"
      | "dinas_luar";

    latitude: number;
    longitude: number;

    photo:
      | Blob
      | {
          uri: string;
          name: string;
          type: string;
        };

    device_info?: string;
  }
) {
  const body = new FormData();

  body.append(
    "type",
    payload.type
  );

  body.append(
    "latitude",
    String(payload.latitude)
  );

  body.append(
    "longitude",
    String(payload.longitude)
  );

  body.append(
    "photo",
    payload.photo as never
  );

  if (payload.device_info) {
    body.append(
      "device_info",
      payload.device_info
    );
  }

  return apiRequest<{
    data: ApiAttendance;
  }>("/attendance/check-in", {
    method: "POST",
    body,
  });
}

/**
 * ============================================================
 * CHECK OUT
 * ============================================================
 */

export async function checkOut(
  payload: {
    latitude: number;
    longitude: number;

    photo:
      | Blob
      | {
          uri: string;
          name: string;
          type: string;
        };

    device_info?: string;
  }
) {
  const body = new FormData();

  body.append(
    "latitude",
    String(payload.latitude)
  );

  body.append(
    "longitude",
    String(payload.longitude)
  );

  body.append(
    "photo",
    payload.photo as never
  );

  if (payload.device_info) {
    body.append(
      "device_info",
      payload.device_info
    );
  }

  return apiRequest<{
    data: ApiAttendance;
  }>("/attendance/check-out", {
    method: "POST",
    body,
  });
}

/**
 * ============================================================
 * LEAVE REQUEST
 * ============================================================
 */

export async function getLeaveRequests(
  params?: {
    employee_id?: number;
    leave_type_id?: number;
    status?: string;
  }
) {
  return apiRequest<{
    data: ApiLeaveRequest[];
  }>(
    `/leave-requests${buildQuery(
      params
    )}`
  );
}

export async function getLeaveTypes() {
  return apiRequest<{
    data: ApiLeaveType[];
  }>("/leave-types");
}

export async function postLeaveRequest(
  payload:
    | FormData
    | JsonMap
) {
  return apiRequest<{
    data: ApiLeaveRequest;
  }>("/leave-requests", {
    method: "POST",
    body:
      payload instanceof FormData
        ? payload
        : JSON.stringify(payload),
  });
}

/**
 * ============================================================
 * LEAVE BALANCE
 * ============================================================
 */

export async function getLeaveBalances() {
  return apiRequest<{
    data: ApiLeaveBalance[];
  }>("/leave-balances");
}

/**
 * ============================================================
 * OVERTIME
 * ============================================================
 */

export async function getOvertimeRequests() {
  return apiRequest<{
    data: ApiOvertimeRequest[];
  }>("/overtime-requests");
}

/**
 * ============================================================
 * LEAVE APPROVAL
 * ============================================================
 */

export async function decideLeaveRequest(
  id: number | string,
  decision:
    | "approve"
    | "reject",
  note?: string
) {
  return apiRequest<{
    data: ApiLeaveRequest;
  }>(
    `/leave-requests/${id}/${decision}`,
    {
      method: "POST",
      body: JSON.stringify({
        note,
      }),
    }
  );
}

/**
 * ============================================================
 * WFH REQUEST
 * ============================================================
 */

export async function getWfhRequests(
  params?: {
    employee_id?: number;
    status?: string;
  }
) {
  return apiRequest<{
    data: ApiWfhRequest[];
  }>(
    `/wfh-requests${buildQuery(
      params
    )}`
  );
}

export async function postWfhRequest(
  payload: {
    start_date: string;
    end_date: string;
    reason: string;
  }
) {
  return apiRequest<{
    data: ApiWfhRequest;
  }>("/wfh-requests", {
    method: "POST",
    body: JSON.stringify(
      payload
    ),
  });
}

/**
 * ============================================================
 * WFH APPROVAL
 * ============================================================
 */

export async function decideWfhRequest(
  id: number | string,
  decision:
    | "approve"
    | "reject",
  note?: string
) {
  return apiRequest<{
    data: ApiWfhRequest;
  }>(
    `/wfh-requests/${id}/${decision}`,
    {
      method: "POST",
      body: JSON.stringify({
        note,
      }),
    }
  );
}