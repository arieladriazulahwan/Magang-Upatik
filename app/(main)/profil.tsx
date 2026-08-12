import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import Avatar from "../../components/Avatar";
import Badge from "../../components/Badge";
import Button from "../../components/Button";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import { AppConfig } from "../../constants/config";
import { me } from "../../constants/mockData";

export default function ProfilScreen() {
  return (
    <MainScreen>
      <View style={styles.profileCard}>
        <Avatar initials={me.initials} size={72} />
        <Text style={styles.name}>{me.name}</Text>
        <Text style={styles.role}>{me.role}</Text>
        <Badge label={me.category} tone="blue" />
      </View>

      <View style={styles.panel}>
        <InfoRow label="NIP" value={me.nip} mono />
        <InfoRow label="Unit kerja" value={me.unit} />
        <InfoRow label="Status" value={me.status} />
        <InfoRow label="Pangkat/Golongan" value={me.rank} />
        <InfoRow label="Minimal kerja" value={me.minWork} />
      </View>

      <View style={styles.panel}>
        <MenuRow label="Email" value={me.email} />
        <MenuRow label="No. HP" value={me.phone} />
        <MenuRow label="Bahasa" value="Indonesia" />
        <MenuRow label="Notifikasi" value="Aktif" />
      </View>

      <Button title="Keluar" variant="ghost" onPress={() => router.replace("/login")} />

      <Text style={styles.footer}>
        {AppConfig.name} - {AppConfig.university}
        {"\n"}
        Versi {AppConfig.version} - {AppConfig.ssoName}
      </Text>
    </MainScreen>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, mono ? styles.mono : null]}>{value}</Text>
    </View>
  );
}

function MenuRow({ label, value }: { label: string; value: string }) {
  return (
    <Pressable style={styles.menuRow}>
      <Text style={styles.menuLabel}>{label}</Text>
      <Text style={styles.menuValue}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: "center",
    gap: 8,
    padding: 20,
    borderRadius: 18,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  name: {
    color: Colors.textInk,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  role: {
    color: "#7A8699",
    fontSize: 12.5,
    fontWeight: "600",
    textAlign: "center",
  },
  panel: {
    overflow: "hidden",
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F8",
  },
  infoLabel: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "700",
  },
  infoValue: {
    flex: 1,
    color: Colors.textInk,
    fontSize: 12.5,
    fontWeight: "800",
    textAlign: "right",
  },
  mono: {
    fontFamily: "monospace",
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F8",
  },
  menuLabel: {
    color: Colors.textInk,
    fontSize: 13,
    fontWeight: "700",
  },
  menuValue: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },
  footer: {
    color: "#94A0B3",
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 17,
    textAlign: "center",
  },
});
