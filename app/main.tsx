import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import BerandaScreen from "../components/screens/BerandaScreen";
import PengajuanScreen from "../components/screens/PengajuanScreen";
import ProfilScreen from "../components/screens/ProfilScreen";
import RiwayatScreen from "../components/screens/RiwayatScreen";

type TabKey = "beranda" | "riwayat" | "pengajuan" | "profil";

export default function MainScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("beranda");

  return (
    <View className="flex-1 bg-white">
      {/* ===== KONTEN AKTIF SESUAI TAB ===== */}
      <View className="flex-1">
        {activeTab === "beranda" && <BerandaScreen />}
        {activeTab === "riwayat" && <RiwayatScreen />}
        {activeTab === "pengajuan" && <PengajuanScreen />}
        {activeTab === "profil" && <ProfilScreen />}
      </View>

      {/* ===== CUSTOM BOTTOM TAB BAR ===== */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex-row items-center justify-around pt-2 pb-6">
        <TabButton
          icon="home-outline"
          activeIcon="home"
          label="Beranda"
          isActive={activeTab === "beranda"}
          onPress={() => setActiveTab("beranda")}
        />
        <TabButton
          icon="time-outline"
          activeIcon="time"
          label="Riwayat"
          isActive={activeTab === "riwayat"}
          onPress={() => setActiveTab("riwayat")}
        />

        {/* Tombol tengah (Absen) — style beda, dibuat menonjol */}
        <Pressable
          onPress={() => {
            /* nanti panggil endpoint POST /presensi/masuk atau /pulang di sini */
          }}
          className="items-center -mt-8"
        >
          <View className="w-17 h-17 bg-blue-600 rounded-full items-center justify-center border-3 border-white shadow-md">
            <Ionicons name="scan-outline" size={25} color="white" />
            <Text className="text-white text-[10px] font-bold mt-1">ABSEN</Text>
          </View>
        </Pressable>

        <TabButton
          icon="document-text-outline"
          activeIcon="document-text"
          label="Pengajuan"
          isActive={activeTab === "pengajuan"}
          onPress={() => setActiveTab("pengajuan")}
        />
        <TabButton
          icon="person-outline"
          activeIcon="person"
          label="Profil"
          isActive={activeTab === "profil"}
          onPress={() => setActiveTab("profil")}
        />
      </View>
    </View>
  );
}

// ============================================================
// Tombol tab — dipisah biar tidak berulang-ulang nulis style yang sama
// ============================================================
function TabButton({
  icon,
  activeIcon,
  label,
  isActive,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="items-center">
      <Ionicons
        name={isActive ? activeIcon : icon}
        size={22}
        color={isActive ? "#2563eb" : "#9ca3af"}
      />
      <Text
        className={
          isActive
            ? "text-[10px] mt-1 text-blue-600 font-semibold"
            : "text-[10px] mt-1 text-gray-400"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
