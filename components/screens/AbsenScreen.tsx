import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GridBackground from "../functions/absen/GridBackground";
import LocationRadar from "../functions/absen/LocationRadar";

type LocationValidation = {
  latitude: number;
  longitude: number;
  accuracy: number;
  locationName: string;
  distance: number;
  isWithinRadius: boolean;
};

const dummyLocationValidation: LocationValidation = {
  latitude: -0.8389,
  longitude: 119.8707,
  accuracy: 4,
  locationName: "Gd. Dekanat FATEK",
  distance: 12,
  isWithinRadius: true,
};

export default function AbsenScreen() {
  const location = dummyLocationValidation;

  function handleClose() {
    router.back();
  }

  function handleLanjut() {
    router.push("/verifikasi-wajah");
  }

  return (
    <LinearGradient
      colors={["#0f2347", "#09152a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <GridBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 mb-2">
          <Pressable
            onPress={handleClose}
            className="w-9 h-9 rounded-full bg-white/10 items-center justify-center mr-3"
          >
            <Ionicons name="close" size={20} color="white" />
          </Pressable>
          <View>
            <Text className="text-white font-bold text-lg">Absen Masuk</Text>
            <Text className="text-blue-300 text-xs mt-0.5">
              Langkah 1 dari 3 · Validasi Lokasi
            </Text>
          </View>
        </View>

        {/* Radar lokasi */}
        <View className="flex-1 items-center justify-center">
          <LocationRadar />
        </View>

        {/* Card status radius */}
        <View className="mx-5 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 mb-3">
          <View className="flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-emerald-400" />
            <Text className="text-white font-semibold text-sm">
              Anda berada dalam radius
            </Text>
          </View>
          <Text className="text-slate-400 text-xs mt-1">
            {location.latitude}, {location.longitude} · akurasi{" "}
            {location.accuracy} m
          </Text>
        </View>

        {/* Info Lokasi & Jarak */}
        <View className="flex-row gap-2 mx-5 mb-4">
          <View className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
            <Text className="text-slate-400 text-[10px] font-semibold tracking-wide">
              LOKASI
            </Text>
            <Text className="text-white font-bold text-sm mt-1">
              {location.locationName}
            </Text>
          </View>
          <View className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
            <Text className="text-slate-400 text-[10px] font-semibold tracking-wide">
              JARAK TITIK
            </Text>
            <Text className="text-white font-bold text-sm mt-1">
              {location.distance} m
            </Text>
          </View>
        </View>

        {/* Tombol lanjut */}
        <View className="px-5 pb-5">
          <Pressable
            onPress={handleLanjut}
            disabled={!location.isWithinRadius}
            className="bg-blue-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 active:opacity-80 disabled:opacity-50"
          >
            <Text className="text-white font-semibold text-base">
              Lanjut · Verifikasi Wajah
            </Text>
            <Ionicons name="arrow-forward" size={18} color="white" />
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
