import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  decideLeaveRequest,
  decideWfhRequest,
  getAttendance,
  getLeaveTypes,
  getLeaveRequests,
  getProfile,
  getStoredUser,
  getToken,
  getWfhRequests,
  postLeaveRequest,
  postWfhRequest,
  type ApiUser,
  type ApiAttendance,
  type ApiLeaveRequest,
  type ApiWfhRequest,
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
  | "Ditolak";

type Decision =
  | "Disetujui"
  | "Ditolak";

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

  unreadCount: number;

  toast: string | null;

  loadingRequest: boolean;

  loadingApprovalId: string | null;

  /*
   * Presensi sekarang menerima:
   * - jenis
   * - foto
   * - latitude
   * - longitude
   */
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

function nowTime() {
  const now = new Date();

  return `${String(
    now.getHours()
  ).padStart(
    2,
    "0"
  )}:${String(
    now.getMinutes()
  ).padStart(
    2,
    "0"
  )}`;
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

function delay(ms: number) {
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

  const date = new Date(
    value
  );

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
  if (
    status ===
    "disetujui"
  ) {
    return "Disetujui";
  }

  if (
    status ===
    "ditolak"
  ) {
    return "Ditolak";
  }

  return "Menunggu";
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

    meta: formatDateRange(
      item.start_date,
      item.end_date
    ),

    days: item.total_days
      ? `${item.total_days} hari`
      : "Pengajuan",

    status:
      statusToRequestStatus(
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

    range: formatDateRange(
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

    meta: formatDateRange(
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

    range: formatDateRange(
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

    time: `${formatTime(
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

        const profileResponse =
          await getProfile();

        const [
          attendanceResponse,
          leaveResponse,
          wfhResponse,
        ] =
          await Promise.all([
            getAttendance({
              per_page: 15,
            }),

            getLeaveRequests(),

            getWfhRequests(),
          ]);

        if (!active) {
          return;
        }

        setProfile(
          profileResponse.user
        );

        setAttendanceHistory(
          attendanceResponse.data.map(
            mapAttendance
          )
        );

        const backendRequests =
          [
            ...leaveResponse.data.map(
              mapLeaveRequest
            ),

            ...wfhResponse.data.map(
              mapWfhRequest
            ),
          ];

        setRequests(
          backendRequests
        );

        setApprovals([
          ...leaveResponse.data
            .filter(
              (item) =>
                item.status ===
                "diajukan"
            )
            .map(
              mapLeaveApproval
            ),

          ...wfhResponse.data
            .filter(
              (item) =>
                item.status ===
                "diajukan"
            )
            .map(
              mapWfhApproval
            ),
        ]);
      } catch (error) {
        console.log(
          "Backend sync failed:",
          error instanceof Error
            ? error.message
            : error
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
              /*
               * Untuk sementara proses dibuat
               * asynchronous agar UI prototype
               * memiliki tahap loading.
               *
               * Nanti bagian ini dapat diganti
               * dengan API upload foto presensi.
               */

              await delay(1200);

              console.log(
                "ATTENDANCE SUBMIT:",
                {
                  type,
                  photoUri,
                  latitude,
                  longitude,
                }
              );

              const time =
                nowTime();

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

              /*
               * Tambahkan riwayat presensi
               * secara lokal untuk prototype.
               */

              const now =
                new Date();

              const date =
                `${now.getFullYear()}-${String(
                  now.getMonth() +
                    1
                ).padStart(
                  2,
                  "0"
                )}-${String(
                  now.getDate()
                ).padStart(
                  2,
                  "0"
                )}`;

              const day =
                now
                  .toLocaleDateString(
                    "id-ID",
                    {
                      weekday:
                        "short",
                    }
                  )
                  .toUpperCase();

              setAttendanceHistory(
                (
                  current
                ) => [
                  {
                    date: String(
                      now.getDate()
                    ).padStart(
                      2,
                      "0"
                    ),

                    day,

                    time:
                      type ===
                      "masuk"
                        ? `${time} - --:--`
                        : `--:-- - ${time}`,

                    duration:
                      "0j 0m",

                    status:
                      "Hadir",

                    mode:
                      "WFO",
                  },

                  ...current,
                ]
              );

              /*
               * Notifikasi presensi berhasil.
               */

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

              setNotifications(
                (
                  current
                ) => [
                  {
                    id: `attendance-error-${Date.now()}`,

                    title:
                      "Presensi gagal",

                    desc:
                      "Terjadi kesalahan saat menyimpan presensi.",

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
                "Presensi gagal"
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
              } else {
                const leaveTypes =
                  await getLeaveTypes();

                const selectedType =
                  leaveTypes.data.find(
                    (item) => {
                      if (
                        payload.type ===
                        "Sakit"
                      ) {
                        return (
                          item.category ===
                          "sakit"
                        );
                      }

                      if (
                        payload.type ===
                        "Izin"
                      ) {
                        return (
                          item.category ===
                          "izin"
                        );
                      }

                      return (
                        item.code ===
                        "cuti_tahunan"
                      );
                    }
                  );

                if (
                  !selectedType
                ) {
                  throw new Error(
                    "Jenis pengajuan tidak tersedia dari backend."
                  );
                }

                const response =
                  await postLeaveRequest(
                    {
                      leave_type_id:
                        selectedType.id,

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
                    mapLeaveRequest(
                      response.data
                    ),

                    ...current,
                  ]
                );
              }

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
                              "Terjadi kesalahan. Silakan coba lagi.",

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
                "Pengajuan gagal dikirim"
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

              try {
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
                }
              } catch (error) {
                console.log(
                  "Backend approval skipped:",
                  error instanceof
                    Error
                    ? error.message
                    : error
                );

                await delay(
                  700
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

              setNotifications(
                (items) =>
                  items.map(
                    (item) =>
                      item.id ===
                      notificationId
                        ? {
                            ...item,

                            title:
                              "Proses gagal",

                            desc:
                              "Pengajuan gagal diproses. Silakan coba lagi.",

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
                "Proses pengajuan gagal"
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