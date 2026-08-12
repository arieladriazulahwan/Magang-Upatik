import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import { leaveBalances } from "../../constants/mockData";

export default function SaldoScreen() {
  return (
    <MainScreen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>{"<"}</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Saldo Cuti</Text>
          <Text style={styles.subtitle}>Hak cuti dan pemakaian tahun berjalan</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Cuti tahunan tersisa</Text>
        <View style={styles.heroValueRow}>
          <Text style={styles.heroValue}>14</Text>
          <Text style={styles.heroUnit}>hari tersisa</Text>
        </View>
        <View style={styles.bar}>
          <View style={styles.barUsed} />
          <View style={styles.barLeft} />
        </View>
        <Text style={styles.heroNote}>4 hari terpakai dari total 18 hari tersedia</Text>
      </View>

      <View style={styles.list}>
        {leaveBalances.map((item) => (
          <View key={item.name} style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Badge label={item.value} tone={item.tone as never} />
            </View>
            <Text style={styles.cardNote}>{item.note}</Text>
          </View>
        ))}
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
    fontSize: 20,
    fontWeight: "800",
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
  hero: {
    gap: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  heroLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  heroValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  heroValue: {
    color: Colors.white,
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 48,
  },
  heroUnit: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },
  bar: {
    height: 9,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  barUsed: {
    flex: 4,
    backgroundColor: Colors.warning,
  },
  barLeft: {
    flex: 14,
    backgroundColor: Colors.success,
  },
  heroNote: {
    color: Colors.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
  },
  list: {
    gap: 10,
  },
  card: {
    gap: 8,
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
    gap: 10,
  },
  cardTitle: {
    color: Colors.textInk,
    fontSize: 14.5,
    fontWeight: "800",
  },
  cardNote: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
});
