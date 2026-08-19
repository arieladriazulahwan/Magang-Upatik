import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import {
  NotificationStatus,
  usePrototype,
} from "../../contexts/PrototypeContext";

export default function NotifikasiScreen() {
  const {
    notifications,
    markNotificationRead,
  } = usePrototype();

  /**
   * Menentukan icon berdasarkan status notifikasi.
   */
  const getStatusIcon = (status?: NotificationStatus) => {
    switch (status) {
      case "loading":
        return "⏳";

      case "success":
        return "✓";

      case "error":
        return "✕";

      default:
        return "!";
    }
  };

  /**
   * Menentukan style icon berdasarkan status.
   */
  const getStatusIconStyle = (
    status?: NotificationStatus
  ) => {
    switch (status) {
      case "loading":
        return styles.iconLoading;

      case "success":
        return styles.iconSuccess;

      case "error":
        return styles.iconError;

      default:
        return null;
    }
  };

  /**
   * Menentukan warna teks icon.
   */
  const getStatusIconTextStyle = (
    status?: NotificationStatus
  ) => {
    switch (status) {
      case "loading":
        return styles.iconTextLoading;

      case "success":
        return styles.iconTextSuccess;

      case "error":
        return styles.iconTextError;

      default:
        return null;
    }
  };

  /**
   * Badge berdasarkan status.
   */
  const renderStatusBadge = (
    status?: NotificationStatus,
    unread?: boolean
  ) => {
    if (status === "loading") {
      return <Badge label="Memproses" tone="blue" />;
    }

    if (status === "success") {
      return <Badge label="Berhasil" tone="blue" />;
    }

    if (status === "error") {
      return <Badge label="Gagal" tone="blue" />;
    }

    if (unread) {
      return <Badge label="Baru" tone="blue" />;
    }

    return null;
  };

  return (
    <MainScreen>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
        >
          <Text style={styles.backText}>{"<"}</Text>
        </Pressable>

        <View>
          <Text style={styles.title}>
            Notifikasi
          </Text>

          <Text style={styles.subtitle}>
            Informasi dan pengingat presensi
          </Text>
        </View>
      </View>

      {/* LIST NOTIFIKASI */}
      <View style={styles.list}>
        {notifications.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>
              ✓
            </Text>

            <Text style={styles.emptyTitle}>
              Tidak ada notifikasi
            </Text>

            <Text style={styles.emptyDesc}>
              Semua informasi terbaru akan muncul di sini.
            </Text>
          </View>
        ) : (
          notifications.map((item) => (
            <Pressable
              key={item.id}
              style={[
                styles.card,
                item.status === "loading"
                  ? styles.cardLoading
                  : null,
                item.status === "error"
                  ? styles.cardError
                  : null,
              ]}
              onPress={() =>
                markNotificationRead(item.id)
              }
            >
              {/* ICON */}
              <View
                style={[
                  styles.icon,
                  item.unread
                    ? styles.iconUnread
                    : null,
                  getStatusIconStyle(item.status),
                ]}
              >
                <Text
                  style={[
                    styles.iconText,
                    item.unread
                      ? styles.iconTextUnread
                      : null,
                    getStatusIconTextStyle(
                      item.status
                    ),
                  ]}
                >
                  {getStatusIcon(item.status)}
                </Text>
              </View>

              {/* BODY */}
              <View style={styles.body}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle}>
                    {item.title}
                  </Text>

                  {renderStatusBadge(
                    item.status,
                    item.unread
                  )}
                </View>

                <Text style={styles.desc}>
                  {item.desc}
                </Text>

                <Text style={styles.time}>
                  {item.time}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </View>
    </MainScreen>
  );
}

const styles = StyleSheet.create({
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

  backText: {
    color: Colors.textInk,
    fontSize: 31,
    lineHeight: 33,
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
    borderColor: Colors.line,
  },

  /**
   * Sedikit penanda visual ketika
   * proses sedang berlangsung.
   */
  cardLoading: {
    borderColor: "#B9CDF3",
  },

  /**
   * Penanda visual ketika proses gagal.
   */
  cardError: {
    borderColor: "#F0C4C4",
  },

  icon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: "#EEF1F6",
  },

  iconUnread: {
    backgroundColor: "#E7EEFC",
  },

  /**
   * LOADING
   */
  iconLoading: {
    backgroundColor: "#E7EEFC",
  },

  iconTextLoading: {
    color: Colors.primaryDark,
    fontSize: 18,
    fontWeight: "800",
  },

  /**
   * SUCCESS
   */
  iconSuccess: {
    backgroundColor: "#E7F6EC",
  },

  iconTextSuccess: {
    color: "#2E8B57",
    fontSize: 20,
    fontWeight: "900",
  },

  /**
   * ERROR
   */
  iconError: {
    backgroundColor: "#FCE8E8",
  },

  iconTextError: {
    color: "#D64545",
    fontSize: 19,
    fontWeight: "900",
  },

  iconText: {
    color: "#94A0B3",
    fontSize: 18,
    fontWeight: "800",
  },

  iconTextUnread: {
    color: Colors.primaryDark,
  },

  body: {
    flex: 1,
    gap: 4,
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

  time: {
    color: "#94A0B3",
    fontSize: 11,
    fontWeight: "700",
  },

  /**
   * EMPTY STATE
   */
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 50,
    height: 50,
    textAlign: "center",
    textAlignVertical: "center",
    borderRadius: 25,
    backgroundColor: "#E7F6EC",
    color: "#2E8B57",
    fontSize: 25,
    fontWeight: "900",
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