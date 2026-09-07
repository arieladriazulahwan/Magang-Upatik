import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Platform,
} from "react-native";

import {
  checkIn,
  checkOut,
  clearSession,
  decideLeaveRequest,
  decideOvertimeRequest,
  decideWfhRequest,
  getAttendance,
  getLeaveRequests,
  getNotifications,
  getOvertimeRequests,
  getProfile,
  getStoredUser,
  getToken,
  getWfhRequests,
  postLeaveRequest,
  postNotification,
  postOvertimeRequest,
  postWfhRequest,
  subscribeSessionChange,
  markNotificationRead as markBackendNotificationRead,
  type ApiUser,
  type ApiAttendance,
  type ApiLeaveRequest,
  type ApiOvertimeRequest,
  type ApiWfhRequest,
  type ApiNotification,
} from "../services/api";
import {
  formatWitaShortWeekday,
  formatWitaTime,
} from "../constants/time";

/* =====================================================
   TYPE
===================================================== */

type AttendanceState =
  | "belum"
  | "masuk"
  | "selesai";

type RequestStatus =
  | "Disetujui"
  | "Diproses"
  | "Menunggu"
  | "Ditolak"
  | "Dibatalkan";

type Decision =
  | "Disetujui"
  | "Ditolak";

export type RequestAttachment = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

export interface RequestItem {
  id: string;
  title: string;
  meta: string;
  days: string;
  status: RequestStatus;
  type: string;
}

export interface ApprovalItem {
  id: string;
  name: string;
  unit: string;
  type: string;
  range: string;
  reason: string;
  info: string;
}

export interface ApprovalHistoryItem
  extends ApprovalItem {
  decision: Decision;
  requestStatus?: RequestStatus;
}

export type NotificationStatus =
  | "loading"
  | "success"
  | "error"
  | "waiting"
  | "processing"
  | "approved"
  | "rejected"
  | "present"
  | "late"
  | "permit"
  | "absent";

export type NotificationCategory =
  | "attendance"
  | "request"
  | "approval"
  | "system";

export interface AttendanceHistoryItem {
  date: string;
  day: string;
  time: string;
  duration: string;
  status: string;
  mode: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  createdAt?: string | null;
  unread: boolean;
  status?: NotificationStatus;
  category?: NotificationCategory;
  ownerEmployeeId?: number | null;
}

export interface OvertimeItem {
  id: string;
  date: string;
  time: string;
  duration: string;
  desc: string;
  status: string;
}

/* =====================================================
   CONTEXT VALUE
===================================================== */

interface PrototypeContextValue {
  profile: ApiUser | null;

  attendanceState: AttendanceState;

  jamMasuk: string | null;

  jamPulang: string | null;

  workDuration: string;

  attendanceHistory: AttendanceHistoryItem[];

  requests: RequestItem[];

  approvals: ApprovalItem[];

  approvalHistory: ApprovalHistoryItem[];

  notifications: NotificationItem[];

  overtimeRequests: OvertimeItem[];

  unreadCount: number;

  toast: string | null;

  syncing: boolean;

  loadingRequest: boolean;

  loadingApprovalId: string | null;

  submitAttendance: (
    type: "masuk" | "pulang",
    photoUri: string,
    latitude: number,
    longitude: number
  ) => Promise<boolean>;

  submitRequest: (
    payload: Pick<
      RequestItem,
      "title" | "days" | "type"
    > & {
      startDate: string;
      endDate: string;
      reason: string;
      leaveTypeId?: number;
      attachment?: RequestAttachment | null;
      doctorLetterType?: "dokter_biasa" | "tim_penguji_kesehatan";
      doctorLetterNumber?: string;
      doctorFacilityName?: string;
      childNumber?: number;
      subCategory?: "menikah" | "keluarga_sakit" | "keluarga_meninggal" | "bencana";
      plannedStartTime?: string;
      plannedEndTime?: string;
    }
  ) => Promise<boolean>;

  decideApproval: (
    id: string,
    decision: Decision
  ) => Promise<boolean>;

  markNotificationRead: (
    id: string
  ) => void;

  pushNotification: (
    item: Omit<
      NotificationItem,
      "id" | "time" | "unread"
    > &
      Partial<
        Pick<
          NotificationItem,
          "id" | "time" | "unread"
        >
      >
  ) => void;
}

/* =====================================================
   CONTEXT
===================================================== */

const PrototypeContext =
  createContext<PrototypeContextValue | null>(
    null
  );

/* =====================================================
   HELPER
===================================================== */

function localDateKey(
  date = new Date()
) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function flash(
  setToast: (
    message: string | null
  ) => void,
  message: string
) {
  setToast(message);

  setTimeout(() => {
    setToast(null);
  }, 2200);
}

function delay(
  ms: number
) {
  return new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        ms
      );
    }
  );
}

function formatTime(
  value: string | null
) {
  return formatWitaTime(value, "--:--");
}

function formatDateRange(
  start?: string | null,
  end?: string | null
) {
  if (!start && !end) {
    return "-";
  }

  if (
    !end ||
    start === end
  ) {
    return start || "-";
  }

  return `${start} - ${end}`;
}

function statusToRequestStatus(
  status?: string | null
): RequestStatus {
  return statusToDisplay(
    status
  );
}

function statusToDisplay(
  status?: string | null
): RequestStatus {
  const value =
    status
      ?.toLowerCase()
      .trim() ?? "";

  if (
    value === "diproses" ||
    value === "proses"
  ) {
    return "Diproses";
  }

  if (
    value === "disetujui" ||
    value === "selesai"
  ) {
    return "Disetujui";
  }

  if (
    value === "ditolak"
  ) {
    return "Ditolak";
  }

  if (
    value === "dibatalkan"
  ) {
    return "Dibatalkan";
  }

  return "Menunggu";
}

function isPendingApprovalStatus(
  status?: string | null
) {
  const value =
    status
      ?.toLowerCase()
      .trim() ?? "";

  return (
    value === "diajukan" ||
    value === "diproses" ||
    value === "pending" ||
    value === "menunggu" ||
    value === "waiting"
  );
}

