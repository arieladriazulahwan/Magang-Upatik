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
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import MainScreen from "../../components/MainScreen";
import { getAttendance, ApiAttendance } from "../../services/api";
import { Colors } from "../../constants/colors";
import Badge from "../../components/Badge";
import StatCard from "../../components/StatCard";

/* ============================================================
   TYPES
============================================================ */

type HistoryRow = {
  id: number;
  date: string;
  day: string;
  time: string;
  duration: string;
  mode: string;
  status: string;
};

/* ============================================================
   HELPERS
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
   FORMAT TIME
============================================================ */

function formatTime(
  value: string | null | undefined
) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString(
      "id-ID",
      {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }
    );
  }

  return value.slice(0, 5);
}

/* ============================================================
   FORMAT DATE
============================================================ */

function getDateInfo(
  value: string | null
) {
  if (!value) {
    return {
      date: "—",
      day: "—",
    };
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return {
      date: value.slice(-2),
      day: "—",
    };
  }

  return {
    date: date.toLocaleDateString(
      "id-ID",
      {
        day: "2-digit",
      }
    ),

    day: date
      .toLocaleDateString(
        "id-ID",
        {
          weekday: "short",
        }
      )
      .toUpperCase(),
  };
}

/* ============================================================
   FORMAT DURATION
============================================================ */

