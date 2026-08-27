import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import MainScreen from "../../components/MainScreen";
import {
  ApiAttendance,
  ApiUser,
  getAttendance,
  getDashboardMe,
  getLeaveRequests,
  getNotifications,
  getOvertimeRequests,
  getProfile,
  getStoredUser,
  getWfhRequests,
} from "../../services/api";
/* ============================================================
   COLORS
============================================================ */

const COLORS = {
  navy: "#0d2747",
  navyDark: "#0a1d36",

  blue: "#1d4ed8",
  blueLight: "#3b82f6",

  background: "#eef1f6",
  white: "#ffffff",

  text: "#16223a",
  textSecondary: "#7a8699",
  border: "#e4e9f2",

  green: "#0f766e",
  greenLight: "#e2f3f0",

  orange: "#b45309",
  orangeLight: "#fdf2dd",

  purple: "#7c3aed",
  purpleLight: "#f0ecfd",

  cyan: "#0e7490",
  cyanLight: "#e0f2f6",

  red: "#dc2626",
  redLight: "#fde8e8",
};

/* ============================================================
   TYPES
============================================================ */

type Shortcut = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  route: string;
};

type Activity = {
  date: string;
  day: string;
  masuk: string;
  keluar: string;
  duration: string;
  mode: string;
  status: string;
  statusColor: string;
  statusBg: string;
};

/* ============================================================
   DATE HELPERS
============================================================ */

function formatLongDate(value: Date) {
  return value.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/* ============================================================
   TIME HELPERS
============================================================ */

function formatTime(
  value: string | null | undefined
) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return value.slice(0, 5);
}

/* ============================================================
   DURATION
============================================================ */

function formatDuration(
  minutes: number | null | undefined
) {
  if (
    minutes === null ||
    minutes === undefined
  ) {
    return "--";
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}j ${mins}m`;
}

/* ============================================================
   INITIALS
============================================================ */

function getInitials(
  name?: string | null
) {
  if (!name) {
    return "PG";
  }

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${parts[0][0]}${
    parts[parts.length - 1][0]
  }`.toUpperCase();
}

/* ============================================================
   NORMALIZE STATUS
============================================================ */

