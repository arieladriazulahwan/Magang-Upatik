import { Feather, Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

type JenisPengajuan =
  | "Cuti Tahunan"
  | "Izin"
  | "Sakit"
  | "WFH"
  | "Dinas Luar"
  | "Lembur"
  | "Koreksi Presensi";

const pengajuanList: JenisPengajuan[] = [
  "Cuti Tahunan",
  "Izin",
  "Sakit",
  "WFH",
  "Dinas Luar",
  "Lembur",
  "Koreksi Presensi",
];

export default function PengajuanFormScreen() {
  const [selected, setSelected] = useState<JenisPengajuan>("Cuti Tahunan");

  // State
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [alasan, setAlasan] = useState("");

  // Variabel penentu logika tampilan
  const isLembur = selected === "Lembur";
  const isKoreksi = selected === "Koreksi Presensi";
  const isDefault = !isLembur && !isKoreksi;
  const isDatesFilled = startDate !== null && endDate !== null;

  return (
    <ScrollView className="flex" showsVerticalScrollIndicator={false}>
      {/* 1. FILTER LIST JENIS PENGAJUAN */}
      <Text className="text-base font-bold text-[#2c405a] mb-4">
        Jenis pengajuan
      </Text>
      <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
        {pengajuanList.map((item) => {
          const isActive = selected === item;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => setSelected(item)}
              activeOpacity={0.7}
              className={`w-[31%] py-3 px-1 rounded-xl items-center justify-center border shadow-sm ${
                isActive
                  ? "bg-[#112744] border-[#112744]"
                  : "bg-white border-gray-100"
              }`}
            >
              <Text
                className={`text-xs text-center ${
                  isActive ? "text-white font-bold" : "text-[#112744] font-bold"
                }`}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. AREA DINAMIS INPUT TANGGAL */}

      {/* Tampilan A: LEMBUR */}
      {isLembur && (
        <View className="flex-row justify-between mb-4">
          <View className="w-[48%]">
            <Text className="text-[#2c405a] font-bold mb-2">
              Tanggal Lembur
            </Text>
            <View className="bg-white border border-gray-200 rounded-xl p-3 items-center">
              <Text className="text-[#0f172a] font-bold">Pilih Tanggal</Text>
            </View>
          </View>
          <View className="w-[48%]">
            <Text className="text-[#2c405a] font-bold mb-2">Jam Lembur</Text>
            <View className="bg-white border border-gray-200 rounded-xl p-3 items-center">
              <Text className="text-[#0f172a] font-bold">17:00 - 20:00</Text>
            </View>
          </View>
        </View>
      )}

      {/* Tampilan B: KOREKSI PRESENSI (1 Tanggal) */}
      {isKoreksi && (
        <View className="mb-4">
          <Text className="text-[#2c405a] font-bold mb-2">Tanggal Koreksi</Text>
          <TouchableOpacity
            className="w-full bg-white border border-gray-200 rounded-xl p-3 items-center"
            onPress={() => setStartDate("09 Jul 2026")}
          >
            <Text className="text-[#0f172a] font-bold font-mono">
              {startDate ? startDate : "Pilih Tanggal"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tampilan C: DEFAULT (Cuti, Izin, dll - 2 Tanggal) */}
      {isDefault && (
        <View className="flex-row justify-between mb-3">
          <TouchableOpacity
            className="w-[48%]"
            onPress={() => setStartDate("07 Jul 2026")}
          >
            <Text className="text-[#2c405a] font-bold mb-2">Tanggal mulai</Text>
            <View className="bg-white border border-gray-200 rounded-xl p-3 items-center">
              <Text className="text-[#0f172a] font-bold font-mono">
                {startDate ? startDate : "Pilih Mulai"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            className="w-[48%]"
            onPress={() => setEndDate("08 Jul 2026")}
          >
            <Text className="text-[#2c405a] font-bold mb-2">
              Tanggal selesai
            </Text>
            <View className="bg-white border border-gray-200 rounded-xl p-3 items-center">
              <Text className="text-[#0f172a] font-bold font-mono">
                {endDate ? endDate : "Pilih Selesai"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* NOTIFIKASI INFO */}
      {isDefault && isDatesFilled && (
        <View className="bg-[#eff4fb] border border-[#d2e3fc] rounded-xl p-3 flex-row items-center mt-2 mb-3">
          <Ionicons
            name="information-circle-outline"
            size={20}
            color="#1a56db"
            className="mr-2"
          />
          <Text className="text-[#1a56db] text-xs font-medium ml-2">
            2 hari kerja • sisa saldo cuti tahunan: 14 hari
          </Text>
        </View>
      )}

      {/* 3. AREA KETERANGAN & SUBMIT */}
      <View className="flex-1 mt-2 pb-10">
        {/* Kolom Alasan (Selalu Muncul) */}
        <View className="mb-4">
          <Text className="text-sm font-bold text-[#334155] mb-2">
            Alasan & Keterangan
          </Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-xl p-3 text-[#0f172a] h-28"
            placeholder="Tulis alasan pengajuan anda..."
            placeholderTextColor="#94a3b8"
            textAlignVertical="top"
            value={alasan}
            onChangeText={setAlasan}
          />
        </View>

        {/* Kolom Lampiran (HILANG HANYA SAAT LEMBUR) */}
        {!isLembur && (
          <View className="mb-6">
            <Text className="text-sm font-semibold text-[#334155] mb-2">
              Lampiran
            </Text>
            <TouchableOpacity
              activeOpacity={0.6}
              className="bg-[#f8fafc] border border-dashed border-[#94a3b8] rounded-xl py-6 items-center justify-center"
            >
              <Feather
                name="upload"
                size={20}
                color="#64748b"
                className="mb-2"
              />
              <Text className="text-[#64748b] text-sm font-medium mt-1">
                Unggah surat / dokumen pendukung
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tombol Submit (Selalu Muncul) */}
        <TouchableOpacity
          activeOpacity={0.8}
          className="bg-[#2563eb] rounded-xl py-4 items-center justify-center shadow-sm"
        >
          <Text className="text-white font-bold text-base">
            Kirim Pengajuan
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