function isAlreadyProcessedMessage(
  message: string
) {
  const value =
    message
      .toLowerCase()
      .trim();

  return (
    value.includes(
      "sudah selesai diproses"
    ) ||
    value.includes(
      "sudah diproses"
    ) ||
    value.includes(
      "bukan status diajukan"
    )
  );
}

function isForbiddenApprovalMessage(
  message: string
) {
  const value =
    message
      .toLowerCase()
      .trim();

  return (
    value.includes(
      "tidak punya wewenang"
    ) ||
    value.includes(
      "tidak punya izin"
    )
  );
}

function userHasRole(
  user: ApiUser | null | undefined,
  roles: string[]
) {
  return (
    user?.roles?.some(
      (role) =>
        roles.includes(
          role.name
        )
    ) ?? false
  );
}

function canApproveLeaveStep(
  user: ApiUser | null | undefined,
  approverRole?: string | null
) {
  if (
    userHasRole(user, [
      "super_admin",
    ])
  ) {
    return true;
  }

  if (
    approverRole ===
    "atasan_langsung"
  ) {
    return userHasRole(user, [
      "pimpinan",
    ]);
  }

  if (
    approverRole ===
    "admin_kepegawaian"
  ) {
    return userHasRole(user, [
      "admin_kepegawaian",
    ]);
  }

  return false;
}

function currentPendingLeaveStep(
  item: ApiLeaveRequest
) {
  return item.approval_steps
    ?.filter(
      (step) =>
        step.status ===
        "menunggu"
    )
    .sort(
      (a, b) =>
        a.sequence -
        b.sequence
    )[0];
}

function isLeaveAwaitingCurrentUser(
  item: ApiLeaveRequest,
  user: ApiUser | null | undefined
) {
  const step =
    currentPendingLeaveStep(
      item
    );

  return (
    Boolean(step) &&
    canApproveLeaveStep(
      user,
      step?.approver_role
    )
  );
}

function hasUserProcessedLeave(
  item: ApiLeaveRequest,
  user: ApiUser | null | undefined
) {
  const employeeId =
    user?.employee?.id;

  if (!employeeId) {
    return false;
  }

  return (
    item.approval_steps?.some(
      (step) =>
        step.approver?.id ===
          employeeId &&
        [
          "disetujui",
          "ditolak",
        ].includes(
          step.status
        )
    ) ?? false
  );
}

function leaveDecisionForUser(
  item: ApiLeaveRequest,
  user: ApiUser | null | undefined
): Decision {
  const employeeId =
    user?.employee?.id;
  const step =
    item.approval_steps?.find(
      (approvalStep) =>
        approvalStep.approver?.id ===
        employeeId
    );

  return step?.status === "ditolak"
    ? "Ditolak"
    : "Disetujui";
}

const LEAVE_TYPE_IDS = {
  Cuti: 1,
  Sakit: 3,
  Izin: 8,
  Perjadi: 9,
} as const;

/* =====================================================
   PHOTO FILE
===================================================== */

function photoFileFromUri(
  uri: string,
  type: "masuk" | "pulang"
) {
  const extension =
    uri
      .split(".")
      .pop()
      ?.toLowerCase() ||
    "jpg";

  const mimeType =
    extension === "png"
      ? "image/png"
      : "image/jpeg";

  return {
    uri,

    name: `presensi-${type}-${Date.now()}.${extension}`,

    type: mimeType,
  };
}

/* =====================================================
   ATTACHMENT WEB / NATIVE
===================================================== */

/**
 * Membuat attachment yang sesuai
 * dengan platform.
 *
 * WEB:
 *   URI → Blob → FormData
 *
 * Android/iOS:
 *   { uri, name, type } → FormData
 */

async function createAttachmentForUpload(
  attachment: RequestAttachment
): Promise<
  Blob | {
    uri: string;
    name: string;
    type: string;
  }
> {
  const mimeType =
    attachment.mimeType ||
    "application/octet-stream";

  const fileName =
    attachment.name ||
    `attachment-${Date.now()}`;

  /**
   * =================================================
   * WEB
   * =================================================
   */

  if (
    Platform.OS === "web"
  ) {
    const response =
      await fetch(
        attachment.uri
      );

    if (!response.ok) {
      throw new Error(
        "File attachment tidak dapat dibaca oleh browser."
      );
    }

    const blob =
      await response.blob();

    return new Blob(
      [blob],
      {
        type:
          blob.type ||
          mimeType,
      }
    );
  }

  /**
   * =================================================
   * ANDROID / IOS
   * =================================================
   */

  return {
    uri: attachment.uri,
    name: fileName,
    type: mimeType,
  };
}

/* =====================================================
   ERROR HELPER
===================================================== */

function getErrorMessage(
  error: unknown
) {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  if (
    typeof error === "string"
  ) {
    return error;
  }

  return "Terjadi kesalahan pada server.";
}

function attendanceNotificationStatus(
  status?: string | null
): NotificationStatus {
  const value =
    status
      ?.toLowerCase()
      .replace(/[\s_-]+/g, "") ?? "";

  if (
    value.includes("terlambat")
  ) {
    return "late";
  }

  if (
    value.includes("izin")
  ) {
    return "permit";
  }

  if (
    value.includes("alpa") ||
    value.includes("alpha") ||
    value.includes("tidakhadir")
  ) {
    return "absent";
  }

  if (
    value.includes("hadir")
  ) {
    return "present";
  }

  return "success";
}

function attendanceStatusLabel(
  status?: string | null
) {
  switch (
    attendanceNotificationStatus(
      status
    )
  ) {
    case "late":
      return "Terlambat";

    case "permit":
      return "Izin";

    case "absent":
      return "Alpa";

    case "present":
      return "Hadir";

    default:
      return "Berhasil";
  }
}

/* =====================================================
   MAPPING
===================================================== */

