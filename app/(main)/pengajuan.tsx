import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import { usePrototype } from "../../contexts/PrototypeContext";

const filters = ["Semua", "Izin", "Cuti", "Sakit", "WFH"];

export default function PengajuanScreen() {
  const [activeFilter, setActiveFilter] = useState("Semua");
  const { requests } = usePrototype();
  const filteredRequests = useMemo(
    () => requests.filter((item) => activeFilter === "Semua" || item.type === activeFilter),
    [activeFilter, requests]
  );

  return (
    <MainScreen>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Pengajuan</Text>
          <Text style={styles.subtitle}>Izin, cuti, WFH, dan dinas luar</Text>
        </View>
        <Pressable style={styles.addButton} onPress={() => router.push("/(main)/pengajuan-baru")}>
          <Text style={styles.addText}>Baru</Text>
        </Pressable>
      </View>

      <View style={styles.chips}>
        {filters.map((item) => (
          <Pressable key={item} style={[styles.chip, activeFilter === item ? styles.activeChip : null]} onPress={() => setActiveFilter(item)}>
            <Text style={[styles.chipText, activeFilter === item ? styles.activeChipText : null]}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.list}>
        {filteredRequests.map((item) => (
          <View key={`${item.title}-${item.meta}`} style={styles.card}>
            <View style={styles.cardTop}>
              <Badge label={item.type} tone={item.type === "Cuti" ? "purple" : item.type === "WFH" ? "green" : "blue"} />
              <Badge label={item.status} tone={item.status === "Menunggu" ? "amber" : "green"} />
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>{item.meta} - {item.days}</Text>
          </View>
        ))}
        {filteredRequests.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Tidak ada pengajuan pada kategori ini</Text>
          </View>
        ) : null}
      </View>
    </MainScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    marginTop: 3,
  },
  addButton: {
    height: 38,
    justifyContent: "center",
    borderRadius: 11,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
  },
  addText: {
    color: Colors.white,
    fontSize: 12.5,
    fontWeight: "800",
  },
  chips: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  activeChip: {
    backgroundColor: Colors.background,
    borderColor: Colors.background,
  },
  chipText: {
    color: Colors.textBody,
    fontSize: 12,
    fontWeight: "800",
  },
  activeChipText: {
    color: Colors.white,
  },
  list: {
    gap: 10,
  },
  card: {
    gap: 9,
    padding: 15,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    color: Colors.textInk,
    fontSize: 14.5,
    fontWeight: "800",
  },
  cardMeta: {
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
