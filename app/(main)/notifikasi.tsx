import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import { notifications } from "../../constants/mockData";

export default function NotifikasiScreen() {
  return (
    <MainScreen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Notifikasi</Text>
          <Text style={styles.subtitle}>Informasi dan pengingat presensi</Text>
        </View>
      </View>

      <View style={styles.list}>
        {notifications.map((item) => (
          <View key={`${item.title}-${item.time}`} style={styles.card}>
            <View style={[styles.icon, item.unread ? styles.iconUnread : null]}>
              <Text style={[styles.iconText, item.unread ? styles.iconTextUnread : null]}>!</Text>
            </View>
            <View style={styles.body}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                {item.unread ? <Badge label="Baru" tone="blue" /> : null}
              </View>
              <Text style={styles.desc}>{item.desc}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
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
});
