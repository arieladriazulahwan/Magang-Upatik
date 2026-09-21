import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router, Tabs, usePathname } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" }, // sembunyikan default tab bar, pakai custom di bawah
      }}
      tabBar={() => <CustomTabBar />}
    >
      <Tabs.Screen name="beranda" />
      <Tabs.Screen name="riwayat" />
      <Tabs.Screen name="pengajuan" />
      <Tabs.Screen name="profil" />
    </Tabs>
  );
}

// ============================================================
// Custom Tab Bar — style-nya persis kayak punyamu, tapi sekarang
// navigasinya pakai router.push() ke route asli, bukan setState
// ============================================================
function CustomTabBar() {
  const pathname = usePathname();

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex-row items-center justify-around pt-2 pb-6">
      <TabButton
        IconProvider={Ionicons}
        icon="home-outline"
        activeIcon="home"
        label="Beranda"
        isActive={pathname === "/beranda"}
        onPress={() => router.push("/beranda")}
      />
      <TabButton
        IconProvider={MaterialIcons}
        icon="history"
        activeIcon="history"
        label="Riwayat"
        isActive={pathname === "/riwayat"}
        onPress={() => router.push("/riwayat")}
      />

      <Pressable
        onPress={() => router.push("/absen")}
        className="items-center -mt-8"
      >
        <View className="w-17 h-17 bg-blue-600 rounded-full items-center justify-center border-3 border-white shadow-md">
          <Ionicons name="scan-outline" size={25} color="white" />
          <Text className="text-white text-[10px] font-bold mt-1">ABSEN</Text>
        </View>
      </Pressable>

      <TabButton
        IconProvider={Ionicons}
        icon="document-text-outline"
        activeIcon="document-text"
        label="Pengajuan"
        isActive={pathname === "/pengajuan"}
        onPress={() => router.push("/pengajuan")}
      />
      <TabButton
        IconProvider={Ionicons}
        icon="person-outline"
        activeIcon="person"
        label="Profil"
        isActive={pathname === "/profil"}
        onPress={() => router.push("/profil")}
      />
    </View>
  );
}

function TabButton({
  IconProvider,
  icon,
  activeIcon,
  label,
  isActive,
  onPress,
}: {
  IconProvider: React.ComponentType<any>;
  icon: string;
  activeIcon: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="items-center">
      <IconProvider
        name={isActive ? activeIcon : icon}
        size={22}
        color={isActive ? "#2563eb" : "#9ca3af"}
      />
      <Text
        className={
          isActive
            ? "text-[10px] mt-1 text-blue-500 font-semibold"
            : "text-[10px] mt-1 text-gray-400"
        }
      >
        {label}
      </Text>
    </Pressable>
  );
}
