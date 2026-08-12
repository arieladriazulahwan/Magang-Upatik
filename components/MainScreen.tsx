import React from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { router, usePathname } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import { Colors } from "../constants/colors";
import { usePrototype } from "../contexts/PrototypeContext";

interface MainScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
}

const tabs = [
  { label: "Beranda", href: "/(main)", match: ["/"], icon: "home" },
  { label: "Riwayat", href: "/(main)/riwayat", match: ["/riwayat"], icon: "history" },
  { label: "Pengajuan", href: "/(main)/pengajuan", match: ["/pengajuan"], icon: "file" },
  { label: "Profil", href: "/(main)/profil", match: ["/profil"], icon: "user" },
];

function TabIcon({ name, color }: { name: string; color: string }) {
  if (name === "home") {
    return (
      <Svg width={23} height={23} viewBox="0 0 24 24">
        <Path d="M3 9.6l9-7 9 7V20a1 1 0 0 1-1 1h-5v-6.5h-6V21H4a1 1 0 0 1-1-1z" stroke={color} strokeWidth="1.95" fill="none" />
      </Svg>
    );
  }
  if (name === "history") {
    return (
      <Svg width={23} height={23} viewBox="0 0 24 24">
        <Path d="M3 3v5h5M3.05 13a9 9 0 1 0 2.6-6.4L3 8M12 7v5l4 2" stroke={color} strokeWidth="1.95" fill="none" />
      </Svg>
    );
  }
  if (name === "file") {
    return (
      <Svg width={23} height={23} viewBox="0 0 24 24">
        <Path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h4" stroke={color} strokeWidth="1.95" fill="none" />
      </Svg>
    );
  }
  return (
    <Svg width={23} height={23} viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.95" fill="none" />
      <Path d="M5 21a7 7 0 0 1 14 0" stroke={color} strokeWidth="1.95" fill="none" />
    </Svg>
  );
}

export default function MainScreen({ children, scroll = true }: MainScreenProps) {
  const pathname = usePathname();
  const { toast } = usePrototype();
  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={styles.staticContent}>{children}</View>
  );

  return (
    <SafeAreaView style={styles.root}>
      {content}
      {toast ? (
        <View style={styles.toast}>
          <View style={styles.toastDot} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
      <View style={styles.nav}>
        {tabs.map((tab) => {
          const active = tab.match.some((item) => pathname === item || pathname.endsWith(item));
          const color = active ? Colors.primaryDark : "#9AA5B6";
          return (
            <Pressable key={tab.label} style={styles.navItem} onPress={() => router.replace(tab.href as never)}>
              <TabIcon name={tab.icon} color={color} />
              <Text style={[styles.navLabel, { color }]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
  },
  scrollContent: {
    padding: 18,
    paddingTop: 18,
    paddingBottom: 96,
    gap: 14,
  },
  staticContent: {
    flex: 1,
    paddingBottom: 76,
  },
  nav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 74,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
  },
  toast: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 88,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    borderRadius: 13,
    backgroundColor: "#16223A",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 8,
  },
  toastDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  toastText: {
    color: Colors.white,
    fontSize: 12.5,
    fontWeight: "700",
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  navLabel: {
    fontSize: 9.5,
    fontWeight: "800",
  },
});
