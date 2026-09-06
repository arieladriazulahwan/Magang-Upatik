import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../constants/colors";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export default function Header({ title, subtitle }: HeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 2,
    backgroundColor: "transparent",
  },
  title: {
    color: Colors.textInk,
    fontSize: 16,
    fontWeight: "800",
  },
  subtitle: {
    color: "#7A8699",
    fontSize: 11.5,
    fontWeight: "500",
    marginTop: 2,
  },
});
