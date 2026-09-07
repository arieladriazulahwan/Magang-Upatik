import React, { useCallback, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import {
  formatWitaLongDate,
  formatWitaShortDate,
  formatWitaTime,
  getWitaDateKey,
  isWitaDateKeyInCurrentYear,
  isWitaDateKeyInCurrentMonth,
  isWitaDateKeyInCurrentWeek,
  isWitaDateKeyToday,
} from "../../constants/time";
import {
  LoadingDots,
} from "../../components/Skeleton";

import {
  getLeaveRequests,
  getOvertimeRequests,
  getProfile,
  getWfhRequests,
  ApiLeaveRequest,
  ApiOvertimeRequest,
  ApiWfhRequest,
} from "../../services/api";

const filters = [
  "Semua",
  "Cuti",
  "Sakit",
  "Izin",
  "WFA",
  "Lembur",
  "Perjadi",
];

type RequestItem = {
  id: string;
  type: string;
  status: string;
  title: string;
  meta: string;
  days: string;
  rawDate: string | null;
  createdAt: string | null;
};

type RequestGroup = {
  key: string;
  label: string;
  items: RequestItem[];
};

type PeriodFilter =
  | "all"
  | "today"
  | "yesterday"
  | "week"
  | "last7"
  | "last30"
  | "month"
  | "year"
  | "custom";

type CustomDateFilter = {
  month: number;
  year: number;
  day: number | null;
};

type CustomPickerKey =
  | "month"
  | "year"
  | "day";

const monthOptions = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const periodFilters: {
  label: string;
  value: PeriodFilter;
}[] = [
  {
    label: "Semua",
    value: "all",
  },
  {
    label: "Hari ini",
    value: "today",
  },
  {
    label: "Kemarin",
    value: "yesterday",
  },
  {
    label: "Minggu ini",
    value: "week",
  },
  {
    label: "7 hari",
    value: "last7",
  },
  {
    label: "30 hari",
    value: "last30",
  },
  {
    label: "Bulan ini",
    value: "month",
  },
  {
    label: "Tahun ini",
    value: "year",
  },
  {
    label: "Kustom",
    value: "custom",
  },
];

function dateKeyToUtcDate(
  key: string
) {
  const [
    year,
    month,
    day,
  ] =
    key.split("-").map(Number);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );
}

function diffDaysFromToday(
  key: string
) {
  const today =
    dateKeyToUtcDate(
      getWitaDateKey()
    );
  const target =
    dateKeyToUtcDate(key);

  return Math.round(
    (today.getTime() -
      target.getTime()) /
      86400000
  );
}

function buildDateKey(
  year: number,
  month: number,
  day: number
) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(
  year: number,
  month: number
) {
  return new Date(
    year,
    month,
    0
  ).getDate();
}

function requestDateKey(
  item: RequestItem
) {
  if (item.createdAt) {
    return getWitaDateKey(
      new Date(item.createdAt)
    );
  }

  return item.rawDate || "unknown";
}

function requestGroupLabel(
  key: string
) {
  if (key === "unknown") {
    return "Tanggal tidak tersedia";
  }

  const date =
    dateKeyToUtcDate(key);
  const diff =
    diffDaysFromToday(key);

  if (diff === 0) {
    return "Hari ini";
  }

  if (diff === 1) {
    return "Kemarin";
  }

  if (diff > 1 && diff < 7) {
    return date.toLocaleDateString(
      "id-ID",
      {
        weekday: "long",
        timeZone: "UTC",
      }
    );
  }

  if (diff >= 7 && diff < 14) {
    return "Seminggu lalu";
  }

  return formatWitaLongDate(
    new Date(
      `${key}T12:00:00+08:00`
    )
  );
}

function groupRequests(
  items: RequestItem[]
): RequestGroup[] {
  const groups =
    new Map<string, RequestItem[]>();

  items.forEach((item) => {
    const key =
      requestDateKey(item);

    groups.set(key, [
      ...(groups.get(key) ?? []),
      item,
    ]);
  });

  return Array.from(
    groups.entries()
  )
    .sort(([a], [b]) => {
      if (a === "unknown") {
        return 1;
      }

      if (b === "unknown") {
        return -1;
      }

      return b.localeCompare(a);
    })
    .map(([key, items]) => ({
      key,
      label:
        requestGroupLabel(key),
      items,
    }));
}

