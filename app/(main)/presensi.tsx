import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

import * as Location from "expo-location";

import { router } from "expo-router";

import Svg, {
  Path,
  Circle,
} from "react-native-svg";

import {
  usePrototype,
} from "../../contexts/PrototypeContext";

/* =====================================================
   ICONS
===================================================== */

function BackIcon() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M15 18l-6-6 6-6"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function CameraIcon() {
  return (
    <Svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M4 7h4l1.5-2h5L16 7h4v12H4z"
        stroke="#fff"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      <Circle
        cx="12"
        cy="13"
        r="3.2"
        stroke="#fff"
        strokeWidth="1.8"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg
      width={48}
      height={48}
      viewBox="0 0 24 24"
      fill="none"
    >
      <Path
        d="M5 12l5 5L20 6"
        stroke="#fff"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* =====================================================
   TYPE
===================================================== */

type Step =
  | "camera"
  | "proses"
  | "hasil";

/* =====================================================
   SCREEN
===================================================== */

export default function PresensiScreen() {
  const {
    attendanceState,
    submitAttendance,
  } = usePrototype();

  const [
    cameraPermission,
    requestCameraPermission,
  ] = useCameraPermissions();

  const [
    step,
    setStep,
  ] = useState<Step>("camera");

  const [
    location,
    setLocation,
  ] =
    useState<Location.LocationObject | null>(
      null
    );

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(false);

  const [
    cameraReady,
    setCameraReady,
  ] = useState(false);

  const [
    processing,
    setProcessing,
  ] = useState(false);

  const [
    resultTime,
    setResultTime,
  ] = useState<string | null>(
    null
  );

  const [
    resultMessage,
    setResultMessage,
  ] = useState("");

  const cameraRef =
    useRef<CameraView | null>(null);

  const jenis =
    attendanceState === "belum"
      ? "masuk"
      : "pulang";

  const jenisLabel =
    jenis === "masuk"
      ? "Masuk"
      : "Pulang";

  /* ===================================================
     REQUEST LOCATION
  =================================================== */

  const getLocation =
    async (): Promise<boolean> => {
      try {
        setLocationLoading(true);

        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (
          permission.status !==
          Location.PermissionStatus.GRANTED
        ) {
          Alert.alert(
            "Lokasi diperlukan",
            "Izinkan aplikasi mengakses lokasi untuk melakukan presensi."
          );

          return false;
        }

        const current =
          await Location.getCurrentPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,
            }
          );

        setLocation(current);

        return true;
      } catch (error) {
        console.error(
          "LOCATION ERROR:",
          error
        );

        Alert.alert(
          "Lokasi gagal",
          "Lokasi perangkat tidak dapat diperoleh. Pastikan GPS aktif."
        );

        return false;
      } finally {
        setLocationLoading(false);
      }
    };

  /* ===================================================
     CAMERA PERMISSION
  =================================================== */

  useEffect(() => {
    if (
      cameraPermission &&
      !cameraPermission.granted
    ) {
      requestCameraPermission();
    }
  }, []);

  /* ===================================================
     TAKE PHOTO
  =================================================== */

  const takePhoto =
    async () => {
      if (
        !cameraRef.current ||
        processing ||
        !cameraReady
      ) {
        return;
      }

      try {
        setProcessing(true);

        /*
         * Lokasi diambil sebelum foto
         * dikirim.
         */
        const locationSuccess =
          location
            ? true
            : await getLocation();

        if (!locationSuccess) {
          setProcessing(false);
          return;
        }

        /*
         * Ambil foto wajah.
         */
        const photo =
          await cameraRef.current.takePictureAsync(
            {
              quality: 0.8,
              base64: false,
            }
          );

        if (!photo?.uri) {
          throw new Error(
            "Foto tidak berhasil diambil."
          );
        }

        /*
         * Masuk ke halaman proses.
         */
        setStep("proses");

        /*
         * Kirim presensi.
         */
        await processAttendance(
          photo.uri
        );
      } catch (error) {
        console.error(
          "CAMERA ERROR:",
          error
        );

        setProcessing(false);

        Alert.alert(
          "Presensi gagal",
          error instanceof Error
            ? error.message
            : "Foto tidak dapat diambil."
        );
      }
    };

  /* ===================================================
     PROCESS ATTENDANCE
  =================================================== */

  const processAttendance =
    async (
      photoUri: string
    ) => {
      if (!location) {
        Alert.alert(
          "Lokasi belum tersedia",
          "Lokasi belum berhasil diperoleh."
        );

        setStep("camera");
        setProcessing(false);

        return;
      }

      try {
        /*
         * Fungsi context menerima:
         *
         * jenis
         * foto
         * latitude
         * longitude
         */
        const success =
          await submitAttendance(
            jenis,
            photoUri,
            location.coords.latitude,
            location.coords.longitude
          );

        if (!success) {
          setStep("camera");
          return;
        }

        const now =
          new Date();

        const formatted =
          `${String(
            now.getHours()
          ).padStart(2, "0")}:${String(
            now.getMinutes()
          ).padStart(2, "0")}`;

        setResultTime(formatted);

        setResultMessage(
          jenis === "masuk"
            ? "Presensi masuk berhasil dicatat."
            : "Presensi pulang berhasil dicatat."
        );

        setStep("hasil");
      } catch (error) {
        console.error(
          "ATTENDANCE ERROR:",
          error
        );

        Alert.alert(
          "Presensi gagal",
          error instanceof Error
            ? error.message
            : "Presensi gagal dikirim."
        );

        setStep("camera");
      } finally {
        setProcessing(false);
      }
    };

  /* ===================================================
     BACK
  =================================================== */

  const handleBack = () => {
    if (processing) {
      return;
    }

    router.back();
  };

  /* ===================================================
     PERMISSION LOADING
  =================================================== */

  if (!cameraPermission) {
    return (
      <View style={styles.root}>
        <Header
          title={`Absen ${jenisLabel}`}
          subtitle="Verifikasi wajah"
          onBack={handleBack}
        />

        <View style={styles.centerContent}>
          <ActivityIndicator
            size="large"
            color="#2563EB"
          />

          <Text style={styles.loadingText}>
            Memeriksa kamera...
          </Text>
        </View>
      </View>
    );
  }

  /* ===================================================
     CAMERA PERMISSION DENIED
  =================================================== */

  if (!cameraPermission.granted) {
    return (
      <View style={styles.root}>
        <Header
          title={`Absen ${jenisLabel}`}
          subtitle="Verifikasi wajah"
          onBack={handleBack}
        />

        <View style={styles.centerContent}>
          <Text style={styles.permissionTitle}>
            Kamera diperlukan
          </Text>

          <Text style={styles.permissionText}>
            Kamera digunakan untuk
            mengambil foto wajah sebagai
            bukti presensi.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              requestCameraPermission()
            }
          >
            <Text
              style={styles.primaryButtonText}
            >
              Izinkan Kamera
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ===================================================
     CAMERA
  =================================================== */

  if (step === "camera") {
    return (
      <View style={styles.cameraRoot}>
        <Header
          title={`Absen ${jenisLabel}`}
          subtitle="Verifikasi wajah"
          onBack={handleBack}
        />

        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            facing="front"
            onCameraReady={() =>
              setCameraReady(true)
            }
          />

          {/* OVERLAY */}

          <View style={styles.cameraOverlay}>
            {/* CORNER TOP LEFT */}
            <View
              style={[
                styles.corner,
                styles.topLeft,
              ]}
            />

            {/* CORNER TOP RIGHT */}
            <View
              style={[
                styles.corner,
                styles.topRight,
              ]}
            />

            {/* CORNER BOTTOM LEFT */}
            <View
              style={[
                styles.corner,
                styles.bottomLeft,
              ]}
            />

            {/* CORNER BOTTOM RIGHT */}
            <View
              style={[
                styles.corner,
                styles.bottomRight,
              ]}
            />

            {/* FACE FRAME */}

            <View style={styles.faceFrame}>
              <View
                style={styles.scanLine}
              />
            </View>

            {/* LIVENESS */}

            <View style={styles.liveness}>
              <View
                style={styles.livenessDot}
              />

              <Text style={styles.livenessText}>
                Posisikan wajah di dalam
                bingkai
              </Text>
            </View>
          </View>
        </View>

        {/* CAMERA BOTTOM */}

        <View style={styles.cameraBottom}>
          <Text style={styles.cameraTitle}>
            Verifikasi wajah
          </Text>

          <Text style={styles.cameraSubtitle}>
            Pastikan wajah terlihat jelas,
            pencahayaan cukup, dan tidak
            menggunakan masker.
          </Text>

          <Pressable
            style={[
              styles.captureButton,
              (!cameraReady ||
                processing ||
                locationLoading) &&
                styles.buttonDisabled,
            ]}
            disabled={
              !cameraReady ||
              processing ||
              locationLoading
            }
            onPress={takePhoto}
          >
            {processing ||
            locationLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <CameraIcon />
            )}

            <Text style={styles.captureText}>
              {locationLoading
                ? "Mendeteksi lokasi..."
                : "Ambil Foto & Verifikasi"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ===================================================
     PROCESS
  =================================================== */

  if (step === "proses") {
    return (
      <View style={styles.cameraRoot}>
        <Header
          title={`Absen ${jenisLabel}`}
          subtitle="Memproses presensi"
          onBack={() => {
            if (!processing) {
              router.back();
            }
          }}
        />

        <View style={styles.processingContent}>
          <View style={styles.processingCircle}>
            <ActivityIndicator
              size="large"
              color="#60A5FA"
            />
          </View>

          <Text style={styles.processingTitle}>
            Memverifikasi presensi
          </Text>

          <Text
            style={styles.processingSubtitle}
          >
            Foto, lokasi, dan data
            presensi sedang diproses.
          </Text>

          <View style={styles.processingSteps}>
            <ProcessRow
              done
              text="Foto wajah diterima"
            />

            <ProcessRow
              done
              text="Lokasi GPS diperoleh"
            />

            <ProcessRow
              loading
              text="Menyimpan presensi"
            />
          </View>
        </View>
      </View>
    );
  }

  /* ===================================================
     RESULT
  =================================================== */

  return (
    <View style={styles.cameraRoot}>
      <Header
        title="Presensi"
        subtitle="Berhasil"
        onBack={() => router.back()}
      />

      <View style={styles.resultContent}>
        <View style={styles.resultCircleOuter}>
          <View style={styles.resultCircle}>
            <CheckIcon />
          </View>
        </View>

        <Text style={styles.resultTitle}>
          Absen {jenisLabel}
          {"\n"}
          Berhasil
        </Text>

        <Text style={styles.resultTime}>
          {resultTime}
        </Text>

        <Text style={styles.resultWita}>
          WITA · Hari ini
        </Text>

        <View style={styles.resultBadge}>
          <View
            style={styles.resultBadgeDot}
          />

          <Text
            style={styles.resultBadgeText}
          >
            {resultMessage}
          </Text>
        </View>

        <View style={styles.resultInfo}>
          <InfoRow
            label="Lokasi"
            value={
              location
                ? `${location.coords.latitude.toFixed(
                    6
                  )}, ${location.coords.longitude.toFixed(
                    6
                  )}`
                : "-"
            }
          />

          <InfoRow
            label="Metode"
            value="WFO · Foto wajah"
          />
        </View>

        <Pressable
          style={styles.primaryButton}
          onPress={() => router.back()}
        >
          <Text
            style={styles.primaryButtonText}
          >
            Kembali ke Beranda
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* =====================================================
   HEADER
===================================================== */

function Header({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <View style={styles.header}>
      <Pressable
        style={styles.backButton}
        onPress={onBack}
      >
        <BackIcon />
      </Pressable>

      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>
          {title}
        </Text>

        <Text style={styles.headerSubtitle}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

/* =====================================================
   PROCESS ROW
===================================================== */

function ProcessRow({
  done,
  loading,
  text,
}: {
  done?: boolean;
  loading?: boolean;
  text: string;
}) {
  return (
    <View style={styles.processRow}>
      <View
        style={[
          styles.processIcon,
          done &&
            styles.processDone,
        ]}
      >
        {done ? (
          <Text style={styles.processCheck}>
            ✓
          </Text>
        ) : loading ? (
          <ActivityIndicator
            size="small"
            color="#60A5FA"
          />
        ) : null}
      </View>

      <Text style={styles.processText}>
        {text}
      </Text>
    </View>
  );
}

/* =====================================================
   INFO ROW
===================================================== */

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>
        {label}
      </Text>

      <Text style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#081222",
  },

  cameraRoot: {
    flex: 1,
    backgroundColor: "#081222",
  },

  header: {
    height: 76,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#0A1428",
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor:
      "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },

  headerSubtitle: {
    color: "#8FB4E8",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 3,
  },

  centerContent: {
    flex: 1,
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    color: "#AFC3DF",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 14,
  },

  permissionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },

  permissionText: {
    color: "#9FB5D4",
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 300,
  },

  primaryButton: {
    minWidth: 220,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingHorizontal: 20,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  /* CAMERA */

  cameraContainer: {
    flex: 1,
    marginHorizontal: 18,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#0A1322",
  },

  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },

  faceFrame: {
    width: 205,
    height: 270,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: "#60A5FA",
    overflow: "hidden",
    backgroundColor:
      "rgba(8,16,32,0.16)",
  },

  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "40%",
    height: 2,
    backgroundColor: "#60A5FA",
    opacity: 0.9,
  },

  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#60A5FA",
  },

  topLeft: {
    top: 16,
    left: 16,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },

  topRight: {
    top: 16,
    right: 16,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },

  bottomLeft: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },

  bottomRight: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },

  liveness: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    padding: 11,
    borderRadius: 13,
    backgroundColor:
      "rgba(8,18,38,0.78)",
    borderWidth: 1,
    borderColor:
      "rgba(96,165,250,0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  livenessDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FBBF24",
  },

  livenessText: {
    color: "#E8F0FC",
    fontSize: 11,
    fontWeight: "700",
  },

  cameraBottom: {
    paddingHorizontal: 22,
    paddingTop: 15,
    paddingBottom:
      Platform.OS === "android"
        ? 24
        : 18,
  },

  cameraTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },

  cameraSubtitle: {
    color: "#9FB5D4",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    marginTop: 5,
  },

  captureButton: {
    height: 52,
    borderRadius: 15,
    marginTop: 15,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },

  captureText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  /* PROCESS */

  processingContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },

  processingCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor:
      "rgba(59,130,246,0.12)",
    borderWidth: 1,
    borderColor:
      "rgba(96,165,250,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },

  processingTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "800",
    marginTop: 22,
    textAlign: "center",
  },

  processingSubtitle: {
    color: "#9FB5D4",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 7,
    maxWidth: 300,
  },

  processingSteps: {
    width: "100%",
    marginTop: 30,
    gap: 13,
  },

  processRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  processIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor:
      "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  processDone: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },

  processCheck: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },

  processText: {
    color: "#CFE0F5",
    fontSize: 12,
    fontWeight: "600",
  },

  /* RESULT */

  resultContent: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  resultCircleOuter: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor:
      "rgba(52,211,153,0.13)",
    alignItems: "center",
    justifyContent: "center",
  },

  resultCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
    elevation: 10,
    shadowColor: "#10B981",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },

  resultTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginTop: 20,
  },

  resultTime: {
    color: "#FFFFFF",
    fontSize: 42,
    fontWeight: "800",
    marginTop: 8,
  },

  resultWita: {
    color: "#9FB5D4",
    fontSize: 12,
    marginTop: 2,
  },

  resultBadge: {
    marginTop: 15,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor:
      "rgba(52,211,153,0.12)",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  resultBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#34D399",
  },

  resultBadgeText: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "700",
  },

  resultInfo: {
    width: "100%",
    marginTop: 25,
    padding: 16,
    borderRadius: 16,
    backgroundColor:
      "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.08)",
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 20,
    paddingVertical: 7,
  },

  infoLabel: {
    color: "#8195B3",
    fontSize: 11,
    fontWeight: "600",
  },

  infoValue: {
    color: "#E8F0FC",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
  },
});