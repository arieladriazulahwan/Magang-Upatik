import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, Pattern, Path, Rect } from "react-native-svg";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { mockLogin } from "../services/mockApi";

const GRID_SIZE = 32;

// ============================================================
// Grid pattern
// ============================================================
function GridBackground() {
  return (
    <Svg style={{ position: "absolute", width: "100%", height: "100%" }}>
      <Defs>
        <Pattern
          id="grid"
          width={GRID_SIZE}
          height={GRID_SIZE}
          patternUnits="userSpaceOnUse"
        >
          <Path
            d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={1}
          />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#grid)" />
    </Svg>
  );
}

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ingatSaya, setIngatSaya] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogin() {
    if (!nip || !password) {
      setErrorMessage("NIP dan kata sandi wajib diisi");
      return;
    }

    setErrorMessage("");
    setLoading(true);

    try {
      // pakai mock dulu — nanti tinggal ganti ke fetch() API asli
      await mockLogin(nip, password);

      // auth di-skip sementara: nggak nyimpen token/context apapun,
      // langsung lempar ke halaman utama begitu "login" (mock) berhasil
      router.replace("/main");
    } catch (error: any) {
      setErrorMessage(error.message || "Terjadi kesalahan, coba lagi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1">
      {/* ===== BACKGROUND: gradient + glow + grid ===== */}
      <LinearGradient
        colors={["#0a1128", "#0d1b3e", "#0a1128"]}
        style={{ position: "absolute", width: "100%", height: "100%" }}
      />
      <LinearGradient
        colors={["rgba(59,91,219,0.35)", "transparent"]}
        style={{ position: "absolute", width: "100%", height: 380, top: 0 }}
      />
      <GridBackground />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 20,
            paddingBottom: 40,
            paddingHorizontal: 24,
            flexGrow: 1,
          }}
        >
          {/* ===== HEADER: Logo + Nama App ===== */}
          <View className="flex-row items-center gap-2 mb-10">
            <View className="w-9 h-9 bg-blue-600 rounded-xl items-center justify-center">
              <Text className="text-white font-bold text-sm">KP</Text>
            </View>
            <View>
              <Text className="text-white font-bold text-base">
                KlikPresensi
              </Text>
              <Text className="text-slate-400 text-[10px] tracking-wide">
                UNIVERSITAS TADULAKO
              </Text>
            </View>
          </View>

          {/* ===== ICON PROFIL BULAT ===== */}
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-2xl bg-white/5 border border-white/10 items-center justify-center">
              <Ionicons name="person-outline" size={32} color="#94a3b8" />
            </View>
          </View>

          {/* ===== JUDUL ===== */}
          <Text className="text-white text-xl font-bold text-center mb-1">
            Masuk ke akun Anda
          </Text>
          <Text className="text-slate-400 text-sm text-center mb-8">
            Gunakan NIP/username & kata sandi kepegawaian Untad
          </Text>

          {/* ===== PESAN ERROR (muncul kalau login gagal) ===== */}
          {errorMessage ? (
            <View className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-4">
              <Text className="text-red-400 text-xs text-center">
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {/* ===== INPUT: NIP / Username ===== */}
          <View className="mb-4">
            <Text className="text-slate-300 text-xs font-medium mb-2">
              NIP / Username
            </Text>
            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-xl px-4">
              <Ionicons name="person-outline" size={18} color="#64748b" />
              <TextInput
                value={nip}
                onChangeText={setNip}
                placeholder="198203152008011002"
                placeholderTextColor="#475569"
                keyboardType="default"
                className="flex-1 text-white text-sm py-3.5 px-3"
              />
            </View>
          </View>

          {/* ===== INPUT: Kata Sandi ===== */}
          <View className="mb-3">
            <Text className="text-slate-300 text-xs font-medium mb-2">
              Kata sandi
            </Text>
            <View className="flex-row items-center bg-white/5 border border-white/10 rounded-xl px-4">
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan kata sandi"
                placeholderTextColor="#475569"
                secureTextEntry={!showPassword}
                className="flex-1 text-white text-sm py-3.5 px-3"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color="#64748b"
                />
              </Pressable>
            </View>
          </View>

          {/* ===== ROW: Ingat saya & Lupa sandi ===== */}
          <View className="flex-row items-center justify-between mb-6">
            <Pressable
              onPress={() => setIngatSaya(!ingatSaya)}
              className="flex-row items-center gap-2"
            >
              <View
                className={
                  ingatSaya
                    ? "w-4 h-4 rounded bg-blue-500 items-center justify-center"
                    : "w-4 h-4 rounded border border-slate-500 items-center justify-center"
                }
              >
                {ingatSaya && (
                  <Ionicons name="checkmark" size={12} color="white" />
                )}
              </View>
              <Text className="text-slate-300 text-xs">Ingat saya</Text>
            </Pressable>

            <Pressable>
              <Text className="text-blue-400 text-xs font-medium">
                Lupa sandi?
              </Text>
            </Pressable>
          </View>

          {/* ===== TOMBOL MASUK ===== */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="bg-blue-600 rounded-xl py-4 flex-row items-center justify-center gap-2 active:bg-blue-700 disabled:opacity-60 mb-5"
          >
            <Text className="text-white font-semibold text-base">
              {loading ? "Memproses..." : "Masuk"}
            </Text>
            {!loading && <Feather name="arrow-right" size={18} color="white" />}
          </Pressable>

          {/* ===== DIVIDER "atau" ===== */}
          <View className="flex-row items-center gap-3 mb-5">
            <View className="flex-1 h-[1px] bg-white/10" />
            <Text className="text-slate-500 text-xs">atau</Text>
            <View className="flex-1 h-[1px] bg-white/10" />
          </View>

          {/* ===== TOMBOL SSO ===== */}
          <Pressable className="border border-white/10 bg-white/5 rounded-xl py-4 flex-row items-center justify-center gap-2 active:bg-white/10">
            <Ionicons name="shield-checkmark-outline" size={18} color="#e2e8f0" />
            <Text className="text-slate-100 font-medium text-sm">
              Masuk dengan SSO SIGA8
            </Text>
          </Pressable>

          {/* ===== FOOTER ===== */}
          <View className="flex-row items-center justify-center gap-1 mt-8">
            <Ionicons name="help-circle-outline" size={14} color="#64748b" />
            <Text className="text-slate-500 text-xs">
              Bantuan · helpdesk@untad.ac.id
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
