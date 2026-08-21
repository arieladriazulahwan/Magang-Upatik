import React, {
  useState,
} from "react";

import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";

import {
  router,
} from "expo-router";

import * as DocumentPicker from "expo-document-picker";

import Button from "../../components/Button";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import {
  usePrototype,
} from "../../contexts/PrototypeContext";

/* =====================================================
   REQUEST TYPE
===================================================== */

const requestTypes = [
  "Cuti",
  "Izin",
  "Sakit",
  "WFH",
] as const;

type RequestType =
  (typeof requestTypes)[number];

/* =====================================================
   SELECTED FILE
===================================================== */

type SelectedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

/* =====================================================
   SCREEN
===================================================== */

export default function PengajuanBaruScreen() {
  const {
    submitRequest,
    loadingRequest,
  } =
    usePrototype();

  const [
    type,
    setType,
  ] =
    useState<RequestType>(
      "Cuti"
    );

  const [
    startDate,
    setStartDate,
  ] =
    useState(
      "2026-07-07"
    );

  const [
    endDate,
    setEndDate,
  ] =
    useState(
      "2026-07-08"
    );

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<SelectedFile | null>(
      null
    );

  /* ===================================================
     PICK DOCUMENT
  =================================================== */

  const pickDocument =
    async () => {
      if (
        loadingRequest
      ) {
        return;
      }

      try {
        const result =
          await DocumentPicker.getDocumentAsync(
            {
              type: [
                "application/pdf",
                "image/jpeg",
                "image/png",
              ],

              copyToCacheDirectory:
                true,

              multiple:
                false,
            }
          );

        if (
          result.canceled
        ) {
          return;
        }

        const file =
          result.assets?.[0];

        if (!file) {
          return;
        }

        /* =========================================
           SIZE VALIDATION
        ========================================= */

        if (
          file.size !==
            undefined &&
          file.size >
            5 * 1024 * 1024
        ) {
          Alert.alert(
            "File terlalu besar",
            "Ukuran file maksimal 5 MB."
          );

          return;
        }

        /* =========================================
           MIME TYPE
        ========================================= */

        const mimeType =
          file.mimeType ||
          "application/octet-stream";

        /* =========================================
           DEBUG
        ========================================= */

        console.log(
          "========== FILE DIPILIH =========="
        );

        console.log(
          "URI:",
          file.uri
        );

        console.log(
          "NAME:",
          file.name
        );

        console.log(
          "MIME:",
          mimeType
        );

        console.log(
          "SIZE:",
          file.size
        );

        console.log(
          "=================================="
        );

        /* =========================================
           SAVE FILE
        ========================================= */

        setSelectedFile({
          uri:
            file.uri,

          name:
            file.name ||
            `dokumen-${Date.now()}`,

          mimeType,

          size:
            file.size,
        });
      } catch (error) {
        console.log(
          "PICK FILE ERROR:",
          error
        );

        Alert.alert(
          "Gagal memilih file",
          "File tidak dapat dipilih."
        );
      }
    };

  /* ===================================================
     REMOVE FILE
  =================================================== */

  const removeFile =
    () => {
      if (
        loadingRequest
      ) {
        return;
      }

      setSelectedFile(
        null
      );
    };

  /* ===================================================
     SUBMIT
  =================================================== */

  const submit =
    async () => {
      if (
        loadingRequest
      ) {
        return;
      }

      /* =========================================
         VALIDASI ALASAN
      ========================================= */

      if (
        !reason.trim()
      ) {
        Alert.alert(
          "Alasan diperlukan",
          "Silakan masukkan alasan pengajuan."
        );

        return;
      }

      /* =========================================
         VALIDASI TANGGAL
      ========================================= */

      if (
        !startDate.trim() ||
        !endDate.trim()
      ) {
        Alert.alert(
          "Tanggal diperlukan",
          "Silakan isi tanggal mulai dan tanggal selesai."
        );

        return;
      }

      /* =========================================
         DEBUG
      ========================================= */

      console.log(
        "========== SUBMIT PENGAJUAN =========="
      );

      console.log(
        "TYPE:",
        type
      );

      console.log(
        "START DATE:",
        startDate
      );

      console.log(
        "END DATE:",
        endDate
      );

      console.log(
        "REASON:",
        reason.trim()
      );

      console.log(
        "ATTACHMENT:",
        selectedFile
      );

      console.log(
        "======================================="
      );

      /* =========================================
         SUBMIT
      ========================================= */

      const success =
        await submitRequest({
          title:
            type === "Cuti"
              ? "Cuti Tahunan"
              : type === "WFH"
              ? "Work From Home"
              : type === "Sakit"
              ? "Cuti Sakit"
              : "Izin Keperluan",

          days:
            type === "WFH" ||
            startDate ===
              endDate
              ? "1 hari"
              : "2 hari kerja",

          type,

          startDate,

          endDate,

          reason:
            reason.trim(),

          attachment:
            selectedFile,
        });

      /* =========================================
         SUCCESS
      ========================================= */

      if (success) {
        router.replace(
          "/(main)/pengajuan"
        );
      }
    };

  /* ===================================================
     RENDER
  =================================================== */

  return (
    <MainScreen>
      {/* ==================================================
          HEADER
      ================================================== */}

      <View
        style={
          styles.headerRow
        }
      >
        <Pressable
          onPress={() => {
            if (
              !loadingRequest
            ) {
              router.back();
            }
          }}
          style={[
            styles.back,

            loadingRequest
              ? styles.backDisabled
              : null,
          ]}
          disabled={
            loadingRequest
          }
        >
          <Text
            style={
              styles.backText
            }
          >
            {"<"}
          </Text>
        </Pressable>

        <View>
          <Text
            style={
              styles.title
            }
          >
            Pengajuan Baru
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Lengkapi detail permohonan
          </Text>
        </View>
      </View>

      {/* ==================================================
          JENIS PENGAJUAN
      ================================================== */}

      <View
        style={
          styles.fieldBlock
        }
      >
        <Text
          style={
            styles.fieldLabel
          }
        >
          Jenis pengajuan
        </Text>

        <View
          style={
            styles.typeGrid
          }
        >
          {requestTypes.map(
            (item) => (
              <Pressable
                key={item}
                style={[
                  styles.typeOption,

                  type === item
                    ? styles.typeOptionActive
                    : null,

                  loadingRequest
                    ? styles.typeOptionDisabled
                    : null,
                ]}
                onPress={() => {
                  if (
                    !loadingRequest
                  ) {
                    setType(
                      item
                    );
                  }
                }}
                disabled={
                  loadingRequest
                }
              >
                <Text
                  style={[
                    styles.typeText,

                    type === item
                      ? styles.typeTextActive
                      : null,
                  ]}
                >
                  {item}
                </Text>
              </Pressable>
            )
          )}
        </View>
      </View>

      {/* ==================================================
          TANGGAL
      ================================================== */}

      <View
        style={
          styles.twoCol
        }
      >
        <Field
          label="Tanggal mulai"
          value={startDate}
          onChangeText={
            setStartDate
          }
          disabled={
            loadingRequest
          }
        />

        <Field
          label="Tanggal selesai"
          value={endDate}
          onChangeText={
            setEndDate
          }
          disabled={
            loadingRequest
          }
        />
      </View>

      {/* ==================================================
          ALASAN
      ================================================== */}

      <Field
        label="Alasan / keterangan"
        value={reason}
        onChangeText={
          setReason
        }
        placeholder="Tulis alasan pengajuan Anda..."
        multiline
        disabled={
          loadingRequest
        }
      />

      {/* ==================================================
          DOKUMEN
      ================================================== */}

      <View
        style={
          styles.fieldBlock
        }
      >
        <Text
          style={
            styles.fieldLabel
          }
        >
          Dokumen pendukung
        </Text>

        {!selectedFile ? (
          <Pressable
            style={[
              styles.upload,

              loadingRequest
                ? styles.uploadDisabled
                : null,
            ]}
            onPress={
              pickDocument
            }
            disabled={
              loadingRequest
            }
          >
            <Text
              style={
                styles.uploadIcon
              }
            >
              ↑
            </Text>

            <Text
              style={
                styles.uploadText
              }
            >
              Unggah surat /
              dokumen pendukung
            </Text>

            <Text
              style={
                styles.uploadHint
              }
            >
              PDF, JPG, JPEG, PNG
              {" • "}
              Maks. 5 MB
            </Text>
          </Pressable>
        ) : (
          <View
            style={
              styles.fileCard
            }
          >
            <View
              style={
                styles.fileInfo
              }
            >
              <View
                style={
                  styles.fileIconBox
                }
              >
                <Text
                  style={
                    styles.fileIcon
                  }
                >
                  📄
                </Text>
              </View>

              <View
                style={
                  styles.fileTextContainer
                }
              >
                <Text
                  style={
                    styles.fileName
                  }
                  numberOfLines={
                    2
                  }
                >
                  {
                    selectedFile.name
                  }
                </Text>

                <Text
                  style={
                    styles.fileSize
                  }
                >
                  {selectedFile.size
                    ? `${(
                        selectedFile.size /
                        1024 /
                        1024
                      ).toFixed(
                        2
                      )} MB`
                    : "Ukuran tidak diketahui"}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={
                removeFile
              }
              disabled={
                loadingRequest
              }
              style={
                styles.removeButton
              }
            >
              <Text
                style={
                  styles.removeText
                }
              >
                Hapus
              </Text>
            </Pressable>
          </View>
        )}

        {selectedFile ? (
          <Pressable
            onPress={
              pickDocument
            }
            disabled={
              loadingRequest
            }
            style={
              styles.changeFileButton
            }
          >
            <Text
              style={
                styles.changeFileText
              }
            >
              Ganti file
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* ==================================================
          BUTTON
      ================================================== */}

      <Button
        title={
          loadingRequest
            ? "Mengirim..."
            : "Kirim Pengajuan"
        }
        onPress={
          submit
        }
        disabled={
          loadingRequest
        }
      />
    </MainScreen>
  );
}

/* =====================================================
   FIELD COMPONENT
===================================================== */

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  disabled,
}: {
  label: string;
  value: string;
  onChangeText: (
    value: string
  ) => void;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
}) {
  return (
    <View
      style={
        styles.fieldBlock
      }
    >
      <Text
        style={
          styles.fieldLabel
        }
      >
        {label}
      </Text>

      <View
        style={[
          styles.field,

          multiline
            ? styles.textarea
            : null,

          disabled
            ? styles.fieldDisabled
            : null,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={
            onChangeText
          }
          placeholder={
            placeholder
          }
          placeholderTextColor="#94A0B3"
          multiline={
            multiline
          }
          editable={
            !disabled
          }
          style={[
            styles.fieldValue,

            multiline
              ? styles.textareaInput
              : null,
          ]}
        />
      </View>
    </View>
  );
}

/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({
    headerRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 12,
    },

    back: {
      width: 38,
      height: 38,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 12,
      backgroundColor:
        Colors.white,
      borderWidth: 1,
      borderColor:
        Colors.line,
    },

    backDisabled: {
      opacity: 0.5,
    },

    backText: {
      color:
        Colors.textInk,
      fontSize: 31,
      lineHeight: 33,
    },

    title: {
      color:
        Colors.textInk,
      fontSize: 19,
      fontWeight:
        "800",
    },

    subtitle: {
      color:
        "#7A8699",
      fontSize: 12,
      fontWeight:
        "600",
    },

    fieldBlock: {
      gap: 7,
      flex: 1,
    },

    fieldLabel: {
      color:
        Colors.textBody,
      fontSize: 12,
      fontWeight:
        "800",
    },

    field: {
      minHeight: 48,
      justifyContent:
        "center",
      borderRadius: 12,
      paddingHorizontal:
        13,
      backgroundColor:
        Colors.white,
      borderWidth: 1,
      borderColor:
        "#E1E6EF",
    },

    fieldDisabled: {
      backgroundColor:
        "#F5F6F8",
      opacity: 0.75,
    },

    typeGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      gap: 8,
    },

    typeOption: {
      minWidth:
        "23%",
      alignItems:
        "center",
      borderRadius: 11,
      paddingHorizontal:
        12,
      paddingVertical:
        10,
      backgroundColor:
        Colors.white,
      borderWidth: 1,
      borderColor:
        "#E1E6EF",
    },

    typeOptionActive: {
      backgroundColor:
        Colors.background,
      borderColor:
        Colors.background,
    },

    typeOptionDisabled: {
      opacity: 0.6,
    },

    typeText: {
      color:
        Colors.textBody,
      fontSize: 12,
      fontWeight:
        "800",
    },

    typeTextActive: {
      color:
        Colors.white,
    },

    textarea: {
      minHeight: 84,
      alignItems:
        "flex-start",
      paddingTop: 13,
    },

    fieldValue: {
      minHeight: 22,
      padding: 0,
      color:
        Colors.textInk,
      fontSize: 13,
      fontWeight:
        "700",
    },

    textareaInput: {
      minHeight: 56,
      textAlignVertical:
        "top",
    },

    twoCol: {
      flexDirection:
        "row",
      gap: 10,
    },

    upload: {
      minHeight: 105,
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 5,
      borderRadius: 13,
      backgroundColor:
        "#F6F8FB",
      borderWidth: 1.5,
      borderStyle:
        "dashed",
      borderColor:
        "#CDD6E4",
    },

    uploadDisabled: {
      opacity: 0.6,
    },

    uploadIcon: {
      color:
        "#9AA5B6",
      fontSize: 22,
      fontWeight:
        "800",
    },

    uploadText: {
      color:
        "#6F7C91",
      fontSize: 12,
      fontWeight:
        "800",
    },

    uploadHint: {
      color:
        "#A0A9B8",
      fontSize: 10.5,
      fontWeight:
        "600",
    },

    fileCard: {
      minHeight: 76,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      gap: 10,
      paddingHorizontal:
        12,
      paddingVertical:
        10,
      borderRadius: 13,
      backgroundColor:
        Colors.white,
      borderWidth: 1,
      borderColor:
        "#DCE3ED",
    },

    fileInfo: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 10,
    },

    fileIconBox: {
      width: 42,
      height: 42,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 10,
      backgroundColor:
        "#EEF3FC",
    },

    fileIcon: {
      fontSize: 20,
    },

    fileTextContainer: {
      flex: 1,
      gap: 3,
    },

    fileName: {
      color:
        Colors.textInk,
      fontSize: 12.5,
      fontWeight:
        "800",
    },

    fileSize: {
      color:
        "#8A96A8",
      fontSize: 10.5,
      fontWeight:
        "600",
    },

    removeButton: {
      paddingHorizontal:
        9,
      paddingVertical:
        7,
    },

    removeText: {
      color:
        "#D9534F",
      fontSize: 11,
      fontWeight:
        "800",
    },

    changeFileButton: {
      alignSelf:
        "flex-start",
      paddingVertical: 2,
    },

    changeFileText: {
      color:
        Colors.primaryDark,
      fontSize: 11,
      fontWeight:
        "800",
    },
  });