function mapLeaveRequest(
  item: ApiLeaveRequest
): RequestItem {
  return {
    id: `leave-${item.id}`,

    title:
      item.leave_type?.name ||
      "Pengajuan",

    meta:
      formatDateRange(
        item.start_date,
        item.end_date
      ),

    days: item.total_days
      ? `${item.total_days} hari`
      : "Pengajuan",

    status:
      statusToDisplay(
        item.status
      ),

    type:
      item.leave_type
        ?.category === "cuti"
        ? "Cuti"
        : item.leave_type
            ?.category === "sakit"
        ? "Sakit"
        : "Izin",
  };
}

function mapLeaveApproval(
  item: ApiLeaveRequest
): ApprovalItem {
  return {
    id: `leave-${item.id}`,

    name:
      item.employee?.name ||
      "Pegawai",

    unit:
      item.employee?.nip ||
      "-",

    type:
      item.leave_type?.name ||
      "Pengajuan",

    range:
      formatDateRange(
        item.start_date,
        item.end_date
      ),

    reason:
      item.reason ||
      "-",

    info: item.total_days
      ? `${item.total_days} hari`
      : "Menunggu persetujuan",
  };
}

function mapWfhRequest(
  item: ApiWfhRequest
): RequestItem {
  return {
    id: `wfh-${item.id}`,

    title:
      "Work From Anywhere",

    meta:
      formatDateRange(
        item.start_date,
        item.end_date
      ),

    days: item.total_days
      ? `${item.total_days} hari`
      : "1 hari",

    status:
      statusToRequestStatus(
        item.status
      ),

    type: "WFA",
  };
}

function mapWfhApproval(
  item: ApiWfhRequest
): ApprovalItem {
  return {
    id: `wfh-${item.id}`,

    name:
      item.employee?.name ||
      "Pegawai",

    unit:
      item.employee?.nip ||
      "-",

    type:
      "Work From Anywhere",

    range:
      formatDateRange(
        item.start_date,
        item.end_date
      ),

    reason:
      item.reason ||
      "-",

    info: item.total_days
      ? `${item.total_days} hari`
      : "Menunggu persetujuan",
  };
}

function mapAttendance(
  item: ApiAttendance
): AttendanceHistoryItem {
  const day =
    item.date
      ? formatWitaShortWeekday(
          new Date(
            `${item.date}T00:00:00`
          )
        )
          .toUpperCase()
      : "-";

  const date =
    item.date
      ? item.date.slice(-2)
      : "--";

  const duration =
    item.duration_minutes
      ? `${Math.floor(
          item.duration_minutes /
            60
        )}j ${
          item.duration_minutes %
          60
        }m`
      : "0j 0m";

  return {
    date,
    day,

    time:
      `${formatTime(
        item.check_in
      )} - ${formatTime(
        item.check_out
      )}`,

    duration,

    status: item.status
      ? item.status.replace(
          /_/g,
          " "
        )
      : "Hadir",

    mode: item.type
      ? item.type.toUpperCase()
      : "WFO",
  };
}

function inferNotificationStatus(
  item: Pick<
    ApiNotification,
    "type" | "title" | "message"
  >
): NotificationStatus | undefined {
  const text =
    `${item.type ?? ""} ${item.title ?? ""} ${item.message ?? ""}`
      .toLowerCase();

  if (
    text.includes("gagal") ||
    text.includes("error")
  ) {
    return "error";
  }

  if (
    (
      text.includes("presensi") ||
      text.includes("attendance")
    ) &&
    text.includes("terlambat")
  ) {
    return "late";
  }

  if (
    (
      text.includes("presensi") ||
      text.includes("attendance")
    ) &&
    (
      text.includes("alpa") ||
      text.includes("alpha") ||
      text.includes("tidak hadir")
    )
  ) {
    return "absent";
  }

  if (
    (
      text.includes("presensi") ||
      text.includes("attendance")
    ) &&
    text.includes("izin")
  ) {
    return "permit";
  }

  if (
    (
      text.includes("presensi") ||
      text.includes("attendance")
    ) &&
    text.includes("hadir")
  ) {
    return "present";
  }

  if (
    text.includes("berhasil")
  ) {
    return "success";
  }

  if (
    text.includes("ditolak")
  ) {
    return "rejected";
  }

  if (
    text.includes("disetujui")
  ) {
    return "approved";
  }

  if (
    text.includes("diproses") ||
    text.includes("proses")
  ) {
    return "processing";
  }

  if (
    text.includes("pengajuan_baru") ||
    text.includes("menunggu") ||
    text.includes("diajukan")
  ) {
    return "waiting";
  }

  return undefined;
}

function inferNotificationCategory(
  item: Pick<
    ApiNotification,
    "type" | "title" | "message"
  >
): NotificationCategory {
  const text =
    `${item.type ?? ""} ${item.title ?? ""} ${item.message ?? ""}`
      .toLowerCase();

  if (
    text.includes("presensi") ||
    text.includes("attendance") ||
    text.includes("check-in") ||
    text.includes("check-out")
  ) {
    return "attendance";
  }

  if (
    text.includes("persetujuan") ||
    text.includes("approval") ||
    text.includes("approv")
  ) {
    return "approval";
  }

  if (
    text.includes("pengajuan") ||
    text.includes("cuti") ||
    text.includes("wfh") ||
    text.includes("wfa") ||
    text.includes("lembur")
  ) {
    return "request";
  }

  return "system";
}

function notificationTypeFor(
  item: Pick<
    NotificationItem,
    "category" | "status"
  >
) {
  const category =
    item.category ?? "system";
  const status =
    item.status ?? "info";

  const statusMap: Record<
    string,
    string
  > = {
    loading: "diproses",
    processing: "diproses",
    waiting: "menunggu",
    approved: "disetujui",
    rejected: "ditolak",
    present: "hadir",
    late: "terlambat",
    permit: "izin",
    absent: "alpa",
    success: "berhasil",
    error: "gagal",
    info: "info",
  };

  const categoryMap: Record<
    NotificationCategory,
    string
  > = {
    attendance: "presensi",
    request: "pengajuan",
    approval: "persetujuan",
    system: "sistem",
  };

  return `${categoryMap[category]}_${
    statusMap[status] ?? status
  }`;
}

