import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import StatCard from "../../components/StatCard";
import { Colors } from "../../constants/colors";
import { usePrototype } from "../../contexts/PrototypeContext";

export default function RiwayatScreen() {
  const { attendanceHistory } = usePrototype();

  return (
    <MainScreen>
      <View style={styles.header}>
        <Text style={styles.title}>Riwayat Kehadiran</Text>
        <Text style={styles.subtitle}>Rekap presensi terverifikasi - Juni 2026</Text>
      </View>

      <View style={styles.summary}>
        <StatCard value="18" label="Hadir" />
        <StatCard value="2" label="Terlambat" />
        <StatCard value="4" label="Izin/WFH" />
        <StatCard value="0" label="Alpha" />
      </View>

      <View style={styles.list}>
        {attendanceHistory.map((row) => (
          <View key={`${row.day}-${row.date}`} style={styles.row}>
            <View style={styles.dateBox}>
              <Text style={styles.date}>{row.date}</Text>
              <Text style={styles.day}>{row.day}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.time}>{row.time}</Text>
              <Text style={styles.duration}>{row.duration}</Text>
              <View style={styles.badges}>
                <Badge label={row.mode} tone={row.mode === "WFH" ? "green" : "blue"} />
                <Badge label={row.status} tone={row.status === "Terlambat" ? "amber" : row.status === "Izin" ? "blue" : "green"} />
              </View>
            </View>
          </View>
        ))}
      </View>
    </MainScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
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
  },
  summary: {
    flexDirection: "row",
    gap: 8,
  },
  list: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  row: {
    flexDirection: "row",
    gap: 13,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F8",
  },
  dateBox: {
    width: 44,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    backgroundColor: "#EEF3FC",
  },
  date: {
    color: Colors.primaryDark,
    fontSize: 17,
    fontWeight: "800",
  },
  day: {
    color: Colors.textMuted,
    fontSize: 9,
    fontWeight: "800",
  },
  info: {
    flex: 1,
    gap: 5,
  },
  time: {
    color: Colors.textInk,
    fontSize: 14,
    fontWeight: "800",
  },
  duration: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "600",
  },
  badges: {
    flexDirection: "row",
    gap: 7,
  },
});
