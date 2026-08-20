import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import { usePrototype } from "../../contexts/PrototypeContext";

export default function LemburScreen() {
  const { overtimeRequests } = usePrototype();

  const pendingCount =
    overtimeRequests.filter(
      (item) => item.status === "Menunggu"
    ).length;

  return (
    <MainScreen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>{"<"}</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Lembur</Text>
          <Text style={styles.subtitle}>Rencana dan realisasi lembur</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Lembur menunggu persetujuan</Text>
        <Text style={styles.summaryValue}>{pendingCount} pengajuan</Text>
      </View>

      {overtimeRequests.map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.date}>{item.date}</Text>
            <Badge
              label={item.status}
              tone={
                item.status === "Menunggu"
                  ? "amber"
                  : item.status === "Ditolak"
                  ? "red"
                  : "green"
              }
            />
          </View>
          <Text style={styles.time}>{item.time} - {item.duration}</Text>
          <Text style={styles.desc}>{item.desc}</Text>
        </View>
      ))}

      {overtimeRequests.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Belum ada pengajuan lembur</Text>
        </View>
      ) : null}
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
  summaryCard: {
    gap: 5,
    padding: 16,
    borderRadius: 17,
    backgroundColor: "#FDF2DD",
  },
  summaryLabel: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#78350F",
    fontSize: 20,
    fontWeight: "800",
  },
  card: {
    gap: 7,
    padding: 15,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  date: {
    color: Colors.textInk,
    fontSize: 14.5,
    fontWeight: "800",
  },
  time: {
    color: Colors.textBody,
    fontSize: 12.5,
    fontWeight: "800",
  },
  desc: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    padding: 26,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  emptyText: {
    color: "#94A0B3",
    fontSize: 13,
    fontWeight: "700",
  },
});
