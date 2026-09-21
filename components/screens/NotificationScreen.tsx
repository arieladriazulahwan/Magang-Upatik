import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import NotificationItem, {
  NotificationItemData,
} from "../functions/notification/notifFunc";

// Data dummy — nanti diganti hasil fetch API
const notifications: NotificationItemData[] = [
  {
    id: "1",
    group: "Hari Ini",
    icon: "approval",
    title: "Reza Pratama mengajukan Cuti Tahunan",
    description: "Perlu persetujuan Anda · 7–8 Jul 2026",
    time: "09:12",
  },
  {
    id: "2",
    group: "Hari Ini",
    icon: "warning-orange",
    title: "Anda belum absen pulang kemarin",
    description: "Lengkapi jam keluar 29 Jun via koreksi atasan",
    time: "07:30",
  },
  {
    id: "3",
    group: "Sebelumnya",
    icon: "success",
    title: "Pengajuan WFH Anda disetujui",
    description: "23 Jun 2026 · oleh Admin Kepegawaian",
    time: "Kemarin 14:20",
  },
  {
    id: "4",
    group: "Sebelumnya",
    icon: "warning-red",
    title: "Saldo cuti tahunan akan hangus",
    description: "6 hari carry-over kedaluwarsa 31 Des 2026",
    time: "Kemarin 08:00",
  },
  {
    id: "5",
    group: "Sebelumnya",
    icon: "star",
    title: "Cuti Besar Anda kini aktif",
    description: "Masa kerja ≥ 5 tahun telah terpenuhi",
    time: "2 hari lalu",
  },
];

// Kelompokkan notifikasi berdasarkan field `group`
function groupNotifications(data: NotificationItemData[]) {
  const groups: Record<string, NotificationItemData[]> = {};
  for (const item of data) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  }
  return groups;
}

export default function NotificationScreen() {
  const grouped = groupNotifications(notifications);

  return (
    <SafeAreaView>
      {/* Header dengan tombol back + subtitle */}
      <View className="flex-row items-center bg-white px-4 py-3 border-b border-gray-100">
        <View className="items-center justify-center rounded-lg border border-slate-400 mr-3 p-1">
          <Pressable
            onPress={() => router.back()}
            className="items-center justify-center"
          >
            <Ionicons name="chevron-back" size={24} color="#0f172a" />
          </Pressable>
        </View>
        <View>
          <Text className="text-black font-bold text-lg">Notifikasi</Text>
          <Text className="text-gray-400 text-xs">In-app · email</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {Object.entries(grouped).map(([groupName, items]) => (
          <View key={groupName} className="mb-2">
            <Text className="text-gray-400 font-semibold text-xs mb-2">
              {groupName.toUpperCase()}
            </Text>
            {items.map((item) => (
              <NotificationItem
                key={item.id}
                {...item}
                onPress={() => console.log("Buka notifikasi:", item.id)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
