import { Text, View } from "react-native";

export type AttendanceItem = {
  id: string;
  date: number;
  day: string;
  checkIn: string;
  checkOut: string;
  duration: string;
  location: string;
  status: string;
};

const statusStyles: Record<string, { bg: string; text: string }> = {
  Hadir: { bg: "bg-green-100", text: "text-green-700" },
  Terlambat: { bg: "bg-orange-100", text: "text-orange-700" },
};

export default function AttendanceRow({
  date,
  day,
  checkIn,
  checkOut,
  duration,
  location,
  status,
}: AttendanceItem) {
  const statusStyle = statusStyles[status] ?? statusStyles.Hadir;

  return (
    <View className="flex-row items-center justify-between py-3 border-b border-gray-100">
      <View className="items-center justify-center bg-indigo-50 rounded-lg w-12 h-12">
        <Text className="text-indigo-600 font-bold text-base">{date}</Text>
        <Text className="text-indigo-400 text-[10px] font-medium">{day}</Text>
      </View>

      <View className="flex-1 ml-3">
        <View className="flex-row items-center">
          <Text className="text-black font-semibold text-base">{checkIn}</Text>
          <Text className="text-gray-400 mx-1">→</Text>
          <Text className="text-black font-semibold text-base">{checkOut}</Text>
        </View>
        <Text className="text-gray-400 text-xs mt-0.5">
          {duration} · {location}
        </Text>
      </View>

      <View className={`px-3 py-1 rounded-full ${statusStyle.bg}`}>
        <Text className={`text-xs font-medium ${statusStyle.text}`}>
          {status}
        </Text>
      </View>
    </View>
  );
}
