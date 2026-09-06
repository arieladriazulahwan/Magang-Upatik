import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Colors } from "../constants/colors";

interface ButtonProps extends PressableProps {
  title: string;
  icon?: React.ReactNode;
  loading?: boolean;
  variant?: "primary" | "ghost" | "outline" | "danger";
  style?: StyleProp<ViewStyle>;
}

export default function Button({
  title,
  icon,
  loading = false,
  variant = "primary",
  disabled,
  style,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={
            variant === "danger"
              ? "#B91C1C"
              : Colors.white
          }
        />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            style={[
              styles.label,
              variant === "ghost"
                ? styles.ghostLabel
                : null,
              variant === "outline"
                ? styles.outlineLabel
                : null,
              variant === "danger"
                ? styles.dangerLabel
                : null,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
  },
  primary: {
    backgroundColor: Colors.primaryDark,
    shadowColor: Colors.primaryDark,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 26,
    elevation: 7,
  },
  ghost: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  outline: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  danger: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#F0C9C4",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.55,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  label: {
    color: Colors.white,
    fontSize: 14.5,
    fontWeight: "700",
  },
  ghostLabel: {
    color: "#E8F0FC",
    fontSize: 13.5,
  },
  outlineLabel: {
    color: Colors.textInk,
  },
  dangerLabel: {
    color: "#B91C1C",
  },
});
