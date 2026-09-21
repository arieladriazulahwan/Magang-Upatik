import { Text, View } from "react-native";

export type SummaryStat = {
  key: string;
  label: string;
  value: number;
  bg: string;
  text: string;
};

export default function SummaryCard({
  label,
  value,
  bg,
  text,
}: Omit<SummaryStat, "key">) {
  return (
    <View className={`flex-1 items-center py-3 rounded-2xl ${bg}`}>
      <Text className={`text-2xl font-bold ${text}`}>{value}</Text>
      <Text className={`text-xs font-semibold mt-0.5 ${text}`}>{label}</Text>
    </View>
  );
}
