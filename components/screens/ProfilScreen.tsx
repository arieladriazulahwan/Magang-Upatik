import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function ProfileScreen() {
  return (
    <View className="flex-1 bg-gray-100">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        {/* ===== HEADER GRADIENT ===== */}
        <LinearGradient
          colors={["#0f1f4d", "#1c3a8a", "#0f1f4d"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 50,
            paddingHorizontal: 20,
            paddingBottom: 30,
          }}
        >
          {/* Avatar + Nama */}
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

          {/* Badge row */}
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
          {/* ===== CARD: INFO DATA ===== */}
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

          {/* ===== CARD: DATA WAJAH ===== */}
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

          {/* ===== CARD: LIST PENGATURAN ===== */}
          <View className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4">
            <SettingRow icon="notifications-outline" label="Notifikasi" />
            <SettingRow icon="globe-outline" label="Bahasa" value="Indonesia" />
            <SettingRow
              icon="settings-outline"
              label="Pengaturan perangkat"
              isLast
            />
          </View>

          {/* ===== TOMBOL KELUAR ===== */}
          <Pressable className="bg-white border border-red-200 rounded-2xl py-3.5 flex-row items-center justify-center gap-2 active:bg-red-50">
            <Feather name="log-out" size={18} color="#dc2626" />
            <Text className="text-red-600 font-semibold text-base">Keluar</Text>
          </Pressable>

          {/* ===== FOOTER TEXT ===== */}
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
    </View>
  );
}

// ============================================================
// KOMPONEN KECIL — dipisah biar ProfileScreen di atas tidak
// berantakan, tiap className tetap ditulis statis (aman NativeWind)
// ============================================================

function InfoRow({
  label,
  value,
  sub,
  isLast,
}: {
  label: string;
  value: string;
  sub?: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row justify-between items-start py-3 ${
        isLast ? "" : "border-b border-gray-100"
      }`}
    >
      <Text className="text-gray-400 text-sm">{label}</Text>
      <View className="items-end">
        <Text className="text-gray-900 font-semibold text-sm text-right">
          {value}
        </Text>
        {sub && <Text className="text-blue-600 text-xs mt-0.5">{sub}</Text>}
      </View>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  value,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3.5 ${
        isLast ? "" : "border-b border-gray-100"
      }`}
    >
      <View className="flex-row items-center gap-3">
        <Ionicons name={icon} size={20} color="#374151" />
        <Text className="text-gray-900 text-sm font-medium">{label}</Text>
      </View>
      <View className="flex-row items-center gap-1">
        {value && <Text className="text-gray-400 text-sm">{value}</Text>}
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
      </View>
    </View>
  );
}
