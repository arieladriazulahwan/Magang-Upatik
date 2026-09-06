import React from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import {
  NotificationItem,
  usePrototype,
} from "../../contexts/PrototypeContext";

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
  } = usePrototype();

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

      <View style={styles.list}>
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="checkmark-done-outline"
                size={26}
                color="#2E8B57"
              />
            </View>

            <Text style={styles.emptyTitle}>
              Tidak ada notifikasi
            </Text>

            <Text style={styles.emptyDesc}>
              Semua informasi terbaru akan muncul di sini.
            </Text>
          </View>
        ) : (
          notifications.map((item) => {
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
          })
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

    list: {
      gap: 10,
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
