import React, {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Button from "../../components/Button";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import {
  enrollFace,
  getFaceStatus,
  type ApiFaceStatus,
  type PhotoPayload,
} from "../../services/api";

const FACE_STEPS = [
  {
    pose: "front",
    title: "Hadap depan",
    instruction: "Tatap kamera lurus dengan wajah berada di tengah bingkai.",
  },
  {
    pose: "left",
    title: "Miring kiri",
    instruction: "Putar wajah sedikit ke kiri, mata tetap terlihat jelas.",
  },
  {
    pose: "right",
    title: "Miring kanan",
    instruction: "Putar wajah sedikit ke kanan tanpa keluar dari bingkai.",
  },
  {
    pose: "up",
    title: "Sedikit ke atas",
    instruction: "Angkat dagu sedikit agar bagian bawah wajah ikut terbaca.",
  },
  {
    pose: "down",
    title: "Sedikit ke bawah",
    instruction: "Tundukkan wajah sedikit agar area dahi dan mata terbaca.",
  },
];

const wait = (ms: number) =>
  new Promise((resolve) =>
    setTimeout(resolve, ms)
  );

export default function DaftarWajahScreen() {
  const cameraRef = useRef<CameraView | null>(null);

  const [
    permission,
    requestPermission,
  ] = useCameraPermissions();

  const [
    cameraReady,
    setCameraReady,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    status,
    setStatus,
  ] = useState<ApiFaceStatus | null>(null);

  const [
    captureIndex,
    setCaptureIndex,
  ] = useState(0);

  const [
    capturedPhotos,
    setCapturedPhotos,
  ] = useState<PhotoPayload[]>([]);

  useEffect(() => {
    if (
      permission &&
      !permission.granted
    ) {
      requestPermission();
    }
  }, [
    permission,
    requestPermission,
  ]);

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const response =
          await getFaceStatus();

        if (active) {
          setStatus(
            response.data
          );
        }
      } catch (error) {
        console.error(
          "FACE STATUS LOAD ERROR:",
          error
        );
      }
    }

    loadStatus();

    return () => {
      active = false;
    };
  }, []);

  const submitEnrollment = async (
    photos: PhotoPayload[]
  ) => {
    const response = await enrollFace({
      replace: true,
      photos,
    });

    setStatus(
      response.data
    );

    Alert.alert(
      "Wajah terdaftar",
      `${photos.length} sampel wajah berhasil disimpan untuk verifikasi presensi.`,
      [
        {
          text: "OK",
          onPress: () =>
            router.back(),
        },
      ]
    );
  };

  const handleCaptureStep = async () => {
    if (
      saving ||
      !cameraRef.current ||
      !cameraReady
    ) {
      return;
    }

    try {
      setSaving(true);

      if (capturedPhotos.length >= FACE_STEPS.length) {
        await submitEnrollment(capturedPhotos);
        return;
      }

      await wait(450);

      const step =
        FACE_STEPS[captureIndex];

      const photo =
        await cameraRef.current.takePictureAsync({
          quality: 0.92,
          base64: false,
          skipProcessing: false,
        });

      if (!photo?.uri) {
        throw new Error(
          "Foto wajah tidak berhasil diambil."
        );
      }

      const nextPhotos = [
        ...capturedPhotos,
        {
          uri: photo.uri,
          name: `wajah-${step.pose}-${Date.now()}.jpg`,
          type: "image/jpeg",
          pose: step.pose,
        },
      ];

      setCapturedPhotos(nextPhotos);

      if (nextPhotos.length < FACE_STEPS.length) {
        setCaptureIndex(nextPhotos.length);
        return;
      }

      await submitEnrollment(nextPhotos);
    } catch (error) {
      console.error(
        "FACE ENROLL ERROR:",
        error
      );

      Alert.alert(
        "Pendaftaran gagal",
        error instanceof Error
          ? error.message
          : "Data wajah gagal didaftarkan."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleResetCapture = () => {
    if (saving) {
      return;
    }

    setCapturedPhotos([]);
    setCaptureIndex(0);
  };

  if (
    permission &&
    !permission.granted
  ) {
    return (
      <MainScreen showBottomNav={false}>
        <Header />
        <View style={styles.centerBox}>
          <View style={styles.permissionIcon}>
            <Ionicons
              name="camera-outline"
              size={34}
              color={Colors.primary}
            />
          </View>
          <Text style={styles.centerTitle}>
            Izin kamera diperlukan
          </Text>
          <Text style={styles.centerText}>
            Kamera digunakan untuk mengambil data wajah pegawai.
          </Text>
          <Button
            title="Izinkan Kamera"
            onPress={requestPermission}
          />
        </View>
      </MainScreen>
    );
  }

  return (
    <MainScreen showBottomNav={false}>
      <Header />

      <View style={styles.statusCard}>
        <View
          style={[
            styles.statusIcon,
            status?.registered
              ? styles.statusIconSuccess
              : null,
          ]}
        >
          <Ionicons
            name={
              status?.registered
                ? "checkmark-circle-outline"
                : "scan-outline"
            }
            size={22}
            color={
              status?.registered
                ? "#16A34A"
                : Colors.primary
            }
          />
        </View>
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>
            {status?.registered
              ? "Wajah sudah terdaftar"
              : "Wajah belum terdaftar"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {status?.registered
              ? `${status.sample_count} sampel aktif tersimpan`
              : "Ambil foto wajah untuk mengaktifkan verifikasi presensi"}
          </Text>
        </View>
      </View>

      <View style={styles.cameraCard}>
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFillObject}
          facing="front"
          onCameraReady={() =>
            setCameraReady(true)
          }
        />
        <View style={styles.overlay}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>
              {saving
                ? "Menangkap foto..."
                : `${capturedPhotos.length}/${FACE_STEPS.length} sampel`}
            </Text>
          </View>
          <View style={styles.faceFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
        </View>
      </View>

      <View style={styles.instructionCard}>
        <View style={styles.instructionIcon}>
          <Ionicons
            name="scan-outline"
            size={20}
            color={Colors.primary}
          />
        </View>
        <View style={styles.instructionText}>
          <Text style={styles.instructionTitle}>
            {saving
              ? FACE_STEPS[captureIndex].title
              : FACE_STEPS[captureIndex].title}
          </Text>
          <Text style={styles.instructionSubtitle}>
            {saving
              ? "Tahan posisi sebentar, jangan bergerak sampai foto selesai diambil."
              : FACE_STEPS[captureIndex].instruction}
          </Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        {FACE_STEPS.map((step, index) => {
          const done =
            index < capturedPhotos.length;
          const active =
            index === captureIndex &&
            capturedPhotos.length < FACE_STEPS.length;

          return (
            <View
              key={step.title}
              style={[
                styles.progressDot,
                done ? styles.progressDotDone : null,
                active ? styles.progressDotActive : null,
              ]}
            >
              <Text
                style={[
                  styles.progressDotText,
                  done || active
                    ? styles.progressDotTextActive
                    : null,
                ]}
              >
                {index + 1}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.tipBox}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={Colors.primaryDark}
        />
        <Text style={styles.tipText}>
          Pastikan wajah berada di dalam bingkai dan pencahayaan cukup.
        </Text>
      </View>

      {capturedPhotos.length > 0 && !saving ? (
        <Pressable
          style={styles.resetButton}
          onPress={handleResetCapture}
        >
          <Ionicons
            name="refresh-outline"
            size={16}
            color={Colors.primary}
          />
          <Text style={styles.resetText}>
            Ulangi dari awal
          </Text>
        </Pressable>
      ) : null}

      <Button
        title={
          saving
            ? "Mengambil Foto..."
            : capturedPhotos.length >= FACE_STEPS.length
            ? "Simpan Data Wajah"
            : status?.registered
            ? capturedPhotos.length === FACE_STEPS.length - 1
              ? "Simpan Data Wajah"
              : capturedPhotos.length === 0
              ? "Mulai Perbarui Data Wajah"
              : "Ambil Foto Berikutnya"
            : capturedPhotos.length === FACE_STEPS.length - 1
            ? "Simpan Data Wajah"
            : capturedPhotos.length === 0
            ? "Mulai Daftarkan Wajah"
            : "Ambil Foto Berikutnya"
        }
        loading={saving}
        disabled={
          !cameraReady ||
          saving
        }
        icon={
          saving ? null : (
            <Ionicons
              name="camera-outline"
              size={19}
              color="#fff"
            />
          )
        }
        onPress={handleCaptureStep}
      />

      {!cameraReady ? (
        <View style={styles.loadingCamera}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingCameraText}>
            Menyiapkan kamera...
          </Text>
        </View>
      ) : null}
    </MainScreen>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <Pressable
        style={styles.backButton}
        onPress={() =>
          router.back()
        }
      >
        <Ionicons
          name="chevron-back"
          size={22}
          color={Colors.textInk}
        />
      </Pressable>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>
          Daftar Wajah
        </Text>
        <Text style={styles.headerSubtitle}>
          Verifikasi presensi pegawai
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.textInk,
    fontSize: 16,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#7A8699",
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 2,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF1FF",
  },
  statusIconSuccess: {
    backgroundColor: "#E7F6ED",
  },
  statusText: {
    flex: 1,
    minWidth: 0,
  },
  statusTitle: {
    color: Colors.textInk,
    fontSize: 13.5,
    fontWeight: "800",
  },
  statusSubtitle: {
    color: "#7A8699",
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "600",
    marginTop: 2,
  },
  cameraCard: {
    width: "100%",
    height: 520,
    maxHeight: "58%",
    overflow: "hidden",
    borderRadius: 20,
    position: "relative",
    backgroundColor: "#0A1D36",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  stepBadge: {
    position: "absolute",
    top: 14,
    alignSelf: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(17,24,39,0.72)",
  },
  stepBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "800",
  },
  faceFrame: {
    width: 220,
    height: 280,
    borderRadius: 110,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 38,
    height: 38,
    borderColor: "rgba(255,255,255,0.95)",
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 18,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 18,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 18,
  },
  cornerBottomRight: {
    right: 0,
    bottom: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderBottomRightRadius: 18,
  },
  tipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    padding: 13,
    borderRadius: 14,
    backgroundColor: "#EAF1FF",
  },
  instructionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  instructionIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF1FF",
  },
  instructionText: {
    flex: 1,
    minWidth: 0,
  },
  instructionTitle: {
    color: Colors.textInk,
    fontSize: 13,
    fontWeight: "800",
  },
  instructionSubtitle: {
    color: "#6B7280",
    fontSize: 11.5,
    lineHeight: 17,
    fontWeight: "600",
    marginTop: 2,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E5E7EB",
  },
  progressDotDone: {
    backgroundColor: "#16A34A",
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },
  progressDotText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "800",
  },
  progressDotTextActive: {
    color: Colors.white,
  },
  tipText: {
    flex: 1,
    color: Colors.textInk,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  loadingCamera: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingCameraText: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "700",
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 4,
  },
  resetText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: "800",
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 20,
  },
  permissionIcon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF1FF",
  },
  centerTitle: {
    color: Colors.textInk,
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  centerText: {
    color: "#7A8699",
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "600",
    textAlign: "center",
  },
});
