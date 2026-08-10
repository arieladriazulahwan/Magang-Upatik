import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/colors";

interface AttendanceCardProps {
  title: string;
  subtitle: string;
}

export default function AttendanceCard({ title, subtitle }: AttendanceCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    padding: 18,
  },
  title: {
    color: Colors.white,
    fontSize: 17,
    fontWeight: "800",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 5,
  },
});
