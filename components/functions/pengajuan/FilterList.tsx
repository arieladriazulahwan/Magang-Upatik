import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export default function FilterList() {
  const filterOptions = ["Semua", "Izin", "Cuti", "Sakit", "WFH", "Lembur"];
  const [activeFilter, setActiveFilter] = useState("Semua");

  return (
    <View className="px-1">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          gap: 2,
          paddingVertical: 2,
        }}
      >
        {filterOptions.map((item, index) => {
          const isActive = activeFilter === item;

          return (
            <Pressable
              key={index}
              onPress={() => setActiveFilter(item)}
              className={`px-4 py-2 rounded-xl border items-center justify-center ${
                isActive
                  ? "bg-containerPengajuan border-[#0B1E46]"
                  : "bg-white border-slate-200"
              }`}
              style={{
                marginRight: index === filterOptions.length - 1 ? 0 : 12,
              }}
            >
              <Text
                className={`text-sm font-semibold ${
                  isActive ? "text-white" : "text-slate-600"
                }`}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
