import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FormList from "../functions/ajukan/FormList";

export default function AjukanScreen() {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View className="bg-white px-4 py-3 mb-3 flex-row">
        <Pressable
          className="bg-white items-center justify-center border rounded-lg p-1 border border-slate-400 mr-3"
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color="#0f172a" />
        </Pressable>
        <View>
          <Text className="text-black font-bold text-lg">Pengajuan Baru</Text>
          <Text className="text-gray-400 text-xs">
            Lengkapi data & Lampiran
          </Text>
        </View>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingLeft: 20,
          paddingRight: 20,
          paddingTop: 5,
          paddingBottom: 50,
        }}
      >
        <FormList />
      </ScrollView>
    </SafeAreaView>
  );
}
