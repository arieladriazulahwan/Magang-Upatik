import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import Svg, { Defs, Path, Pattern, Rect } from "react-native-svg";
import {
  mockAbsenMasuk,
  mockAbsenPulang,
  mockGetDashboardSummary,
  mockGetPresensiToday,
} from "../../services/mockApi";

type DashboardSummary = {
  kuotaCuti: number;
  jamKerjaBulanIni: string;
  pengajuanDiproses: number;
};

type PresensiToday = {
  sudahAbsenMasuk: boolean;
  jamMasuk: string | null;
  sudahAbsenPulang: boolean;
  jamPulang: string | null;
};

const GRID_SIZE = 38;

function GridBackground() {
  return (
    <Svg
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100%",
      }}
    >
      <Defs>
        <Pattern
          id="grid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <Path
            d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={2}
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#grid)" />
    </Svg>
  );
}

export default function BerandaScreen() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [presensi, setPresensi] = useState<PresensiToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [absenLoading, setAbsenLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // dua request "sekaligus" — persis pola yang dipakai nanti dengan API asli
      const [summaryData, presensiData] = await Promise.all([
        mockGetDashboardSummary(),
        mockGetPresensiToday(),
      ]);

      setSummary(summaryData);
      setPresensi(presensiData);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAbsen() {
    setAbsenLoading(true);
    try {
      if (!presensi?.sudahAbsenMasuk) {
        const result = await mockAbsenMasuk();
        setPresensi((prev) =>
          prev
            ? { ...prev, sudahAbsenMasuk: true, jamMasuk: result.jamMasuk }
            : prev,
        );
      } else if (!presensi?.sudahAbsenPulang) {
        const result = await mockAbsenPulang();
        setPresensi((prev) =>
          prev
            ? { ...prev, sudahAbsenPulang: true, jamPulang: result.jamPulang }
            : prev,
        );
      }
    } catch (err: any) {
      setError(err.message || "Gagal melakukan presensi");
    } finally {
      setAbsenLoading(false);
    }
  }

  // ===== STATE: LOADING =====
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-400 text-sm mt-3">Memuat data...</Text>
      </View>
    );
  }

  // ===== STATE: ERROR =====
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
        <Text className="text-gray-900 font-semibold text-base mt-4 text-center">
          Gagal memuat data
        </Text>
        <Text className="text-gray-400 text-sm mt-1 text-center">{error}</Text>
        <Pressable
          onPress={loadData}
          className="bg-blue-600 rounded-xl px-6 py-3 mt-5 active:bg-blue-700"
        >
          <Text className="text-white font-semibold text-sm">Coba Lagi</Text>
        </Pressable>
      </View>
    );
  }

  // ===== STATE: SUKSES — tampilkan data =====
  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      contentContainerStyle={{ padding: 20 }}
    >
      <View className="flex-row items-center mt-8 mb-5 gap-3">
        <LinearGradient
          colors={["#1E50BC", "#0A256B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 15,
            paddingBottom: 15,
            paddingHorizontal: 15,
            borderRadius: 15,
          }}
        >
          <Text className="text-white font-bold">SH</Text>
        </LinearGradient>
        <View className="justify-center">
          <Text className="text-xs text-slate-400 font-semibold">
            Selamat Pagi,
          </Text>
          <Text className="text-base font-bold">Pak Sutomo</Text>
        </View>
        <Pressable className="justify-center ml-42 bg-white rounded-lg items-center p-2">
          <Ionicons name="notifications-outline" size={20} />
        </Pressable>
      </View>

      {/* Card Presensi */}
      <LinearGradient
        colors={["#0f2347", "#09152a"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 24,
          padding: 20,
          overflow: "hidden",
          width: "100%",
        }}
      >
        <GridBackground />

        {/* Header: Tanggal & Badge WFO */}
        <View className="flex-row justify-between items-center mb-3">
          <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "500" }}>
            Rabu, 12 Agustus 2026
          </Text>
          <View
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: "#cbd5e1", fontSize: 12, fontWeight: "600" }}>
              WFO - Reguler
            </Text>
          </View>
        </View>

        {/* Teks Judul & Subtitle */}
        <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "700" }}>
          Anda belum absen masuk
        </Text>
        <Text
          style={{
            color: "#94a3b8",
            fontSize: 13,
            marginTop: 4,
            marginBottom: 16,
          }}
        >
          Ketuk untuk memulai presensi hari ini
        </Text>

        {/* Pill Indicator Radius / Lokasi */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            borderColor: "rgba(45, 212, 191, 0.35)",
            borderWidth: 1,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            marginBottom: 16,
            gap: 8,
          }}
        >
          <Feather name="map-pin" size={16} color="#2dd4bf" />
          <Text style={{ color: "#2dd4bf", fontSize: 13, fontWeight: "600" }}>
            Dalam radius · Gd. Dekanat FATEK · 12 m
          </Text>
        </View>

        {/* Tombol Utama */}
        <Pressable
          style={{
            backgroundColor: "#2563eb",
            borderRadius: 16,
            paddingVertical: 14,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
          className="active:opacity-80"
          onPress={() => console.log("Absen Masuk")}
        >
          <Feather name="maximize" size={18} color="#ffffff" />
          <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>
            Absen Masuk
          </Text>
        </Pressable>
      </LinearGradient>

      {/* Card Ringkasan */}
      <View className="flex-row gap-3 mb-4">
        <View className="flex-1 bg-emerald-50 rounded-2xl p-4">
          <Text className="text-emerald-700 font-bold text-xl">
            {summary?.kuotaCuti}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">Kuota Cuti</Text>
        </View>
        <View className="flex-1 bg-amber-50 rounded-2xl p-4">
          <Text className="text-amber-700 font-bold text-xl">
            {summary?.pengajuanDiproses}
          </Text>
          <Text className="text-gray-500 text-xs mt-1">Diproses</Text>
        </View>
      </View>

      <View className="bg-gray-50 rounded-2xl p-4">
        <Text className="text-gray-500 text-xs">Jam Kerja Bulan Ini</Text>
        <Text className="text-gray-900 font-bold text-lg mt-1">
          {summary?.jamKerjaBulanIni}
        </Text>
      </View>
    </ScrollView>
  );
}
