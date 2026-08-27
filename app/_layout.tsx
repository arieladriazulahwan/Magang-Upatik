import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PrototypeProvider } from "../contexts/PrototypeContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PrototypeProvider>
        <StatusBar style="light" />

        <Stack
          screenOptions={{
            headerShown: false,
            animation: "fade",
          }}
        />
      </PrototypeProvider>
    </SafeAreaProvider>
  );
}
