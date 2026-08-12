import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Button from "../../components/Button";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";

export default function PengajuanBaruScreen() {
  return (
    <MainScreen>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <View>
          <Text style={styles.title}>Pengajuan Baru</Text>
          <Text style={styles.subtitle}>Lengkapi detail permohonan</Text>
        </View>
      </View>

      <Field label="Jenis pengajuan" value="Cuti Tahunan" />
      <View style={styles.twoCol}>
        <Field label="Tanggal mulai" value="07 Jul 2026" />
        <Field label="Tanggal selesai" value="08 Jul 2026" />
      </View>
      <Field label="Alasan / keterangan" value="Tulis alasan pengajuan Anda..." multiline />

      <View style={styles.upload}>
        <Text style={styles.uploadIcon}>↑</Text>
        <Text style={styles.uploadText}>Unggah surat / dokumen pendukung</Text>
      </View>

      <Button title="Kirim Pengajuan" onPress={() => router.replace("/(main)/pengajuan")} />
    </MainScreen>
  );
}

function Field({ label, value, multiline }: { label: string; value: string; multiline?: boolean }) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.field, multiline ? styles.textarea : null]}>
        <Text style={[styles.fieldValue, multiline ? styles.placeholder : null]}>{value}</Text>
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
  textarea: {
    minHeight: 84,
    alignItems: "flex-start",
    paddingTop: 13,
  },
  fieldValue: {
    color: Colors.textInk,
    fontSize: 13,
    fontWeight: "700",
  },
  placeholder: {
    color: "#94A0B3",
    fontWeight: "600",
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
