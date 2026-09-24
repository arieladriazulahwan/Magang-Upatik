import {
  AntDesign,
  Feather,
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
  Octicons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  mockGetDashboardSummary,
  mockGetPresensiToday
} from "../../services/mockApi";
import AttendanceRow from "../functions/beranda/AttendanceRow";
import PresenceCard from "../functions/beranda/PresenceCard";

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

const attendanceHistory = [
  {
    id: "1",
    date: 30,
    day: "SEN",
    checkIn: "07:38",
    checkOut: "16:10",
    duration: "8j 32m",
    location: "WFO",
    status: "Hadir",
  },
  {
    id: "2",
    date: 27,
    day: "JUM",
    checkIn: "07:51",
    checkOut: "15:40",
    duration: "7j 49m",
    location: "WFO",
    status: "Hadir",
  },
  {
    id: "3",
    date: 26,
    day: "KAM",
    checkIn: "08:12",
    checkOut: "16:05",
    duration: "7j 53m",
    location: "WFO",
    status: "Terlambat",
  },
];

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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-gray-400 text-sm mt-3">Memuat data...</Text>
      </View>
    );
  }

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

  return (
    <SafeAreaView>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingBottom: 100,
          paddingTop: 5,
        }}
      >
        <View className="flex-row items-center pt-2 mb-5">
          <LinearGradient
            colors={["#1E50BC", "#0A256B"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              paddingTop: 15,
              paddingBottom: 15,
              paddingHorizontal: 15,
              borderRadius: 15,
              marginRight: 10,
            }}
          >
            <Text className="text-white font-bold">SH</Text>
          </LinearGradient>
          <View className="justify-center mr-auto">
            <Text className="text-xs text-slate-400 font-semibold">
              Selamat Pagi,
            </Text>
            <Text className="text-base font-bold">Pak Sutomo</Text>
          </View>
          <Pressable
            onPress={() => router.push("/notifikasi")}
            className="justify-center bg-white rounded-lg items-center p-2"
          >
            <Ionicons name="notifications-outline" size={20} />
          </Pressable>
        </View>

        {/* Card Presensi */}
        <PresenceCard
          dateLabel="Rabu, 12 Agustus 2026"
          workModeLabel="WFO - Reguler"
          radiusLabel="Dalam Radius · Gd. Dekanat FATEK · 12 m"
          presensi={
            presensi ?? {
              sudahAbsenMasuk: false,
              jamMasuk: null,
              sudahAbsenPulang: false,
              jamPulang: null,
            }
          }
          onAbsenMasuk={() => router.push("/absen")}
          onAbsenPulang={() => router.push("/absen")}
        />

        {/* Card Ringkasan */}
        <View className="flex-row gap-2 mt-4 mb-4">
          <View className="flex-1 bg-white rounded-2xl pl-2 pt-4 pb-4 pr-4">
            <Ionicons
              name="time-outline"
              color="#0BA6DF"
              size={18}
              className="mb-2"
            />
            <Text className="text-black font-bold text-2xl">4j 18</Text>
            <Text className="text-gray-500 text-xs">Jam kerja min 4j</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl pl-2 pt-4 pb-4 pr-4">
            <Ionicons
              name="calendar-clear-outline"
              color="#48938F"
              size={18}
              className="mb-2"
            />
            <Text className="text-black font-bold text-2xl">14</Text>
            <Text className="text-gray-500 text-xs">Sisa cuti tahunan</Text>
          </View>
          <View className="flex-1 bg-white rounded-2xl pl-2 pt-4 pb-4 pr-4">
            <Ionicons
              name="document-outline"
              size={18}
              color="#BB7947"
              className="mb-2"
            />
            <Text className="text-black font-bold text-2xl">2</Text>
            <Text className="text-gray-500 text-xs">Jam Kerja Bulan Ini</Text>
          </View>
        </View>

        <Pressable className="flex-row items-center bg-cardBackgroundPersetujuan border-borderPersetujutan p-4 rounded-card mb-4">
          <View className="items-center bg-iconContainerBlue rounded-lg p-2 ml-2 mr-2">
            <Feather name="check-square" color="#1D4ED8" size={18} />
          </View>
          <View className="flex-column mr-auto ml-auto">
            <Text className="text-black text-base font-bold">
              Persetujuan menunggu anda
            </Text>
            <Text className="text-gray-500 text-xs">
              Sebagai Pimpinan FATEK ketuk untuk meninjau
            </Text>
          </View>
          <View className="rounded-full w-7 h-7 bg-red-600 items-center justify-center">
            <Text className="text-white text-base font-semibold">3</Text>
          </View>
        </Pressable>

        <View>
          <Text className="text-black font-bold text-base mb-4">
            Akses Cepat
          </Text>
        </View>

        <View className="flex-row flex-wrap gap-2 mb-4">
          <View className="w-[23%] justify-center items-center bg-white rounded-card py-3 mb-2">
            <Pressable className="justify-center items-center bg-iconContainerBlue rounded-lg p-2">
              <MaterialIcons name="history" size={24} color="#1D4ED8" />
            </Pressable>
            <Text className="text-black text-sm font-medium mt-2">Riwayat</Text>
          </View>

          <View className="w-[23%] justify-center items-center bg-white rounded-card py-3 mb-2">
            <Pressable className="justify-center items-center bg-iconContainerGreen rounded-lg p-2">
              <MaterialIcons name="event-available" size={24} color="#4BB49F" />
            </Pressable>
            <Text className="text-black text-sm font-medium mt-2">
              Saldo Cuti
            </Text>
          </View>

          <View className="w-[23%] justify-center items-center bg-white rounded-card py-3 mb-2">
            <Pressable className="justify-center items-center bg-iconContainerPurple rounded-lg p-2">
              <AntDesign name="file-add" size={24} color="#7C3AED" />
            </Pressable>
            <Text className="text-black text-sm font-medium mt-2">Ajukan</Text>
          </View>

          <View className="w-[23%] justify-center items-center bg-white rounded-card py-3 mb-2">
            <Pressable className="justify-center items-center bg-iconContainerYellow rounded-lg p-2">
              <MaterialCommunityIcons
                name="clock-plus-outline"
                size={24}
                color="#D97426"
              />
            </Pressable>
            <Text className="text-black text-sm font-medium mt-2">Lembur</Text>
          </View>

          <View className="w-[23%] justify-center items-center bg-white rounded-card py-3 mb-2">
            <Pressable className="justify-center items-center bg-iconContainerCyan rounded-lg p-2">
              <Octicons name="home" size={24} color="#0E7490" />
            </Pressable>
            <Text className="text-black text-sm font-medium mt-2">WFA</Text>
          </View>

          <View className="w-[23%] justify-center items-center bg-white rounded-card py-3 mb-2">
            <Pressable className="justify-center items-center bg-iconContainerRed rounded-lg p-2">
              <MaterialCommunityIcons
                name="emoticon-sick-outline"
                size={24}
                color="#E9164B"
              />
            </Pressable>
            <Text className="text-black text-sm font-medium mt-2">Sakit</Text>
          </View>

          <View className="w-[23%] justify-center items-center bg-white rounded-card py-3 mb-2">
            <Pressable className="justify-center items-center bg-iconContainerBlue rounded-lg p-2">
              <Feather name="check-square" size={24} color="#1D4ED8" />
            </Pressable>
            <Text className="text-black text-sm font-medium mt-2">
              Persetujuan
            </Text>
          </View>
        </View>

        <View className="justify-between flex-row items-center mb-4">
          <Text className="text-black text-base font-bold">
            Aktivitas Terakhir
          </Text>
          <Pressable className="items-center justify-center">
            <Text className="text-blue-600 text-sm font-medium">
              Lihat Semua
            </Text>
          </Pressable>
        </View>

        <View className="bg-white rounded-card px-4">
          {attendanceHistory.map((item) => (
            <AttendanceRow key={item.id} {...item} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
