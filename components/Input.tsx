import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Colors } from "../constants/colors";

interface InputProps extends TextInputProps {
  label: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}

export default function Input({ label, icon, right, style, ...props }: InputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.field}>
        {icon ? <View style={styles.leftIcon}>{icon}</View> : null}
        <TextInput
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primarySoft}
          style={[
            styles.input,
            icon ? styles.withLeftIcon : null,
            right ? styles.withRightIcon : null,
            style,
          ]}
          {...props}
        />
        {right ? <View style={styles.rightIcon}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 7,
  },
  label: {
    color: "#8FB4E8",
    fontSize: 11.5,
    fontWeight: "700",
  },
  field: {
    position: "relative",
    justifyContent: "center",
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 15,
  },
  withLeftIcon: {
    paddingLeft: 44,
  },
  withRightIcon: {
    paddingRight: 46,
  },
  leftIcon: {
    position: "absolute",
    left: 15,
    zIndex: 2,
  },
  rightIcon: {
    position: "absolute",
    right: 12,
    zIndex: 2,
  },
});
