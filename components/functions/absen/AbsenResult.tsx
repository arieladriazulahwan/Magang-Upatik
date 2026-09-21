import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export type AbsenResultData = {
  time: string; // "15:56"
  timezone: string; // "WITA"
  date: string; // "Rabu, 16 September 2026"
  statusLabel: string; // "Hadir · Tepat waktu"
  faceMatchScore: number; // 0.93
  livenessPassed: boolean;
  geofenceLocation: string; // "Gd. Dekanat FATEK"
  presenceType: string; // "WFO · Dosen Tugas Tambahan"
};

type AbsenResultProps = {
  data: AbsenResultData;
  onSelesai: () => void;
};

export default function AbsenResult({ data, onSelesai }: AbsenResultProps) {
  return (
    <View className="flex-1 justify-between px-5">
      {/* Bagian atas: ikon sukses + ringkasan */}
      <View className="items-center mt-16">
        <View className="w-20 h-20 rounded-full bg-emerald-500 items-center justify-center">
          <Ionicons name="checkmark" size={40} color="white" />
        </View>

        <Text className="text-white font-bold text-lg mt-5">
          Absen Masuk Berhasil
        </Text>

        <Text className="text-white font-bold text-5xl mt-3">{data.time}</Text>
        <Text className="text-blue-300 text-xs mt-1">
          {data.timezone} · {data.date}
        </Text>

        <View className="bg-emerald-500/15 border border-emerald-500/30 rounded-full px-4 py-1.5 mt-4">
          <Text className="text-emerald-400 text-xs font-semibold">
            {data.statusLabel}
          </Text>
        </View>
      </View>

      {/* Bagian bawah: detail hasil verifikasi + tombol selesai */}
      <View className="mb-5">
        <View className="bg-white/5 border border-white/10 rounded-2xl px-4 py-1 mb-4">
          <DetailRow
            label="Skor kemiripan wajah"
            value={`${data.faceMatchScore.toFixed(2)} · Lolos`}
            valueColor="text-emerald-400"
          />
          <DetailRow
            label="Anti-spoofing / liveness"
            value={data.livenessPassed ? "Lolos" : "Gagal"}
            valueColor={data.livenessPassed ? "text-emerald-400" : "text-red-400"}
          />
          <DetailRow label="Lokasi geofence" value={data.geofenceLocation} />
          <DetailRow label="Tipe presensi" value={data.presenceType} isLast />
        </View>

        <Pressable
          onPress={onSelesai}
          className="bg-white rounded-2xl py-4 items-center justify-center active:opacity-80"
        >
          <Text className="text-slate-900 font-bold text-base">Selesai</Text>
        </Pressable>
      </View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  valueColor = "text-white",
  isLast,
}: {
  label: string;
  value: string;
  valueColor?: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-3 ${
        isLast ? "" : "border-b border-white/10"
      }`}
    >
      <Text className="text-blue-300 text-xs flex-1 mr-2">{label}</Text>
      <Text className={`text-sm font-bold ${valueColor}`}>{value}</Text>
    </View>
  );
}