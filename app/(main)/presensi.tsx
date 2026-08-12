import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import { Colors } from "../../constants/colors";
import { usePrototype } from "../../contexts/PrototypeContext";

type Step = "lokasi" | "wajah" | "hasil";

export default function PresensiScreen() {
  const [step, setStep] = useState<Step>("lokasi");
  const [completedType, setCompletedType] = useState<"masuk" | "pulang" | null>(null);
  const { attendanceState, jamMasuk, jamPulang, submitAttendance } = usePrototype();
  const type = attendanceState === "masuk" ? "pulang" : "masuk";
  const typeLabel = type === "masuk" ? "Masuk" : "Pulang";
  const resultType = completedType || type;
  const resultLabel = resultType === "masuk" ? "Masuk" : "Pulang";
  const resultTime = resultType === "masuk" ? jamMasuk : jamPulang;

  const finishAttendance = () => {
    setCompletedType(type);
    submitAttendance(type);
    setStep("hasil");
  };

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>{"<"}</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Presensi {typeLabel}</Text>
          <Text style={styles.subtitle}>
            {step === "lokasi" ? "Langkah 1 dari 3 - Validasi lokasi" : step === "wajah" ? "Langkah 2 dari 3 - Pengenalan wajah" : "Selesai"}
          </Text>
        </View>
      </View>

      {step === "lokasi" ? (
        <View style={styles.content}>
          <View style={styles.mapMock}>
            <View style={styles.radius} />
            <View style={styles.pin}>
              <Text style={styles.pinText}>12 m</Text>
            </View>
            <View style={styles.mapInfo}>
              <Text style={styles.mapTitle}>Dalam radius geofence</Text>
              <Text style={styles.mapSub}>Gd. Dekanat FATEK - Universitas Tadulako</Text>
            </View>
          </View>
          <View style={styles.darkCard}>
            <Text style={styles.cardTitle}>Lokasi terverifikasi</Text>
            <Text style={styles.cardSub}>Pastikan Anda berada di area kerja sebelum melanjutkan scan wajah.</Text>
          </View>
          <Button title="Lanjut Scan Wajah" onPress={() => setStep("wajah")} />
        </View>
      ) : null}

      {step === "wajah" ? (
        <View style={styles.content}>
          <View style={styles.camera}>
            <View style={styles.faceCircle}>
              <Svg width={92} height={92} viewBox="0 0 24 24">
                <Circle cx="12" cy="9.5" r="4.2" stroke="#FFFFFF" strokeWidth="1.1" fill="none" />
                <Path d="M4.5 21a7.5 7.5 0 0 1 15 0" stroke="#FFFFFF" strokeWidth="1.1" fill="none" />
              </Svg>
            </View>
            <View style={styles.scanLine} />
            <Text style={styles.cameraHint}>Posisikan wajah di dalam bingkai</Text>
          </View>
          <Button title="Verifikasi Wajah" onPress={finishAttendance} />
        </View>
      ) : null}

      {step === "hasil" ? (
        <View style={styles.content}>
          <View style={styles.resultIcon}>
            <Text style={styles.resultCheck}>OK</Text>
          </View>
          <Text style={styles.resultTitle}>Presensi berhasil</Text>
          <Text style={styles.resultSub}>{resultLabel} tercatat pukul {resultTime || "--:--"} WITA</Text>
          <View style={styles.resultCard}>
            <Row label="Skor kemiripan wajah" value="0.93 - lolos" />
            <Row label="Anti-spoofing / liveness" value="Lolos" />
            <Row label="Lokasi geofence" value="Gd. Dekanat FATEK" />
            <Row label="Tipe presensi" value={`WFO - ${resultLabel}`} />
          </View>
          <Badge label="Hadir - Tepat waktu" tone="green" />
          <Button title="Kembali ke Beranda" onPress={() => router.replace("/(main)")} />
        </View>
      ) : null}
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.backgroundInk,
  },
  top: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 16,
  },
  back: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  backText: {
    color: Colors.white,
    fontSize: 32,
    lineHeight: 34,
  },
  title: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    color: "#9FB5D4",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  content: {
    flex: 1,
    gap: 16,
    padding: 18,
  },
  mapMock: {
    height: 330,
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#17385F",
  },
  radius: {
    position: "absolute",
    width: 230,
    height: 230,
    left: "50%",
    top: "48%",
    marginLeft: -115,
    marginTop: -115,
    borderRadius: 115,
    borderWidth: 2,
    borderColor: "rgba(96,165,250,0.45)",
    backgroundColor: "rgba(96,165,250,0.1)",
  },
  pin: {
    position: "absolute",
    left: "50%",
    top: "48%",
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -32,
    marginTop: -32,
    borderRadius: 32,
    backgroundColor: Colors.primary,
  },
  pinText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  mapInfo: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "rgba(8,18,38,0.72)",
  },
  mapTitle: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  mapSub: {
    color: "#9FB5D4",
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 3,
  },
  darkCard: {
    padding: 15,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  cardTitle: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "800",
  },
  cardSub: {
    color: "#9FB5D4",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 5,
  },
  camera: {
    height: 420,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 22,
    backgroundColor: "#05070B",
  },
  faceCircle: {
    width: 220,
    height: 270,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 110,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(96,165,250,0.65)",
  },
  scanLine: {
    position: "absolute",
    left: 45,
    right: 45,
    height: 2,
    backgroundColor: Colors.primarySoft,
    top: "55%",
  },
  cameraHint: {
    position: "absolute",
    bottom: 18,
    color: Colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  resultIcon: {
    width: 78,
    height: 78,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#0F7A4A",
    marginTop: 30,
  },
  resultCheck: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: "800",
  },
  resultTitle: {
    color: Colors.white,
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  resultSub: {
    color: "#9FB5D4",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  resultCard: {
    paddingHorizontal: 15,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  resultLabel: {
    flex: 1,
    color: "#9FB5D4",
    fontSize: 12,
    fontWeight: "600",
  },
  resultValue: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
});
