import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/colors";

interface StatCardProps {
  value: string;
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export default function StatCard({
  value,
  label,
  active,
  onPress,
}: StatCardProps) {
  const content =
    <View
      style={[
        styles.card,
        active ? styles.cardActive : null,
      ]}
    >
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>;

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      style={[
        styles.pressable,
        active ? styles.pressableActive : null,
      ]}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    flex: 1,
    borderRadius: 15,
  },
  pressableActive: {
    shadowColor: Colors.primaryDark,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 2,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 15,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.line,
    minHeight: 108,
  },
  cardActive: {
    borderColor: Colors.primaryDark,
    backgroundColor: "#E7EEFC",
  },
  value: {
    color: Colors.textInk,
    fontSize: 18,
    fontWeight: "800",
  },
  label: {
    color: "#7A8699",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },
});
