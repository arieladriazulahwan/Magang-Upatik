import { Feather, Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";
import GridBackground from "./GridBackground";

type PresensiToday = {
  sudahAbsenMasuk: boolean;
  jamMasuk: string | null;
  sudahAbsenPulang: boolean;
  jamPulang: string | null;
};

type PresenceCardProps = {
  dateLabel: string; // "Senin, 21 September 2026"
  workModeLabel: string; // "WFO - Reguler"
  radiusLabel: string; // "Dalam radius · Gd. Dekanat FATEK · 12 m"
  presensi: PresensiToday;
  onAbsenMasuk: () => void;
  onAbsenPulang: () => void;
};

export default function PresenceCard({
  dateLabel,
  workModeLabel,
  radiusLabel,
  presensi,
  onAbsenMasuk,
  onAbsenPulang,
}: PresenceCardProps) {
  return (
    <LinearGradient
      colors={["#0f2347", "#09152a"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        borderRadius: 24,
        padding: 20,
        overflow: "hidden",
        width: "100%",
      }}
    >
      <GridBackground />

      {/* Header: Tanggal & Badge mode kerja */}
      <View className="flex-row justify-between items-center mb-3">
        <Text style={{ color: "#94a3b8", fontSize: 13, fontWeight: "500" }}>
          {dateLabel}
        </Text>
        <View
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.12)",
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#cbd5e1", fontSize: 12, fontWeight: "600" }}>
            {workModeLabel}
          </Text>
        </View>
      </View>

      {presensi.sudahAbsenMasuk ? (
        <>
          {/* ===== STATE: SUDAH ABSEN MASUK ===== */}
          <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "700" }}>
            Sudah absen masuk
          </Text>
          <Text
            style={{
              color: "#94a3b8",
              fontSize: 13,
              marginTop: 4,
              marginBottom: 16,
            }}
          >
            Jangan lupa absen pulang sebelum 17.00
          </Text>

          {/* Kotak jam Masuk & Pulang */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{ color: "#93c5fd", fontSize: 11, fontWeight: "600" }}
              >
                MASUK
              </Text>
              <Text
                style={{
                  color: "white",
                  fontSize: 22,
                  fontWeight: "700",
                  marginTop: 2,
                }}
              >
                {presensi.jamMasuk ?? "—"}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
              }}
            >
              <Text
                style={{ color: "#93c5fd", fontSize: 11, fontWeight: "600" }}
              >
                PULANG
              </Text>
              <Text
                style={{
                  color: "white",
                  fontSize: 22,
                  fontWeight: "700",
                  marginTop: 2,
                }}
              >
                {presensi.jamPulang ?? "—"}
              </Text>
            </View>
          </View>

          {/* Pill radius lokasi */}
          <RadiusPill label={radiusLabel} />

          {/* Tombol Absen Pulang */}
          <Pressable
            style={{
              backgroundColor: "#2563eb",
              borderRadius: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 16,
            }}
            className="active:opacity-80"
            onPress={onAbsenPulang}
          >
            <Feather name="maximize" size={18} color="#ffffff" />
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>
              Absen Pulang
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          {/* ===== STATE: BELUM ABSEN MASUK ===== */}
          <Text style={{ color: "#ffffff", fontSize: 20, fontWeight: "700" }}>
            Anda belum absen masuk
          </Text>
          <Text
            style={{
              color: "#94a3b8",
              fontSize: 13,
              marginTop: 4,
              marginBottom: 16,
            }}
          >
            Ketuk untuk memulai presensi hari ini
          </Text>

          <RadiusPill label={radiusLabel} />

          <Pressable
            style={{
              backgroundColor: "#2563eb",
              borderRadius: 16,
              paddingVertical: 14,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 16,
            }}
            className="active:opacity-80"
            onPress={onAbsenMasuk}
          >
            <Feather name="maximize" size={18} color="#ffffff" />
            <Text style={{ color: "#ffffff", fontSize: 16, fontWeight: "700" }}>
              Absen Masuk
            </Text>
          </Pressable>
        </>
      )}
    </LinearGradient>
  );
}

function RadiusPill({ label }: { label: string }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        borderColor: "rgba(45, 212, 191, 0.35)",
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 8,
      }}
    >
      <Ionicons name="location-outline" size={16} color="#2dd4bf" />
      <Text style={{ color: "#2dd4bf", fontSize: 13, fontWeight: "600" }}>
        {label}
      </Text>
    </View>
  );
}
