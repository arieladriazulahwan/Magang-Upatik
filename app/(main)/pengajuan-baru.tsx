import React, {
  useState,
} from "react";

import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";

import {
  router,
  useLocalSearchParams,
} from "expo-router";

import {
  Ionicons,
} from "@expo/vector-icons";

import * as DocumentPicker from "expo-document-picker";

import Button from "../../components/Button";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import {
  formatWitaShortDate,
} from "../../constants/time";
import {
  usePrototype,
} from "../../contexts/PrototypeContext";

/* =====================================================
   REQUEST TYPE
===================================================== */

type RequestType =
  | "Cuti"
  | "Sakit"
  | "Izin"
  | "WFA"
  | "Lembur"
  | "Perjadi";

type CutiCategory = {
  label: string;
  value: number;
  code:
    | "cuti_tahunan"
    | "cuti_besar"
    | "cuti_melahirkan"
    | "cuti_alasan_penting"
    | "cuti_bersama"
    | "cltn";
  needsAttachment?: boolean;
  needsDoctorLetter?: boolean;
};

type ImportantLeaveSubCategory =
  | "menikah"
  | "keluarga_sakit"
  | "keluarga_meninggal"
  | "bencana";

const requestTypes: {
  label: string;
  value?: RequestType;
  route?: string;
}[] = [
  {
    label: "Cuti",
    value: "Cuti",
  },
  {
    label: "Sakit",
    value: "Sakit",
  },
  {
    label: "Izin",
    value: "Izin",
  },
  {
    label: "WFA",
    value: "WFA",
  },
  {
    label: "Lembur",
    value: "Lembur",
  },
  {
    label: "Perjadi",
    value: "Perjadi",
  },
];

const cutiCategories: CutiCategory[] = [
  {
    label: "Cuti Tahunan",
    value: 1,
    code: "cuti_tahunan",
  },
  {
    label: "Cuti Besar",
    value: 2,
    code: "cuti_besar",
  },
  {
    label: "Cuti Melahirkan",
    value: 4,
    code: "cuti_melahirkan",
    needsAttachment: true,
    needsDoctorLetter: true,
  },
  {
    label: "Cuti Alasan Penting",
    value: 5,
    code: "cuti_alasan_penting",
    needsAttachment: true,
  },
  {
    label: "Cuti Bersama",
    value: 6,
    code: "cuti_bersama",
  },
  {
    label: "CLTN",
    value: 7,
    code: "cltn",
    needsAttachment: true,
  },
];

const importantLeaveSubCategories: {
  label: string;
  value: ImportantLeaveSubCategory;
}[] = [
  {
    label: "Menikah",
    value: "menikah",
  },
  {
    label: "Keluarga sakit",
    value: "keluarga_sakit",
  },
  {
    label: "Keluarga meninggal",
    value: "keluarga_meninggal",
  },
  {
    label: "Bencana",
    value: "bencana",
  },
];

function getInitialRequestType(
  value: unknown
): RequestType {
  const typeParam =
    Array.isArray(value)
      ? value[0]
      : value;

  if (
    typeParam === "Cuti" ||
    typeParam === "Sakit" ||
    typeParam === "Izin" ||
    typeParam === "WFA" ||
    typeParam === "Lembur" ||
    typeParam === "Perjadi"
  ) {
    return typeParam;
  }

  return "Cuti";
}

/* =====================================================
   SELECTED FILE
===================================================== */

type SelectedFile = {
  uri: string;
  name: string;
  mimeType: string;
  size?: number;
};

type DateTarget =
  | "start"
  | "end";

const monthNames = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const dayNames = [
  "Min",
  "Sen",
  "Sel",
  "Rab",
  "Kam",
  "Jum",
  "Sab",
];

function toDateKey(
  value: Date
) {
  return `${value.getFullYear()}-${String(
    value.getMonth() + 1
  ).padStart(2, "0")}-${String(
    value.getDate()
  ).padStart(2, "0")}`;
}

function parseDateKey(
  value: string
) {
  const [
    year,
    month,
    day,
  ] =
    value
      .split("-")
      .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return new Date();
  }

  return new Date(
    year,
    month - 1,
    day
  );
}

function formatDisplayDate(
  value: string
) {
  const date =
    parseDateKey(
      value
    );

  return formatWitaShortDate(date);
}

