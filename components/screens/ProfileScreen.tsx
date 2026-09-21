import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import InfoRow from "../functions/profile/InfoRow";
import SettingRow from "../functions/profile/SettingRow";

export default function ProfileScreen() {
  function handleLogout() {
    router.replace("/login");
  }

  return (
    <SafeAreaView>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <LinearGradient
          colors={["#0f1f4d", "#1c3a8a", "#0f1f4d"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 20,
            paddingHorizontal: 20,
            paddingBottom: 20,
          }}
        >
          <View className="flex-row items-center gap-3 mb-4">
            <View className="w-14 h-14 bg-blue-500 rounded-2xl items-center justify-center">
              <Text className="text-white font-bold text-lg">SH</Text>
            </View>
            <View>
              <Text className="text-white font-bold text-lg">
                Dr. Ir. Sutomo Hadi, M.T.
              </Text>
              <Text className="text-slate-300 text-sm">
                Dekan Fakultas Teknik
              </Text>
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <View className="px-3 py-1.5 rounded-full bg-white/10">
              <Text className="text-xs font-medium text-slate-200">
                PNS · IV/b
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-full bg-emerald-500/20">
              <Text className="text-xs font-medium text-emerald-400">
                Pegawai
              </Text>
            </View>
            <View className="px-3 py-1.5 rounded-full bg-blue-500/20">
              <Text className="text-xs font-medium text-blue-300">
                Pimpinan FATEK
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View className="px-5 mt-3">
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
            <InfoRow label="NIP" value="1982 0315 2008 01 1002" />
            <InfoRow label="Unit kerja" value="FATEK · Teknik Sipil" />
            <InfoRow
              label="Kategori"
              value="Dosen Tugas Tambahan"
              sub="min. 240 menit/hari"
            />
            <InfoRow label="Email" value="sutomo.hadi@untad.ac.id" isLast />
          </View>

          <View className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center">
                <Ionicons name="person-add-outline" size={20} color="#10b981" />
              </View>
              <View>
                <Text className="text-gray-900 font-semibold text-sm">
                  Data Wajah Terdaftar
                </Text>
                <Text className="text-gray-400 text-xs mt-0.5">
                  5 sampel · terverifikasi
                </Text>
              </View>
            </View>
            <Pressable>
              <Text className="text-blue-600 text-sm font-medium">
                Perbarui
              </Text>
            </Pressable>
          </View>

          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4">
            <SettingRow icon="notifications-outline" label="Notifikasi" />
            <SettingRow icon="globe-outline" label="Bahasa" value="Indonesia" />
            <SettingRow
              icon="settings-outline"
              label="Pengaturan perangkat"
              isLast
            />
          </View>

          <Pressable
            onPress={handleLogout}
            className="bg-white border border-red-200 rounded-2xl py-3.5 flex-row items-center justify-center gap-2 active:bg-red-50"
          >
            <Feather name="log-out" size={18} color="#dc2626" />
            <Text className="text-red-600 font-semibold text-base">Keluar</Text>
          </Pressable>

          <View className="items-center mt-6">
            <Text className="text-gray-400 text-xs">
              KlikPresensi · Universitas Tadulako
            </Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              Versi 1.0.0 · SSO SIGA8
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
