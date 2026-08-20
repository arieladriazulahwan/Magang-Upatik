import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
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

import { Ionicons } from "@expo/vector-icons";

import {
  ApiAttendance,
  checkIn,
  checkOut,
  getAttendance,
} from "../../services/api";

/* ============================================================
   COLORS
============================================================ */

const COLORS = {
  navy: "#0d2747",
  navyDark: "#0a1d36",

  blue: "#1d4ed8",
  blueLight: "#3b82f6",

  background: "#eef1f6",
  white: "#ffffff",

  text: "#16223a",
  textSecondary: "#7a8699",

  border: "#e4e9f2",

  green: "#0f766e",
  greenLight: "#e2f3f0",

  red: "#dc2626",
  redLight: "#fde8e8",

  orange: "#b45309",
  orangeLight: "#fdf2dd",
};

/* ============================================================
   TYPES
============================================================ */

type Step =
  | "loading"
  | "camera"
  | "processing"
  | "result";

type AttendanceKind =
  | "masuk"
  | "pulang";

/* ============================================================
   HELPERS
============================================================ */

function formatTime(
  value: string | null | undefined
) {
  if (!value) {
    return "--:--";
  }

  const date = new Date(value);

  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return value.slice(0, 5);
}

function formatDate(
  value: Date
) {
  return value.toLocaleDateString(
    "id-ID",
    {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

function getErrorMessage(
  error: unknown
) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan saat melakukan presensi.";
}

/* ============================================================
   SCREEN
============================================================ */

export default function PresensiScreen() {
  /* ==========================================================
     CAMERA
  ========================================================== */

  const [
    cameraPermission,
    requestCameraPermission,
  ] = useCameraPermissions();

  const cameraRef =
    useRef<CameraView | null>(null);

  const [
    cameraReady,
    setCameraReady,
  ] = useState(false);

  /* ==========================================================
     ATTENDANCE
  ========================================================== */

  const [
    todayAttendance,
    setTodayAttendance,
  ] =
    useState<ApiAttendance | null>(null);

  const [
    attendanceLoading,
    setAttendanceLoading,
  ] = useState(true);

  const [
    attendanceKind,
    setAttendanceKind,
  ] =
    useState<AttendanceKind>("masuk");

  /* ==========================================================
     LOCATION
  ========================================================== */

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

  /* ==========================================================
     PROCESS
  ========================================================== */

  const [
    step,
    setStep,
  ] = useState<Step>("loading");

  const [
    processing,
    setProcessing,
  ] = useState(false);

  /* ==========================================================
     RESULT
  ========================================================== */

  const [
    resultTime,
    setResultTime,
  ] = useState("--:--");

  const [
    resultMessage,
    setResultMessage,
  ] = useState("");

  const [
    resultAttendance,
    setResultAttendance,
  ] =
    useState<ApiAttendance | null>(null);

  /* ==========================================================
     DETERMINE TODAY ATTENDANCE
  ========================================================== */

  const loadTodayAttendance =
    useCallback(async () => {
      try {
        setAttendanceLoading(true);

        const today =
          new Date()
            .toISOString()
            .slice(0, 10);

        const response =
          await getAttendance({
            date_from: today,
            date_to: today,
            per_page: 10,
          });

        const items =
          response?.data || [];

        const current =
          items.find(
            (item: ApiAttendance) =>
              item.check_in ||
              item.check_out
          ) ||
          items[0] ||
          null;

        setTodayAttendance(current);

        /*
         * Belum masuk
         */
        if (!current?.check_in) {
          setAttendanceKind("masuk");
        }

        /*
         * Sudah masuk tetapi belum pulang
         */
        else if (
          current.check_in &&
          !current.check_out
        ) {
          setAttendanceKind("pulang");
        }

        /*
         * Sudah masuk dan pulang
         */
        else {
          setAttendanceKind("pulang");
        }
      } catch (error) {
        console.error(
          "LOAD ATTENDANCE ERROR:",
          error
        );

        /*
         * Jika gagal mengambil data,
         * default ke absen masuk.
         */
        setAttendanceKind("masuk");
      } finally {
        setAttendanceLoading(false);
        setStep("camera");
      }
    }, []);

  /* ==========================================================
     INITIAL LOAD
  ========================================================== */

  useEffect(() => {
    loadTodayAttendance();
  }, [loadTodayAttendance]);

  /* ==========================================================
     CAMERA PERMISSION
  ========================================================== */

  useEffect(() => {
    if (
      cameraPermission &&
      !cameraPermission.granted
    ) {
      requestCameraPermission();
    }
  }, [
    cameraPermission,
    requestCameraPermission,
  ]);

  /* ==========================================================
     LABEL
  ========================================================== */

  const jenisLabel =
    attendanceKind === "masuk"
      ? "Masuk"
      : "Pulang";

  const alreadyCheckedIn =
    Boolean(todayAttendance?.check_in);

  /* ==========================================================
     GET LOCATION
  ========================================================== */

  const getCurrentLocation = async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    try {
      setLocationLoading(true);

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (permission.status !== "granted") {
        Alert.alert(
          "Lokasi diperlukan",
          "Izinkan akses lokasi agar sistem dapat memverifikasi lokasi presensi."
        );

        return null;
      }

      const current =
        await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

      console.log("CURRENT LOCATION:", current);

      if (
        !current ||
        !current.coords ||
        typeof current.coords.latitude !== "number" ||
        typeof current.coords.longitude !== "number"
      ) {
        throw new Error(
          "Koordinat lokasi tidak berhasil diperoleh."
        );
      }

      setLocation(current);

      return {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };
    } catch (error) {
      console.error(
        "LOCATION ERROR:",
        error
      );

      Alert.alert(
        "Lokasi gagal",
        getErrorMessage(error)
      );

      return null;
    } finally {
      setLocationLoading(false);
    }
  };

/* ==========================================================
   TAKE PHOTO
========================================================== */

  const takePhoto = async () => {
    if (
      processing ||
      locationLoading ||
      !cameraRef.current ||
      !cameraReady
    ) {
      return;
    }

    try {
      setProcessing(true);

      /*
      * =====================================================
      * 1. AMBIL LOKASI
      * =====================================================
      */

      const currentLocation =
        await getCurrentLocation();

      if (!currentLocation) {
        setProcessing(false);
        return;
      }

      console.log(
        "LOCATION FOR ATTENDANCE:",
        currentLocation
      );

      /*
      * =====================================================
      * 2. AMBIL FOTO
      * =====================================================
      */

      const photo =
        await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });

      if (!photo?.uri) {
        throw new Error(
          "Foto wajah tidak berhasil diambil."
        );
      }

      /*
      * =====================================================
      * 3. MASUK KE PROSES
      * =====================================================
      */

      setStep("processing");

      /*
      * =====================================================
      * 4. KIRIM KE BACKEND
      * =====================================================
      */

      await submitToBackend(
        photo.uri,
        currentLocation
      );
    } catch (error) {
      console.error(
        "TAKE PHOTO ERROR:",
        error
      );

      setProcessing(false);
      setStep("camera");

      Alert.alert(
        "Presensi gagal",
        getErrorMessage(error)
      );
    }
  };
  /* ==========================================================
     SUBMIT ATTENDANCE
  ========================================================== */

    const submitToBackend = async (
      photoUri: string,
      currentLocation: {
        latitude: number;
        longitude: number;
      }
    ) => {

      try {
        /*
         * Format file untuk multipart/form-data
         */
        const photoFile = {
          uri: photoUri,
          name: `presensi-${Date.now()}.jpg`,
          type: "image/jpeg",
        };

        const deviceInfo =
          `${Platform.OS} ${String(
            Platform.Version
          )}`;

        let response;

        /*
         * =====================================================
         * CHECK IN
         * =====================================================
         */

        if (
          attendanceKind ===
          "masuk"
        ) {
          response =
            await checkIn({
              type: "wfo",

              latitude:
                currentLocation.latitude,

              longitude:
                currentLocation.longitude,

              photo: photoFile,

              device_info:
                deviceInfo,
            });
        }

        /*
         * =====================================================
         * CHECK OUT
         * =====================================================
         */

        else {
          response =
            await checkOut({
              latitude:
                currentLocation.latitude,

              longitude:
                currentLocation.longitude,

              photo: photoFile,

              device_info:
                deviceInfo,
            });
        }

        console.log(
          "ATTENDANCE RESPONSE:",
          response
        );

        /*
         * Backend mengembalikan:
         *
         * {
         *   data: ApiAttendance
         * }
         */

        const attendance =
          response?.data ||
          null;

        setResultAttendance(
          attendance
        );

        /*
         * Ambil waktu dari backend.
         * Jangan menggunakan waktu lokal
         * jika backend sudah memberikan
         * check_in/check_out.
         */

        let serverTime: string | null =
          null;

        if (
          attendanceKind ===
          "masuk"
        ) {
          serverTime =
            attendance?.check_in ||
            null;
        } else {
          serverTime =
            attendance?.check_out ||
            null;
        }

        /*
         * Fallback ke waktu perangkat
         * jika response backend tidak
         * mengembalikan waktu.
         */

        const finalTime =
          serverTime
            ? formatTime(serverTime)
            : new Date().toLocaleTimeString(
                "id-ID",
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                }
              );

        setResultTime(
          finalTime
        );

        setResultMessage(
          attendanceKind ===
          "masuk"
            ? "Presensi masuk berhasil dicatat."
            : "Presensi pulang berhasil dicatat."
        );

        /*
         * Selesai
         */
        setProcessing(false);
        setStep("result");
      } catch (error) {
        console.error(
          "SUBMIT ATTENDANCE ERROR:",
          error
        );

        setProcessing(false);
        setStep("camera");

        Alert.alert(
          "Presensi gagal",
          getErrorMessage(error)
        );
      }
    };

  /* ==========================================================
     BACK
  ========================================================== */

  const handleBack =
    () => {
      if (processing) {
        return;
      }

      router.back();
    };

  /* ==========================================================
     BACK TO DASHBOARD
  ========================================================== */

  const handleDone =
    () => {
      /*
       * Kembali ke dashboard.
       *
       * Dashboard akan dapat mengambil
       * data terbaru ketika screen
       * dimuat kembali.
       */

      router.replace(
        "/(main)"
      );
    };

  /* ==========================================================
     LOADING
  ========================================================== */

  if (
    attendanceLoading ||
    step === "loading"
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.navy
          }
        />

        <View
          style={styles.loadingScreen}
        >
          <View
            style={
              styles.loadingIcon
            }
          >
            <Ionicons
              name="finger-print-outline"
              size={38}
              color="#fff"
            />
          </View>

          <ActivityIndicator
            size="large"
            color="#fff"
          />

          <Text
            style={
              styles.loadingTitle
            }
          >
            Menyiapkan presensi
          </Text>

          <Text
            style={
              styles.loadingSubtitle
            }
          >
            Memeriksa status presensi hari ini...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ==========================================================
     CAMERA PERMISSION LOADING
  ========================================================== */

  if (!cameraPermission) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.navy
          }
        />

        <View
          style={
            styles.permissionScreen
          }
        >
          <Header
            title={`Absen ${jenisLabel}`}
            subtitle="Verifikasi wajah"
            onBack={handleBack}
          />

          <View
            style={
              styles.centerContent
            }
          >
            <ActivityIndicator
              size="large"
              color={
                COLORS.blue
              }
            />

            <Text
              style={
                styles.centerTitle
              }
            >
              Memeriksa kamera...
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ==========================================================
     CAMERA PERMISSION DENIED
  ========================================================== */

  if (
    !cameraPermission.granted
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.navy
          }
        />

        <View
          style={
            styles.permissionScreen
          }
        >
          <Header
            title={`Absen ${jenisLabel}`}
            subtitle="Verifikasi wajah"
            onBack={handleBack}
          />

          <View
            style={
              styles.centerContent
            }
          >
            <View
              style={
                styles.permissionIcon
              }
            >
              <Ionicons
                name="camera-outline"
                size={42}
                color={
                  COLORS.blue
                }
              />
            </View>

            <Text
              style={
                styles.centerTitle
              }
            >
              Kamera diperlukan
            </Text>

            <Text
              style={
                styles.centerDescription
              }
            >
              Kamera digunakan untuk
              mengambil foto wajah
              sebagai bukti presensi.
            </Text>

            <Pressable
              style={
                styles.primaryButton
              }
              onPress={() =>
                requestCameraPermission()
              }
            >
              <Ionicons
                name="camera-outline"
                size={20}
                color="#fff"
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Izinkan Kamera
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ==========================================================
     PROCESSING
  ========================================================== */

  if (
    step === "processing"
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.navyDark
          }
        />

        <View
          style={
            styles.processingScreen
          }
        >
          <Header
            title={`Absen ${jenisLabel}`}
            subtitle="Memproses presensi"
            onBack={() => {}}
            disabled
          />

          <View
            style={
              styles.processingContent
            }
          >
            <View
              style={
                styles.processingCircle
              }
            >
              <ActivityIndicator
                size="large"
                color="#fff"
              />
            </View>

            <Text
              style={
                styles.processingTitle
              }
            >
              Memproses presensi
            </Text>

            <Text
              style={
                styles.processingDescription
              }
            >
              Foto dan lokasi sedang
              diverifikasi oleh sistem.
            </Text>

            <View
              style={
                styles.processingSteps
              }
            >
              <ProcessItem
                icon="checkmark-circle"
                text="Foto wajah berhasil diambil"
                done
              />

              <ProcessItem
                icon="location"
                text="Lokasi sedang diverifikasi"
                active
              />

              <ProcessItem
                icon="cloud-upload-outline"
                text="Menyimpan data presensi"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ==========================================================
     RESULT
  ========================================================== */

  if (
    step === "result"
  ) {
    return (
      <SafeAreaView
        style={styles.safeArea}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor={
            COLORS.navy
          }
        />

        <View
          style={
            styles.resultScreen
          }
        >
          <Header
            title="Presensi Berhasil"
            subtitle="Data berhasil disimpan"
            onBack={handleDone}
          />

          <View
            style={
              styles.resultContent
            }
          >
            <View
              style={
                styles.successCircle
              }
            >
              <Ionicons
                name="checkmark"
                size={54}
                color="#fff"
              />
            </View>

            <Text
              style={
                styles.resultTitle
              }
            >
              Absen {jenisLabel} Berhasil
            </Text>

            <Text
              style={
                styles.resultDescription
              }
            >
              {resultMessage}
            </Text>

            <View
              style={
                styles.resultCard
              }
            >
              <View
                style={
                  styles.resultRow
                }
              >
                <View
                  style={
                    styles.resultRowLeft
                  }
                >
                  <View
                    style={
                      styles.resultSmallIcon
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color={
                        COLORS.blue
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.resultLabel
                    }
                  >
                    Tanggal
                  </Text>
                </View>

                <Text
                  style={
                    styles.resultValue
                  }
                >
                  {formatDate(
                    new Date()
                  )}
                </Text>
              </View>

              <View
                style={
                  styles.divider
                }
              />

              <View
                style={
                  styles.resultRow
                }
              >
                <View
                  style={
                    styles.resultRowLeft
                  }
                >
                  <View
                    style={
                      styles.resultSmallIcon
                    }
                  >
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={
                        COLORS.blue
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.resultLabel
                    }
                  >
                    Waktu
                  </Text>
                </View>

                <Text
                  style={
                    styles.resultTime
                  }
                >
                  {resultTime}
                </Text>
              </View>

              <View
                style={
                  styles.divider
                }
              />

              <View
                style={
                  styles.resultRow
                }
              >
                <View
                  style={
                    styles.resultRowLeft
                  }
                >
                  <View
                    style={
                      styles.resultSmallIcon
                    }
                  >
                    <Ionicons
                      name="location-outline"
                      size={18}
                      color={
                        COLORS.blue
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.resultLabel
                    }
                  >
                    Lokasi
                  </Text>
                </View>

                <View
                  style={
                    styles.verifiedBadge
                  }
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={
                      COLORS.green
                    }
                  />

                  <Text
                    style={
                      styles.verifiedText
                    }
                  >
                    Terverifikasi
                  </Text>
                </View>
              </View>
            </View>

            <View
              style={
                styles.infoBox
              }
            >
              <Ionicons
                name="information-circle-outline"
                size={20}
                color={
                  COLORS.blue
                }
              />

              <Text
                style={
                  styles.infoText
                }
              >
                Data presensi telah
                tersimpan pada sistem.
              </Text>
            </View>

            <Pressable
              style={
                styles.primaryButton
              }
              onPress={
                handleDone
              }
            >
              <Ionicons
                name="home-outline"
                size={20}
                color="#fff"
              />

              <Text
                style={
                  styles.primaryButtonText
                }
              >
                Kembali ke Beranda
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  /* ==========================================================
     CAMERA SCREEN
  ========================================================== */

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={
          COLORS.navyDark
        }
      />

      <View
        style={
          styles.cameraScreen
        }
      >
        <Header
          title={`Absen ${jenisLabel}`}
          subtitle="Verifikasi wajah"
          onBack={handleBack}
        />

        {/* ====================================================
            CAMERA
        ==================================================== */}

        <View
          style={
            styles.cameraContainer
          }
        >
          <CameraView
            ref={cameraRef}
            style={
              StyleSheet.absoluteFillObject
            }
            facing="front"
            onCameraReady={() =>
              setCameraReady(true)
            }
          />

          {/* DARK OVERLAY */}

          <View
            style={
              styles.cameraOverlay
            }
          />

          {/* FACE FRAME */}

          <View
            style={
              styles.faceFrame
            }
          >
            <View
              style={[
                styles.frameCorner,
                styles.frameTopLeft,
              ]}
            />

            <View
              style={[
                styles.frameCorner,
                styles.frameTopRight,
              ]}
            />

            <View
              style={[
                styles.frameCorner,
                styles.frameBottomLeft,
              ]}
            />

            <View
              style={[
                styles.frameCorner,
                styles.frameBottomRight,
              ]}
            />

            <View
              style={
                styles.scanLine
              }
            />
          </View>

          {/* CAMERA STATUS */}

          <View
            style={
              styles.cameraStatus
            }
          >
            <View
              style={
                styles.liveDot
              }
            />

            <Text
              style={
                styles.cameraStatusText
              }
            >
              Posisikan wajah di dalam
              bingkai
            </Text>
          </View>
        </View>

        {/* ====================================================
            BOTTOM CAMERA PANEL
        ==================================================== */}

        <View
          style={
            styles.cameraBottom
          }
        >
          <View
            style={
              styles.attendanceBadge
            }
          >
            <Ionicons
              name={
                attendanceKind ===
                "masuk"
                  ? "log-in-outline"
                  : "log-out-outline"
              }
              size={16}
              color={
                COLORS.blue
              }
            />

            <Text
              style={
                styles.attendanceBadgeText
              }
            >
              Presensi {jenisLabel}
            </Text>
          </View>

          <Text
            style={
              styles.cameraTitle
            }
          >
            Verifikasi wajah
          </Text>

          <Text
            style={
              styles.cameraSubtitle
            }
          >
            Pastikan wajah terlihat jelas,
            pencahayaan cukup, dan tidak
            menggunakan masker.
          </Text>

          {alreadyCheckedIn &&
          attendanceKind ===
            "pulang" ? (
            <View
              style={
                styles.lastAttendance
              }
            >
              <View
                style={
                  styles.lastAttendanceIcon
                }
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={
                    COLORS.green
                  }
                />
              </View>

              <View
                style={
                  styles.lastAttendanceContent
                }
              >
                <Text
                  style={
                    styles.lastAttendanceTitle
                  }
                >
                  Absen masuk sudah tercatat
                </Text>

                <Text
                  style={
                    styles.lastAttendanceText
                  }
                >
                  Pukul{" "}
                  {formatTime(
                    todayAttendance?.check_in
                  )}
                </Text>
              </View>
            </View>
          ) : null}

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
            onPress={
              takePhoto
            }
          >
            {processing ||
            locationLoading ? (
              <ActivityIndicator
                color="#fff"
              />
            ) : (
              <Ionicons
                name="camera-outline"
                size={23}
                color="#fff"
              />
            )}

            <Text
              style={
                styles.captureText
              }
            >
              {locationLoading
                ? "Mendeteksi lokasi..."
                : "Ambil Foto & Verifikasi"}
            </Text>
          </Pressable>

          <View
            style={
              styles.locationHint
            }
          >
            <Ionicons
              name="location-outline"
              size={16}
              color={
                COLORS.textSecondary
              }
            />

            <Text
              style={
                styles.locationHintText
              }
            >
              Lokasi akan diverifikasi
              otomatis oleh sistem.
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

/* ============================================================
   HEADER
============================================================ */

type HeaderProps = {
  title: string;
  subtitle: string;
  onBack: () => void;
  disabled?: boolean;
};

function Header({
  title,
  subtitle,
  onBack,
  disabled = false,
}: HeaderProps) {
  return (
    <View
      style={
        styles.header
      }
    >
      <Pressable
        disabled={disabled}
        onPress={onBack}
        style={[
          styles.backButton,
          disabled &&
            styles.backButtonDisabled,
        ]}
      >
        <Ionicons
          name="chevron-back"
          size={23}
          color="#fff"
        />
      </Pressable>

      <View
        style={
          styles.headerText
        }
      >
        <Text
          style={
            styles.headerTitle
          }
        >
          {title}
        </Text>

        <Text
          style={
            styles.headerSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <View
        style={
          styles.headerRight
        }
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={22}
          color="rgba(255,255,255,0.8)"
        />
      </View>
    </View>
  );
}

/* ============================================================
   PROCESS ITEM
============================================================ */

type ProcessItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  done?: boolean;
  active?: boolean;
};

function ProcessItem({
  icon,
  text,
  done = false,
  active = false,
}: ProcessItemProps) {
  return (
    <View
      style={
        styles.processItem
      }
    >
      <View
        style={[
          styles.processIcon,
          done &&
            styles.processIconDone,
          active &&
            styles.processIconActive,
        ]}
      >
        {active ? (
          <ActivityIndicator
            size="small"
            color="#fff"
          />
        ) : (
          <Ionicons
            name={icon}
            size={18}
            color={
              done
                ? "#fff"
                : "rgba(255,255,255,0.45)"
            }
          />
        )}
      </View>

      <Text
        style={[
          styles.processText,
          done &&
            styles.processTextDone,
          active &&
            styles.processTextActive,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        COLORS.navyDark,
    },

    /* ========================================================
       GENERAL
    ======================================================== */

    cameraScreen: {
      flex: 1,
      backgroundColor:
        COLORS.navyDark,
    },

    permissionScreen: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    /* ========================================================
       HEADER
    ======================================================== */

    header: {
      height: 70,
      backgroundColor:
        COLORS.navy,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
    },

    backButton: {
      width: 42,
      height: 42,
      borderRadius: 13,
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.16)",
      backgroundColor:
        "rgba(255,255,255,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },

    backButtonDisabled: {
      opacity: 0,
    },

    headerText: {
      flex: 1,
      marginLeft: 12,
    },

    headerTitle: {
      color: "#fff",
      fontSize: 17,
      fontWeight: "800",
    },

    headerSubtitle: {
      marginTop: 2,
      color:
        "rgba(255,255,255,0.62)",
      fontSize: 11.5,
      fontWeight: "500",
    },

    headerRight: {
      width: 42,
      alignItems: "flex-end",
    },

    /* ========================================================
       LOADING
    ======================================================== */

    loadingScreen: {
      flex: 1,
      backgroundColor:
        COLORS.navy,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },

    loadingIcon: {
      width: 78,
      height: 78,
      borderRadius: 24,
      backgroundColor:
        "rgba(255,255,255,0.08)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.12)",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },

    loadingTitle: {
      marginTop: 20,
      color: "#fff",
      fontSize: 18,
      fontWeight: "800",
    },

    loadingSubtitle: {
      marginTop: 8,
      color:
        "rgba(255,255,255,0.62)",
      fontSize: 13,
      textAlign: "center",
    },

    /* ========================================================
       CENTER
    ======================================================== */

    centerContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },

    centerTitle: {
      marginTop: 18,
      color: COLORS.text,
      fontSize: 18,
      fontWeight: "800",
      textAlign: "center",
    },

    centerDescription: {
      marginTop: 9,
      color:
        COLORS.textSecondary,
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      maxWidth: 310,
    },

    permissionIcon: {
      width: 88,
      height: 88,
      borderRadius: 28,
      backgroundColor:
        "#e7eefc",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },

    primaryButton: {
      minHeight: 52,
      paddingHorizontal: 22,
      borderRadius: 15,
      backgroundColor:
        COLORS.blue,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
      marginTop: 24,
    },

    primaryButtonText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "800",
    },

    /* ========================================================
       CAMERA
    ======================================================== */

    cameraContainer: {
      flex: 1,
      minHeight: 300,
      backgroundColor: "#111",
      position: "relative",
      overflow: "hidden",
    },

    cameraOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor:
        "rgba(0,0,0,0.18)",
    },

    faceFrame: {
      position: "absolute",
      width: 225,
      height: 285,
      borderRadius: 115,
      left: "50%",
      top: "50%",
      marginLeft: -112.5,
      marginTop: -142.5,
      alignItems: "center",
      justifyContent: "center",
    },

    frameCorner: {
      position: "absolute",
      width: 36,
      height: 36,
      borderColor:
        "rgba(255,255,255,0.9)",
    },

    frameTopLeft: {
      top: 0,
      left: 0,
      borderTopWidth: 3,
      borderLeftWidth: 3,
      borderTopLeftRadius: 18,
    },

    frameTopRight: {
      top: 0,
      right: 0,
      borderTopWidth: 3,
      borderRightWidth: 3,
      borderTopRightRadius: 18,
    },

    frameBottomLeft: {
      bottom: 0,
      left: 0,
      borderBottomWidth: 3,
      borderLeftWidth: 3,
      borderBottomLeftRadius: 18,
    },

    frameBottomRight: {
      bottom: 0,
      right: 0,
      borderBottomWidth: 3,
      borderRightWidth: 3,
      borderBottomRightRadius: 18,
    },

    scanLine: {
      width: 190,
      height: 1,
      backgroundColor:
        "rgba(96,165,250,0.8)",
      opacity: 0.75,
    },

    cameraStatus: {
      position: "absolute",
      top: 18,
      alignSelf: "center",
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 20,
      backgroundColor:
        "rgba(0,0,0,0.48)",
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },

    liveDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor:
        "#4ade80",
    },

    cameraStatusText: {
      color: "#fff",
      fontSize: 11.5,
      fontWeight: "600",
    },

    /* ========================================================
       CAMERA BOTTOM
    ======================================================== */

    cameraBottom: {
      backgroundColor:
        COLORS.white,
      paddingHorizontal: 20,
      paddingTop: 18,
      paddingBottom: 22,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      marginTop: -20,
      zIndex: 5,
    },

    attendanceBadge: {
      alignSelf: "flex-start",
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      backgroundColor:
        "#e7eefc",
    },

    attendanceBadgeText: {
      color: COLORS.blue,
      fontSize: 11.5,
      fontWeight: "800",
    },

    cameraTitle: {
      marginTop: 13,
      color: COLORS.text,
      fontSize: 19,
      fontWeight: "800",
    },

    cameraSubtitle: {
      marginTop: 6,
      color:
        COLORS.textSecondary,
      fontSize: 12.5,
      lineHeight: 19,
    },

    lastAttendance: {
      marginTop: 14,
      padding: 12,
      borderRadius: 13,
      backgroundColor:
        COLORS.greenLight,
      flexDirection: "row",
      alignItems: "center",
    },

    lastAttendanceIcon: {
      width: 35,
      height: 35,
      borderRadius: 11,
      backgroundColor:
        "rgba(15,118,110,0.1)",
      alignItems: "center",
      justifyContent: "center",
    },

    lastAttendanceContent: {
      marginLeft: 10,
    },

    lastAttendanceTitle: {
      color: COLORS.text,
      fontSize: 12,
      fontWeight: "800",
    },

    lastAttendanceText: {
      marginTop: 2,
      color:
        COLORS.textSecondary,
      fontSize: 11,
    },

    captureButton: {
      height: 54,
      borderRadius: 16,
      backgroundColor:
        COLORS.blue,
      marginTop: 17,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 9,
    },

    buttonDisabled: {
      opacity: 0.55,
    },

    captureText: {
      color: "#fff",
      fontSize: 14,
      fontWeight: "800",
    },

    locationHint: {
      marginTop: 11,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
    },

    locationHintText: {
      color:
        COLORS.textSecondary,
      fontSize: 10.5,
    },

    /* ========================================================
       PROCESSING
    ======================================================== */

    processingScreen: {
      flex: 1,
      backgroundColor:
        COLORS.navyDark,
    },

    processingContent: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 30,
    },

    processingCircle: {
      width: 112,
      height: 112,
      borderRadius: 56,
      backgroundColor:
        "rgba(59,130,246,0.14)",
      borderWidth: 1,
      borderColor:
        "rgba(96,165,250,0.25)",
      alignItems: "center",
      justifyContent: "center",
    },

    processingTitle: {
      marginTop: 26,
      color: "#fff",
      fontSize: 20,
      fontWeight: "800",
    },

    processingDescription: {
      marginTop: 8,
      color:
        "rgba(255,255,255,0.6)",
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      maxWidth: 300,
    },

    processingSteps: {
      marginTop: 32,
      width: "100%",
      maxWidth: 320,
    },

    processItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 15,
    },

    processIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor:
        "rgba(255,255,255,0.08)",
      alignItems: "center",
      justifyContent: "center",
    },

    processIconDone: {
      backgroundColor:
        COLORS.green,
    },

    processIconActive: {
      backgroundColor:
        COLORS.blue,
    },

    processText: {
      marginLeft: 11,
      color:
        "rgba(255,255,255,0.4)",
      fontSize: 12.5,
      fontWeight: "600",
    },

    processTextDone: {
      color:
        "rgba(255,255,255,0.85)",
    },

    processTextActive: {
      color: "#fff",
    },

    /* ========================================================
       RESULT
    ======================================================== */

    resultScreen: {
      flex: 1,
      backgroundColor:
        COLORS.background,
    },

    resultContent: {
      flex: 1,
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: 34,
    },

    successCircle: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor:
        COLORS.green,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 14,
      shadowOffset: {
        width: 0,
        height: 6,
      },
      elevation: 5,
    },

    resultTitle: {
      marginTop: 22,
      color: COLORS.text,
      fontSize: 21,
      fontWeight: "800",
      textAlign: "center",
    },

    resultDescription: {
      marginTop: 7,
      color:
        COLORS.textSecondary,
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
    },

    resultCard: {
      width: "100%",
      marginTop: 25,
      borderRadius: 18,
      backgroundColor:
        COLORS.white,
      paddingHorizontal: 16,
      paddingVertical: 5,
      borderWidth: 1,
      borderColor:
        COLORS.border,
    },

    resultRow: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    resultRowLeft: {
      flexDirection: "row",
      alignItems: "center",
    },

    resultSmallIcon: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor:
        "#e7eefc",
      alignItems: "center",
      justifyContent: "center",
    },

    resultLabel: {
      marginLeft: 10,
      color:
        COLORS.textSecondary,
      fontSize: 12.5,
      fontWeight: "600",
    },

    resultValue: {
      maxWidth: 160,
      color: COLORS.text,
      fontSize: 12,
      fontWeight: "700",
      textAlign: "right",
    },

    resultTime: {
      color: COLORS.text,
      fontSize: 19,
      fontWeight: "800",
    },

    divider: {
      height: 1,
      backgroundColor:
        "#edf0f5",
    },

    verifiedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 9,
      backgroundColor:
        COLORS.greenLight,
    },

    verifiedText: {
      color: COLORS.green,
      fontSize: 10.5,
      fontWeight: "800",
    },

    infoBox: {
      width: "100%",
      marginTop: 13,
      padding: 13,
      borderRadius: 13,
      backgroundColor:
        "#e7eefc",
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
    },

    infoText: {
      flex: 1,
      color: COLORS.text,
      fontSize: 11.5,
      lineHeight: 17,
    },
  });