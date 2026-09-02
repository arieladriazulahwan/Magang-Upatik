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
  postWfhRequest,
  markNotificationRead as markBackendNotificationRead,
  type ApiUser,
  type ApiAttendance,
  type ApiLeaveRequest,
  type ApiOvertimeRequest,
  type ApiWfhRequest,
  type ApiNotification,
} from "../services/api";

/* =====================================================
   TYPE
===================================================== */

type AttendanceState =
  | "belum"
  | "masuk"
  | "selesai";

type RequestStatus =
  | "Disetujui"
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
}

export type NotificationStatus =
  | "loading"
  | "success"
  | "error";

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
  unread: boolean;
  status?: NotificationStatus;
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
      attachment?: RequestAttachment | null;
      doctorLetterType?: "dokter_biasa" | "tim_penguji_kesehatan";
      doctorLetterNumber?: string;
      doctorFacilityName?: string;
    }
  ) => Promise<boolean>;

  decideApproval: (
    id: string,
    decision: Decision
  ) => Promise<boolean>;

  markNotificationRead: (
    id: string
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
  if (!value) {
    return "--:--";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value.slice(0, 5);
  }

  return `${String(
    date.getHours()
  ).padStart(
    2,
    "0"
  )}:${String(
    date.getMinutes()
  ).padStart(
    2,
    "0"
  )}`;
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

const LEAVE_TYPE_IDS = {
  Cuti: 1,
  Sakit: 3,
  Izin: 8,
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
      "Work From Home",

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

    type: "WFH",
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
      "Work From Home",

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
      ? new Date(
          item.date
        )
          .toLocaleDateString(
            "id-ID",
            {
              weekday:
                "short",
            }
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

function mapNotification(
  item: ApiNotification
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

    unread:
      !item.is_read,
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

    async function syncFromBackend() {
      try {
        const token =
          await getToken();

        if (!token) {
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
              setProfile(
                null
              );
            }

            return;
          }

          console.error(
            "PROFILE LOAD ERROR:",
            message
          );
        }

        const results =
          await Promise.allSettled([
            getAttendance({
              per_page: 15,
            }),

            getLeaveRequests(),

            getWfhRequests(),

            getNotifications({
              per_page: 20,
            }),

            getOvertimeRequests(),
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

        setApprovals([
          ...leaveData
            .filter(
              (item) =>
                isPendingApprovalStatus(
                  item.status
                )
            )
            .map(
              mapLeaveApproval
            ),

          ...wfhData
            .filter(
              (item) =>
                isPendingApprovalStatus(
                  item.status
                )
            )
            .map(
              mapWfhApproval
            ),

          ...overtimeData
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

        /* NOTIFICATIONS */

        if (
          notificationResult.status ===
          "fulfilled"
        ) {
          setNotifications(
            notificationResult.value.data.map(
              mapNotification
            )
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
      }
    }

    syncFromBackend();

    return () => {
      active = false;
    };
  }, []);

  /* ===================================================
     CONTEXT VALUE
  =================================================== */

  const value =
    useMemo<PrototypeContextValue>(
      () => {
        const unreadCount =
          notifications.filter(
            (item) =>
              item.unread
          ).length;

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

          notifications,

          overtimeRequests,

          unreadCount,

          toast,

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
                      type ===
                      "masuk"
                        ? "Presensi masuk berhasil"
                        : "Presensi pulang berhasil",

                    desc:
                      `Presensi ${
                        type ===
                        "masuk"
                          ? "masuk"
                          : "pulang"
                      } tercatat pada ${time}`,

                    time:
                      "Baru saja",

                    unread:
                      true,

                    status:
                      "success",
                  },

                  ...current,
                ]
              );

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

                    unread:
                      true,

                    status:
                      "error",
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

                  unread:
                    true,

                  status:
                    "loading",
                },

                ...current,
              ]
            );

            try {
              await delay(
                100
              );

              /* =====================================
                 WFH
              ===================================== */

              if (
                payload.type ===
                "WFH"
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

                  unread:
                    true,

                  status:
                    "loading",
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

              if (
                kind ===
                "wfh"
              ) {
                await decideWfhRequest(
                  rawId,
                  apiDecision
                );
              } else if (
                kind ===
                "leave"
              ) {
                await decideLeaveRequest(
                  rawId,
                  apiDecision
                );
              } else if (
                kind ===
                "overtime"
              ) {
                await decideOvertimeRequest(
                  rawId,
                  apiDecision
                );
              } else {
                throw new Error(
                  "Jenis pengajuan tidak dikenali."
                );
              }

              setApprovalHistory(
                (history) => [
                  {
                    ...selected,
                    decision,
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
                              message,

                            status:
                              "error",

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