function normalizeStatus(
  status: string | null | undefined
) {
  return (
    status || ""
  )
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

/* ============================================================
   ATTENDANCE STATUS
============================================================ */

function mapAttendanceStatus(
  attendance: ApiAttendance
) {
  const status = normalizeStatus(
    attendance.status
  );

  if (
    status.includes("terlambat")
  ) {
    return {
      text: "Terlambat",
      color: COLORS.orange,
      bg: COLORS.orangeLight,
    };
  }

  if (
    status.includes("izin")
  ) {
    return {
      text: "Izin",
      color: COLORS.blue,
      bg: "#e7eefc",
    };
  }

  if (
    status.includes("alpha") ||
    status.includes("tidakhadir")
  ) {
    return {
      text: "Alpha",
      color: COLORS.red,
      bg: COLORS.redLight,
    };
  }

  return {
    text: "Hadir",
    color: "#0f7a4a",
    bg: "#e7f6ed",
  };
}

/* ============================================================
   ATTENDANCE MODE
============================================================ */

function mapAttendanceMode(
  type: ApiAttendance["type"]
) {
  switch (type) {
    case "wfh":
      return "WFH";

    case "shift":
      return "Shift";

    case "dinas_luar":
      return "Dinas Luar";

    default:
      return "WFO";
  }
}

/* ============================================================
   ATTENDANCE -> ACTIVITY
============================================================ */

function toActivity(
  item: ApiAttendance
): Activity {
  const status =
    mapAttendanceStatus(item);

  return {
    date: item.date
      ? new Date(
          `${item.date}T00:00:00`
        ).toLocaleDateString(
          "id-ID",
          {
            day: "2-digit",
          }
      )
      : "--",

    day: item.date
      ? new Date(
          `${item.date}T00:00:00`
        )
          .toLocaleDateString(
            "id-ID",
            {
              weekday: "short",
            }
      )
      .toUpperCase()
      : "--",

    masuk: formatTime(
      item.check_in
    ),

    keluar: formatTime(
      item.check_out
    ),

    duration:
      formatDuration(
        item.duration_minutes
      ),

    mode:
      mapAttendanceMode(
        item.type
      ),

    status:
      status.text,

    statusColor:
      status.color,

    statusBg:
      status.bg,
  };
}

/* ============================================================
   MAIN SCREEN
============================================================ */

export default function DashboardScreen() {
  /* ==========================================================
     STATE
  ========================================================== */

  const [
    user,
    setUser,
  ] =
    useState<ApiUser | null>(
      null
    );

  const [
    todayAttendance,
    setTodayAttendance,
  ] =
    useState<ApiAttendance | null>(
      null
    );

  const [
    activities,
    setActivities,
  ] =
    useState<Activity[]>(
      []
    );

  const [
    notifCount,
    setNotifCount,
  ] =
    useState(0);

  const [
    processedCount,
    setProcessedCount,
  ] =
    useState(0);

  const [
    approvalCount,
    setApprovalCount,
  ] =
    useState(0);

  const [
    leaveRemaining,
    setLeaveRemaining,
  ] =
    useState<string>("--");

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState<string | null>(
      null
    );

  /* ==========================================================
     TODAY
  ========================================================== */

  const today = useMemo(
    () => new Date(),
    []
  );

  /* ==========================================================
     CHECK ROLE APPROVER
  ========================================================== */

  const isApprover = useMemo(() => {
    const roles =
      user?.roles?.map(
        (role) =>
          role.name
      ) || [];

    return roles.some(
      (role) =>
        [
          "pimpinan",
          "admin_unit",
          "admin_kepegawaian",
          "super_admin",
        ].includes(role)
    );
  }, [user]);

  /* ==========================================================
     LOAD DASHBOARD
  ========================================================== */

  const loadDashboard =
    useCallback(
      async () => {
        setLoadError(null);

        try {
          /*
           * Ambil user tersimpan terlebih dahulu
           * supaya nama dapat langsung tampil.
           */

          const storedUser =
            await getStoredUser();

          if (storedUser) {
            setUser(
              storedUser
            );
          }

          /* -----------------------------------------------
             DATE
          ------------------------------------------------ */

          const todayText =
            today
              .toISOString()
              .slice(
                0,
                10
              );

          const monthStart =
            new Date(
              today.getFullYear(),
              today.getMonth(),
              1
            )
              .toISOString()
              .slice(
                0,
                10
              );

          /* -----------------------------------------------
             REQUEST API
          ------------------------------------------------ */

          const [
            profileResult,
            todayResult,
            historyResult,
            notificationResult,
            dashboardResult,
            leaveResult,
            wfhResult,
            overtimeResult,
          ] =
            await Promise.all([
              getProfile(),

              getAttendance({
                date_from:
                  todayText,

                date_to:
                  todayText,

                per_page: 10,
              }),

              getAttendance({
                date_from:
                  monthStart,

                date_to:
                  todayText,

                per_page: 3,
              }),

              getNotifications({
                per_page: 1,
              }),

              getDashboardMe(),

              getLeaveRequests(),

              getWfhRequests(),

              getOvertimeRequests(),
            ]);

          /* -----------------------------------------------
             PROFILE
          ------------------------------------------------ */

          const currentUser =
            profileResult.user;

          setUser(
            currentUser
          );

          /* -----------------------------------------------
             TODAY ATTENDANCE
          ------------------------------------------------ */

          const todayItems =
            todayResult.data ||
            [];

          const currentAttendance =
            todayItems.find(
              (item) =>
                item.check_in ||
                item.check_out
            ) ||
            todayItems[0] ||
            null;

          setTodayAttendance(
            currentAttendance
          );

          /* -----------------------------------------------
             HISTORY
          ------------------------------------------------ */

          setActivities(
            (
              historyResult.data ||
              []
            ).map(
              toActivity
            )
          );

          /* -----------------------------------------------
             NOTIFICATIONS
          ------------------------------------------------ */

          setNotifCount(
            notificationResult
              .meta
              ?.unread_count ||
              0
          );

          /* -----------------------------------------------
             LEAVE BALANCE
          ------------------------------------------------ */

          const leaveBalances =
            dashboardResult.data
              .leave_balances || [];

          const annualBalance =
            leaveBalances.find(
              (item) => {
                const name =
                  item.leave_type?.name
                    ?.toLowerCase() ||
                  "";
                const code =
                  item.leave_type?.code
                    ?.toLowerCase() ||
                  "";

                return (
                  name.includes(
                    "tahunan"
                  ) ||
                  code.includes(
                    "tahunan"
                  )
                );
              }
            ) || leaveBalances[0];

          setLeaveRemaining(
            annualBalance
              ? `${annualBalance.remaining}`
              : "--"
          );

          /* -----------------------------------------------
             REQUEST COUNTS
          ------------------------------------------------ */

          const pendingStatuses =
            new Set([
              "diajukan",
              "diproses",
              "pending",
            ]);

          const ownOrVisibleRequests =
            [
              ...(leaveResult.data ||
                []),

              ...(wfhResult.data ||
                []),

              ...(overtimeResult.data ||
                []),
            ];

          /* -----------------------------------------------
             PROCESSED REQUEST
          ------------------------------------------------ */

          setProcessedCount(
            ownOrVisibleRequests.filter(
              (item) =>
                pendingStatuses.has(
                  normalizeStatus(
                    item.status
                  )
                )
            ).length
          );

          /* -----------------------------------------------
             APPROVAL COUNT
          ------------------------------------------------ */

          const currentUserIsApprover =
            currentUser.roles?.some(
              (role) =>
                [
                  "pimpinan",
                  "admin_unit",
                  "admin_kepegawaian",
                  "super_admin",
                ].includes(
                  role.name
                )
            ) ?? false;

          if (
            currentUserIsApprover
          ) {
            setApprovalCount(
              ownOrVisibleRequests.filter(
                (item) =>
                  pendingStatuses.has(
                    normalizeStatus(
                      item.status
                    )
                  )
              ).length
            );
          } else {
            setApprovalCount(
              0
            );
          }
        } catch (
          error
        ) {
          console.error(
            "DASHBOARD LOAD ERROR:",
            error
          );

          setLoadError(
            error instanceof
              Error
              ? error.message
              : "Data dashboard gagal dimuat."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [today]
    );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadDashboard();
  }, [
    loadDashboard,
  ]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const onRefresh =
    useCallback(
      async () => {
        setRefreshing(
          true
        );

        await loadDashboard();

        setRefreshing(
          false
        );
      },
      [loadDashboard]
    );

  /* ==========================================================
     ATTENDANCE STATE
  ========================================================== */

  const hasCheckedIn =
    Boolean(
      todayAttendance?.check_in
    );

  const hasCheckedOut =
    Boolean(
      todayAttendance?.check_out
    );

  let attendanceTitle =
    "Anda belum absen masuk";

  let attendanceSubtitle =
    "Ketuk untuk memulai presensi hari ini";

  let attendanceButton =
    "Absen Masuk";

  if (
    hasCheckedIn &&
    !hasCheckedOut
  ) {
    attendanceTitle =
      "Sudah absen masuk";

    attendanceSubtitle =
      "Jangan lupa absen pulang sebelum selesai bekerja";

    attendanceButton =
      "Absen Pulang";
  }

  if (
    hasCheckedIn &&
    hasCheckedOut
  ) {
    attendanceTitle =
      "Presensi hari ini selesai";

    attendanceSubtitle =
      "Presensi hari ini sudah tercatat";

    attendanceButton =
      "";
  }

  /* ==========================================================
     ABSEN BUTTON
  ========================================================== */

  const handleAbsen =
    () => {
      router.push(
        "/(main)/presensi"
      );
    };

  /* ==========================================================
     SHORTCUT
  ========================================================== */

  const handleShortcut =
    (
      route: string
    ) => {
      router.push(
        route as never
      );
    };

  const shortcuts:
    Shortcut[] = [
      {
        label:
          "Riwayat",

        icon:
          "time-outline",

        color:
          COLORS.blue,

        bg:
          "#e7eefc",

        route:
          "/(main)/riwayat",
      },

      {
        label:
          "Saldo Cuti",

        icon:
          "calendar-outline",

        color:
          COLORS.green,

        bg:
          COLORS.greenLight,

        route:
          "/(main)/saldo",
      },

      {
        label:
          "Ajukan",

        icon:
          "document-text-outline",

        color:
          COLORS.purple,

        bg:
          COLORS.purpleLight,

        route:
          "/(main)/pengajuan",
      },

      {
        label:
          "Lembur",

        icon:
          "time-outline",

        color:
          COLORS.orange,

        bg:
          COLORS.orangeLight,

        route:
          "/(main)/lembur",
      },

      {
        label:
          "WFH",

        icon:
          "home-outline",

        color:
          COLORS.cyan,

        bg:
          COLORS.cyanLight,

        route:
          "/(main)/pengajuan",
      },

      {
        label:
          "Sakit",

        icon:
          "medkit-outline",

        color:
          "#be123c",

        bg:
          COLORS.redLight,

        route:
          "/(main)/pengajuan",
      },

      {
        label:
          "Persetujuan",

        icon:
          "checkmark-done-outline",

        color:
          COLORS.blue,

        bg:
          "#e7eefc",

        route:
          "/(main)/persetujuan",
      },

      {
        label:
          "Notifikasi",

        icon:
          "notifications-outline",

        color:
          "#48536a",

        bg:
          "#eceff4",

        route:
          "/(main)/notifikasi",
      },
    ];

  const displayActivities =
    activities.slice(
      0,
      3
    );

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <MainScreen scroll={false}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={
          COLORS.background
        }
      />

      <View
        style={
          styles.container
        }
      >
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.scrollContent
          }
          refreshControl={
            <RefreshControl
              refreshing={
                refreshing
              }
              onRefresh={
                onRefresh
              }
              tintColor={
                COLORS.blue
              }
            />
          }
        >

          {/* =================================================
              HEADER
          ================================================= */}

          <View
            style={
              styles.header
            }
          >
            <View
              style={
                styles.avatar
              }
            >
              <Text
                style={
                  styles.avatarText
                }
              >
                {getInitials(
                  user?.full_name ||
                    user?.employee
                      ?.name
                )}
              </Text>
            </View>

            <View
              style={
                styles.headerText
              }
            >
              <Text
                style={
                  styles.greeting
                }
              >
                Selamat datang,
              </Text>

              <Text
                style={
                  styles.userName
                }
                numberOfLines={
                  1
                }
                ellipsizeMode="tail"
              >
                {user?.full_name ||
                  user?.employee
                    ?.name ||
                  "Pegawai"}
              </Text>
            </View>

            <Pressable
              style={
                styles.notificationButton
              }
              onPress={() =>
                router.push(
                  "/(main)/notifikasi"
                )
              }
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color="#48536a"
              />

              {notifCount >
                0 && (
                <View
                  style={
                    styles.notificationBadge
                  }
                >
                  <Text
                    style={
                      styles.notificationBadgeText
                    }
                  >
                    {notifCount >
                    99
                      ? "99+"
                      : notifCount}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* =================================================
              ERROR
          ================================================= */}

          {loadError && (
            <Pressable
              style={
                styles.errorCard
              }
              onPress={
                loadDashboard
              }
            >
              <Ionicons
                name="warning-outline"
                size={19}
                color={
                  COLORS.red
                }
              />

              <View
                style={
                  styles.errorContent
                }
              >
                <Text
                  style={
                    styles.errorTitle
                  }
                >
                  Data dashboard belum termuat
                </Text>

                <Text
                  style={
                    styles.errorText
                  }
                  numberOfLines={
                    2
                  }
                >
                  {loadError}
                </Text>
              </View>

              <Ionicons
                name="refresh-outline"
                size={18}
                color={
                  COLORS.blue
                }
              />
            </Pressable>
          )}

          {/* =================================================
              HERO ABSEN
          ================================================= */}

          <View
            style={
              styles.heroCard
            }
          >
            <View
              style={
                styles.heroGrid
              }
            />

            <View
              style={
                styles.heroGlow
              }
            />

            <View
              style={
                styles.heroTop
              }
            >
              <Text
                style={
                  styles.heroDate
                }
              >
                {formatLongDate(
                  today
                )}
              </Text>

              <View
                style={
                  styles.modeChip
                }
              >
                <View
                  style={
                    styles.modeDot
                  }
                />

                <Text
                  style={
                    styles.modeText
                  }
                >
                  {todayAttendance
                    ?.type
                    ? mapAttendanceMode(
                        todayAttendance.type
                      )
                    : "Belum presensi"}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.heroTitleContainer
              }
            >
              <Text
                style={
                  styles.heroTitle
                }
              >
                {
                  attendanceTitle
                }
              </Text>

              <Text
                style={
                  styles.heroSubtitle
                }
              >
                {
                  attendanceSubtitle
                }
              </Text>
            </View>

            {/* =================================================
                JAM MASUK / PULANG
            ================================================= */}

            {hasCheckedIn && (
              <View
                style={
                  styles.attendanceTimes
                }
              >
                <View
                  style={
                    styles.timeBox
                  }
                >
                  <Text
                    style={
                      styles.timeLabel
                    }
                  >
                    MASUK
                  </Text>

                  <Text
                    style={
                      styles.timeValue
                    }
                  >
                    {formatTime(
                      todayAttendance?.check_in
                    )}
                  </Text>
                </View>

                <View
                  style={
                    styles.timeBox
                  }
                >
                  <Text
                    style={
                      styles.timeLabel
                    }
                  >
                    PULANG
                  </Text>

                  <Text
                    style={[
                      styles.timeValue,
                      !hasCheckedOut &&
                        styles.timeDisabled,
                    ]}
                  >
                    {formatTime(
                      todayAttendance?.check_out
                    )}
                  </Text>
                </View>
              </View>
            )}

            {/* =================================================
                LOCATION
            ================================================= */}

            <View
              style={
                styles.locationStatus
              }
            >
              <Ionicons
                name="location-outline"
                size={17}
                color="#6ee7b7"
              />

              <Text
                style={
                  styles.locationText
                }
              >
                Lokasi presensi diverifikasi oleh server
              </Text>
            </View>

            {/* =================================================
                ABSEN BUTTON
            ================================================= */}

            {!hasCheckedOut && (
              <Pressable
                style={({
                  pressed,
                }) => [
                  styles.attendanceButton,
                  pressed &&
                    styles.buttonPressed,
                ]}
                onPress={
                  handleAbsen
                }
              >
                <Ionicons
                  name="scan-outline"
                  size={21}
                  color="#fff"
                />

                <Text
                  style={
                    styles.attendanceButtonText
                  }
                >
                  {
                    attendanceButton
                  }
                </Text>
              </Pressable>
            )}
          </View>

          {/* =================================================
              STATISTICS
          ================================================= */}

          <View
            style={
              styles.statsRow
            }
          >
            {/* JAM KERJA */}

            <View
              style={
                styles.statCard
              }
            >
              <Ionicons
                name="time-outline"
                size={19}
                color={
                  COLORS.blue
                }
              />

              <Text
                style={
                  styles.statValue
                }
              >
                {formatDuration(
                  todayAttendance?.duration_minutes
                )}
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                Jam kerja hari ini
              </Text>
            </View>

            {/* SALDO CUTI */}

            <View
              style={
                styles.statCard
              }
            >
              <Ionicons
                name="calendar-outline"
                size={19}
                color={
                  COLORS.green
                }
              />

              <Text
                style={
                  styles.statValue
                }
              >
                {leaveRemaining}
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                Saldo cuti
              </Text>
            </View>

            {/* PENGAJUAN */}

            <View
              style={
                styles.statCard
              }
            >
              <Ionicons
                name="document-text-outline"
                size={19}
                color={
                  COLORS.orange
                }
              />

              <Text
                style={
                  styles.statValue
                }
              >
                {
                  processedCount
                }
              </Text>

              <Text
                style={
                  styles.statLabel
                }
              >
                Pengajuan diproses
              </Text>
            </View>
          </View>

          {/* =================================================
              PERSETUJUAN
          ================================================= */}

          {isApprover && (
            <Pressable
              style={
                styles.approvalCard
              }
              onPress={() =>
                router.push(
                  "/(main)/persetujuan"
                )
              }
            >
              <View
                style={
                  styles.approvalIcon
                }
              >
                <Ionicons
                  name="checkmark-done-outline"
                  size={22}
                  color={
                    COLORS.blue
                  }
                />
              </View>

              <View
                style={
                  styles.approvalContent
                }
              >
                <Text
                  style={
                    styles.approvalTitle
                  }
                >
                  Persetujuan menunggu Anda
                </Text>

                <Text
                  style={
                    styles.approvalSubtitle
                  }
                >
                  Tinjau pengajuan yang masih dalam proses
                </Text>
              </View>

              <View
                style={
                  styles.approvalBadge
                }
              >
                <Text
                  style={
                    styles.approvalBadgeText
                  }
                >
                  {
                    approvalCount
                  }
                </Text>
              </View>
            </Pressable>
          )}

          {/* =================================================
              AKSES CEPAT
          ================================================= */}

          <View
            style={
              styles.sectionHeader
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Akses Cepat
            </Text>
          </View>

          <View
            style={
              styles.shortcutGrid
            }
          >
            {shortcuts.map(
              (item) => (
                <Pressable
                  key={
                    item.label
                  }
                  style={({
                    pressed,
                  }) => [
                    styles.shortcutCard,
                    pressed &&
                      styles.shortcutPressed,
                  ]}
                  onPress={() =>
                    handleShortcut(
                      item.route
                    )
                  }
                >
                  <View
                    style={[
                      styles.shortcutIcon,
                      {
                        backgroundColor:
                          item.bg,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        item.icon
                      }
                      size={20}
                      color={
                        item.color
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.shortcutText
                    }
                  >
                    {
                      item.label
                    }
                  </Text>
                </Pressable>
              )
            )}
          </View>

          {/* =================================================
              AKTIVITAS TERAKHIR
          ================================================= */}

          <View
            style={
              styles.activityHeader
            }
          >
            <Text
              style={
                styles.sectionTitle
              }
            >
              Aktivitas Terakhir
            </Text>

            <Pressable
              onPress={() =>
                router.push(
                  "/(main)/riwayat"
                )
              }
            >
              <Text
                style={
                  styles.seeAll
                }
              >
                Lihat semua
              </Text>
            </Pressable>
          </View>

          <View
            style={
              styles.activityContainer
            }
          >
            {loading ? (
              <View
                style={
                  styles.loadingBox
                }
              >
                <ActivityIndicator
                  color={
                    COLORS.blue
                  }
                />

                <Text
                  style={
                    styles.loadingText
                  }
                >
                  Memuat aktivitas...
                </Text>
              </View>
            ) : displayActivities.length ===
              0 ? (
              <View
                style={
                  styles.emptyBox
                }
              >
                <Ionicons
                  name="calendar-clear-outline"
                  size={28}
                  color={
                    COLORS.textSecondary
                  }
                />

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  Belum ada aktivitas
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  Riwayat presensi akan muncul setelah Anda melakukan presensi.
                </Text>
              </View>
            ) : (
              displayActivities.map(
                (
                  activity,
                  index
                ) => (
                  <View
                    key={`${activity.date}-${activity.day}-${index}`}
                    style={[
                      styles.activityRow,
                      index !==
                        displayActivities.length -
                          1 &&
                        styles.activityRowBorder,
                    ]}
                  >
                    <View
                      style={[
                        styles.dateBox,
                        {
                          backgroundColor:
                            "#eef3fc",
                        },
                      ]}
                    >
                      <Text
                        style={
                          styles.dateNumber
                        }
                      >
                        {
                          activity.date
                        }
                      </Text>

                      <Text
                        style={
                          styles.dateDay
                        }
                      >
                        {
                          activity.day
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.activityInfo
                      }
                    >
                      <Text
                        style={
                          styles.activityTime
                        }
                      >
                        {
                          activity.masuk
                        }

                        <Text
                          style={
                            styles.arrow
                          }
                        >
                          {" -> "}
                        </Text>

                        {
                          activity.keluar
                        }
                      </Text>

                      <Text
                        style={
                          styles.activityDetail
                        }
                      >
                        {
                          activity.duration
                        }{" - "}
                        {
                          activity.mode
                        }
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            activity.statusBg,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          {
                            color:
                              activity.statusColor,
                          },
                        ]}
                      >
                        {
                          activity.status
                        }
                      </Text>
                    </View>
                  </View>
                )
              )
            )}
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </MainScreen>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    container: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    scrollContent: {
      paddingTop: 4,
    },

    /* ========================================================
       HEADER
    ======================================================== */

    header: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        18,
      paddingTop: 12,
      paddingBottom: 10,
      gap: 12,
    },

    avatar: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        COLORS.navy,
      alignItems:
        "center",
      justifyContent:
        "center",
      shadowColor:
        COLORS.navy,
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity:
        0.25,
      shadowRadius: 8,
      elevation: 4,
    },

    avatarText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "700",
    },

    headerText: {
      flex: 1,
      minWidth: 0,
    },

    greeting: {
      fontSize: 12,
      color:
        COLORS.textSecondary,
      fontWeight:
        "600",
    },

    userName: {
      marginTop: 1,
      fontSize: 15.5,
      color:
        COLORS.text,
      fontWeight:
        "800",
    },

    notificationButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    notificationBadge: {
      position:
        "absolute",
      top: -4,
      right: -4,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor:
        COLORS.red,
      borderWidth: 2,
      borderColor:
        COLORS.background,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    notificationBadgeText: {
      color: "#fff",
      fontSize: 10,
      fontWeight:
        "700",
    },

    /* ========================================================
       ERROR
    ======================================================== */

    errorCard: {
      marginHorizontal: 16,
      marginBottom: 8,
      padding: 12,
      borderRadius: 14,
      backgroundColor:
        COLORS.redLight,
      borderWidth: 1,
      borderColor:
        "#f5c2c2",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
    },

    errorContent: {
      flex: 1,
    },

    errorTitle: {
      color:
        COLORS.text,
      fontSize: 12,
      fontWeight:
        "800",
    },

    errorText: {
      color:
        COLORS.textSecondary,
      fontSize: 10.5,
      marginTop: 2,
    },

    /* ========================================================
       HERO
    ======================================================== */

    heroCard: {
      marginHorizontal: 16,
      marginTop: 6,
      borderRadius: 22,
      backgroundColor:
        COLORS.navy,
      padding: 18,
      paddingBottom: 19,
      overflow:
        "hidden",
      shadowColor:
        COLORS.navy,
      shadowOffset: {
        width: 0,
        height: 12,
      },
      shadowOpacity:
        0.28,
      shadowRadius: 18,
      elevation: 8,
    },

    heroGrid: {
      position:
        "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      opacity: 0.08,
    },

    heroGlow: {
      position:
        "absolute",
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor:
        "rgba(59,130,246,0.25)",
      top: -90,
      right: -60,
    },

    heroTop: {
      position:
        "relative",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    heroDate: {
      color:
        "#a8c4e6",
      fontSize: 11.5,
      fontWeight:
        "600",
      flex: 1,
    },

    modeChip: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor:
        "rgba(255,255,255,0.12)",
    },

    modeDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        "#6ee7b7",
    },

    modeText: {
      color:
        "#cfe0f5",
      fontSize: 10.5,
      fontWeight:
        "700",
    },

    heroTitleContainer: {
      marginTop: 14,
    },

    heroTitle: {
      color: "#fff",
      fontSize: 18.5,
      fontWeight:
        "800",
    },

    heroSubtitle: {
      color:
        "#a8c4e6",
      fontSize: 12,
      fontWeight:
        "500",
      marginTop: 3,
    },

    attendanceTimes: {
      flexDirection:
        "row",
      gap: 10,
      marginTop: 15,
    },

    timeBox: {
      flex: 1,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 13,
      backgroundColor:
        "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.1)",
    },

    timeLabel: {
      color:
        "#8fb4e8",
      fontSize: 10,
      fontWeight:
        "700",
      letterSpacing:
        0.4,
    },

    timeValue: {
      color: "#fff",
      fontSize: 19,
      fontWeight:
        "800",
      marginTop: 2,
    },

    timeDisabled: {
      color:
        "#5d80ad",
    },

    locationStatus: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 11,
      backgroundColor:
        "rgba(52,211,153,0.12)",
      borderWidth: 1,
      borderColor:
        "rgba(52,211,153,0.22)",
    },

    locationText: {
      flex: 1,
      color:
        "#d7f3e6",
      fontSize: 11.5,
      fontWeight:
        "600",
      lineHeight: 16,
    },

    attendanceButton: {
      height: 50,
      marginTop: 15,
      borderRadius: 15,
      backgroundColor:
        COLORS.blue,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 10,
      shadowColor:
        COLORS.blue,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity:
        0.35,
      shadowRadius: 12,
      elevation: 6,
    },

    attendanceButtonText: {
      color: "#fff",
      fontSize: 14.5,
      fontWeight:
        "700",
    },

    buttonPressed: {
      opacity: 0.85,
      transform: [
        {
          scale: 0.99,
        },
      ],
    },

    /* ========================================================
       STATISTICS
    ======================================================== */

    statsRow: {
      flexDirection:
        "row",
      gap: 10,
      paddingHorizontal: 16,
      paddingTop: 13,
    },

    statCard: {
      flex: 1,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 15,
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 11,
      minHeight: 108,
    },

    statValue: {
      color:
        COLORS.text,
      fontSize: 18,
      fontWeight:
        "800",
      marginTop: 9,
    },

    statLabel: {
      color:
        COLORS.textSecondary,
      fontSize: 10.5,
      fontWeight:
        "600",
      lineHeight: 14,
      marginTop: 4,
    },

    /* ========================================================
       APPROVAL
    ======================================================== */

    approvalCard: {
      marginHorizontal: 16,
      marginTop: 13,
      padding: 14,
      borderRadius: 16,
      backgroundColor:
        "#f6f9ff",
      borderWidth: 1,
      borderColor:
        "#d9e2f3",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 13,
    },

    approvalIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor:
        "#e7eefc",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    approvalContent: {
      flex: 1,
      minWidth: 0,
    },

    approvalTitle: {
      color:
        COLORS.text,
      fontSize: 13.5,
      fontWeight:
        "800",
    },

    approvalSubtitle: {
      color:
        COLORS.textSecondary,
      fontSize: 11.5,
      fontWeight:
        "500",
      marginTop: 2,
    },

    approvalBadge: {
      minWidth: 26,
      height: 26,
      paddingHorizontal: 8,
      borderRadius: 13,
      backgroundColor:
        COLORS.red,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    approvalBadgeText: {
      color: "#fff",
      fontSize: 13,
      fontWeight:
        "800",
    },

    /* ========================================================
       SECTION
    ======================================================== */

    sectionHeader: {
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 2,
    },

    sectionTitle: {
      color:
        COLORS.text,
      fontSize: 13.5,
      fontWeight:
        "800",
    },

    /* ========================================================
       SHORTCUT
    ======================================================== */

    shortcutGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      justifyContent:
        "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      rowGap: 9,
    },

    shortcutCard: {
      width: "23%",
      minHeight: 92,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 15,
      paddingHorizontal: 5,
      paddingVertical: 10,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    shortcutPressed: {
      opacity: 0.75,
      transform: [
        {
          scale: 0.97,
        },
      ],
    },

    shortcutIcon: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    shortcutText: {
      marginTop: 7,
      color:
        "#2b3650",
      fontSize: 10.5,
      fontWeight:
        "700",
      textAlign:
        "center",
      lineHeight: 13,
    },

    /* ========================================================
       ACTIVITY
    ======================================================== */

    activityHeader: {
      flexDirection:
        "row",
      alignItems:
        "baseline",
      justifyContent:
        "space-between",
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 2,
    },

    seeAll: {
      color:
        COLORS.blue,
      fontSize: 11.5,
      fontWeight:
        "700",
    },

    activityContainer: {
      marginHorizontal: 16,
      marginTop: 8,
      backgroundColor:
        COLORS.white,
      borderWidth: 1,
      borderColor:
        COLORS.border,
      borderRadius: 16,
      overflow:
        "hidden",
    },

    loadingBox: {
      minHeight: 130,
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 8,
    },

    loadingText: {
      color:
        COLORS.textSecondary,
      fontSize: 11,
      fontWeight:
        "600",
    },

    emptyBox: {
      minHeight: 150,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 25,
      paddingVertical: 25,
    },

    emptyTitle: {
      marginTop: 8,
      color:
        COLORS.text,
      fontSize: 13,
      fontWeight:
        "800",
    },

    emptyText: {
      marginTop: 4,
      color:
        COLORS.textSecondary,
      fontSize: 11,
      lineHeight: 16,
      textAlign:
        "center",
    },

    activityRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },

    activityRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor:
        "#f2f4f8",
    },

    dateBox: {
      width: 38,
      height: 38,
      borderRadius: 11,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    dateNumber: {
      color:
        COLORS.blue,
      fontSize: 13,
      fontWeight:
        "800",
    },

    dateDay: {
      color:
        COLORS.blue,
      fontSize: 8,
      fontWeight:
        "700",
      letterSpacing:
        0.3,
      marginTop: 1,
    },

    activityInfo: {
      flex: 1,
      minWidth: 0,
    },

    activityTime: {
      color:
        COLORS.text,
      fontSize: 12.5,
      fontWeight:
        "700",
    },

    arrow: {
      color:
        "#c2c9d6",
    },

    activityDetail: {
      color:
        COLORS.textSecondary,
      fontSize: 11,
      fontWeight:
        "500",
      marginTop: 2,
    },

    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 7,
    },

    statusText: {
      fontSize: 10,
      fontWeight:
        "700",
    },

    bottomSpacing: {
      height: 8,
    },

  });