function isInPeriod(
  rawDate: string | null,
  period: PeriodFilter,
  customFilter?: CustomDateFilter
) {
  if (
    period === "custom"
  ) {
    if (!rawDate || !customFilter) {
      return false;
    }

    if (customFilter.day) {
      return (
        rawDate ===
        buildDateKey(
          customFilter.year,
          customFilter.month,
          customFilter.day
        )
      );
    }

    const monthPrefix =
      `${customFilter.year}-${String(
        customFilter.month
      ).padStart(2, "0")}`;

    return rawDate.startsWith(
      monthPrefix
    );
  }

  switch (period) {
    case "all":
      return true;

    case "today":
      return isWitaDateKeyToday(rawDate);

    case "yesterday":
      return rawDate
        ? diffDaysFromToday(rawDate) === 1
        : false;

    case "week":
      return isWitaDateKeyInCurrentWeek(rawDate);

    case "last7":
      return rawDate
        ? diffDaysFromToday(rawDate) >= 0 &&
            diffDaysFromToday(rawDate) <= 6
        : false;

    case "last30":
      return rawDate
        ? diffDaysFromToday(rawDate) >= 0 &&
            diffDaysFromToday(rawDate) <= 29
        : false;

    case "year":
      return isWitaDateKeyInCurrentYear(rawDate);

    default:
      return isWitaDateKeyInCurrentMonth(rawDate);
  }
}

