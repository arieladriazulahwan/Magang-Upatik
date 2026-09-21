import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export type SettingRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  isLast?: boolean;
};

export default function SettingRow({
  icon,
  label,
  value,
  isLast,
}: SettingRowProps) {
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
