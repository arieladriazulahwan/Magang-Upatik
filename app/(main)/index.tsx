import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Path } from "react-native-svg";
import Avatar from "../../components/Avatar";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import StatCard from "../../components/StatCard";
import { Colors } from "../../constants/colors";
import { attendanceRows, me } from "../../constants/mockData";

const shortcuts = [
  { label: "Riwayat", route: "/(main)/riwayat", tone: "#1D4ED8" },
  { label: "Saldo Cuti", route: "/(main)/pengajuan", tone: "#0F766E" },
  { label: "Ajukan", route: "/(main)/pengajuan-baru", tone: "#7C3AED" },
  { label: "Presensi", route: "/(main)/presensi", tone: "#B45309" },
];

function BellIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" stroke={Colors.white} strokeWidth="1.8" fill="none" />
    </Svg>
  );
}

export default function BerandaScreen() {
  return (
    <MainScreen>
      <View style={styles.hero}>
        <View style={styles.topRow}>
          <View style={styles.identity}>
            <Avatar initials={me.initials} />
            <View style={styles.identityText}>
              <Text style={styles.greeting}>Selamat pagi</Text>
              <Text style={styles.name}>{me.greetingName}</Text>
            </View>
          </View>
          <Pressable style={styles.bell} onPress={() => router.push("/(main)/notifikasi")}>
            <BellIcon />
            <View style={styles.dot} />
          </Pressable>
        </View>

        <Text style={styles.role}>{me.role}</Text>
        <Badge label="WFO - Reguler" tone="blue" />

        <View style={styles.presenceCard}>
          <View>
            <Text style={styles.presenceTitle}>Anda belum absen masuk</Text>
            <Text style={styles.presenceSub}>Ketuk untuk memulai presensi hari ini</Text>
          </View>
          <Pressable style={styles.presenceButton} onPress={() => router.push("/(main)/presensi")}>
            <Text style={styles.presenceButtonText}>Absen Masuk</Text>
          </Pressable>
        </View>

        <View style={styles.timeRow}>
          <View>
            <Text style={styles.timeLabel}>Masuk</Text>
            <Text style={styles.timeValue}>--:--</Text>
          </View>
          <View>
            <Text style={styles.timeLabel}>Pulang</Text>
            <Text style={styles.timeValue}>--:--</Text>
          </View>
          <View>
            <Text style={styles.timeLabel}>Lokasi</Text>
            <Text style={styles.timeValue}>12 m</Text>
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <StatCard value="0j 0m" label="Jam kerja - min 4j" />
        <StatCard value="14" label="Sisa cuti tahunan" />
        <StatCard value="2" label="Pengajuan diproses" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Akses cepat</Text>
        <View style={styles.shortcuts}>
          {shortcuts.map((item) => (
            <Pressable key={item.label} style={styles.shortcut} onPress={() => router.push(item.route as never)}>
              <View style={[styles.shortcutIcon, { backgroundColor: `${item.tone}18` }]}>
                <Text style={[styles.shortcutInitial, { color: item.tone }]}>{item.label.slice(0, 1)}</Text>
              </View>
              <Text style={styles.shortcutLabel}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aktivitas terbaru</Text>
          <Pressable onPress={() => router.push("/(main)/riwayat")}>
            <Text style={styles.link}>Lihat semua</Text>
          </Pressable>
        </View>
        {attendanceRows.slice(0, 3).map((row) => (
          <View key={`${row.day}-${row.date}`} style={styles.activityRow}>
            <View style={styles.dateBox}>
              <Text style={styles.date}>{row.date}</Text>
              <Text style={styles.day}>{row.day}</Text>
            </View>
            <View style={styles.activityText}>
              <Text style={styles.activityTime}>{row.time}</Text>
              <Text style={styles.activityDuration}>{row.duration}</Text>
            </View>
            <Badge label={row.status} tone={row.status === "Terlambat" ? "amber" : "green"} />
          </View>
        ))}
      </View>
    </MainScreen>
  );
}

const styles = StyleSheet.create({
  hero: {
    gap: 14,
    padding: 18,
    borderRadius: 22,
    backgroundColor: Colors.background,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  identityText: {
    flex: 1,
  },
  greeting: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  name: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  bell: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  dot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.danger,
  },
  role: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  presenceCard: {
    gap: 12,
    padding: 15,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  presenceTitle: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "800",
  },
  presenceSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  presenceButton: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  presenceButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 2,
  },
  timeLabel: {
    color: Colors.textMuted,
    fontSize: 10.5,
    fontWeight: "700",
  },
  timeValue: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "800",
    marginTop: 3,
  },
  stats: {
    flexDirection: "row",
    gap: 10,
  },
  section: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: Colors.textInk,
    fontSize: 15,
    fontWeight: "800",
  },
  link: {
    color: Colors.primaryDark,
    fontSize: 11.5,
    fontWeight: "800",
  },
  shortcuts: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 16,
    marginTop: 16,
  },
  shortcut: {
    width: "25%",
    alignItems: "center",
    gap: 8,
  },
  shortcutIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  shortcutInitial: {
    fontSize: 17,
    fontWeight: "800",
  },
  shortcutLabel: {
    color: Colors.textBody,
    fontSize: 10.5,
    fontWeight: "700",
    textAlign: "center",
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 14,
  },
  dateBox: {
    width: 42,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#EEF3FC",
  },
  date: {
    color: Colors.primaryDark,
    fontSize: 16,
    fontWeight: "800",
  },
  day: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
  },
  activityText: {
    flex: 1,
  },
  activityTime: {
    color: Colors.textInk,
    fontSize: 13.5,
    fontWeight: "800",
  },
  activityDuration: {
    color: "#7A8699",
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 2,
  },
});