function formatDuration(
  minutes: number | null | undefined
) {
  if (
    minutes === null ||
    minutes === undefined
  ) {
    return "—";
  }

  const hours = Math.floor(
    minutes / 60
  );

  const mins =
    minutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  if (mins === 0) {
    return `${hours}j`;
  }

  return `${hours}j ${mins}m`;
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
   ATTENDANCE STATUS
============================================================ */

function mapAttendanceStatus(
  status: string | null | undefined
) {
  const normalized =
    normalizeStatus(
      status
    );

  if (
    normalized.includes(
      "terlambat"
    )
  ) {
    return "Terlambat";
  }

  if (
    normalized.includes(
      "izin"
    )
  ) {
    return "Izin";
  }

  if (
    normalized.includes(
      "alpha"
    ) ||
    normalized.includes(
      "tidakhadir"
    )
  ) {
    return "Alpha";
  }

  return "Hadir";
}

/* ============================================================
   API -> HISTORY ROW
============================================================ */

function toHistoryRow(
  item: ApiAttendance
): HistoryRow {
  const dateInfo =
    getDateInfo(
      item.date
    );

  const masuk =
    formatTime(
      item.check_in
    );

  const keluar =
    formatTime(
      item.check_out
    );

  return {
    id: item.id,

    date:
      dateInfo.date,

    day:
      dateInfo.day,

    time:
      `${masuk}  →  ${keluar}`,

    duration:
      formatDuration(
        item.duration_minutes
      ),

    mode:
      mapAttendanceMode(
        item.type
      ),

    status:
      mapAttendanceStatus(
        item.status
      ),
  };
}

/* ============================================================
   MAIN SCREEN
============================================================ */

export default function RiwayatScreen() {
  const [
    attendanceHistory,
    setAttendanceHistory,
  ] = useState<HistoryRow[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null
  );

  /* ==========================================================
     LOAD HISTORY
  ========================================================== */

  const loadHistory =
    useCallback(
      async () => {
        try {
          setError(null);

          const result =
            await getAttendance({
              per_page: 100,
            });

          const rows =
            (
              result.data ||
              []
            )
              .map(
                toHistoryRow
              )
              .sort(
                (a, b) =>
                  Number(b.id) -
                  Number(a.id)
              );

          setAttendanceHistory(
            rows
          );
        } catch (
          error
        ) {
          console.error(
            "RIWAYAT LOAD ERROR:",
            error
          );

          setError(
            error instanceof
              Error
              ? error.message
              : "Data riwayat gagal dimuat."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadHistory();
  }, [
    loadHistory,
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

        await loadHistory();

        setRefreshing(
          false
        );
      },
      [loadHistory]
    );

  /* ==========================================================
     STATISTICS
  ========================================================== */

  const statistics =
    useMemo(() => {
      let hadir = 0;
      let terlambat = 0;
      let izin = 0;
      let alpha = 0;

      attendanceHistory.forEach(
        (item) => {
          switch (
            item.status
          ) {
            case "Terlambat":
              terlambat++;
              break;

            case "Izin":
              izin++;
              break;

            case "Alpha":
              alpha++;
              break;

            default:
              hadir++;
              break;
          }
        }
      );

      return {
        hadir,
        terlambat,
        izin,
        alpha,
      };
    }, [
      attendanceHistory,
    ]);

  /* ==========================================================
     MONTH / PERIOD LABEL
  ========================================================== */

  const periodLabel =
    useMemo(() => {
      if (
        attendanceHistory.length ===
        0
      ) {
        return "Rekap presensi";
      }

      return "Rekap presensi";
    }, [
      attendanceHistory,
    ]);

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <MainScreen>
      <ScrollView
        showsVerticalScrollIndicator={
          false
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
              Colors.primary
            }
          />
        }
      >
        {/* ====================================================
            HEADER
        ==================================================== */}

        <View
          style={
            styles.header
          }
        >
          <View
            style={
              styles.headerTop
            }
          >
            <View
              style={
                styles.headerTitleContainer
              }
            >
              <Text
                style={
                  styles.title
                }
              >
                Riwayat Kehadiran
              </Text>

              <Text
                style={
                  styles.subtitle
                }
              >
                {periodLabel}
              </Text>
            </View>

            <Pressable
              style={
                styles.refreshButton
              }
              onPress={
                loadHistory
              }
            >
              <Ionicons
                name="refresh-outline"
                size={19}
                color={
                  Colors.primaryDark
                }
              />
            </Pressable>
          </View>
        </View>

        {/* ====================================================
            ERROR
        ==================================================== */}

        {error && (
          <Pressable
            style={
              styles.errorCard
            }
            onPress={
              loadHistory
            }
          >
            <View
              style={
                styles.errorIcon
              }
            >
              <Ionicons
                name="warning-outline"
                size={18}
                color="#dc2626"
              />
            </View>

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
                Gagal memuat riwayat
              </Text>

              <Text
                style={
                  styles.errorText
                }
                numberOfLines={
                  2
                }
              >
                {error}
              </Text>
            </View>

            <Ionicons
              name="refresh-outline"
              size={18}
              color={
                Colors.primary
              }
            />
          </Pressable>
        )}

        {/* ====================================================
            SUMMARY
        ==================================================== */}

        <View
          style={
            styles.summary
          }
        >
          <StatCard
            value={String(
              statistics.hadir
            )}
            label="Hadir"
          />

          <StatCard
            value={String(
              statistics.terlambat
            )}
            label="Terlambat"
          />

          <StatCard
            value={String(
              statistics.izin
            )}
            label="Izin"
          />

          <StatCard
            value={String(
              statistics.alpha
            )}
            label="Alpha"
          />
        </View>

        {/* ====================================================
            LIST
        ==================================================== */}

        <View
          style={
            styles.list
          }
        >
          {loading ? (
            <View
              style={
                styles.loadingBox
              }
            >
              <ActivityIndicator
                size="small"
                color={
                  Colors.primary
                }
              />

              <Text
                style={
                  styles.loadingText
                }
              >
                Memuat riwayat presensi...
              </Text>
            </View>
          ) : attendanceHistory.length ===
            0 ? (
            <View
              style={
                styles.emptyBox
              }
            >
              <View
                style={
                  styles.emptyIcon
                }
              >
                <Ionicons
                  name="calendar-clear-outline"
                  size={28}
                  color={
                    Colors.primary
                  }
                />
              </View>

              <Text
                style={
                  styles.emptyTitle
                }
              >
                Belum ada riwayat
              </Text>

              <Text
                style={
                  styles.emptyText
                }
              >
                Data presensi Anda akan
                muncul di halaman ini
                setelah melakukan
                presensi.
              </Text>
            </View>
          ) : (
            attendanceHistory.map(
              (
                row,
                index
              ) => (
                <View
                  key={
                    row.id
                  }
                  style={[
                    styles.row,
                    index !==
                      attendanceHistory.length -
                        1 &&
                      styles.rowBorder,
                  ]}
                >
                  {/* DATE */}

                  <View
                    style={
                      styles.dateBox
                    }
                  >
                    <Text
                      style={
                        styles.date
                      }
                    >
                      {
                        row.date
                      }
                    </Text>

                    <Text
                      style={
                        styles.day
                      }
                    >
                      {
                        row.day
                      }
                    </Text>
                  </View>

                  {/* INFO */}

                  <View
                    style={
                      styles.info
                    }
                  >
                    <Text
                      style={
                        styles.time
                      }
                    >
                      {
                        row.time
                      }
                    </Text>

                    <Text
                      style={
                        styles.duration
                      }
                    >
                      {
                        row.duration
                      }
                    </Text>

                    <View
                      style={
                        styles.badges
                      }
                    >
                      <Badge
                        label={
                          row.mode
                        }
                        tone={
                          row.mode ===
                          "WFH"
                            ? "green"
                            : "blue"
                        }
                      />

                      <Badge
                        label={
                          row.status
                        }
                        tone={
                          row.status ===
                          "Terlambat"
                            ? "amber"
                            : row.status ===
                              "Izin"
                            ? "blue"
                            : row.status ===
                              "Alpha"
                            ? "red"
                            : "green"
                        }
                      />
                    </View>
                  </View>
                </View>
              )
            )
          )}
        </View>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        {!loading &&
          attendanceHistory.length >
            0 && (
            <Text
              style={
                styles.footerText
              }
            >
              Menampilkan{" "}
              {
                attendanceHistory.length
              }{" "}
              data presensi
            </Text>
          )}

        <View
          style={
            styles.bottomSpacing
          }
        />
      </ScrollView>
    </MainScreen>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles =
  StyleSheet.create({
    header: {
      gap: 4,
    },

    headerTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    headerTitleContainer: {
      flex: 1,
    },

    title: {
      color:
        Colors.textInk,
      fontSize: 20,
      fontWeight:
        "800",
    },

    subtitle: {
      color:
        "#7A8699",
      fontSize: 12.5,
      fontWeight:
        "600",
      marginTop: 3,
    },

    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor:
        Colors.white,
      borderWidth: 1,
      borderColor:
        Colors.line,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    /* ========================================================
       ERROR
    ======================================================== */

    errorCard: {
      marginTop: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor:
        "#FDE8E8",
      borderWidth: 1,
      borderColor:
        "#F5C2C2",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
    },

    errorIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor:
        "#FBD5D5",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    errorContent: {
      flex: 1,
    },

    errorTitle: {
      color:
        Colors.textInk,
      fontSize: 12.5,
      fontWeight:
        "800",
    },

    errorText: {
      color:
        "#7A8699",
      fontSize: 10.5,
      marginTop: 2,
    },

    /* ========================================================
       SUMMARY
    ======================================================== */

    summary: {
      flexDirection:
        "row",
      gap: 8,
      marginTop: 14,
    },

    /* ========================================================
       LIST
    ======================================================== */

    list: {
      marginTop: 14,
      overflow:
        "hidden",
      borderRadius: 16,
      backgroundColor:
        Colors.white,
      borderWidth: 1,
      borderColor:
        Colors.line,
    },

    loadingBox: {
      minHeight: 180,
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 9,
    },

    loadingText: {
      color:
        "#7A8699",
      fontSize: 11.5,
      fontWeight:
        "600",
    },

    emptyBox: {
      minHeight: 220,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 30,
      paddingVertical: 30,
    },

    emptyIcon: {
      width: 60,
      height: 60,
      borderRadius: 18,
      backgroundColor:
        "#EEF3FC",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      marginTop: 12,
      color:
        Colors.textInk,
      fontSize: 14,
      fontWeight:
        "800",
    },

    emptyText: {
      marginTop: 5,
      color:
        "#7A8699",
      fontSize: 11.5,
      lineHeight: 17,
      textAlign:
        "center",
    },

    /* ========================================================
       ROW
    ======================================================== */

    row: {
      flexDirection:
        "row",
      gap: 13,
      padding: 14,
    },

    rowBorder: {
      borderBottomWidth: 1,
      borderBottomColor:
        "#F2F4F8",
    },

    dateBox: {
      width: 44,
      height: 50,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 13,
      backgroundColor:
        "#EEF3FC",
    },

    date: {
      color:
        Colors.primaryDark,
      fontSize: 17,
      fontWeight:
        "800",
    },

    day: {
      color:
        Colors.textMuted,
      fontSize: 9,
      fontWeight:
        "800",
      marginTop: 1,
    },

    info: {
      flex: 1,
      gap: 5,
      minWidth: 0,
    },

    time: {
      color:
        Colors.textInk,
      fontSize: 14,
      fontWeight:
        "800",
    },

    duration: {
      color:
        "#7A8699",
      fontSize: 12,
      fontWeight:
        "600",
    },

    badges: {
      flexDirection:
        "row",
      gap: 7,
      flexWrap:
        "wrap",
    },

    footerText: {
      color:
        "#8A94A6",
      fontSize: 10.5,
      fontWeight:
        "600",
      textAlign:
        "center",
      marginTop: 12,
    },

    bottomSpacing: {
      height: 20,
    },
  });