export default function PengajuanScreen() {
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [periodFilter, setPeriodFilter] =
    useState<PeriodFilter>("all");
  const currentDate =
    dateKeyToUtcDate(
      getWitaDateKey()
    );
  const [
    customFilter,
    setCustomFilter,
  ] =
    useState<CustomDateFilter>({
      month:
        currentDate.getUTCMonth() + 1,
      year:
        currentDate.getUTCFullYear(),
      day: null,
    });
  const [
    openCustomPicker,
    setOpenCustomPicker,
  ] =
    useState<CustomPickerKey | null>(
      null
    );

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * ============================================================
   * LOAD DATA PENGAJUAN
   * ============================================================
   */

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const profile =
        await getProfile();
      const employeeId =
        profile.user.employee?.id;

      const [leaveResult, wfhResult, overtimeResult] =
        await Promise.allSettled([
          getLeaveRequests({
            employee_id:
              employeeId,
          }),
          getWfhRequests({
            employee_id:
              employeeId,
          }),
          getOvertimeRequests({
            employee_id:
              employeeId,
          }),
        ]);

      const result: RequestItem[] = [];

      /**
       * --------------------------------------------------------
       * CUTI / LEAVE
       * --------------------------------------------------------
       */

      if (leaveResult.status === "fulfilled") {
        const leaveData =
          leaveResult.value?.data ?? [];

        leaveData.forEach(
          (item: ApiLeaveRequest) => {
            result.push({
              id: `leave-${item.id}`,
              type: mapLeaveType(item),
              status: mapStatus(item.status),
              title:
                item.leave_type?.name ||
                "Pengajuan Cuti",

              meta: formatDateRange(
                item.start_date,
                item.end_date
              ),

              days:
                item.total_days !== null &&
                item.total_days !== undefined
                  ? `${item.total_days} hari`
                  : "-",

              rawDate:
                item.start_date,

              createdAt:
                item.created_at ?? null,
            });
          }
        );
      } else {
        console.error(
          "LEAVE LOAD ERROR:",
          leaveResult.reason
        );
      }

      /**
       * --------------------------------------------------------
       * WFA / WFH
       * --------------------------------------------------------
       */

      if (wfhResult.status === "fulfilled") {
        const wfhData =
          wfhResult.value?.data ?? [];

        wfhData.forEach(
          (item: ApiWfhRequest) => {
            result.push({
              id: `wfh-${item.id}`,
              type: "WFA",
              status: mapStatus(item.status),
              title: "Work From Anywhere",

              meta: formatDateRange(
                item.start_date,
                item.end_date
              ),

              days:
                item.total_days !== null &&
                item.total_days !== undefined
                  ? `${item.total_days} hari`
                  : "-",

              rawDate:
                item.start_date,

              createdAt:
                item.created_at ?? null,
            });
          }
        );
      } else {
        console.error(
          "WFH LOAD ERROR:",
          wfhResult.reason
        );
      }

      /**
       * --------------------------------------------------------
       * LEMBUR
       * --------------------------------------------------------
       */

      if (overtimeResult.status === "fulfilled") {
        const overtimeData =
          overtimeResult.value?.data ?? [];

        overtimeData.forEach(
          (item: ApiOvertimeRequest) => {
            result.push({
              id: `overtime-${item.id}`,
              type: "Lembur",
              status: mapStatus(item.status),
              title: "Lembur",

              meta: formatDate(
                item.date
              ),

              days: formatOvertimeRange(
                item
              ),

              rawDate:
                item.date,

              createdAt:
                item.created_at ?? null,
            });
          }
        );
      } else {
        console.error(
          "OVERTIME LOAD ERROR:",
          overtimeResult.reason
        );
      }

      /**
       * Urutkan berdasarkan data terbaru.
       */

      result.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;

        return (
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
        );
      });

      setRequests(result);
    } catch (err) {
      console.error(
        "PENGAJUAN LOAD ERROR:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Gagal mengambil data pengajuan."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Reload setiap kali halaman Pengajuan
   * kembali dibuka.
   */

  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [loadRequests])
  );

  /**
   * ============================================================
   * FILTER
   * ============================================================
   */

  const filteredRequests = useMemo(() => {
    return requests.filter(
      (item) =>
        (activeFilter === "Semua" ||
          item.type === activeFilter) &&
        isInPeriod(
          item.rawDate,
          periodFilter,
          customFilter
        )
    );
  }, [
    activeFilter,
    customFilter,
    periodFilter,
    requests,
  ]);

  const requestGroups =
    useMemo(
      () =>
        groupRequests(
          filteredRequests
        ),
      [
        filteredRequests,
      ]
    );

  const customYearOptions =
    useMemo(() => {
      const currentYear =
        currentDate.getUTCFullYear();

      return Array.from(
        {
          length: 6,
        },
        (_, index) =>
          currentYear - index
      );
    }, [
      currentDate,
    ]);

  const customDayOptions =
    useMemo(
      () =>
        Array.from(
          {
            length: daysInMonth(
              customFilter.year,
              customFilter.month
            ),
          },
          (_, index) =>
            index + 1
        ),
      [
        customFilter.year,
        customFilter.month,
      ]
    );

  /**
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <MainScreen>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            Pengajuan
          </Text>

          <Text style={styles.subtitle}>
            Cuti, sakit, izin, WFA, lembur, dan perjadi
          </Text>
        </View>

        <Pressable
          style={styles.addButton}
          onPress={() =>
            router.push(
              "/(main)/pengajuan-baru"
            )
          }
        >
          <Ionicons
            name="add"
            size={17}
            color={Colors.white}
          />
          <Text style={styles.addText}>
            Baru
          </Text>
        </Pressable>
      </View>

      {/* FILTER */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {filters.map((item) => (
          <Pressable
            key={item}
            style={[
              styles.chip,
              activeFilter === item
                ? styles.activeChip
                : null,
            ]}
            onPress={() =>
              setActiveFilter(item)
            }
          >
            <Text
              style={[
                styles.chipText,
                activeFilter === item
                  ? styles.activeChipText
                  : null,
              ]}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={
          styles.periodTabs
        }
      >
        {periodFilters.map((item) => {
          const active =
            item.value === periodFilter;

          return (
            <Pressable
              key={item.value}
              style={[
                styles.periodTab,
                active
                  ? styles.periodTabActive
                  : null,
              ]}
              onPress={() => {
                setPeriodFilter(
                  item.value
                );
                setOpenCustomPicker(
                  null
                );
              }}
            >
              <Text
                style={[
                  styles.periodTabText,
                  active
                    ? styles.periodTabTextActive
                    : null,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {periodFilter === "custom" ? (
        <View style={styles.customFilterBox}>
          <View style={styles.customFilterRow}>
            <Pressable
              style={styles.customButton}
              onPress={() =>
                setOpenCustomPicker(
                  openCustomPicker ===
                    "month"
                    ? null
                    : "month"
                )
              }
            >
              <Text style={styles.customLabel}>
                Bulan
              </Text>
              <Text
                style={styles.customValue}
                numberOfLines={1}
              >
                {
                  monthOptions[
                    customFilter.month - 1
                  ]
                }
              </Text>
            </Pressable>

            <Pressable
              style={styles.customButton}
              onPress={() =>
                setOpenCustomPicker(
                  openCustomPicker ===
                    "year"
                    ? null
                    : "year"
                )
              }
            >
              <Text style={styles.customLabel}>
                Tahun
              </Text>
              <Text style={styles.customValue}>
                {customFilter.year}
              </Text>
            </Pressable>

            <Pressable
              style={styles.customButton}
              onPress={() =>
                setOpenCustomPicker(
                  openCustomPicker ===
                    "day"
                    ? null
                    : "day"
                )
              }
            >
              <Text style={styles.customLabel}>
                Tanggal
              </Text>
              <Text style={styles.customValue}>
                {customFilter.day ?? "Semua"}
              </Text>
            </Pressable>
          </View>

          {openCustomPicker ? (
            <View style={styles.customPanel}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={
                  false
                }
                contentContainerStyle={
                  styles.customOptions
                }
              >
                {openCustomPicker ===
                "month"
                  ? monthOptions.map(
                      (label, index) => {
                        const value =
                          index + 1;
                        const active =
                          customFilter.month ===
                          value;

                        return (
                          <Pressable
                            key={label}
                            style={[
                              styles.customOption,
                              active
                                ? styles.customOptionActive
                                : null,
                            ]}
                            onPress={() => {
                              setCustomFilter(
                                (current) => ({
                                  ...current,
                                  month:
                                    value,
                                  day:
                                    current.day &&
                                    current.day >
                                      daysInMonth(
                                        current.year,
                                        value
                                      )
                                      ? null
                                      : current.day,
                                })
                              );
                              setOpenCustomPicker(
                                null
                              );
                            }}
                          >
                            <Text
                              style={[
                                styles.customOptionText,
                                active
                                  ? styles.customOptionTextActive
                                  : null,
                              ]}
                            >
                              {label}
                            </Text>
                          </Pressable>
                        );
                      }
                    )
                  : null}

                {openCustomPicker ===
                "year"
                  ? customYearOptions.map(
                      (year) => {
                        const active =
                          customFilter.year ===
                          year;

                        return (
                          <Pressable
                            key={year}
                            style={[
                              styles.customOption,
                              active
                                ? styles.customOptionActive
                                : null,
                            ]}
                            onPress={() => {
                              setCustomFilter(
                                (current) => ({
                                  ...current,
                                  year,
                                  day:
                                    current.day &&
                                    current.day >
                                      daysInMonth(
                                        year,
                                        current.month
                                      )
                                      ? null
                                      : current.day,
                                })
                              );
                              setOpenCustomPicker(
                                null
                              );
                            }}
                          >
                            <Text
                              style={[
                                styles.customOptionText,
                                active
                                  ? styles.customOptionTextActive
                                  : null,
                              ]}
                            >
                              {year}
                            </Text>
                          </Pressable>
                        );
                      }
                    )
                  : null}

                {openCustomPicker ===
                "day" ? (
                  <>
                    <Pressable
                      style={[
                        styles.customOption,
                        customFilter.day === null
                          ? styles.customOptionActive
                          : null,
                      ]}
                      onPress={() => {
                        setCustomFilter(
                          (current) => ({
                            ...current,
                            day: null,
                          })
                        );
                        setOpenCustomPicker(
                          null
                        );
                      }}
                    >
                      <Text
                        style={[
                          styles.customOptionText,
                          customFilter.day === null
                            ? styles.customOptionTextActive
                            : null,
                        ]}
                      >
                        Semua
                      </Text>
                    </Pressable>

                    {customDayOptions.map(
                      (day) => {
                        const active =
                          customFilter.day ===
                          day;

                        return (
                          <Pressable
                            key={day}
                            style={[
                              styles.customOption,
                              active
                                ? styles.customOptionActive
                                : null,
                            ]}
                            onPress={() => {
                              setCustomFilter(
                                (current) => ({
                                  ...current,
                                  day,
                                })
                              );
                              setOpenCustomPicker(
                                null
                              );
                            }}
                          >
                            <Text
                              style={[
                                styles.customOptionText,
                                active
                                  ? styles.customOptionTextActive
                                  : null,
                              ]}
                            >
                              {day}
                            </Text>
                          </Pressable>
                        );
                      }
                    )}
                  </>
                ) : null}
              </ScrollView>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* LOADING */}
      {loading ? (
        <View style={styles.loadingBox}>
          <LoadingDots label="Memuat pengajuan" />
        </View>
      ) : null}

      {/* ERROR */}
      {!loading && error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            Gagal memuat pengajuan
          </Text>

          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={loadRequests}
          >
            <Text style={styles.retryText}>
              Coba Lagi
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* LIST */}
      {!loading && !error ? (
        <View style={styles.list}>
          {requestGroups.map(
            (group) => (
              <View
                key={group.key}
                style={styles.group}
              >
                <Text style={styles.groupLabel}>
                  {group.label}
                </Text>

                {group.items.map(
                  (item) => (
                    <View
                      key={item.id}
                      style={styles.card}
                    >
                      <View style={styles.cardTop}>
                        <Badge
                          label={item.type}
                          tone={
                            item.type === "Cuti"
                              ? "purple"
                              : item.type === "WFA"
                              ? "green"
                              : "blue"
                          }
                        />

                        <Badge
                          label={item.status}
                          tone={getStatusTone(
                            item.status
                          )}
                        />
                      </View>

                      <Text style={styles.cardTitle}>
                        {item.title}
                      </Text>

                      <View style={styles.createdRow}>
                        <Ionicons
                          name="time-outline"
                          size={14}
                          color="#8A94A6"
                        />
                        <Text style={styles.createdText}>
                          Dibuat{" "}
                          {formatCreatedAt(
                            item.createdAt
                          )}
                        </Text>
                      </View>

                      <Text style={styles.cardMeta}>
                        {item.meta} - {item.days}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )
          )}

          {/* EMPTY */}
          {filteredRequests.length ===
          0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Tidak ada pengajuan pada
                kategori ini
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {!loading &&
      !error &&
      filteredRequests.length >
        0 ? (
        <Text style={styles.footerText}>
          Menampilkan {filteredRequests.length} data pengajuan
        </Text>
      ) : null}
    </MainScreen>
  );
}

/**
 * ============================================================
 * HELPER
 * ============================================================
 */

function mapLeaveType(
  item: ApiLeaveRequest
) {
  const name =
    item.leave_type?.name
      ?.toLowerCase()
      .trim() ?? "";

  if (
    name.includes("sakit")
  ) {
    return "Sakit";
  }

  if (
    name.includes("izin")
  ) {
    return "Izin";
  }

  if (
    name.includes("dinas") ||
    name.includes("perjalanan")
  ) {
    return "Perjadi";
  }

  return "Cuti";
}

function mapStatus(
  status: string | null | undefined
) {
  const value =
    status
      ?.toLowerCase()
      .trim() ?? "";

  switch (value) {
    case "pending":
    case "diajukan":
    case "menunggu":
    case "waiting":
      return "Menunggu";

    case "diproses":
    case "proses":
      return "Diproses";

    case "approved":
    case "approve":
    case "disetujui":
    case "selesai":
      return "Disetujui";

    case "rejected":
    case "reject":
    case "ditolak":
      return "Ditolak";

    case "cancelled":
    case "canceled":
    case "dibatalkan":
      return "Dibatalkan";

    default:
      return status || "Menunggu";
  }
}

function getStatusTone(
  status: string
): "amber" | "green" | "blue" | "red" | "gray" {
  if (status === "Menunggu") {
    return "amber";
  }

  if (status === "Diproses") {
    return "blue";
  }

  if (status === "Disetujui") {
    return "green";
  }

  if (status === "Ditolak") {
    return "red";
  }

  if (status === "Dibatalkan") {
    return "gray";
  }

  return "blue";
}

function formatOvertimeRange(
  item: ApiOvertimeRequest
) {
  const start =
    item.planned_start_time?.slice(0, 5) ||
    "--:--";

  const end =
    item.planned_end_time?.slice(0, 5) ||
    "--:--";

  if (item.duration_minutes) {
    const hours = Math.floor(
      item.duration_minutes / 60
    );
    const minutes =
      item.duration_minutes % 60;

    return `${hours}j ${minutes}m`;
  }

  return `${start} - ${end}`;
}

function formatDate(
  date: string | null
) {
  if (!date) {
    return "-";
  }

  const value =
    new Date(`${date}T00:00:00`);

  if (
    Number.isNaN(value.getTime())
  ) {
    return date;
  }

  return formatWitaShortDate(value);
}

function formatCreatedAt(
  value: string | null
) {
  if (!value) {
    return "belum tersedia";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return `${formatWitaTime(date)} WITA`;
}

function formatDateRange(
  startDate: string | null,
  endDate: string | null
) {
  if (!startDate && !endDate) {
    return "Tanggal belum tersedia";
  }

  if (
    startDate &&
    endDate &&
    startDate !== endDate
  ) {
    return `${formatDate(
      startDate
    )} - ${formatDate(endDate)}`;
  }

  return formatDate(
    startDate || endDate
  );
}

/**
 * ============================================================
 * STYLES
 * ============================================================
 */

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerText: {
    flex: 1,
  },

  title: {
    color: Colors.textInk,
    fontSize: 20,
    fontWeight: "800",
  },

  subtitle: {
    color: "#7A8699",
    fontSize: 12.5,
    fontWeight: "600",
    marginTop: 3,
  },

  addButton: {
    height: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 11,
    paddingLeft: 12,
    paddingRight: 15,
    backgroundColor: Colors.background,
  },

  addText: {
    color: Colors.white,
    fontSize: 12.5,
    fontWeight: "800",
  },

  chips: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
  },

  chip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  activeChip: {
    backgroundColor: Colors.background,
    borderColor: Colors.background,
  },

  chipText: {
    color: Colors.textBody,
    fontSize: 12,
    fontWeight: "800",
  },

  activeChipText: {
    color: Colors.white,
  },

  periodTabs: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 8,
  },

  periodTab: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 84,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  periodTabActive: {
    backgroundColor: Colors.background,
    borderColor: Colors.background,
  },

  periodTabText: {
    color: Colors.textBody,
    fontSize: 12,
    fontWeight: "800",
  },

  periodTabTextActive: {
    color: Colors.white,
  },

  customFilterBox: {
    padding: 10,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  customFilterRow: {
    flexDirection: "row",
    gap: 8,
  },

  customButton: {
    flex: 1,
    minHeight: 54,
    justifyContent: "center",
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: "#F7F9FD",
    borderWidth: 1,
    borderColor: "#E6EBF3",
  },

  customLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    marginBottom: 3,
  },

  customValue: {
    color: Colors.textInk,
    fontSize: 12.5,
    fontWeight: "800",
  },

  customPanel: {
    marginTop: 9,
    paddingTop: 9,
    borderTopWidth: 1,
    borderTopColor: "#EEF1F6",
  },

  customOptions: {
    gap: 8,
    paddingRight: 8,
  },

  customOption: {
    minWidth: 46,
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F7F9FD",
    borderWidth: 1,
    borderColor: "#E6EBF3",
  },

  customOptionActive: {
    backgroundColor: Colors.background,
    borderColor: Colors.background,
  },

  customOptionText: {
    color: Colors.textBody,
    fontSize: 12,
    fontWeight: "800",
  },

  customOptionTextActive: {
    color: Colors.white,
  },

  loadingBox: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  list: {
    gap: 10,
  },

  group: {
    gap: 8,
  },

  groupLabel: {
    color: Colors.textInk,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 2,
    marginLeft: 2,
  },

  card: {
    gap: 9,
    padding: 15,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  cardTitle: {
    color: Colors.textInk,
    fontSize: 14.5,
    fontWeight: "800",
  },

  cardMeta: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "600",
  },

  createdRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: -2,
  },

  createdText: {
    color: "#8A94A6",
    fontSize: 11.5,
    fontWeight: "700",
  },

  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 30,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  stateText: {
    color: "#7A8699",
    fontSize: 13,
    fontWeight: "700",
  },

  errorBox: {
    gap: 8,
    padding: 16,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#F0D5D5",
  },

  errorTitle: {
    color: Colors.textInk,
    fontSize: 14,
    fontWeight: "800",
  },

  errorText: {
    color: "#B45353",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },

  retryButton: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: Colors.background,
  },

  retryText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
  },

  empty: {
    alignItems: "center",
    padding: 26,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  emptyText: {
    color: "#94A0B3",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },

  footerText: {
    color: "#8A94A6",
    fontSize: 10.5,
    fontWeight: "600",
    textAlign: "center",
  },
});