function mapNotification(
  item: ApiNotification,
  ownerEmployeeId?: number | null
): NotificationItem {
  return {
    id: String(
      item.id
    ),

    title:
      item.title,

    desc:
      item.message ?? "",

    time:
      item.created_at
        ? formatTime(
            item.created_at
          )
        : "-",

    createdAt:
      item.created_at,

    unread:
      !item.is_read,

    status:
      inferNotificationStatus(
        item
      ),

    category:
      inferNotificationCategory(
        item
      ),

    ownerEmployeeId,
  };
}

function formatDuration(
  minutes?: number | null
) {
  if (!minutes) {
    return "Menunggu realisasi";
  }

  return `${Math.floor(
    minutes / 60
  )}j ${
    minutes % 60
  }m`;
}

function mapOvertime(
  item: ApiOvertimeRequest
): OvertimeItem {
  const start =
    item.planned_start_time?.slice(
      0,
      5
    ) ||
    "--:--";

  const end =
    item.planned_end_time?.slice(
      0,
      5
    ) ||
    "--:--";

  return {
    id: String(
      item.id
    ),

    date:
      item.date || "-",

    time:
      `${start} - ${end}`,

    duration:
      formatDuration(
        item.duration_minutes
      ),

    desc:
      item.work_description,

    status:
      statusToDisplay(
        item.status
      ),
  };
}

function mapOvertimeRequest(
  item: ApiOvertimeRequest
): RequestItem {
  return {
    id: `overtime-${item.id}`,
    title: "Lembur",
    meta: item.date || "-",
    days:
      item.duration_minutes
        ? formatDuration(
            item.duration_minutes
          )
        : `${item.planned_start_time?.slice(0, 5) || "--:--"} - ${
            item.planned_end_time?.slice(0, 5) || "--:--"
          }`,
    status:
      statusToRequestStatus(
        item.status
      ),
    type: "Lembur",
  };
}

function mapOvertimeApproval(
  item: ApiOvertimeRequest
): ApprovalItem {
  return {
    id: `overtime-${item.id}`,
    name:
      item.employee?.name ||
      "Pegawai",
    unit:
      item.employee?.nip ||
      "-",
    type: "Lembur",
    range:
      item.date || "-",
    reason:
      item.work_description ||
      "-",
    info:
      `${item.planned_start_time?.slice(0, 5) || "--:--"} - ${
        item.planned_end_time?.slice(0, 5) || "--:--"
      }`,
  };
}

/* =====================================================
   PROVIDER
===================================================== */

