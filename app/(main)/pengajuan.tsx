import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
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
  getLeaveRequests,
  getOvertimeRequests,
  getWfhRequests,
  ApiLeaveRequest,
  ApiOvertimeRequest,
  ApiWfhRequest,
} from "../../services/api";

const filters = ["Semua", "Izin", "Cuti", "Sakit", "WFH", "Lembur"];

type RequestItem = {
  id: string;
  type: string;
  status: string;
  title: string;
  meta: string;
  days: string;
  createdAt: string | null;
};

export default function PengajuanScreen() {
  const [activeFilter, setActiveFilter] = useState("Semua");

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

      const [leaveResult, wfhResult, overtimeResult] =
        await Promise.allSettled([
          getLeaveRequests(),
          getWfhRequests(),
          getOvertimeRequests(),
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
       * WFH
       * --------------------------------------------------------
       */

      if (wfhResult.status === "fulfilled") {
        const wfhData =
          wfhResult.value?.data ?? [];

        wfhData.forEach(
          (item: ApiWfhRequest) => {
            result.push({
              id: `wfh-${item.id}`,
              type: "WFH",
              status: mapStatus(item.status),
              title: "Work From Home",

              meta: formatDateRange(
                item.start_date,
                item.end_date
              ),

              days:
                item.total_days !== null &&
                item.total_days !== undefined
                  ? `${item.total_days} hari`
                  : "-",

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
    if (activeFilter === "Semua") {
      return requests;
    }

    return requests.filter(
      (item) =>
        item.type === activeFilter
    );
  }, [activeFilter, requests]);

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
            Izin, cuti, WFH, dan lembur
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

      {/* LOADING */}
      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator
            size="small"
            color={Colors.background}
          />

          <Text style={styles.stateText}>
            Memuat data pengajuan...
          </Text>
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
                        : item.type === "WFH"
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
    case "diproses":
    case "menunggu":
    case "waiting":
      return "Menunggu";

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

  return value.toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
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
});
