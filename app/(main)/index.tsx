import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

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

export default function MainScreen() {
  const [sudahMasuk, setSudahMasuk] = useState(false);
  const [sudahPulang, setSudahPulang] = useState(false);

  const user = {
    initials: "TU",
    name: "Test User",
    role: "Pegawai",
  };

  const notifCount = 7;

  const today = useMemo(() => {
    const date = new Date();

    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }, []);

  const handleAbsen = () => {
    if (!sudahMasuk) {
      router.push("/(main)/presensi");
      return;
    }

    if (!sudahPulang) {
      router.push("/(main)/presensi");
      return;
    }
  };

  const handleShortcut = (route: string) => {
    router.push(route as any);
  };

  const shortcuts: Shortcut[] = [
    {
      label: "Riwayat",
      icon: "time-outline",
      color: COLORS.blue,
      bg: "#e7eefc",
      route: "/(main)/riwayat",
    },
    {
      label: "Saldo Cuti",
      icon: "calendar-outline",
      color: COLORS.green,
      bg: COLORS.greenLight,
      route: "/(main)/saldo-cuti",
    },
    {
      label: "Ajukan",
      icon: "document-text-outline",
      color: COLORS.purple,
      bg: COLORS.purpleLight,
      route: "/(main)/pengajuan",
    },
    {
      label: "Lembur",
      icon: "time-outline",
      color: COLORS.orange,
      bg: COLORS.orangeLight,
      route: "/(main)/lembur",
    },
    {
      label: "WFH",
      icon: "home-outline",
      color: COLORS.cyan,
      bg: COLORS.cyanLight,
      route: "/(main)/pengajuan",
    },
    {
      label: "Sakit",
      icon: "medkit-outline",
      color: "#be123c",
      bg: COLORS.redLight,
      route: "/(main)/pengajuan",
    },
    {
      label: "Persetujuan",
      icon: "checkmark-done-outline",
      color: COLORS.blue,
      bg: "#e7eefc",
      route: "/(main)/persetujuan",
    },
    {
      label: "Notifikasi",
      icon: "notifications-outline",
      color: "#48536a",
      bg: "#eceff4",
      route: "/(main)/notifikasi",
    },
  ];

  const activities: Activity[] = [
    {
      date: "30",
      day: "SEN",
      masuk: "07:38",
      keluar: "16:10",
      duration: "8j 32m",
      mode: "WFO",
      status: "Hadir",
      statusColor: "#0f7a4a",
      statusBg: "#e7f6ed",
    },
    {
      date: "27",
      day: "JUM",
      masuk: "07:51",
      keluar: "15:40",
      duration: "7j 49m",
      mode: "WFO",
      status: "Hadir",
      statusColor: "#0f7a4a",
      statusBg: "#e7f6ed",
    },
    {
      date: "26",
      day: "KAM",
      masuk: "08:12",
      keluar: "16:05",
      duration: "7j 53m",
      mode: "WFO",
      status: "Terlambat",
      statusColor: COLORS.orange,
      statusBg: COLORS.orangeLight,
    },
  ];

  let attendanceTitle = "Anda belum absen masuk";
  let attendanceSubtitle = "Ketuk untuk memulai presensi hari ini";
  let attendanceButton = "Absen Masuk";

  if (sudahMasuk && !sudahPulang) {
    attendanceTitle = "Sudah absen masuk";
    attendanceSubtitle = "Jangan lupa absen pulang sebelum 17.00";
    attendanceButton = "Absen Pulang";
  }

  if (sudahMasuk && sudahPulang) {
    attendanceTitle = "Presensi hari ini selesai";
    attendanceSubtitle = "Terima kasih, sampai jumpa besok";
    attendanceButton = "";
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={COLORS.background}
      />

      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ================= HEADER ================= */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.initials}</Text>
            </View>

            <View style={styles.headerText}>
              <Text style={styles.greeting}>Selamat datang,</Text>

              <Text
                style={styles.userName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user.name}
              </Text>
            </View>

            <Pressable
              style={styles.notificationButton}
              onPress={() => router.push("/(main)/notifikasi")}
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color="#48536a"
              />

              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {notifCount}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* ================= HERO ABSEN ================= */}
          <View style={styles.heroCard}>
            <View style={styles.heroGrid} />
            <View style={styles.heroGlow} />

            <View style={styles.heroTop}>
              <Text style={styles.heroDate}>{today}</Text>

              <View style={styles.modeChip}>
                <View style={styles.modeDot} />

                <Text style={styles.modeText}>
                  WFO · Reguler
                </Text>
              </View>
            </View>

            <View style={styles.heroTitleContainer}>
              <Text style={styles.heroTitle}>
                {attendanceTitle}
              </Text>

              <Text style={styles.heroSubtitle}>
                {attendanceSubtitle}
              </Text>
            </View>

            {/* Jam masuk & pulang */}
            {sudahMasuk && (
              <View style={styles.attendanceTimes}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>MASUK</Text>

                  <Text style={styles.timeValue}>
                    07:42
                  </Text>
                </View>

                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>PULANG</Text>

                  <Text
                    style={[
                      styles.timeValue,
                      !sudahPulang && styles.timeDisabled,
                    ]}
                  >
                    {sudahPulang ? "16:10" : "—"}
                  </Text>
                </View>
              </View>
            )}

            {/* Geofence */}
            <View style={styles.locationStatus}>
              <Ionicons
                name="location-outline"
                size={17}
                color="#6ee7b7"
              />

              <Text style={styles.locationText}>
                Dalam radius · Gd. Dekanat FATEK{" "}
                <Text style={styles.distanceText}>
                  · 12 m
                </Text>
              </Text>
            </View>

            {/* Tombol absen */}
            {!sudahPulang && (
              <Pressable
                style={({ pressed }) => [
                  styles.attendanceButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleAbsen}
              >
                <Ionicons
                  name="scan-outline"
                  size={21}
                  color="#fff"
                />

                <Text style={styles.attendanceButtonText}>
                  {attendanceButton}
                </Text>
              </Pressable>
            )}
          </View>

          {/* ================= STATISTICS ================= */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons
                name="time-outline"
                size={19}
                color={COLORS.blue}
              />

              <Text style={styles.statValue}>
                {sudahMasuk ? "4j 18m" : "0j 0m"}
              </Text>

              <Text style={styles.statLabel}>
                Jam kerja · min 4j
              </Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons
                name="calendar-outline"
                size={19}
                color={COLORS.green}
              />

              <Text style={styles.statValue}>
                14
              </Text>

              <Text style={styles.statLabel}>
                Sisa cuti tahunan
              </Text>
            </View>

            <View style={styles.statCard}>
              <Ionicons
                name="document-text-outline"
                size={19}
                color={COLORS.orange}
              />

              <Text style={styles.statValue}>
                2
              </Text>

              <Text style={styles.statLabel}>
                Pengajuan diproses
              </Text>
            </View>
          </View>

          {/* ================= PERSETUJUAN ================= */}
          <Pressable
            style={styles.approvalCard}
            onPress={() => router.push("/(main)/persetujuan")}
          >
            <View style={styles.approvalIcon}>
              <Ionicons
                name="checkmark-done-outline"
                size={22}
                color={COLORS.blue}
              />
            </View>

            <View style={styles.approvalContent}>
              <Text style={styles.approvalTitle}>
                Persetujuan menunggu Anda
              </Text>

              <Text style={styles.approvalSubtitle}>
                Sebagai {user.role} · ketuk untuk meninjau
              </Text>
            </View>

            <View style={styles.approvalBadge}>
              <Text style={styles.approvalBadgeText}>
                3
              </Text>
            </View>
          </Pressable>

          {/* ================= AKSES CEPAT ================= */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Akses Cepat
            </Text>
          </View>

          <View style={styles.shortcutGrid}>
            {shortcuts.map((item) => (
              <Pressable
                key={item.label}
                style={({ pressed }) => [
                  styles.shortcutCard,
                  pressed && styles.shortcutPressed,
                ]}
                onPress={() => handleShortcut(item.route)}
              >
                <View
                  style={[
                    styles.shortcutIcon,
                    { backgroundColor: item.bg },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={item.color}
                  />
                </View>

                <Text style={styles.shortcutText}>
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ================= AKTIVITAS TERAKHIR ================= */}
          <View style={styles.activityHeader}>
            <Text style={styles.sectionTitle}>
              Aktivitas Terakhir
            </Text>

            <Pressable
              onPress={() => router.push("/(main)/riwayat")}
            >
              <Text style={styles.seeAll}>
                Lihat semua
              </Text>
            </Pressable>
          </View>

          <View style={styles.activityContainer}>
            {activities.map((activity, index) => (
              <View
                key={`${activity.date}-${activity.day}`}
                style={[
                  styles.activityRow,
                  index !== activities.length - 1 &&
                    styles.activityRowBorder,
                ]}
              >
                <View
                  style={[
                    styles.dateBox,
                    {
                      backgroundColor: "#eef3fc",
                    },
                  ]}
                >
                  <Text style={styles.dateNumber}>
                    {activity.date}
                  </Text>

                  <Text style={styles.dateDay}>
                    {activity.day}
                  </Text>
                </View>

                <View style={styles.activityInfo}>
                  <Text style={styles.activityTime}>
                    {activity.masuk}
                    <Text style={styles.arrow}>
                      {"  →  "}
                    </Text>
                    {activity.keluar}
                  </Text>

                  <Text style={styles.activityDetail}>
                    {activity.duration} · {activity.mode}
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
                    {activity.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* ================= BOTTOM NAVIGATION ================= */}
        <View style={styles.bottomNav}>
          <BottomNavItem
            icon="home"
            label="Beranda"
            active
            onPress={() => router.replace("/(main)")}
          />

          <BottomNavItem
            icon="time-outline"
            label="Riwayat"
            onPress={() =>
              router.push("/(main)/riwayat")
            }
          />

          <BottomNavItem
            icon="document-text-outline"
            label="Pengajuan"
            onPress={() =>
              router.push("/(main)/pengajuan")
            }
          />

          <BottomNavItem
            icon="person-outline"
            label="Profil"
            onPress={() =>
              router.push("/(main)/profil")
            }
          />
        </View>

        {/* Home indicator */}
        <View style={styles.gestureArea}>
          <View style={styles.gesturePill} />
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ============================================================
   BOTTOM NAV ITEM
============================================================ */

type BottomNavItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active?: boolean;
  onPress: () => void;
};

function BottomNavItem({
  icon,
  label,
  active = false,
  onPress,
}: BottomNavItemProps) {
  return (
    <Pressable
      style={styles.bottomNavItem}
      onPress={onPress}
    >
      <Ionicons
        name={icon}
        size={23}
        color={active ? COLORS.blue : "#9aa5b6"}
      />

      <Text
        style={[
          styles.bottomNavLabel,
          {
            color: active
              ? COLORS.blue
              : "#9aa5b6",
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingTop: 4,
    paddingBottom: 10,
  },

  /* ================= HEADER ================= */

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },

  avatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.navy,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
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
    color: COLORS.textSecondary,
    fontWeight: "600",
  },

  userName: {
    marginTop: 1,
    fontSize: 15.5,
    color: COLORS.text,
    fontWeight: "800",
  },

  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: COLORS.red,
    borderWidth: 2,
    borderColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  /* ================= HERO ================= */

  heroCard: {
    marginHorizontal: 16,
    marginTop: 6,
    borderRadius: 22,
    backgroundColor: COLORS.navy,
    padding: 18,
    paddingBottom: 19,
    overflow: "hidden",
    shadowColor: COLORS.navy,
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },

  heroGrid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.08,
  },

  heroGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59,130,246,0.25)",
    top: -90,
    right: -60,
  },

  heroTop: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  heroDate: {
    color: "#a8c4e6",
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },

  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.12)",
  },

  modeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6ee7b7",
  },

  modeText: {
    color: "#cfe0f5",
    fontSize: 10.5,
    fontWeight: "700",
  },

  heroTitleContainer: {
    marginTop: 14,
  },

  heroTitle: {
    color: "#fff",
    fontSize: 18.5,
    fontWeight: "800",
  },

  heroSubtitle: {
    color: "#a8c4e6",
    fontSize: 12,
    fontWeight: "500",
    marginTop: 3,
  },

  attendanceTimes: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },

  timeBox: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  timeLabel: {
    color: "#8fb4e8",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  timeValue: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
    marginTop: 2,
  },

  timeDisabled: {
    color: "#5d80ad",
  },

  locationStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 11,
    backgroundColor: "rgba(52,211,153,0.12)",
    borderWidth: 1,
    borderColor: "rgba(52,211,153,0.22)",
  },

  locationText: {
    flex: 1,
    color: "#d7f3e6",
    fontSize: 11.5,
    fontWeight: "600",
    lineHeight: 16,
  },

  distanceText: {
    color: "#6ee7b7",
    fontWeight: "700",
  },

  attendanceButton: {
    height: 50,
    marginTop: 15,
    borderRadius: 15,
    backgroundColor: COLORS.blue,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: COLORS.blue,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },

  attendanceButtonText: {
    color: "#fff",
    fontSize: 14.5,
    fontWeight: "700",
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },

  /* ================= STATISTICS ================= */

  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 13,
  },

  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 11,
    minHeight: 108,
  },

  statValue: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 9,
  },

  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 10.5,
    fontWeight: "600",
    lineHeight: 14,
    marginTop: 4,
  },

  /* ================= APPROVAL ================= */

  approvalCard: {
    width: "auto",
    marginHorizontal: 16,
    marginTop: 13,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#f6f9ff",
    borderWidth: 1,
    borderColor: "#d9e2f3",
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },

  approvalIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#e7eefc",
    alignItems: "center",
    justifyContent: "center",
  },

  approvalContent: {
    flex: 1,
    minWidth: 0,
  },

  approvalTitle: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: "800",
  },

  approvalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 11.5,
    fontWeight: "500",
    marginTop: 2,
  },

  approvalBadge: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: COLORS.red,
    alignItems: "center",
    justifyContent: "center",
  },

  approvalBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "800",
  },

  /* ================= SECTION ================= */

  sectionHeader: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 2,
  },

  sectionTitle: {
    color: COLORS.text,
    fontSize: 13.5,
    fontWeight: "800",
  },

  /* ================= SHORTCUT ================= */

  shortcutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 9,
  },

  shortcutCard: {
    width: "23.4%",
    minHeight: 92,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 15,
    paddingHorizontal: 5,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  shortcutPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.97 }],
  },

  shortcutIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  shortcutText: {
    marginTop: 7,
    color: "#2b3650",
    fontSize: 10.5,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 13,
  },

  /* ================= ACTIVITY ================= */

  activityHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 2,
  },

  seeAll: {
    color: COLORS.blue,
    fontSize: 11.5,
    fontWeight: "700",
  },

  activityContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    overflow: "hidden",
  },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },

  activityRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f2f4f8",
  },

  dateBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  dateNumber: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: "800",
  },

  dateDay: {
    color: COLORS.blue,
    fontSize: 8,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 1,
  },

  activityInfo: {
    flex: 1,
    minWidth: 0,
  },

  activityTime: {
    color: COLORS.text,
    fontSize: 12.5,
    fontWeight: "700",
  },

  arrow: {
    color: "#c2c9d6",
  },

  activityDetail: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },

  bottomSpacing: {
    height: 20,
  },

  /* ================= BOTTOM NAV ================= */

  bottomNav: {
    height: 64,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: "#e7ebf3",
    paddingHorizontal: 14,
    paddingTop: 9,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  bottomNavItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },

  bottomNavLabel: {
    fontSize: 9.5,
    fontWeight: "700",
  },

  gestureArea: {
    height: 26,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
  },

  gesturePill: {
    width: 120,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#16223a",
  },
});