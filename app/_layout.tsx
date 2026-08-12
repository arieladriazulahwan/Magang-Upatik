import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PrototypeProvider } from "../contexts/PrototypeContext";

export default function RootLayout() {
  return (
    <PrototypeProvider>
      <StatusBar style="light" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
        }}
      />
    </PrototypeProvider>
  );
}
