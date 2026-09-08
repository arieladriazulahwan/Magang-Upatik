import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
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
import {
  getAttendance,
  getProfile,
  ApiAttendance,
} from "../../services/api";
import { Colors } from "../../constants/colors";
import {
  formatWitaDay,
  formatWitaLongDate,
  formatWitaShortDate,
  formatWitaShortWeekday,
  formatWitaTime,
  getWitaDateKey,
  getWitaMonthStartKey,
  getWitaWeekRangeKeys,
  getWitaYearStartKey,
  isWitaDateKeyInCurrentYear,
  isWitaDateKeyInCurrentMonth,
  isWitaDateKeyInCurrentWeek,
  isWitaDateKeyToday,
} from "../../constants/time";
import Badge from "../../components/Badge";
import StatCard from "../../components/StatCard";
import {
  LoadingDots,
} from "../../components/Skeleton";

/* ============================================================
   TYPES
============================================================ */

type HistoryRow = {
  id: number;
  rawDate: string | null;
  date: string;
  day: string;
  dateLabel: string;
  time: string;
  duration: string;
  mode: string;
  status: string;
};

type AttendanceStatusFilter =
  | "all"
  | "Hadir"
  | "Terlambat"
  | "Izin"
  | "Alpha";

const LIVE_REFRESH_INTERVAL_MS =
  15000;

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
   FORMAT DATE
============================================================ */

