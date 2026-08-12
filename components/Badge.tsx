import React from "react";
import { StyleSheet, Text, View } from "react-native";

const toneColor = {
  blue: { color: "#1C4FB8", bg: "#E7EEFC" },
  green: { color: "#0F7A4A", bg: "#E7F6ED" },
  amber: { color: "#B45309", bg: "#FDF2DD" },
  purple: { color: "#7C3AED", bg: "#F0ECFD" },
  red: { color: "#B91C1C", bg: "#FDE8E8" },
  gray: { color: "#667085", bg: "#EEF1F6" },
};

interface BadgeProps {
  label: string;
  tone?: keyof typeof toneColor;
}

export default function Badge({ label, tone = "blue" }: BadgeProps) {
  const colors = toneColor[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.label, { color: colors.color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: {
    fontSize: 10.5,
    fontWeight: "800",
  },
});
