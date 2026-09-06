import React, {
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Avatar from "../../components/Avatar";
import Button from "../../components/Button";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import { AppConfig } from "../../constants/config";
import {
  clearSession,
  logout,
} from "../../services/api";
import { usePrototype } from "../../contexts/PrototypeContext";

export default function ProfilScreen() {
  const { profile } = usePrototype();
  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const employee = profile?.employee;
  const fullName = profile?.full_name || profile?.username || "Pegawai";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase();
  const role = profile?.roles?.map((item) => item.name).join(", ") || "Pegawai";

  const handleLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logout();
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error
      );

      await clearSession();
    } finally {
      setLoggingOut(false);
      router.replace("/login");
    }
  };

  return (
    <MainScreen>
      <LinearGradient
        colors={[
          Colors.background,
          Colors.backgroundMid,
        ]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
        style={styles.profileHero}
      >
        <View style={styles.profileGlow} />

        <View style={styles.profileHeroTop}>
          <Avatar initials={initials || "KP"} size={62} />

          <View style={styles.profileHeroText}>
            <Text style={styles.heroName} numberOfLines={2}>
              {fullName}
            </Text>
            <Text style={styles.heroRole} numberOfLines={1}>
              {role}
            </Text>
          </View>
        </View>

        <View style={styles.heroChips}>
          <View style={styles.heroChip}>
            <Text style={styles.heroChipText}>
              {employee?.employment_status || "Pegawai"}
            </Text>
          </View>
          <View style={[styles.heroChip, styles.heroChipGreen]}>
            <Text style={[styles.heroChipText, styles.heroChipTextGreen]}>
              Pegawai
            </Text>
          </View>
          <View style={styles.heroChipBlue}>
            <Text style={styles.heroChipBlueText}>
              {employee?.employee_type || "Aktif"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.panel}>
        <InfoRow label="NIP" value={employee?.nip || "-"} mono />
        <InfoRow label="Unit kerja" value={employee?.work_unit?.name || "-"} />
        <InfoRow label="Kategori" value={employee?.employee_type || "-"} />
        <InfoRow label="Status" value={employee?.employment_status || "-"} />
      </View>

      <View style={styles.faceCard}>
        <View style={styles.faceIcon}>
          <Ionicons
            name="person-circle-outline"
            size={23}
            color="#16A34A"
          />
        </View>
        <View style={styles.faceContent}>
          <Text style={styles.faceTitle}>Data wajah terdaftar</Text>
          <Text style={styles.faceSubtitle}>Terverifikasi untuk presensi</Text>
        </View>
        <Text style={styles.faceAction}>Perbarui</Text>
      </View>

      <View style={styles.panel}>
        <MenuRow icon="mail-outline" label="Email" value={profile?.employee?.name ? profile.username : "-"} />
        <MenuRow icon="notifications-outline" label="Notifikasi" value="Aktif" />
        <MenuRow icon="language-outline" label="Bahasa" value="Indonesia" />
        <MenuRow icon="settings-outline" label="Pengaturan perangkat" value="" />
      </View>

      <Button
        title={
          loggingOut
            ? "Keluar..."
            : "Keluar"
        }
        variant="danger"
        loading={loggingOut}
        onPress={handleLogout}
      />

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

function MenuRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <Pressable style={styles.menuRow}>
      <Ionicons
        name={icon}
        size={19}
        color={Colors.textBody}
      />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? (
        <Text style={styles.menuValue}>{value}</Text>
      ) : (
        <Ionicons
          name="chevron-forward"
          size={17}
          color="#C2C9D6"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileHero: {
    overflow: "hidden",
    gap: 14,
    marginHorizontal: -16,
    marginTop: -4,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 22,
  },
  profileGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(59,130,246,0.28)",
    top: -90,
    right: -50,
  },
  profileHeroTop: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileHeroText: {
    flex: 1,
    minWidth: 0,
  },
  heroName: {
    color: Colors.white,
    fontSize: 16.5,
    fontWeight: "800",
    lineHeight: 21,
  },
  heroRole: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    marginTop: 3,
  },
  heroChips: {
    position: "relative",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  heroChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.13)",
  },
  heroChipGreen: {
    backgroundColor: "rgba(52,211,153,0.16)",
  },
  heroChipBlue: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 9,
    backgroundColor: "rgba(96,165,250,0.18)",
  },
  heroChipText: {
    color: "#CFE0F5",
    fontSize: 10.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heroChipTextGreen: {
    color: "#6EE7B7",
  },
  heroChipBlueText: {
    color: "#93C5FD",
    fontSize: 10.5,
    fontWeight: "800",
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
  faceCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  faceIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#E7F6ED",
  },
  faceContent: {
    flex: 1,
    minWidth: 0,
  },
  faceTitle: {
    color: Colors.textInk,
    fontSize: 13,
    fontWeight: "800",
  },
  faceSubtitle: {
    color: "#7A8699",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  faceAction: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontWeight: "800",
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 13,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F4F8",
  },
  menuLabel: {
    flex: 1,
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