export function PrototypeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [
    profile,
    setProfile,
  ] =
    useState<ApiUser | null>(
      null
    );

  const [
    attendanceState,
    setAttendanceState,
  ] =
    useState<AttendanceState>(
      "belum"
    );

  const [
    jamMasuk,
    setJamMasuk,
  ] =
    useState<string | null>(
      null
    );

  const [
    jamPulang,
    setJamPulang,
  ] =
    useState<string | null>(
      null
    );

  const [
    attendanceHistory,
    setAttendanceHistory,
  ] =
    useState<
      AttendanceHistoryItem[]
    >([]);

  const [
    requests,
    setRequests,
  ] =
    useState<RequestItem[]>(
      []
    );

  const [
    approvals,
    setApprovals,
  ] =
    useState<ApprovalItem[]>(
      []
    );

  const [
    approvalHistory,
    setApprovalHistory,
  ] =
    useState<
      ApprovalHistoryItem[]
    >([]);

  const [
    notifications,
    setNotifications,
  ] =
    useState<
      NotificationItem[]
    >([]);

  const [
    overtimeRequests,
    setOvertimeRequests,
  ] =
    useState<OvertimeItem[]>(
      []
    );

  const [
    toast,
    setToast,
  ] =
    useState<string | null>(
      null
    );

  const [
    loadingRequest,
    setLoadingRequest,
  ] =
    useState(false);

  const [
    syncing,
    setSyncing,
  ] = useState(true);

  const [
    loadingApprovalId,
    setLoadingApprovalId,
  ] =
    useState<string | null>(
      null
    );

  /* ===================================================
     BACKEND SYNC
  =================================================== */

  useEffect(() => {
    let active = true;

    function resetLocalState() {
      setProfile(null);
      setAttendanceHistory([]);
      setRequests([]);
      setApprovals([]);
      setApprovalHistory([]);
      setNotifications([]);
      setOvertimeRequests([]);
      setJamMasuk(null);
      setJamPulang(null);
      setAttendanceState("belum");
    }

    async function syncFromBackend() {
      if (active) {
        setSyncing(true);
      }

      try {
        const token =
          await getToken();

        if (!token) {
          if (active) {
            resetLocalState();
          }

          return;
        }

        const storedUser =
          await getStoredUser();

        if (
          active &&
          storedUser
        ) {
          setProfile(
            storedUser
          );
        }

        let profileResponse;

        try {
          profileResponse =
            await getProfile();

          if (
            active &&
            profileResponse.user
          ) {
            setProfile(
              profileResponse.user
            );
          }
        } catch (error) {
          const message =
            getErrorMessage(
              error
            );

          if (
            message ===
              "Unauthenticated." ||
            message
              .toLowerCase()
              .includes(
                "unauthenticated"
              )
          ) {
            await clearSession();

            if (active) {
              resetLocalState();
            }

            return;
          }

          console.error(
            "PROFILE LOAD ERROR:",
            message
          );
        }

        const currentUser =
          profileResponse?.user ||
          storedUser ||
          null;
        const employeeId =
          currentUser?.employee?.id;
        const canLoadLeaveApprovals =
          userHasRole(currentUser, [
            "super_admin",
            "admin_kepegawaian",
            "pimpinan",
          ]);
        const canLoadWfhApprovals =
          userHasRole(currentUser, [
            "super_admin",
            "admin_kepegawaian",
            "admin_unit",
            "pimpinan",
          ]);
        const canLoadOvertimeApprovals =
          userHasRole(currentUser, [
            "super_admin",
            "admin_kepegawaian",
            "pimpinan",
          ]);
        const emptyResponse =
          Promise.resolve({
            data: [],
          });

        const results =
          await Promise.allSettled([
            getAttendance({
              employee_id:
                employeeId,

              per_page: 15,
            }),

            getLeaveRequests({
              employee_id:
                employeeId,
            }),

            getWfhRequests({
              employee_id:
                employeeId,
            }),

            getNotifications({
              per_page: 20,
            }),

            getOvertimeRequests({
              employee_id:
                employeeId,
            }),

            canLoadLeaveApprovals
              ? getLeaveRequests()
              : emptyResponse,

            canLoadWfhApprovals
              ? getWfhRequests()
              : emptyResponse,

            canLoadOvertimeApprovals
              ? getOvertimeRequests()
              : emptyResponse,
          ]);

        if (!active) {
          return;
        }

        const [
          attendanceResult,
          leaveResult,
          wfhResult,
          notificationResult,
          overtimeResult,
          approvalLeaveResult,
          approvalWfhResult,
          approvalOvertimeResult,
        ] = results;

        /* ATTENDANCE */

        if (
          attendanceResult.status ===
          "fulfilled"
        ) {
          const attendanceResponse =
            attendanceResult.value;

          setAttendanceHistory(
            attendanceResponse.data.map(
              mapAttendance
            )
          );

          const today =
            localDateKey();

          const todayAttendance =
            attendanceResponse.data.find(
              (item) =>
                item.date ===
                today
            );

          if (
            todayAttendance
          ) {
            setJamMasuk(
              formatTime(
                todayAttendance.check_in
              )
            );

            setJamPulang(
              todayAttendance.check_out
                ? formatTime(
                    todayAttendance.check_out
                  )
                : null
            );

            setAttendanceState(
              todayAttendance.check_out
                ? "selesai"
                : "masuk"
            );
          } else {
            setJamMasuk(
              null
            );

            setJamPulang(
              null
            );

            setAttendanceState(
              "belum"
            );
          }
        } else {
          console.error(
            "ATTENDANCE LOAD ERROR:",
            getErrorMessage(
              attendanceResult.reason
            )
          );

          setAttendanceHistory(
            []
          );
        }

        /* LEAVE */

        let leaveData:
          | ApiLeaveRequest[]
          | undefined;

        if (
          leaveResult.status ===
          "fulfilled"
        ) {
          leaveData =
            leaveResult.value.data;
        } else {
          console.error(
            "LEAVE LOAD ERROR:",
            getErrorMessage(
              leaveResult.reason
            )
          );

          leaveData = [];
        }

        /* WFH */

        let wfhData:
          | ApiWfhRequest[]
          | undefined;

        if (
          wfhResult.status ===
          "fulfilled"
        ) {
          wfhData =
            wfhResult.value.data;
        } else {
          console.error(
            "WFH LOAD ERROR:",
            getErrorMessage(
              wfhResult.reason
            )
          );

          wfhData = [];
        }

        /* REQUESTS */

        let overtimeData:
          | ApiOvertimeRequest[]
          | undefined;

        if (
          overtimeResult.status ===
          "fulfilled"
        ) {
          overtimeData =
            overtimeResult.value.data;
        } else {
          console.error(
            "OVERTIME LOAD ERROR:",
            getErrorMessage(
              overtimeResult.reason
            )
          );

          overtimeData = [];
        }

        const backendRequests = [
          ...leaveData.map(
            mapLeaveRequest
          ),

          ...wfhData.map(
            mapWfhRequest
          ),

          ...overtimeData.map(
            mapOvertimeRequest
          ),
        ];

        setRequests(
          backendRequests
        );

        /* APPROVALS */

        const approvalLeaveData =
          approvalLeaveResult.status ===
          "fulfilled"
            ? approvalLeaveResult.value.data as ApiLeaveRequest[]
            : [];
        const approvalWfhData =
          approvalWfhResult.status ===
          "fulfilled"
            ? approvalWfhResult.value.data as ApiWfhRequest[]
            : [];
        const approvalOvertimeData =
          approvalOvertimeResult.status ===
          "fulfilled"
            ? approvalOvertimeResult.value.data as ApiOvertimeRequest[]
            : [];

        setApprovals([
          ...approvalLeaveData
            .filter(
              (item) =>
                isLeaveAwaitingCurrentUser(
                  item,
                  currentUser
                )
            )
            .map(
              mapLeaveApproval
            ),

          ...approvalWfhData
            .filter(
              (item) =>
                isPendingApprovalStatus(
                  item.status
                )
            )
            .map(
              mapWfhApproval
            ),

          ...approvalOvertimeData
            .filter(
              (item) =>
                isPendingApprovalStatus(
                  item.status
                )
            )
            .map(
            mapOvertimeApproval
            ),
        ]);

        setApprovalHistory([
          ...approvalLeaveData
            .filter(
              (item) =>
                hasUserProcessedLeave(
                  item,
                  currentUser
                )
            )
            .map(
              (item) => ({
                ...mapLeaveApproval(
                  item
                ),
                decision:
                  leaveDecisionForUser(
                    item,
                    currentUser
                  ),
                requestStatus:
                  statusToDisplay(
                    item.status
                  ),
              })
            ),
        ]);

        /* NOTIFICATIONS */

        if (
          notificationResult.status ===
          "fulfilled"
        ) {
          setNotifications(
            (current) => {
              const backendNotifications =
                notificationResult.value.data.map(
                  (item) =>
                    mapNotification(
                      item,
                      employeeId
                    )
                );

              const localNotifications =
                current.filter(
                  (item) =>
                    !/^\d+$/.test(
                      item.id
                    ) &&
                    (item.ownerEmployeeId ===
                      undefined ||
                      item.ownerEmployeeId ===
                        employeeId)
                );

              return [
                ...localNotifications,
                ...backendNotifications,
              ];
            }
          );
        } else {
          console.error(
            "NOTIFICATION LOAD ERROR:",
            getErrorMessage(
              notificationResult.reason
            )
          );
        }

        setOvertimeRequests(
          overtimeData.map(
            mapOvertime
          )
        );
      } catch (error) {
        console.error(
          "BACKEND SYNC ERROR:",
          getErrorMessage(
            error
          )
        );
      } finally {
        if (active) {
          setSyncing(false);
        }
      }
    }

    void syncFromBackend();

    const unsubscribe =
      subscribeSessionChange(() => {
        void syncFromBackend();
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  /* ===================================================
     CONTEXT VALUE
  =================================================== */

  const value =
    useMemo<PrototypeContextValue>(
      () => {
        const unreadCount =
          notifications
            .filter(
              (item) =>
                item.ownerEmployeeId ===
                profile?.employee?.id
            )
            .filter(
            (item) =>
              item.unread
          ).length;

        const visibleNotifications =
          notifications.filter(
            (item) =>
              item.ownerEmployeeId ===
              profile?.employee?.id
          );

        const workDuration =
          attendanceState ===
          "belum"
            ? "0j 0m"
            : attendanceState ===
              "masuk"
            ? "4j 18m"
            : "8j 10m";

        return {
          profile,

          attendanceState,

          jamMasuk,

          jamPulang,

          workDuration,

          attendanceHistory,

          requests,

          approvals,

          approvalHistory,

          notifications:
            visibleNotifications,

          overtimeRequests,

          unreadCount,

          toast,

          syncing,

          loadingRequest,

          loadingApprovalId,

          /* =========================================
             PRESENSI
          ========================================= */

          async submitAttendance(
            type,
            photoUri,
            latitude,
            longitude
          ) {
            try {
              const photo =
                photoFileFromUri(
                  photoUri,
                  type
                );

              const response =
                type === "masuk"
                  ? await checkIn({
                      type: "wfo",
                      latitude,
                      longitude,
                      photo,
                      device_info:
                        "KlikPresensi Mobile",
                    })
                  : await checkOut({
                      latitude,
                      longitude,
                      photo,
                      device_info:
                        "KlikPresensi Mobile",
                    });

              const attendance =
                response.data;

              const time =
                formatTime(
                  type === "masuk"
                    ? attendance.check_in
                    : attendance.check_out
                );
              const notificationStatus =
                attendanceNotificationStatus(
                  attendance.status
                );
              const statusLabel =
                attendanceStatusLabel(
                  attendance.status
                );
              const notificationTitle =
                type === "masuk"
                  ? "Presensi masuk tercatat"
                  : "Presensi pulang tercatat";
              const notificationDesc =
                `Presensi ${
                  type === "masuk"
                    ? "masuk"
                    : "pulang"
                } tercatat pada ${time} dengan status ${statusLabel}`;

              if (
                type === "masuk"
              ) {
                setJamMasuk(
                  time
                );

                setAttendanceState(
                  "masuk"
                );
              } else {
                setJamPulang(
                  time
                );

                setAttendanceState(
                  "selesai"
                );
              }

              setAttendanceHistory(
                (
                  current
                ) => {
                  const next =
                    mapAttendance(
                      attendance
                    );

                  return [
                    next,

                    ...current.filter(
                      (item) =>
                        !(
                          item.date ===
                            next.date &&
                          item.day ===
                            next.day
                        )
                    ),
                  ];
                }
              );

              setNotifications(
                (
                  current
                ) => [
                  {
                    id: `attendance-${Date.now()}`,

                    title:
                      notificationTitle,

                    desc:
                      notificationDesc,

                    time:
                      "Baru saja",

                    createdAt:
                      new Date().toISOString(),

                    unread:
                      true,

                    status:
                      notificationStatus,

                    category:
                      "attendance",

                    ownerEmployeeId:
                      profile?.employee?.id ??
                      null,
                  },

                  ...current,
                ]
              );

              void postNotification({
                title:
                  notificationTitle,
                message:
                  notificationDesc,
                type:
                  notificationTypeFor({
                    category:
                      "attendance",
                    status:
                      notificationStatus,
                  }),
              }).catch((error) => {
                console.error(
                  "Persist notification failed:",
                  getErrorMessage(error)
                );
              });

              flash(
                setToast,
                type ===
                  "masuk"
                  ? `Presensi masuk tercatat ${time}`
                  : `Presensi pulang tercatat ${time}`
              );

              return true;
            } catch (error) {
              console.error(
                "Submit attendance error:",
                error
              );

              const message =
                getErrorMessage(
                  error
                );

              setNotifications(
                (
                  current
                ) => [
                  {
                    id: `attendance-error-${Date.now()}`,

                    title:
                      "Presensi gagal",

                    desc:
                      message,

                    time:
                      "Baru saja",

                    createdAt:
                      new Date().toISOString(),

                    unread:
                      true,

                    status:
                      "error",

                    category:
                      "attendance",

                    ownerEmployeeId:
                      profile?.employee?.id ??
                      null,
                  },

                  ...current,
                ]
              );

              flash(
                setToast,
                message
              );

              return false;
            }
          },

          /* =========================================
             SUBMIT REQUEST
          ========================================= */

          async submitRequest(
            payload
          ) {
            if (
              loadingRequest
            ) {
              flash(
                setToast,
                "Pengajuan masih diproses, mohon tunggu..."
              );

              return false;
            }

            setLoadingRequest(
              true
            );

            const notificationId =
              `notif-${Date.now()}`;

            setNotifications(
              (current) => [
                {
                  id:
                    notificationId,

                  title:
                    "Mengirim pengajuan...",

                  desc:
                    `${payload.title} sedang diproses`,

                  time:
                    "Baru saja",

                  createdAt:
                    new Date().toISOString(),

                  unread:
                    true,

                  status:
                    "loading",

                  category:
                    "request",

                  ownerEmployeeId:
                    profile?.employee?.id ??
                    null,
                },

                ...current,
              ]
            );

            try {
              await delay(
                100
              );

              /* =====================================
                 WFA / WFH
              ===================================== */

              if (
                payload.type ===
                "Lembur"
              ) {
                const response =
                  await postOvertimeRequest(
                    {
                      date:
                        payload.startDate,

                      planned_start_time:
                        payload.plannedStartTime ||
                        "17:00",

                      planned_end_time:
                        payload.plannedEndTime ||
                        "19:00",

                      work_description:
                        payload.reason ||
                        payload.title,
                    }
                  );

                setRequests(
                  (current) => [
                    mapOvertimeRequest(
                      response.data
                    ),

                    ...current,
                  ]
                );
              }

              else if (
                payload.type === "WFH" ||
                payload.type === "WFA"
              ) {
                const response =
                  await postWfhRequest(
                    {
                      start_date:
                        payload.startDate,

                      end_date:
                        payload.endDate,

                      reason:
                        payload.reason ||
                        payload.title,
                    }
                  );

                setRequests(
                  (current) => [
                    mapWfhRequest(
                      response.data
                    ),

                    ...current,
                  ]
                );
              }

              /* =====================================
                 CUTI / IZIN / SAKIT
              ===================================== */

              else {
                const selectedTypeId =
                  payload.leaveTypeId ??
                  LEAVE_TYPE_IDS[
                    payload.type as keyof typeof LEAVE_TYPE_IDS
                  ];

                if (!selectedTypeId) {
                  throw new Error(
                    "Jenis pengajuan belum didukung oleh backend mobile."
                  );
                }

                const formData =
                  new FormData();

                /* DATA UTAMA */

                formData.append(
                  "leave_type_id",
                  String(
                    selectedTypeId
                  )
                );

                formData.append(
                  "start_date",
                  payload.startDate
                );

                formData.append(
                  "end_date",
                  payload.endDate
                );

                formData.append(
                  "reason",
                  payload.reason ||
                    payload.title
                );

                if (
                  payload.doctorLetterType
                ) {
                  formData.append(
                    "doctor_letter_type",
                    payload.doctorLetterType
                  );
                }

                if (
                  payload.doctorLetterNumber
                ) {
                  formData.append(
                    "doctor_letter_number",
                    payload.doctorLetterNumber
                  );
                }

                if (
                  payload.doctorFacilityName
                ) {
                  formData.append(
                    "doctor_facility_name",
                    payload.doctorFacilityName
                  );
                }

                if (
                  payload.childNumber
                ) {
                  formData.append(
                    "child_number",
                    String(
                      payload.childNumber
                    )
                  );
                }

                if (
                  payload.subCategory
                ) {
                  formData.append(
                    "sub_category",
                    payload.subCategory
                  );
                }

                /* =================================
                   ATTACHMENT
                ================================= */

                if (
                  payload.attachment
                ) {
                  const file =
                    await createAttachmentForUpload(
                      payload.attachment
                    );

                  formData.append(
                    "attachment",
                    file as any
                  );
                }

                /* =================================
                   SEND TO LARAVEL
                ================================= */

                const response =
                  await postLeaveRequest(
                    formData
                  );

                setRequests(
                  (current) => [
                    mapLeaveRequest(
                      response.data
                    ),

                    ...current,
                  ]
                );
              }

              /* =====================================
                 SUCCESS NOTIFICATION
              ===================================== */

              setNotifications(
                (current) =>
                  current.map(
                    (item) =>
                      item.id ===
                      notificationId
                        ? {
                            ...item,

                            title:
                              "Pengajuan berhasil dikirim",

                            desc:
                              `${payload.title} menunggu persetujuan atasan`,

                            status:
                              "success",

                            category:
                              "request",

                            ownerEmployeeId:
                              profile?.employee?.id ??
                              null,

                            unread:
                              true,
                          }
                        : item
                  )
              );

              flash(
                setToast,
                "Pengajuan berhasil dikirim"
              );

              return true;
            } catch (error) {
              console.error(
                "Submit request error:",
                error
              );

              const message =
                getErrorMessage(
                  error
                );

              console.error(
                "SUBMIT REQUEST MESSAGE:",
                message
              );

              setNotifications(
                (current) =>
                  current.map(
                    (item) =>
                      item.id ===
                      notificationId
                        ? {
                            ...item,

                            title:
                              "Pengajuan gagal dikirim",

                            desc:
                              message,

                            status:
                              "error",

                            category:
                              "request",

                            ownerEmployeeId:
                              profile?.employee?.id ??
                              null,

                            unread:
                              true,
                          }
                        : item
                  )
              );

              flash(
                setToast,
                message
              );

              return false;
            } finally {
              setLoadingRequest(
                false
              );
            }
          },

          /* =========================================
             APPROVAL
          ========================================= */

          async decideApproval(
            id,
            decision
          ) {
            if (
              loadingApprovalId !==
              null
            ) {
              flash(
                setToast,
                "Masih ada pengajuan yang diproses..."
              );

              return false;
            }

            const selected =
              approvals.find(
                (item) =>
                  item.id === id
              );

            if (!selected) {
              flash(
                setToast,
                "Pengajuan tidak ditemukan"
              );

              return false;
            }

            setLoadingApprovalId(
              id
            );

            const notificationId =
              `notif-${Date.now()}`;

            setNotifications(
              (items) => [
                {
                  id:
                    notificationId,

                  title:
                    decision ===
                    "Disetujui"
                      ? "Menyetujui pengajuan..."
                      : "Menolak pengajuan...",

                  desc:
                    `${selected.type} - ${selected.range}`,

                  time:
                    "Baru saja",

                  createdAt:
                    new Date().toISOString(),

                  unread:
                    true,

                  status:
                    "loading",

                  category:
                    "approval",

                  ownerEmployeeId:
                    profile?.employee?.id ??
                    null,
                },

                ...items,
              ]
            );

            try {
              await delay(
                100
              );

              const [
                kind,
                rawId,
              ] =
                id.split(
                  "-"
                );

              const apiDecision =
                decision ===
                "Disetujui"
                  ? "approve"
                  : "reject";

              const decisionNote =
                decision ===
                "Ditolak"
                  ? "Ditolak melalui aplikasi mobile."
                  : undefined;

              let updatedRequest:
                | RequestItem
                | null = null;

              if (
                kind ===
                "wfh"
              ) {
                const response =
                  await decideWfhRequest(
                  rawId,
                  apiDecision,
                  decisionNote
                );

                updatedRequest =
                  mapWfhRequest(
                    response.data
                  );
              } else if (
                kind ===
                "leave"
              ) {
                const response =
                  await decideLeaveRequest(
                  rawId,
                  apiDecision,
                  decisionNote
                );

                updatedRequest =
                  mapLeaveRequest(
                    response.data
                  );
              } else if (
                kind ===
                "overtime"
              ) {
                const response =
                  await decideOvertimeRequest(
                  rawId,
                  apiDecision,
                  decisionNote
                );

                updatedRequest =
                  mapOvertimeRequest(
                    response.data
                  );
              } else {
                throw new Error(
                  "Jenis pengajuan tidak dikenali."
                );
              }

              if (updatedRequest) {
                setRequests(
                  (current) => {
                    const exists =
                      current.some(
                        (item) =>
                          item.id ===
                          updatedRequest.id
                      );

                    if (!exists) {
                      return [
                        updatedRequest,
                        ...current,
                      ];
                    }

                    return current.map(
                      (item) =>
                        item.id ===
                        updatedRequest.id
                          ? updatedRequest
                          : item
                    );
                  }
                );
              }

              setApprovalHistory(
                (history) => [
                  {
                    ...selected,
                    decision,
                    requestStatus:
                      updatedRequest?.status,
                  },

                  ...history,
                ]
              );

              setApprovals(
                (current) =>
                  current.filter(
                    (item) =>
                      item.id !==
                      id
                  )
              );

              setNotifications(
                (items) =>
                  items.map(
                    (item) =>
                      item.id ===
                      notificationId
                        ? {
                            ...item,

                            title:
                              decision ===
                              "Disetujui"
                                ? "Pengajuan disetujui"
                                : "Pengajuan ditolak",

                            desc:
                              `${selected.type} - ${selected.range}`,

                            status:
                              "success",

                            category:
                              "approval",

                            ownerEmployeeId:
                              profile?.employee?.id ??
                              null,

                            unread:
                              true,
                          }
                        : item
                  )
              );

              flash(
                setToast,
                decision ===
                  "Disetujui"
                  ? "Pengajuan berhasil disetujui"
                  : "Pengajuan berhasil ditolak"
              );

              return true;
            } catch (error) {
              console.error(
                "Approval error:",
                error
              );

              const message =
                getErrorMessage(
                  error
                );

              const alreadyProcessed =
                isAlreadyProcessedMessage(
                  message
                );
              const forbiddenApproval =
                isForbiddenApprovalMessage(
                  message
                );

              if (
                alreadyProcessed ||
                forbiddenApproval
              ) {
                setApprovals(
                  (current) =>
                    current.filter(
                      (item) =>
                        item.id !==
                        id
                    )
                );
              }

              setNotifications(
                (items) =>
                  items.map(
                    (item) =>
                      item.id ===
                      notificationId
                        ? {
                            ...item,

                            title:
                              "Proses pengajuan gagal",

                            desc:
                              alreadyProcessed
                                ? "Data persetujuan diperbarui dari server."
                                : forbiddenApproval
                                ? "Pengajuan ini bukan giliran akun Anda."
                                : message,

                            status:
                              alreadyProcessed ||
                              forbiddenApproval
                                ? "success"
                                : "error",

                            category:
                              "approval",

                            ownerEmployeeId:
                              profile?.employee?.id ??
                              null,

                            unread:
                              true,
                          }
                        : item
                  )
              );

              flash(
                setToast,
                alreadyProcessed
                  ? "Pengajuan sudah diproses, daftar diperbarui"
                  : forbiddenApproval
                  ? "Pengajuan dihapus dari daftar menunggu akun ini"
                  : message
              );

              return false;
            } finally {
              setLoadingApprovalId(
                null
              );
            }
          },

          /* =========================================
             NOTIFICATION
          ========================================= */

          markNotificationRead(
            id
          ) {
            if (
              /^\d+$/.test(id)
            ) {
              void markBackendNotificationRead(
                id
              ).catch(
                (error) => {
                  console.error(
                    "Mark notification failed:",
                    error instanceof
                      Error
                      ? error.message
                      : error
                  );
                }
              );
            }

            setNotifications(
              (current) =>
                current.map(
                  (item) =>
                    item.id === id
                      ? {
                          ...item,
                          unread:
                            false,
                        }
                      : item
                  )
                );
          },

          pushNotification(
            item
          ) {
            const localId =
              item.id ??
              `local-${Date.now()}`;
            const localItem: NotificationItem =
              {
                id: localId,
                title: item.title,
                desc: item.desc,
                  time:
                    item.time ??
                    "Baru saja",
                  createdAt:
                    item.createdAt ??
                    new Date().toISOString(),
                  unread:
                  item.unread ??
                  true,
                status:
                  item.status,
                category:
                  item.category ??
                  "system",
                ownerEmployeeId:
                  profile?.employee?.id ??
                  null,
              };

            setNotifications(
              (current) => [
                localItem,

                ...current,
              ]
            );

            void postNotification({
              title: localItem.title,
              message: localItem.desc,
              type:
                notificationTypeFor(
                  localItem
                ),
            })
              .then((response) => {
                const stored =
                  mapNotification(
                    response.data,
                    profile?.employee?.id ??
                      null
                  );

                setNotifications(
                  (current) =>
                    current.map(
                      (existing) =>
                        existing.id ===
                        localId
                          ? stored
                          : existing
                    )
                );
              })
              .catch((error) => {
                console.error(
                  "Persist notification failed:",
                  getErrorMessage(
                    error
                  )
                );
              });
          },
        };
      },
      [
        approvalHistory,
        approvals,
        attendanceHistory,
        attendanceState,
        jamMasuk,
        jamPulang,
        notifications,
        overtimeRequests,
        profile,
        requests,
        syncing,
        toast,
        loadingRequest,
        loadingApprovalId,
      ]
    );

  return (
    <PrototypeContext.Provider
      value={value}
    >
      {children}
    </PrototypeContext.Provider>
  );
}

/* =====================================================
   HOOK
===================================================== */

export function usePrototype() {
  const context =
    useContext(
      PrototypeContext
    );

  if (!context) {
    throw new Error(
      "usePrototype must be used inside PrototypeProvider"
    );
  }

  return context;
}
