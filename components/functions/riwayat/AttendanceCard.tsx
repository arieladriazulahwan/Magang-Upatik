import { Text, View } from "react-native";

export type AttendanceStatus =
  | "Hadir"
  | "Terlambat"
  | "Izin"
  | "Sakit"
  | "Alpa";

export type AttendanceItem = {
  id: string;
  date: number;
  day: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
  duration?: string;
  location?: string;
  note?: string;
};

const dateBadgeStyles: Record<AttendanceStatus, { bg: string; text: string }> =
  {
    Hadir: { bg: "bg-green-50", text: "text-green-700" },
    Terlambat: { bg: "bg-orange-50", text: "text-orange-600" },
    Izin: { bg: "bg-indigo-50", text: "text-indigo-600" },
    Sakit: { bg: "bg-red-50", text: "text-red-600" },
    Alpa: { bg: "bg-gray-100", text: "text-gray-500" },
  };

const statusBadgeStyles: Record<
  AttendanceStatus,
  { bg: string; text: string }
> = {
  Hadir: { bg: "bg-green-100", text: "text-green-700" },
  Terlambat: { bg: "bg-orange-100", text: "text-orange-700" },
  Izin: { bg: "bg-indigo-100", text: "text-indigo-700" },
  Sakit: { bg: "bg-red-100", text: "text-red-700" },
  Alpa: { bg: "bg-gray-100", text: "text-gray-600" },
};

export default function AttendanceCard({
  date,
  day,
  status,
  checkIn,
  checkOut,
  duration,
  location,
  note,
}: AttendanceItem) {
  const dateStyle = dateBadgeStyles[status];
  const statusStyle = statusBadgeStyles[status];
  const hasSchedule = Boolean(checkIn && checkOut);

  return (
    <View className="px-4">
      <View className="flex-row items-center bg-white rounded-2xl p-4 mb-3">
        <View
          className={`items-center justify-center rounded-xl w-12 h-12 mr-3 ${dateStyle.bg}`}
        >
          <Text className={`font-bold text-base ${dateStyle.text}`}>
            {date}
          </Text>
          <Text className={`text-[10px] font-medium ${dateStyle.text}`}>
            {day}
          </Text>
        </View>

        <View className="flex-1">
          {hasSchedule ? (
            <>
              <View className="flex-row items-center">
                <Text className="text-black font-semibold text-base">
                  {checkIn}
                </Text>
                <Text className="text-gray-400 mx-1">→</Text>
                <Text className="text-black font-semibold text-base">
                  {checkOut}
                </Text>
              </View>
              <Text className="text-gray-400 text-xs mt-0.5">{duration}</Text>
            </>
          ) : (
            <Text className="text-gray-400 text-sm">{note}</Text>
          )}
        </View>

        <View className="items-end gap-1.5">
          <View className={`px-3 py-1 rounded-full ${statusStyle.bg}`}>
            <Text className={`text-xs font-medium ${statusStyle.text}`}>
              {status}
            </Text>
          </View>
          {location && (
            <View className="px-3 py-1 rounded-full bg-blue-50">
              <Text className="text-xs font-medium text-blue-600">
                {location}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
