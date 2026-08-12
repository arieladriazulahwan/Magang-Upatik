import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import Button from "../../components/Button";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import { usePrototype } from "../../contexts/PrototypeContext";

const requestTypes = ["Cuti", "Izin", "Sakit", "WFH"];

export default function PengajuanBaruScreen() {
  const { submitRequest } = usePrototype();
  const [type, setType] = useState("Cuti");
  const [startDate, setStartDate] = useState("07 Jul 2026");
  const [endDate, setEndDate] = useState("08 Jul 2026");
  const [reason, setReason] = useState("");

  const submit = () => {
    submitRequest({
      title: type === "Cuti" ? "Cuti Tahunan" : type === "WFH" ? "Work From Home" : type === "Sakit" ? "Cuti Sakit" : "Izin Keperluan",
      meta: startDate === endDate ? startDate : `${startDate} - ${endDate}`,
      days: type === "WFH" || startDate === endDate ? "1 hari" : "2 hari kerja",
      type,
    });
    router.replace("/(main)/pengajuan");
  };

  return (
    <MainScreen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>{"<"}</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Pengajuan Baru</Text>
          <Text style={styles.subtitle}>Lengkapi detail permohonan</Text>
        </View>
      </View>

      <View style={styles.fieldBlock}>
        <Text style={styles.fieldLabel}>Jenis pengajuan</Text>
        <View style={styles.typeGrid}>
          {requestTypes.map((item) => (
            <Pressable key={item} style={[styles.typeOption, type === item ? styles.typeOptionActive : null]} onPress={() => setType(item)}>
              <Text style={[styles.typeText, type === item ? styles.typeTextActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.twoCol}>
        <Field label="Tanggal mulai" value={startDate} onChangeText={setStartDate} />
        <Field label="Tanggal selesai" value={endDate} onChangeText={setEndDate} />
      </View>
      <Field label="Alasan / keterangan" value={reason} onChangeText={setReason} placeholder="Tulis alasan pengajuan Anda..." multiline />

      <View style={styles.upload}>
        <Text style={styles.uploadIcon}>↑</Text>
        <Text style={styles.uploadText}>Unggah surat / dokumen pendukung</Text>
      </View>

      <Button title="Kirim Pengajuan" onPress={submit} />
    </MainScreen>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.field, multiline ? styles.textarea : null]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A0B3"
          multiline={multiline}
          style={[styles.fieldValue, multiline ? styles.textareaInput : null]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  backText: {
    color: Colors.textInk,
    fontSize: 31,
    lineHeight: 33,
  },
  title: {
    color: Colors.textInk,
    fontSize: 19,
    fontWeight: "800",
  },
  subtitle: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "600",
  },
  fieldBlock: {
    gap: 7,
    flex: 1,
  },
  fieldLabel: {
    color: Colors.textBody,
    fontSize: 12,
    fontWeight: "800",
  },
  field: {
    minHeight: 48,
    justifyContent: "center",
    borderRadius: 12,
    paddingHorizontal: 13,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E1E6EF",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeOption: {
    minWidth: "23%",
    alignItems: "center",
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E1E6EF",
  },
  typeOptionActive: {
    backgroundColor: Colors.background,
    borderColor: Colors.background,
  },
  typeText: {
    color: Colors.textBody,
    fontSize: 12,
    fontWeight: "800",
  },
  typeTextActive: {
    color: Colors.white,
  },
  textarea: {
    minHeight: 84,
    alignItems: "flex-start",
    paddingTop: 13,
  },
  fieldValue: {
    minHeight: 22,
    padding: 0,
    color: Colors.textInk,
    fontSize: 13,
    fontWeight: "700",
  },
  textareaInput: {
    minHeight: 56,
    textAlignVertical: "top",
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
  },
  upload: {
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 13,
    backgroundColor: "#F6F8FB",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#CDD6E4",
  },
  uploadIcon: {
    color: "#9AA5B6",
    fontSize: 22,
    fontWeight: "800",
  },
  uploadText: {
    color: "#94A0B3",
    fontSize: 11.5,
    fontWeight: "700",
  },
});
