import React, {
  useCallback,
  useMemo,
  useState,
} from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  router,
  useFocusEffect,
} from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import {
  formatWitaLongDate,
  getWitaDateKey,
  getWitaMonthStartKey,
  getWitaYearStartKey,
} from "../../constants/time";
import {
  NotificationItem,
  usePrototype,
} from "../../contexts/PrototypeContext";
import {
  LoadingDots,
} from "../../components/Skeleton";

type BadgeTone =
  | "blue"
  | "green"
  | "amber"
  | "purple"
  | "red"
  | "gray";

type NotificationAppearance = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  border: string;
  label: string;
  tone: BadgeTone;
};

type NotificationGroup = {
  key: string;
  label: string;
  items: NotificationItem[];
};

type TimeFilter =
  | "all"
  | "today"
  | "yesterday"
  | "week"
  | "last7"
  | "last30"
  | "month"
  | "year";

type ActivityFilter =
  | "all"
  | "attendance"
  | "request"
  | "approval";

type StatusFilter =
  | "all"
  | "unread"
  | "waiting"
  | "processing"
  | "approved"
  | "rejected"
  | "present"
  | "late"
  | "permit"
  | "absent"
  | "success"
  | "error";

type FilterKey =
  | "time"
  | "activity"
  | "status";

type NotificationFilters = {
  time: TimeFilter;
  activity: ActivityFilter;
  status: StatusFilter;
};

