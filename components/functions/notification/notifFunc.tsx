import { Ionicons } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

export type NotificationIconType =
  | "approval"
  | "warning-orange"
  | "success"
  | "warning-red"
  | "star";

export type NotificationItemData = {
  id: string;
  group: "Hari Ini" | "Sebelumnya";
  icon: NotificationIconType;
  title: string;
  description: string;
  time: string;
};

const iconStyles: Record<
  NotificationIconType,
  { name: keyof typeof Ionicons.glyphMap; bg: string; color: string }
> = {
  approval: { name: "checkbox-outline", bg: "bg-blue-50", color: "#2563EB" },
  "warning-orange": {
    name: "warning-outline",
    bg: "bg-orange-50",
    color: "#EA8C1E",
  },
  success: {
    name: "checkmark-circle-outline",
    bg: "bg-green-50",
    color: "#16A34A",
  },
  "warning-red": { name: "warning-outline", bg: "bg-red-50", color: "#DC2626" },
  star: { name: "star-outline", bg: "bg-purple-50", color: "#7C3AED" },
};

type NotificationItemProps = NotificationItemData & {
  onPress?: () => void;
};

export default function NotificationItem({
  icon,
  title,
  description,
  time,
  onPress,
}: NotificationItemProps) {
  const style = iconStyles[icon];

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-start bg-white rounded-2xl p-4 mb-3"
    >
      <View
        className={`items-center justify-center rounded-xl w-10 h-10 mr-3 ${style.bg}`}
      >
        <Ionicons name={style.name} size={20} color={style.color} />
      </View>

      <View className="flex-1">
        <Text className="text-black font-semibold text-sm">{title}</Text>
        <Text className="text-gray-400 text-xs mt-1">{description}</Text>
        <Text className="text-gray-300 text-[11px] mt-1">{time}</Text>
      </View>
    </Pressable>
  );
}
