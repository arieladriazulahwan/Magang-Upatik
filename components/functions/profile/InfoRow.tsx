import { Text, View } from "react-native";

export type InfoRowProps = {
  label: string;
  value: string;
  sub?: string;
  isLast?: boolean;
};

export default function InfoRow({ label, value, sub, isLast }: InfoRowProps) {
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
