import React, { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import LogoMark from "../../components/LogoMark";
import { Colors } from "../../constants/colors";
import { AppConfig } from "../../constants/config";

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/login");
    }, 2600);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Pressable style={styles.container} onPress={() => router.replace("/login")}>
      <View style={styles.grid} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <View style={styles.content}>
        <LogoMark size={108} variant="scan" />
        <Text style={styles.title}>{AppConfig.name}</Text>
        <Text style={styles.subtitle}>{AppConfig.tagline}</Text>

        <View style={styles.university}>
          <View style={styles.line} />
          <Text style={styles.universityText}>{AppConfig.university}</Text>
          <View style={styles.line} />
        </View>
      </View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          <View style={styles.dot} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
        <Text style={styles.version}>
          Versi {AppConfig.version} - {AppConfig.ssoName}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: Colors.background,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    backgroundColor: Colors.backgroundMid,
  },
  glowTop: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(59,130,246,0.24)",
    top: -150,
    right: -120,
  },
  glowBottom: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(13,148,136,0.16)",
    bottom: -90,
    left: -110,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: -40,
  },
  title: {
    color: Colors.white,
    fontSize: 31,
    fontWeight: "800",
    marginTop: 30,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  university: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginTop: 20,
  },
  line: {
    width: 26,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  universityText: {
    color: "#8FB4E8",
    fontSize: 10.5,
    fontWeight: "700",
    letterSpacing: 2,
  },
  bottom: {
    position: "absolute",
    bottom: 46,
    alignItems: "center",
    gap: 16,
  },
  dots: {
    flexDirection: "row",
    gap: 7,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.primarySoft,
  },
  version: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
});
