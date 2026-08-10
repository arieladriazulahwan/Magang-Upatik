import React from "react";
import { StyleSheet, Text, View } from "react-native";
import AttendanceCard from "../../components/AttendanceCard";
import StatCard from "../../components/StatCard";
import { Colors } from "../../constants/colors";

export default function BerandaScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Selamat pagi, Pak Sutomo</Text>
      <AttendanceCard
        title="Anda belum absen masuk"
        subtitle="Ketuk menu Presensi untuk memulai presensi hari ini"
      />
      <View style={styles.stats}>
        <StatCard value="0j 0m" label="Jam kerja" />
        <StatCard value="14" label="Sisa cuti" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 14,
    padding: 18,
    paddingTop: 56,
    backgroundColor: Colors.surfaceMuted,
  },
  greeting: {
    color: Colors.textInk,
    fontSize: 18,
    fontWeight: "800",
  },
  stats: {
    flexDirection: "row",
    gap: 12,
  },
});
