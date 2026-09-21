import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AttendanceCard, {
  AttendanceItem,
} from "../functions/riwayat/AttendanceCard";
import SummaryCard, { SummaryStat } from "../functions/riwayat/SummaryCard";

const summaryStats: SummaryStat[] = [
  {
    key: "hadir",
    label: "Hadir",
    value: 18,
    bg: "bg-green-50",
    text: "text-green-700",
  },
  {
    key: "terlambat",
    label: "Terlambat",
    value: 2,
    bg: "bg-orange-50",
    text: "text-orange-600",
  },
  {
    key: "izin",
    label: "Izin/WFH",
    value: 4,
    bg: "bg-blue-50",
    text: "text-blue-600",
  },
  {
    key: "alpa",
    label: "Alpa",
    value: 0,
    bg: "bg-gray-100",
    text: "text-gray-400",
  },
];

const attendanceHistory: AttendanceItem[] = [
  {
    id: "1",
    date: 30,
    day: "SEN",
    status: "Hadir",
    checkIn: "07:38",
    checkOut: "16:10",
    duration: "8j 32m",
    location: "WFO",
  },
  {
    id: "2",
    date: 27,
    day: "JUM",
    status: "Hadir",
    checkIn: "07:51",
    checkOut: "15:40",
    duration: "7j 49m",
    location: "WFO",
  },
  {
    id: "3",
    date: 26,
    day: "KAM",
    status: "Terlambat",
    checkIn: "08:12",
    checkOut: "16:05",
    duration: "7j 53m",
    location: "WFO",
  },
  {
    id: "4",
    date: 25,
    day: "RAB",
    status: "Izin",
    note: "Izin keperluan keluarga",
  },
  {
    id: "5",
    date: 24,
    day: "SEL",
    status: "Hadir",
    checkIn: "07:33",
    checkOut: "16:20",
    duration: "8j 47m",
    location: "WFO",
  },
  {
    id: "6",
    date: 23,
    day: "SEN",
    status: "Hadir",
    checkIn: "09:02",
    checkOut: "16:00",
    duration: "6j 58m",
    location: "WFH",
  },
];

export default function RiwayatScreen() {
  return (
    <SafeAreaView>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 100,
        }}
      >
        <View className="flex-1 bg-white p-4 mb-4">
          <View className="flex-row justify-between items-center mb-2">
            <View className="justify-center">
              <Text className="font-bold text-lg text-black">
                Riwayat Kehadiran
              </Text>
              <Text className="font-semibold text-xs text-slate-400">
                Rekap Presensi Terverifikasi
              </Text>
            </View>
            <Pressable
              className="flex-row items-center justify-center border border-slate-200 bg-slate-100 rounded-2xl px-2 py-2 self-start"
              onPress={() => console.log("Buka Pilihan Bulan")}
            >
              <Text className="text-slate-800 font-semibold text-sm mr-2">
                Juni 2026
              </Text>
              <Ionicons name="chevron-down-outline" size={16} color="#64748B" />
            </Pressable>
          </View>
          <View className="flex-row gap-2 mt-2">
            {summaryStats.map(({ key, ...stat }) => (
              <SummaryCard key={key} {...stat} />
            ))}
          </View>
        </View>
        {attendanceHistory.map((item) => (
          <AttendanceCard key={item.id} {...item} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