function buildCalendarDays(
  monthDate: Date
) {
  const year =
    monthDate.getFullYear();
  const month =
    monthDate.getMonth();
  const firstDay =
    new Date(
      year,
      month,
      1
    );
  const daysInMonth =
    new Date(
      year,
      month + 1,
      0
    ).getDate();
  const days: Array<
    string | null
  > = [];

  for (
    let i = 0;
    i < firstDay.getDay();
    i += 1
  ) {
    days.push(null);
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day += 1
  ) {
    days.push(
      toDateKey(
        new Date(
          year,
          month,
          day
        )
      )
    );
  }

  while (
    days.length % 7 !==
    0
  ) {
    days.push(null);
  }

  return days;
}

function addDays(
  value: Date,
  days: number
) {
  const next =
    new Date(value);

  next.setDate(
    next.getDate() +
      days
  );

  return next;
}

function daysBetween(
  start: string,
  end: string
) {
  const startTime =
    parseDateKey(start).getTime();
  const endTime =
    parseDateKey(end).getTime();
  const diff =
    Math.max(
      0,
      endTime - startTime
    );

  return (
    Math.floor(
      diff /
        (24 * 60 * 60 * 1000)
    ) + 1
  );
}

/* =====================================================
   SCREEN
===================================================== */

export default function PengajuanBaruScreen() {
  const params =
    useLocalSearchParams<{
      type?: string;
    }>();

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
      getInitialRequestType(
        params.type
      )
    );

  const [
    startDate,
    setStartDate,
  ] =
    useState(
      toDateKey(
        new Date()
      )
    );

  const [
    endDate,
    setEndDate,
  ] =
    useState(
      toDateKey(
        addDays(
          new Date(),
          1
        )
      )
    );

  const [
    reason,
    setReason,
  ] =
    useState("");

  const [
    cutiCategoryId,
    setCutiCategoryId,
  ] =
    useState(1);

  const [
    childNumber,
    setChildNumber,
  ] =
    useState(1);

  const [
    importantLeaveSubCategory,
    setImportantLeaveSubCategory,
  ] =
    useState<ImportantLeaveSubCategory>(
      "menikah"
    );

  const [
    plannedStartTime,
    setPlannedStartTime,
  ] =
    useState("17:00");

  const [
    plannedEndTime,
    setPlannedEndTime,
  ] =
    useState("19:00");

  const [
    doctorLetterNumber,
    setDoctorLetterNumber,
  ] =
    useState("");

  const [
    doctorFacilityName,
    setDoctorFacilityName,
  ] =
    useState("");

  const [
    selectedFile,
    setSelectedFile,
  ] =
    useState<SelectedFile | null>(
      null
    );

  const [
    datePickerTarget,
    setDatePickerTarget,
  ] =
    useState<DateTarget | null>(
      null
    );

  const documentLabel =
    type === "Cuti" &&
    cutiCategories.find(
      (item) =>
        item.value === cutiCategoryId
    )?.needsDoctorLetter
      ? "Surat dokter"
      : type === "Sakit"
      ? "Surat dokter"
      : type === "Perjadi"
      ? "Surat tugas"
      : "Dokumen pendukung";

  const uploadText =
    type === "Cuti" &&
    cutiCategories.find(
      (item) =>
        item.value === cutiCategoryId
    )?.needsDoctorLetter
      ? "Unggah surat dokter"
      : type === "Sakit"
      ? "Unggah surat dokter"
      : type === "Perjadi"
      ? "Unggah surat tugas"
      : "Unggah surat / dokumen pendukung";

  const isOvertime =
    type === "Lembur";
  const selectedCutiCategory =
    cutiCategories.find(
      (item) =>
        item.value === cutiCategoryId
    ) ?? cutiCategories[0];

  const [
    calendarMonth,
    setCalendarMonth,
  ] =
    useState(
      parseDateKey(
        startDate
      )
    );

  const openDatePicker =
    (target: DateTarget) => {
      if (
        loadingRequest
      ) {
        return;
      }

      setDatePickerTarget(
        target
      );

      setCalendarMonth(
        parseDateKey(
          target === "start"
            ? startDate
            : endDate
        )
      );
    };

  const closeDatePicker =
    () => {
      setDatePickerTarget(
        null
      );
    };

  const selectDate =
    (value: string) => {
      if (
        datePickerTarget ===
        "start"
      ) {
        setStartDate(value);

        if (
          parseDateKey(value) >
          parseDateKey(endDate)
        ) {
          setEndDate(value);
        }
      }

      if (
        datePickerTarget ===
        "end"
      ) {
        setEndDate(value);

        if (
          parseDateKey(value) <
          parseDateKey(startDate)
        ) {
          setStartDate(value);
        }
      }

      closeDatePicker();
    };

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
        (!isOvertime &&
          !endDate.trim())
      ) {
        Alert.alert(
          "Tanggal diperlukan",
          "Silakan isi tanggal mulai dan tanggal selesai."
        );

        return;
      }

      if (
        isOvertime &&
        (!/^\d{2}:\d{2}$/.test(
          plannedStartTime
        ) ||
          !/^\d{2}:\d{2}$/.test(
            plannedEndTime
          ))
      ) {
        Alert.alert(
          "Jam lembur tidak valid",
          "Gunakan format jam HH:mm, contoh 17:00."
        );

        return;
      }

      if (
        type === "Sakit" &&
        !doctorLetterNumber.trim()
      ) {
        Alert.alert(
          "Nomor surat diperlukan",
          "Cuti sakit wajib mengisi nomor surat dokter."
        );

        return;
      }

      if (
        type === "Sakit" &&
        !selectedFile
      ) {
        Alert.alert(
          "Dokumen diperlukan",
          "Cuti sakit wajib melampirkan surat dokter."
        );

        return;
      }

      if (
        type === "Perjadi" &&
        !selectedFile
      ) {
        Alert.alert(
          "Dokumen diperlukan",
          "Perjalanan dinas wajib melampirkan surat tugas."
        );

        return;
      }

      /* =========================================
         SUBMIT
      ========================================= */

      const success =
        await submitRequest({
          title:
            type === "Cuti"
              ? "Cuti"
              : type === "WFA"
              ? "Work From Anywhere"
              : type === "Sakit"
              ? "Cuti Sakit"
              : type === "Lembur"
              ? "Lembur"
              : type === "Perjadi"
              ? "Perjalanan Dinas"
              : "Izin",

          days:
            `${daysBetween(
              startDate,
              isOvertime
                ? startDate
                : endDate
            )} hari`,

          type,

          startDate,

          endDate:
            isOvertime
              ? startDate
              : endDate,

          reason:
            reason.trim(),

          attachment:
            selectedFile,

          doctorLetterType:
            type === "Sakit"
              ? "dokter_biasa"
              : undefined,

          doctorLetterNumber:
            type === "Sakit"
              ? doctorLetterNumber.trim()
              : undefined,

          doctorFacilityName:
            type === "Sakit"
              ? doctorFacilityName.trim()
              : undefined,

          plannedStartTime:
            isOvertime
              ? plannedStartTime.trim()
              : undefined,

          plannedEndTime:
            isOvertime
              ? plannedEndTime.trim()
              : undefined,
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
          <Ionicons
            name="chevron-back"
            size={21}
            color={
              Colors.textInk
            }
          />
        </Pressable>

        <View style={styles.headerText}>
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
            Cuti, sakit, izin, WFA, lembur, dan perjalanan dinas
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
            (item) => {
              const active =
                item.value === type;

              return (
                <Pressable
                  key={item.label}
                  style={[
                    styles.typeOption,

                    active
                      ? styles.typeOptionActive
                      : null,

                    loadingRequest
                      ? styles.typeOptionDisabled
                      : null,
                  ]}
                  onPress={() => {
                    if (
                      loadingRequest
                    ) {
                      return;
                    }

                    if (
                      item.route
                    ) {
                      router.push(
                        item.route as never
                      );
                      return;
                    }

                    if (
                      item.value
                    ) {
                      setType(
                        item.value
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

                      active
                        ? styles.typeTextActive
                        : null,
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {
                      item.label
                    }
                  </Text>
                </Pressable>
              );
            }
          )}
        </View>
      </View>

      {/* ==================================================
          TANGGAL
      ================================================== */}

      <View
        style={
          isOvertime
            ? styles.singleCol
            : styles.twoCol
        }
      >
        <DateField
          label={
            isOvertime
              ? "Tanggal lembur"
              : "Tanggal mulai"
          }
          value={startDate}
          onPress={() =>
            openDatePicker(
              "start"
            )
          }
          disabled={
            loadingRequest
          }
        />

        {!isOvertime ? (
          <DateField
            label="Tanggal selesai"
            value={endDate}
            onPress={() =>
              openDatePicker(
                "end"
              )
            }
            disabled={
              loadingRequest
            }
          />
        ) : null}
      </View>

      {isOvertime ? (
        <View
          style={
            styles.twoCol
          }
        >
          <Field
            label="Jam mulai"
            value={
              plannedStartTime
            }
            onChangeText={
              setPlannedStartTime
            }
            placeholder="17:00"
            disabled={
              loadingRequest
            }
          />

          <Field
            label="Jam selesai"
            value={
              plannedEndTime
            }
            onChangeText={
              setPlannedEndTime
            }
            placeholder="19:00"
            disabled={
              loadingRequest
            }
          />
        </View>
      ) : null}

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

      {type === "Sakit" ? (
        <View
          style={
            styles.sickFields
          }
        >
          <Field
            label="Nomor surat dokter"
            value={
              doctorLetterNumber
            }
            onChangeText={
              setDoctorLetterNumber
            }
            placeholder="Contoh: 445/RS/2026"
            disabled={
              loadingRequest
            }
          />

          <Field
            label="Fasilitas kesehatan"
            value={
              doctorFacilityName
            }
            onChangeText={
              setDoctorFacilityName
            }
            placeholder="Nama rumah sakit / klinik"
            disabled={
              loadingRequest
            }
          />
        </View>
      ) : null}

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
          {documentLabel}
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
            <View style={styles.uploadIconBox}>
              <Ionicons
                name="cloud-upload-outline"
                size={26}
                color={
                  Colors.primaryDark
                }
              />
            </View>

            <Text
              style={
                styles.uploadText
              }
            >
              {uploadText}
            </Text>

            <Text
              style={
                styles.uploadHint
              }
            >
              PDF, JPG, JPEG, PNG
              {" - "}
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
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={
                    Colors.primaryDark
                  }
                />
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

      <DatePickerModal
        visible={
          datePickerTarget !==
          null
        }
        selectedDate={
          datePickerTarget ===
          "end"
            ? endDate
            : startDate
        }
        monthDate={
          calendarMonth
        }
        onChangeMonth={
          setCalendarMonth
        }
        onSelect={
          selectDate
        }
        onClose={
          closeDatePicker
        }
      />
    </MainScreen>
  );
}

/* =====================================================
   DATE FIELD
===================================================== */

function DateField({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <Pressable
        style={[
          styles.field,
          styles.dateField,
          disabled
            ? styles.fieldDisabled
            : null,
        ]}
        disabled={disabled}
        onPress={onPress}
      >
        <Text style={styles.dateText}>
          {formatDisplayDate(
            value
          )}
        </Text>

        <Ionicons
          name="calendar-outline"
          size={17}
          color={
            Colors.primaryDark
          }
        />
      </Pressable>
    </View>
  );
}

/* =====================================================
   DATE PICKER MODAL
===================================================== */

function DatePickerModal({
  visible,
  selectedDate,
  monthDate,
  onChangeMonth,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedDate: string;
  monthDate: Date;
  onChangeMonth: (
    value: Date
  ) => void;
  onSelect: (
    value: string
  ) => void;
  onClose: () => void;
}) {
  const days =
    buildCalendarDays(
      monthDate
    );

  const todayKey =
    toDateKey(
      new Date()
    );

  const changeMonth =
    (offset: number) => {
      onChangeMonth(
        new Date(
          monthDate.getFullYear(),
          monthDate.getMonth() +
            offset,
          1
        )
      );
    };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={onClose}
      >
        <Pressable
          style={styles.calendarCard}
        >
          <View style={styles.calendarTop}>
            <Pressable
              style={styles.calendarNav}
              onPress={() =>
                changeMonth(-1)
              }
            >
              <Text style={styles.calendarNavText}>
                {"<"}
              </Text>
            </Pressable>

            <Text style={styles.calendarTitle}>
              {
                monthNames[
                  monthDate.getMonth()
                ]
              }{" "}
              {monthDate.getFullYear()}
            </Text>

            <Pressable
              style={styles.calendarNav}
              onPress={() =>
                changeMonth(1)
              }
            >
              <Text style={styles.calendarNavText}>
                {">"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.calendarWeek}>
            {dayNames.map((day) => (
              <Text
                key={day}
                style={styles.calendarWeekText}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {days.map(
              (dateKey, index) => {
                const selected =
                  dateKey ===
                  selectedDate;
                const isToday =
                  dateKey ===
                  todayKey;

                return (
                  <Pressable
                    key={`${dateKey || "empty"}-${index}`}
                    style={[
                      styles.calendarDay,
                      selected
                        ? styles.calendarDaySelected
                        : null,
                      !dateKey
                        ? styles.calendarDayEmpty
                        : null,
                    ]}
                    disabled={!dateKey}
                    onPress={() => {
                      if (dateKey) {
                        onSelect(dateKey);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isToday
                          ? styles.calendarDayTodayText
                          : null,
                        selected
                          ? styles.calendarDaySelectedText
                          : null,
                      ]}
                    >
                      {dateKey
                        ? String(
                            parseDateKey(
                              dateKey
                            ).getDate()
                          )
                        : ""}
                    </Text>
                  </Pressable>
                );
              }
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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

    headerText: {
      flex: 1,
      minWidth: 0,
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

    dateField: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      gap: 8,
    },

    dateText: {
      flex: 1,
      color:
        Colors.textInk,
      fontSize: 13,
      fontWeight:
        "800",
    },

    fieldDisabled: {
      backgroundColor:
        "#F5F6F8",
      opacity: 0.75,
    },

    sickFields: {
      gap: 12,
    },

    typeGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      justifyContent:
        "space-between",
      rowGap: 8,
    },

    typeOption: {
      width:
        "48.5%",
      alignItems:
        "center",
      borderRadius: 11,
      paddingHorizontal:
        8,
      paddingVertical:
        11,
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
      minHeight: 118,
      alignItems:
        "stretch",
      justifyContent:
        "flex-start",
      paddingTop: 12,
      paddingBottom: 12,
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
      width: "100%",
      minHeight: 92,
      padding: 0,
      textAlignVertical:
        "top",
    },

    twoCol: {
      flexDirection:
        "row",
      gap: 10,
    },

    singleCol: {
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

    uploadIconBox: {
      width: 48,
      height: 48,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 15,
      backgroundColor:
        "#E7EEFC",
      marginBottom: 3,
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

    modalBackdrop: {
      flex: 1,
      justifyContent:
        "center",
      paddingHorizontal: 20,
      backgroundColor:
        "rgba(13, 39, 71, 0.38)",
    },

    calendarCard: {
      borderRadius: 18,
      padding: 16,
      backgroundColor:
        Colors.white,
      borderWidth: 1,
      borderColor:
        Colors.line,
    },

    calendarTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 14,
    },

    calendarNav: {
      width: 36,
      height: 36,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 11,
      backgroundColor:
        "#EEF3FC",
    },

    calendarNavText: {
      color:
        Colors.primaryDark,
      fontSize: 18,
      fontWeight:
        "900",
    },

    calendarTitle: {
      color:
        Colors.textInk,
      fontSize: 15,
      fontWeight:
        "900",
    },

    calendarWeek: {
      flexDirection:
        "row",
      marginBottom: 7,
    },

    calendarWeekText: {
      width: `${100 / 7}%`,
      color:
        "#7A8699",
      fontSize: 10.5,
      fontWeight:
        "800",
      textAlign: "center",
    },

    calendarGrid: {
      flexDirection:
        "row",
      flexWrap:
        "wrap",
      rowGap: 6,
    },

    calendarDay: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderRadius: 11,
    },

    calendarDayEmpty: {
      opacity: 0,
    },

    calendarDaySelected: {
      backgroundColor:
        Colors.background,
    },

    calendarDayText: {
      color:
        Colors.textInk,
      fontSize: 12,
      fontWeight:
        "800",
    },

    calendarDayTodayText: {
      color:
        Colors.primaryDark,
    },

    calendarDaySelectedText: {
      color:
        Colors.white,
    },
  });
