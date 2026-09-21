import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AbsenResult, { AbsenResultData } from "../functions/absen/AbsenResult";
import GridBackground from "../functions/absen/GridBackground";
import VerificationChecklist, {
  VerificationStep,
} from "../functions/absen/VerificationChecklist";
import VerificationRing from "../functions/absen/VerificationRing";

const initialSteps: VerificationStep[] = [
  { id: "embedding", label: "Mengekstrak embedding wajah (512-d)", status: "pending" },
  { id: "matching", label: "Mencocokkan (cosine similarity)", status: "pending" },
  { id: "liveness", label: "Uji anti-spoofing / liveness", status: "pending" },
];

const STEP_DURATION = 1200;

// Data dummy hasil akhir — nanti diganti respons asli dari server
// setelah semua tahap verifikasi (embedding, matching, liveness) selesai
const dummyResult: AbsenResultData = {
  time: "15:56",
  timezone: "WITA",
  date: "Rabu, 16 September 2026",
  statusLabel: "Hadir · Tepat waktu",
  faceMatchScore: 0.93,
  livenessPassed: true,
  geofenceLocation: "Gd. Dekanat FATEK",
  presenceType: "WFO · Dosen Tugas Tambahan",
};

export default function VerifikasiProsesScreen() {
  const [steps, setSteps] = useState<VerificationStep[]>(initialSteps);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let currentIndex = 0;

    function runNextStep() {
      if (currentIndex >= initialSteps.length) {
        setIsDone(true);
        return;
      }

      setSteps((prev) =>
        prev.map((step, i) => (i === currentIndex ? { ...step, status: "loading" } : step))
      );

      setTimeout(() => {
        setSteps((prev) =>
          prev.map((step, i) => (i === currentIndex ? { ...step, status: "done" } : step))
        );
        currentIndex += 1;
        runNextStep();
      }, STEP_DURATION);
    }

    runNextStep();
  }, []);

  function handleClose() {
    router.back();
  }

  function handleSelesai() {
    // Alur presensi selesai — kembali ke Beranda, tidak boleh "back" ke step verifikasi lagi
    router.replace("/beranda");
  }

  return (
    <LinearGradient
      colors={["#0f2347", "#09152a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <GridBackground />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View className="flex-row items-center px-5 pt-2 mb-2">
          <Pressable
            onPress={handleClose}
            className="w-9 h-9 rounded-full bg-white/10 items-center justify-center mr-3"
          >
            <Ionicons name="close" size={20} color="white" />
          </Pressable>
          <View>
            <Text className="text-white font-bold text-lg">Absen Masuk</Text>
            <Text className="text-blue-300 text-xs mt-0.5">
              {isDone ? "Selesai" : "Langkah 3 dari 3 · Verifikasi"}
            </Text>
          </View>
        </View>

        {/* Konten: checklist proses, ATAU hasil sukses setelah selesai */}
        {isDone ? (
          <AbsenResult data={dummyResult} onSelesai={handleSelesai} />
        ) : (
          <View className="flex-1 items-center justify-center px-8">
            <VerificationRing />

            <Text className="text-white font-bold text-lg mt-6">
              Memverifikasi wajah...
            </Text>
            <Text className="text-blue-300 text-xs mt-1 mb-6">
              Mengirim ke microservice face recognition
            </Text>

            <View className="w-full">
              <VerificationChecklist steps={steps} />
            </View>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}