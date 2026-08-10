import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";

interface LogoMarkProps {
  size?: number;
  compact?: boolean;
  variant?: "text" | "scan";
}

export default function LogoMark({
  size = 108,
  compact = false,
  variant = "text",
}: LogoMarkProps) {
  const borderRadius = compact ? size * 0.3 : size * 0.28;

  return (
    <View
      style={[
        styles.mark,
        {
        width: size,
        height: size,
          borderRadius,
        },
      ]}
    >
      {variant === "scan" ? (
        <>
          <View
            style={[
              styles.faceGuide,
              {
                width: size * 0.61,
                height: size * 0.72,
                borderRadius: size * 0.3,
              },
            ]}
          />
          <Svg width={size * 0.48} height={size * 0.48} viewBox="0 0 24 24">
            <Circle cx="12" cy="9.5" r="4.2" stroke="#FFFFFF" strokeWidth="1.2" fill="none" />
            <Path d="M4.5 21a7.5 7.5 0 0 1 15 0" stroke="#FFFFFF" strokeWidth="1.2" fill="none" />
          </Svg>
          <View style={[styles.scanLine, { left: size * 0.12, right: size * 0.12 }]} />
        </>
      ) : (
        <Text style={[styles.text, { fontSize: size * 0.34 }]}>KP</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#2563EB",
    shadowColor: "#1D4ED8",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.45,
    shadowRadius: 40,
    elevation: 8,
  },
  text: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  faceGuide: {
    position: "absolute",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.55)",
  },
  scanLine: {
    position: "absolute",
    height: 2,
    backgroundColor: "#DBEAFE",
    top: "58%",
  },
});