const FILTER_OPTIONS: {
  time: {
    label: string;
    value: TimeFilter;
  }[];
  activity: {
    label: string;
    value: ActivityFilter;
  }[];
  status: {
    label: string;
    value: StatusFilter;
  }[];
} = {
  time: [
    {
      label: "Semua waktu",
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
      label: "7 hari terakhir",
      value: "last7",
    },
    {
      label: "30 hari terakhir",
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
  ],
  activity: [
    {
      label: "Semua aktivitas",
      value: "all",
    },
    {
      label: "Presensi",
      value: "attendance",
    },
    {
      label: "Pengajuan",
      value: "request",
    },
    {
      label: "Persetujuan",
      value: "approval",
    },
  ],
  status: [
    {
      label: "Semua status",
      value: "all",
    },
    {
      label: "Belum dibaca",
      value: "unread",
    },
    {
      label: "Menunggu",
      value: "waiting",
    },
    {
      label: "Diproses",
      value: "processing",
    },
    {
      label: "Disetujui",
      value: "approved",
    },
    {
      label: "Ditolak",
      value: "rejected",
    },
    {
      label: "Hadir",
      value: "present",
    },
    {
      label: "Terlambat",
      value: "late",
    },
    {
      label: "Izin",
      value: "permit",
    },
    {
      label: "Alpa",
      value: "absent",
    },
    {
      label: "Berhasil",
      value: "success",
    },
    {
      label: "Gagal",
      value: "error",
    },
  ],
};

const FILTER_LABELS: {
  [K in FilterKey]: {
    title: string;
    options: {
      label: string;
      value: NotificationFilters[K];
    }[];
  };
} = {
  time: {
    title: "Waktu",
    options: FILTER_OPTIONS.time,
  },
  activity: {
    title: "Aktivitas",
    options: FILTER_OPTIONS.activity,
  },
  status: {
    title: "Status",
    options: FILTER_OPTIONS.status,
  },
};

function statusOptionsFor(
  activity: ActivityFilter
) {
  const base =
    FILTER_OPTIONS.status.filter(
      (item) =>
        item.value === "all" ||
        item.value === "unread"
    );

  if (activity === "attendance") {
    return [
      ...base,
      ...FILTER_OPTIONS.status.filter(
        (item) =>
          item.value ===
            "success" ||
          item.value === "error" ||
          item.value ===
            "present" ||
          item.value === "late" ||
          item.value === "permit" ||
          item.value === "absent"
      ),
    ];
  }

  if (
    activity === "request" ||
    activity === "approval"
  ) {
    return [
      ...base,
      ...FILTER_OPTIONS.status.filter(
        (item) =>
          [
            "waiting",
            "processing",
            "approved",
            "rejected",
            "success",
            "error",
          ].includes(item.value)
      ),
    ];
  }

  return FILTER_OPTIONS.status;
}

function filterOptionsFor(
  key: FilterKey,
  filters: NotificationFilters
) {
  if (key === "status") {
    return statusOptionsFor(
      filters.activity
    );
  }

  return FILTER_LABELS[key].options;
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

function notificationDateKey(
  item: NotificationItem
) {
  return getWitaDateKey(
    item.createdAt
      ? new Date(
          item.createdAt
        )
      : new Date()
  );
}

function notificationGroupLabel(
  key: string
) {
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

function groupNotifications(
  items: NotificationItem[]
): NotificationGroup[] {
  const groups = new Map<
    string,
    NotificationItem[]
  >();

  items.forEach((item) => {
    const key =
      notificationDateKey(item);

    groups.set(key, [
      ...(groups.get(key) ?? []),
      item,
    ]);
  });

  return Array.from(
    groups.entries()
  )
    .sort(
      ([a], [b]) =>
        b.localeCompare(a)
    )
    .map(([key, groupItems]) => ({
      key,
      label:
        notificationGroupLabel(key),
      items: groupItems,
    }));
}

function matchesFilters(
  item: NotificationItem,
  filters: NotificationFilters
) {
  if (
    filters.activity !== "all" &&
    item.category !==
      filters.activity
  ) {
    return false;
  }

  if (filters.time !== "all") {
    const key =
      notificationDateKey(item);
    const diff =
      diffDaysFromToday(
        key
      );

    if (
      filters.time === "today" &&
      diff !== 0
    ) {
      return false;
    }

    if (
      filters.time ===
        "yesterday" &&
      diff !== 1
    ) {
      return false;
    }

    if (
      filters.time === "week" &&
      !(diff >= 0 && diff < 7)
    ) {
      return false;
    }

    if (
      filters.time === "last7" &&
      !(diff >= 0 && diff <= 6)
    ) {
      return false;
    }

    if (
      filters.time === "last30" &&
      !(diff >= 0 && diff <= 29)
    ) {
      return false;
    }

    if (
      filters.time === "month" &&
      !(
        key >=
          getWitaMonthStartKey() &&
        key <= getWitaDateKey()
      )
    ) {
      return false;
    }

    if (
      filters.time === "year" &&
      !(
        key >=
          getWitaYearStartKey() &&
        key <= getWitaDateKey()
      )
    ) {
      return false;
    }
  }

  if (
    filters.status === "unread" &&
    !item.unread
  ) {
    return false;
  }

  if (filters.status === "waiting") {
    return item.status === "waiting";
  }

  if (filters.status === "processing") {
    return (
      item.status === "loading" ||
      item.status === "processing"
    );
  }

  if (filters.status === "approved") {
    return item.status === "approved";
  }

  if (filters.status === "rejected") {
    return item.status === "rejected";
  }

  if (filters.status === "present") {
    return item.status === "present";
  }

  if (filters.status === "late") {
    return item.status === "late";
  }

  if (filters.status === "permit") {
    return item.status === "permit";
  }

  if (filters.status === "absent") {
    return item.status === "absent";
  }

  if (filters.status === "success") {
    return item.status === "success";
  }

  if (filters.status === "error") {
    return item.status === "error";
  }

  return true;
}

function selectedLabel<K extends FilterKey>(
  key: K,
  value: NotificationFilters[K],
  filters: NotificationFilters
) {
  const options =
    filterOptionsFor(
      key,
      filters
    );

  return (
    options.find(
      (item) => item.value === value
    )?.label ?? FILTER_LABELS[key].title
  );
}

function baseAppearance(
  item: NotificationItem
): NotificationAppearance {
  switch (item.category) {
    case "attendance":
      return {
        icon: "finger-print-outline",
        color: "#1D4ED8",
        bg: "#E7EEFC",
        border: "#B9CDF3",
        label: "Presensi",
        tone: "blue",
      };

    case "request":
      return {
        icon: "document-text-outline",
        color: "#7C3AED",
        bg: "#F0ECFD",
        border: "#D6C8FA",
        label: "Pengajuan",
        tone: "purple",
      };

    case "approval":
      return {
        icon: "shield-checkmark-outline",
        color: "#0E7490",
        bg: "#E0F2F6",
        border: "#A9DCE7",
        label: "Persetujuan",
        tone: "blue",
      };

    default:
      return {
        icon: "notifications-outline",
        color: "#667085",
        bg: "#EEF1F6",
        border: Colors.line,
        label: item.unread ? "Baru" : "Info",
        tone: "gray",
      };
  }
}

function notificationAppearance(
  item: NotificationItem
): NotificationAppearance {
  const base =
    baseAppearance(item);

  switch (item.status) {
    case "loading":
      return {
        ...base,
        color: "#1D4ED8",
        bg: "#E7EEFC",
        border: "#B9CDF3",
        label: "Memproses",
        tone: "blue",
      };

    case "processing":
      return {
        ...base,
        color: "#1D4ED8",
        bg: "#E7EEFC",
        border: "#B9CDF3",
        label: "Diproses",
        tone: "blue",
      };

    case "waiting":
      return {
        ...base,
        color: "#B45309",
        bg: "#FDF2DD",
        border: "#F2D59E",
        label: "Menunggu",
        tone: "amber",
      };

    case "approved":
      return {
        ...base,
        color: "#0F7A4A",
        bg: "#E7F6ED",
        border: "#B9E3CB",
        label: "Disetujui",
        tone: "green",
      };

    case "success":
      return {
        ...base,
        color: "#0F7A4A",
        bg: "#E7F6ED",
        border: "#B9E3CB",
        label: "Berhasil",
        tone: "green",
      };

    case "rejected":
      return {
        ...base,
        color: "#B91C1C",
        bg: "#FDE8E8",
        border: "#F0C4C4",
        label: "Ditolak",
        tone: "red",
      };

    case "present":
      return {
        ...base,
        color: "#0F7A4A",
        bg: "#E7F6ED",
        border: "#B9E3CB",
        label: "Hadir",
        tone: "green",
      };

    case "late":
      return {
        ...base,
        color: "#B45309",
        bg: "#FDF2DD",
        border: "#F2D59E",
        label: "Terlambat",
        tone: "amber",
      };

    case "permit":
      return {
        ...base,
        color: "#1D4ED8",
        bg: "#E7EEFC",
        border: "#B9CDF3",
        label: "Izin",
        tone: "blue",
      };

    case "absent":
      return {
        ...base,
        color: "#B91C1C",
        bg: "#FDE8E8",
        border: "#F0C4C4",
        label: "Alpa",
        tone: "red",
      };

    case "error":
      return {
        ...base,
        color: "#B91C1C",
        bg: "#FDE8E8",
        border: "#F0C4C4",
        label: "Gagal",
        tone: "red",
      };

    default:
      return base;
  }
}

export default function NotifikasiScreen() {
  const {
    notifications,
    markNotificationRead,
    refreshData,
    syncing,
  } = usePrototype();
  const [
    filters,
    setFilters,
  ] =
    useState<NotificationFilters>({
      time: "all",
      activity: "all",
      status: "all",
    });
  const [
    openFilter,
    setOpenFilter,
  ] =
    useState<FilterKey | null>(
      null
    );
  const filteredNotifications =
    useMemo(
      () =>
        notifications.filter(
          (item) =>
            matchesFilters(
              item,
              filters
            )
        ),
      [
        notifications,
        filters,
      ]
    );
  const groups =
    groupNotifications(
      filteredNotifications
    );
  const showLoading =
    syncing &&
    notifications.length === 0;

  useFocusEffect(
    useCallback(
      () => {
        refreshData();
      },
      [refreshData]
    )
  );

  return (
    <MainScreen>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons
            name="chevron-back"
            size={23}
            color={Colors.textInk}
          />
        </Pressable>

        <View>
          <Text style={styles.title}>
            Notifikasi
          </Text>

          <Text style={styles.subtitle}>
            Aktivitas dan status terbaru
          </Text>
        </View>
      </View>

      <View style={styles.filterBox}>
        <View style={styles.filterRow}>
          {(
            [
              "time",
              "activity",
              "status",
            ] as FilterKey[]
          ).map((key) => {
            const active =
              openFilter === key;

            return (
              <Pressable
                key={key}
                style={[
                  styles.dropdownButton,
                  active
                    ? styles.dropdownButtonActive
                    : null,
                ]}
                onPress={() =>
                  setOpenFilter(
                    active ? null : key
                  )
                }
              >
                <View style={styles.dropdownTextBox}>
                  <Text style={styles.dropdownLabel}>
                    {FILTER_LABELS[key].title}
                  </Text>

                  <Text
                    style={styles.dropdownValue}
                    numberOfLines={1}
                  >
                    {selectedLabel(
                      key,
                      filters[key],
                      filters
                    )}
                  </Text>
                </View>

                <Ionicons
                  name={
                    active
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={16}
                  color={
                    active
                      ? Colors.primaryDark
                      : "#94A0B3"
                  }
                />
              </Pressable>
            );
          })}
        </View>

        {openFilter ? (
          <View style={styles.dropdownPanel}>
            {filterOptionsFor(
              openFilter,
              filters
            ).map((item) => {
              const active =
                filters[openFilter] ===
                item.value;

              return (
                <Pressable
                  key={item.value}
                  style={[
                    styles.dropdownOption,
                    active
                      ? styles.dropdownOptionActive
                      : null,
                  ]}
                  onPress={() => {
                    setFilters(
                      (current) => {
                        const next = {
                          ...current,
                          [openFilter]:
                            item.value,
                        };

                        if (
                          openFilter ===
                          "activity"
                        ) {
                          const validStatuses =
                            statusOptionsFor(
                              item.value as ActivityFilter
                            ).map(
                              (option) =>
                                option.value
                            );

                          if (
                            !validStatuses.includes(
                              next.status
                            )
                          ) {
                            next.status =
                              "all";
                          }
                        }

                        return next;
                      }
                    );
                    setOpenFilter(null);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      active
                        ? styles.dropdownOptionTextActive
                        : null,
                    ]}
                  >
                    {item.label}
                  </Text>

                  {active ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={
                        Colors.primaryDark
                      }
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.list}>
        {showLoading ? (
          <View style={styles.loadingBox}>
            <LoadingDots label="Memuat notifikasi" />
          </View>
        ) : filteredNotifications.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="checkmark-done-outline"
                size={26}
                color="#2E8B57"
              />
            </View>

            <Text style={styles.emptyTitle}>
              {notifications.length === 0
                ? "Tidak ada notifikasi"
                : "Tidak ada data"}
            </Text>

            <Text style={styles.emptyDesc}>
              {notifications.length === 0
                ? "Semua informasi terbaru akan muncul di sini."
                : "Tidak ada notifikasi untuk filter ini."}
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <View
              key={group.key}
              style={styles.group}
            >
              <Text style={styles.groupTitle}>
                {group.label}
              </Text>

              {group.items.map((item) => {
                const appearance =
                  notificationAppearance(
                    item
                  );

                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.card,
                      {
                        borderColor:
                          appearance.border,
                      },
                    ]}
                    onPress={() =>
                      markNotificationRead(
                        item.id
                      )
                    }
                  >
                    <View
                      style={[
                        styles.icon,
                        {
                          backgroundColor:
                            appearance.bg,
                        },
                      ]}
                    >
                      <Ionicons
                        name={appearance.icon}
                        size={22}
                        color={
                          appearance.color
                        }
                      />
                    </View>

                    <View style={styles.body}>
                      <View style={styles.cardTop}>
                        <Text
                          style={styles.cardTitle}
                        >
                          {item.title}
                        </Text>

                        <Badge
                          label={
                            appearance.label
                          }
                          tone={
                            appearance.tone
                          }
                        />
                      </View>

                      <Text style={styles.desc}>
                        {item.desc}
                      </Text>

                      <View style={styles.footerRow}>
                        <Text style={styles.time}>
                          {item.time}
                        </Text>

                        {item.unread ? (
                          <View
                            style={[
                              styles.unreadDot,
                              {
                                backgroundColor:
                                  appearance.color,
                              },
                            ]}
                          />
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </View>
    </MainScreen>
  );
}

const styles =
  StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },

    back: {
      width: 38,
      height: 38,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 12,
      backgroundColor: Colors.white,
      borderWidth: 1,
      borderColor: Colors.line,
    },

    title: {
      color: Colors.textInk,
      fontSize: 20,
      fontWeight: "800",
    },

    subtitle: {
      color: "#7A8699",
      fontSize: 12,
      fontWeight: "600",
    },

    filterBox: {
      gap: 8,
    },

    filterRow: {
      flexDirection: "row",
      gap: 8,
    },

    dropdownButton: {
      flex: 1,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: Colors.white,
      borderWidth: 1,
      borderColor: Colors.line,
    },

    dropdownButtonActive: {
      backgroundColor: "#E7EEFC",
      borderColor: "#B9CDF3",
    },

    dropdownTextBox: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },

    dropdownLabel: {
      color: "#7A8699",
      fontSize: 10,
      fontWeight: "800",
    },

    dropdownValue: {
      color: Colors.textInk,
      fontSize: 12,
      fontWeight: "800",
    },

    dropdownPanel: {
      padding: 6,
      borderRadius: 12,
      backgroundColor: Colors.white,
      borderWidth: 1,
      borderColor: Colors.line,
      gap: 4,
    },

    dropdownOption: {
      minHeight: 38,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 10,
      borderRadius: 9,
    },

    dropdownOptionActive: {
      backgroundColor: "#E7EEFC",
    },

    dropdownOptionText: {
      color: "#667085",
      fontSize: 12,
      fontWeight: "800",
    },

    dropdownOptionTextActive: {
      color: Colors.primaryDark,
    },

    list: {
      gap: 10,
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

    group: {
      gap: 9,
    },

    groupTitle: {
      color: "#667085",
      fontSize: 12,
      fontWeight: "800",
      marginTop: 4,
      paddingHorizontal: 2,
    },

    card: {
      flexDirection: "row",
      gap: 12,
      padding: 14,
      borderRadius: 15,
      backgroundColor: Colors.white,
      borderWidth: 1,
    },

    icon: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
    },

    body: {
      flex: 1,
      gap: 5,
    },

    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
    },

    cardTitle: {
      flex: 1,
      color: Colors.textInk,
      fontSize: 13.5,
      fontWeight: "800",
    },

    desc: {
      color: "#7A8699",
      fontSize: 12,
      fontWeight: "600",
      lineHeight: 17,
    },

    footerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 1,
    },

    time: {
      color: "#94A0B3",
      fontSize: 11,
      fontWeight: "700",
    },

    unreadDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },

    empty: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 50,
      paddingHorizontal: 30,
    },

    emptyIcon: {
      width: 50,
      height: 50,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 25,
      backgroundColor: "#E7F6EC",
      marginBottom: 12,
    },

    emptyTitle: {
      color: Colors.textInk,
      fontSize: 15,
      fontWeight: "800",
      marginBottom: 5,
    },

    emptyDesc: {
      color: "#7A8699",
      fontSize: 12,
      fontWeight: "600",
      textAlign: "center",
      lineHeight: 18,
    },
  });
