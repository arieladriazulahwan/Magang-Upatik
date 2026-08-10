import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import Svg, { Circle, Path } from "react-native-svg";
import Button from "../../components/Button";
import Input from "../../components/Input";
import LogoMark from "../../components/LogoMark";
import { Colors } from "../../constants/colors";
import { AppConfig } from "../../constants/config";

function UserIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Circle cx="12" cy="8" r="4" stroke={Colors.textMuted} strokeWidth="1.9" fill="none" />
      <Path d="M5 21a7 7 0 0 1 14 0" stroke={Colors.textMuted} strokeWidth="1.9" fill="none" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6z"
        stroke={Colors.textMuted}
        strokeWidth="1.9"
        fill="none"
      />
    </Svg>
  );
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        d={
          hidden
            ? "M17.9 17.9A10.4 10.4 0 0 1 12 20C5 20 1 12 1 12a19 19 0 0 1 5.1-6M1 1l22 22M9.9 4.2A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a19.2 19.2 0 0 1-2.2 3.2"
            : "M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12"
        }
        stroke={Colors.textMuted}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {!hidden ? (
        <Circle cx="12" cy="12" r="3" stroke={Colors.textMuted} strokeWidth="1.8" fill="none" />
      ) : null}
    </Svg>
  );
}

function ArrowIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M5 12h14M13 5l7 7-7 7"
        stroke={Colors.white}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

function CheckIcon() {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24">
      <Path
        d="M5 12l5 5L20 6"
        stroke={Colors.white}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const login = () => {
    router.replace("/(main)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.select({ ios: "padding", default: undefined })}
    >
      <View style={styles.grid} />
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.brandRow}>
          <LogoMark size={44} compact />
          <View>
            <Text style={styles.brand}>{AppConfig.name}</Text>
            <Text style={styles.university}>{AppConfig.university}</Text>
          </View>
        </View>

        <View style={styles.scanWrap}>
          <View style={styles.scanPanel}>
            <LogoMark size={92} variant="scan" />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>Masuk ke akun Anda</Text>
          <Text style={styles.subtitle}>
            Gunakan NIP/username & kata sandi kepegawaian Untad
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="NIP / Username"
            icon={<UserIcon />}
            value={username}
            onChangeText={setUsername}
            placeholder="198203152008011002"
            autoCapitalize="none"
            keyboardType="number-pad"
          />

          <Input
            label="Kata sandi"
            icon={<LockIcon />}
            value={password}
            onChangeText={setPassword}
            placeholder="Masukkan kata sandi"
            secureTextEntry={!showPassword}
            right={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                hitSlop={10}
                onPress={() => setShowPassword((value) => !value)}
              >
                <EyeIcon hidden={!showPassword} />
              </Pressable>
            }
          />

          <View style={styles.optionsRow}>
            <Pressable style={styles.rememberRow} onPress={() => setRemember((value) => !value)}>
              <View style={[styles.checkbox, remember ? styles.checkboxActive : null]}>
                {remember ? <CheckIcon /> : null}
              </View>
              <Text style={styles.optionText}>Ingat saya</Text>
            </Pressable>

            <Pressable>
              <Text style={styles.forgotText}>Lupa kata sandi?</Text>
            </Pressable>
          </View>

          <Button title="Masuk" icon={<ArrowIcon />} onPress={login} />

          <Button
            title={`Masuk dengan ${AppConfig.ssoName}`}
            variant="ghost"
            onPress={login}
            style={styles.ssoButton}
          />
        </View>

        <View style={styles.securityNote}>
          <View style={styles.securityDot} />
          <Text style={styles.securityText}>Koneksi aman terenkripsi</Text>
        </View>

        <Text style={styles.footer}>
          Versi {AppConfig.version} - {AppConfig.ssoName}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: "hidden",
    backgroundColor: Colors.background,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.06,
    backgroundColor: Colors.backgroundMid,
  },
  glowTop: {
    position: "absolute",
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: "rgba(59,130,246,0.28)",
    top: -150,
    right: -130,
  },
  glowBottom: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(13,148,136,0.2)",
    bottom: 40,
    left: -110,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 26,
    paddingTop: 54,
    paddingBottom: 28,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brand: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "800",
  },
  university: {
    color: "#8FB4E8",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.6,
    marginTop: 2,
  },
  scanWrap: {
    alignItems: "center",
    marginTop: 28,
  },
  scanPanel: {
    width: 104,
    height: 104,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  titleBlock: {
    alignItems: "center",
    marginTop: 17,
  },
  title: {
    color: Colors.white,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 12.5,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 7,
    textAlign: "center",
  },
  form: {
    gap: 15,
    marginTop: 23,
  },
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: -2,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkbox: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 5,
    borderWidth: 1.4,
    borderColor: "rgba(255,255,255,0.3)",
  },
  checkboxActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  optionText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  forgotText: {
    color: Colors.primarySoft,
    fontSize: 12,
    fontWeight: "700",
  },
  ssoButton: {
    marginTop: 1,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 18,
  },
  securityDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  securityText: {
    color: Colors.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
  },
  footer: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: "600",
    marginTop: "auto",
    paddingTop: 28,
    textAlign: "center",
  },
});
