import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import FaceFrame from "../functions/absen/FaceFrame";
import GridBackground from "../functions/absen/GridBackground";

type LivenessStep = {
  instruction: string;
};

// Data dummy — nanti diganti urutan tantangan liveness dari backend
// (misal: kedipkan mata -> hadap kiri -> hadap kanan, dst)
const dummyLivenessStep: LivenessStep = {
  instruction: "Kedipkan mata untuk uji liveness",
};

export default function FaceVerificationScreen() {
  const [isCapturing, setIsCapturing] = useState(false);
  const livenessStep = dummyLivenessStep;

  function handleClose() {
    router.back();
  }

  function handleCapture() {
    router.push("/verifikasiProses");
  }
  async function handleCapturenNANTI() {
    setIsCapturing(true);
    try {
      // nanti panggil kamera + kirim frame ke endpoint verifikasi wajah di sini
      console.log("Ambil & verifikasi wajah");
    } finally {
      setIsCapturing(false);
    }
  }

  return (
    <LinearGradient
      colors={["#0f2347", "#09152a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <GridBackground />
      <SafeAreaView style={{ flex:1}}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 mb-4">
          <Pressable
            onPress={handleClose}
            className="w-9 h-9 rounded-full bg-white/10 items-center justify-center mr-3"
          >
            <Ionicons name="close" size={20} color="white" />
          </Pressable>
          <View>
            <Text className="text-white font-bold text-lg">Absen Masuk</Text>
            <Text className="text-blue-300 text-xs mt-0.5">
              Langkah 2 dari 3 · Pengenalan wajah
            </Text>
          </View>
        </View>

        {/* Area bingkai wajah */}
        <View className="flex-1 mx-5 bg-white/5 border border-white/10 rounded-3xl items-center justify-between py-8">
          <View />

          <FaceFrame />

          {/* Instruksi liveness */}
          <View className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3 flex-row items-center gap-2">
            <View className="w-2 h-2 rounded-full bg-amber-400" />
            <Text className="text-white font-semibold text-sm">
              {livenessStep.instruction}
            </Text>
          </View>
        </View>

        {/* Footer: instruksi + tombol */}
        <View className="px-5 pt-4 pb-5">
          <Text className="text-white font-bold text-center text-base">
            Posisikan wajah di dalam bingkai
          </Text>
          <Text className="text-slate-400 text-center text-xs mt-1 mb-4">
            Pastikan pencahayaan cukup & wajah tidak tertutup masker
          </Text>

          <Pressable
            onPress={handleCapture}
            disabled={isCapturing}
            className="bg-blue-600 rounded-2xl py-4 flex-row items-center justify-center gap-2 active:opacity-80 disabled:opacity-50"
          >
            <Ionicons name="scan-outline" size={18} color="white" />
            <Text className="text-white font-semibold text-base">
              {isCapturing ? "Memverifikasi..." : "Ambil & Verifikasi"}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