function getDateInfo(
  value: string | null
) {
  if (!value) {
    return {
      date: "--",
      day: "--",
    };
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (Number.isNaN(date.getTime())) {
    return {
      date: value.slice(-2),
      day: "--",
    };
  }

  return {
    date: formatWitaDay(date),

    day: formatWitaShortWeekday(date)
      .toUpperCase(),
  };
}

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

function shiftDateKey(
  key: string,
  days: number
) {
  const date =
    dateKeyToUtcDate(key);

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return `${date.getUTCFullYear()}-${String(
    date.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
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

function shortDateFromKey(
  key: string
) {
  return formatWitaShortDate(
    new Date(`${key}T12:00:00+08:00`)
  );
}

function longDateFromKey(
  key: string
) {
  return formatWitaLongDate(
    new Date(`${key}T12:00:00+08:00`)
  );
}

function historyDateLabel(
  rawDate: string | null
) {
  if (!rawDate) {
    return "Tanggal tidak tersedia";
  }

  const diff =
    diffDaysFromToday(rawDate);

  if (diff === 0) {
    return "Hari ini";
  }

  if (diff === 1) {
    return "Kemarin";
  }

  if (diff > 1 && diff < 7) {
    return dateKeyToUtcDate(
      rawDate
    ).toLocaleDateString(
      "id-ID",
      {
        weekday: "long",
        timeZone: "UTC",
      }
    );
  }

  return longDateFromKey(rawDate);
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

    const monthPrefix =
      `${customFilter.year}-${String(
        customFilter.month
      ).padStart(2, "0")}`;

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
    return "--";
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
      return "WFA";

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
    formatWitaTime(
      item.check_in
    );

  const keluar =
    formatWitaTime(
      item.check_out
    );

  return {
    id: item.id,
    rawDate: item.date,

    date:
      dateInfo.date,

    day:
      dateInfo.day,

    dateLabel:
      historyDateLabel(
        item.date
      ),

    time:
      `${masuk} -> ${keluar}`,

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

  const [
    periodFilter,
    setPeriodFilter,
  ] = useState<PeriodFilter>(
    "all"
  );
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

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<AttendanceStatusFilter>(
      "all"
    );

  const periodHistory =
    useMemo(
      () =>
        attendanceHistory.filter(
          (item) =>
            isInPeriod(
              item.rawDate,
              periodFilter,
              customFilter
            )
        ),
      [
        attendanceHistory,
        periodFilter,
        customFilter,
      ]
    );

  const filteredHistory =
    useMemo(
      () => {
        if (
          statusFilter === "all"
        ) {
          return periodHistory;
        }

        return periodHistory.filter(
          (item) =>
            item.status ===
            statusFilter
        );
      },
      [
        periodHistory,
        statusFilter,
      ]
    );

  /* ==========================================================
     LOAD HISTORY
  ========================================================== */

  const loadHistory =
    useCallback(
      async () => {
        try {
          setError(null);

          const profile =
            await getProfile();
          const employeeId =
            profile.user.employee?.id;

          const result =
            await getAttendance({
              employee_id:
                employeeId,

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

    const intervalId =
      setInterval(() => {
        void loadHistory();
      }, LIVE_REFRESH_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
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

      periodHistory.forEach(
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
      periodHistory,
    ]);

  /* ==========================================================
     MONTH / PERIOD LABEL
  ========================================================== */

  const periodLabel =
    useMemo(() => {
      const todayKey =
        getWitaDateKey();

      switch (periodFilter) {
        case "all":
          return "Rekap seluruh presensi";

        case "today":
          return `Hari ini, ${shortDateFromKey(
            todayKey
          )}`;

        case "yesterday": {
          const yesterdayKey =
            shiftDateKey(
              todayKey,
              -1
            );

          return `Kemarin, ${shortDateFromKey(
            yesterdayKey
          )}`;
        }

        case "week": {
          const range =
            getWitaWeekRangeKeys();

          return `${shortDateFromKey(
            range.start
          )} - ${shortDateFromKey(
            range.end
          )}`;
        }

        case "last7": {
          const start =
            shiftDateKey(
              todayKey,
              -6
            );

          return `${shortDateFromKey(
            start
          )} - ${shortDateFromKey(
            todayKey
          )}`;
        }

        case "last30": {
          const start =
            shiftDateKey(
              todayKey,
              -29
            );

          return `${shortDateFromKey(
            start
          )} - ${shortDateFromKey(
            todayKey
          )}`;
        }

        case "year":
          return `${shortDateFromKey(
            getWitaYearStartKey()
          )} - ${shortDateFromKey(
            todayKey
          )}`;

        case "custom":
          if (customFilter.day) {
            return longDateFromKey(
              buildDateKey(
                customFilter.year,
                customFilter.month,
                customFilter.day
              )
            );
          }

          return `${
            monthOptions[
              customFilter.month - 1
            ]
          } ${customFilter.year}`;

        default:
          return `${shortDateFromKey(
            getWitaMonthStartKey()
          )} - ${shortDateFromKey(
            todayKey
          )}`;
      }
    }, [
      periodFilter,
      customFilter,
    ]);

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
                  {customFilter.day ??
                    "Semua"}
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
            active={
              statusFilter ===
              "Hadir"
            }
            onPress={() =>
              setStatusFilter(
                statusFilter ===
                  "Hadir"
                  ? "all"
                  : "Hadir"
              )
            }
          />

          <StatCard
            value={String(
              statistics.terlambat
            )}
            label="Terlambat"
            active={
              statusFilter ===
              "Terlambat"
            }
            onPress={() =>
              setStatusFilter(
                statusFilter ===
                  "Terlambat"
                  ? "all"
                  : "Terlambat"
              )
            }
          />

          <StatCard
            value={String(
              statistics.izin
            )}
            label="Izin"
            active={
              statusFilter ===
              "Izin"
            }
            onPress={() =>
              setStatusFilter(
                statusFilter ===
                  "Izin"
                  ? "all"
                  : "Izin"
              )
            }
          />

          <StatCard
            value={String(
              statistics.alpha
            )}
            label="Alpha"
            active={
              statusFilter ===
              "Alpha"
            }
            onPress={() =>
              setStatusFilter(
                statusFilter ===
                  "Alpha"
                  ? "all"
                  : "Alpha"
              )
            }
          />
        </View>

        {statusFilter !== "all" ? (
          <Pressable
            style={styles.activeStatus}
            onPress={() =>
              setStatusFilter(
                "all"
              )
            }
          >
            <Text
              style={
                styles.activeStatusText
              }
            >
              Filter status: {statusFilter}
            </Text>

            <Ionicons
              name="close"
              size={16}
              color={
                Colors.primaryDark
              }
            />
          </Pressable>
        ) : null}

        {/* ====================================================
            LIST
        ==================================================== */}

        <View
          style={
            styles.list
          }
        >
          {loading ? (
            <View style={styles.loadingBox}>
              <LoadingDots label="Memuat riwayat" />
            </View>
          ) : filteredHistory.length ===
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
            filteredHistory.map(
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
                      filteredHistory.length -
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
                        styles.dateLabel
                      }
                    >
                      {
                        row.dateLabel
                      }
                    </Text>

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
                          "WFA"
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
          filteredHistory.length >
            0 && (
            <Text
              style={
                styles.footerText
              }
            >
              Menampilkan{" "}
              {
                filteredHistory.length
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

    periodTabs: {
      flexDirection: "row",
      gap: 8,
      marginTop: 12,
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
      marginTop: 10,
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

    activeStatus: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 10,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 9,
      backgroundColor: "#E7EEFC",
      borderWidth: 1,
      borderColor: "#B9CDF3",
    },

    activeStatusText: {
      color: Colors.primaryDark,
      fontSize: 11.5,
      fontWeight: "800",
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

    emptyBox: {
      minHeight: 220,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 30,
      paddingVertical: 30,
    },

    loadingBox: {
      minHeight: 170,
      alignItems:
        "center",
      justifyContent:
        "center",
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

    dateLabel: {
      color: "#667085",
      fontSize: 11,
      fontWeight: "800",
      marginBottom: 1,
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
