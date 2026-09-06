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
  formatWitaShortDate,
  isWitaDateKeyInCurrentYear,
  isWitaDateKeyInCurrentMonth,
  isWitaDateKeyInCurrentWeek,
  isWitaDateKeyToday,
} from "../../constants/time";
import {
  SkeletonCard,
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

type PeriodFilter =
  | "all"
  | "today"
  | "week"
  | "month"
  | "year";

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
    label: "Minggu ini",
    value: "week",
  },
  {
    label: "Bulan ini",
    value: "month",
  },
  {
    label: "Tahun ini",
    value: "year",
  },
];

function isInPeriod(
  rawDate: string | null,
  period: PeriodFilter
) {
  switch (period) {
    case "all":
      return true;

    case "today":
      return isWitaDateKeyToday(rawDate);

    case "week":
      return isWitaDateKeyInCurrentWeek(rawDate);

    case "year":
      return isWitaDateKeyInCurrentYear(rawDate);

    default:
      return isWitaDateKeyInCurrentMonth(rawDate);
  }
}

export default function PengajuanScreen() {
  const [activeFilter, setActiveFilter] = useState("Semua");
  const [periodFilter, setPeriodFilter] =
    useState<PeriodFilter>("month");

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
          periodFilter
        )
    );
  }, [activeFilter, periodFilter, requests]);

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
      <View style={styles.chips}>
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
      </View>

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
              onPress={() =>
                setPeriodFilter(
                  item.value
                )
              }
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

      {/* LOADING */}
      {loading ? (
        <View style={styles.skeletonList}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
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
          {filteredRequests.map(
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

                <Text style={styles.cardMeta}>
                  {item.meta} - {item.days}
                </Text>
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
    flexWrap: "wrap",
    gap: 8,
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

  skeletonList: {
    gap: 10,
  },

  list: {
    gap: 10,
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
