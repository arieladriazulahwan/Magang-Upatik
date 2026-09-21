// components/screens/PengajuanScreen.tsx
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FilterList from "../functions/pengajuan/FilterList";

export default function PengajuanScreen() {
  return (
    <SafeAreaView>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
        }}
      >
        {/* Header dan filter pengajuan */}
        <View className="flex-1 bg-white p-4 mb-4">
          <View className="flex-row justify-between items-center mb-2 p-1">
            <View className="justify-center">
              <Text className="font-bold text-lg text-black">Pengajuan</Text>
              <Text className="font-semibold text-xs text-slate-400">
                Izin · Cuti · Sakit · WFH · Lembur
              </Text>
            </View>
            <Pressable
              onPress={() => router.push("/ajukan")}
              className="bg-containerPengajuan p-2 flex-row justify-center items-center rounded-lg gap-2"
            >
              <Ionicons name="add-outline" size={13} color="white" />
              <Text className="text-white font-semibold text-sm">Ajukan</Text>
            </Pressable>
          </View>
          <FilterList />
        </View>

        {/* List Riwayat Pengajuan */}
        <View className="px-4 justify-center items-center gap-3">
          <View className="flex-row items-center bg-white rounded-lg p-3">
            <View className="items-center justify-center bg-iconContainerPurple rounded-lg p-2 mr-2">
              <Ionicons
                name="calendar-clear-outline"
                size={24}
                color="#7C3AED"
              />
            </View>
            <View className="mr-22">
              <Text className="text-black text-sm font-bold">Cuti Tahunan</Text>
              <Text className="text-slate-500 text-xs font-semibold">
                12–13 Jun 2026 · 2 hari kerja
              </Text>
            </View>
            <View className="bg-green-100 items-center justify-center p-2 rounded-xl">
              <Text className="text-green-700 font-semibold text-xs">
                Disetujui
              </Text>
            </View>
          </View>

          <View className="flex-row items-center bg-white rounded-lg p-3">
            <View className="items-center justify-center bg-iconContainerBlue rounded-lg p-2 mr-2">
              <Ionicons name="document-outline" size={24} color="#1D4ED8" />
            </View>
            <View className="mr-18">
              <Text className="text-black text-sm font-bold">
                Izin Keperluan Keluarga
              </Text>
              <Text className="text-slate-500 text-xs font-semibold">
                25 Jun 2026 · 1 hari
              </Text>
            </View>
            <View className="bg-orange-100 items-center justify-center p-2 rounded-xl">
              <Text className="text-orange-700 font-semibold text-xs">
                Menunggu
              </Text>
            </View>
          </View>

          <View className="flex-row items-center bg-white rounded-lg p-3">
            <View className="items-center justify-center bg-iconContainerBlue rounded-lg p-2 mr-2">
              <Ionicons name="document-outline" size={24} color="#1D4ED8" />
            </View>
            <View className="mr-25">
              <Text className="text-black text-sm font-bold">
                Izin Datang Terlambat
              </Text>
              <Text className="text-slate-500 text-xs font-semibold">
                18 Mei 2026 · 2 jam
              </Text>
            </View>
            <View className="bg-red-100 items-center justify-center p-2 rounded-xl">
              <Text className="text-red-700 font-semibold text-xs">
                Ditolak
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
