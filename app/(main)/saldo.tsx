import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import {
  ApiLeaveBalance,
  getDashboardMe,
} from "../../services/api";

type BalanceRow = {
  name: string;
  value: string;
  note: string;
  tone: "green" | "purple" | "blue" | "red" | "amber" | "gray";
};

export default function SaldoScreen() {
  const [
    balances,
    setBalances,
  ] = useState<ApiLeaveBalance[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const loadBalances =
    useCallback(async () => {
      try {
        setLoading(true);
        setError(null);

        const response =
          await getDashboardMe();

        setBalances(
          response.data
            .leave_balances || []
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Saldo cuti gagal dimuat."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const annualBalance =
    useMemo(
      () =>
        balances.find(
          (item) => {
            const name =
              item.leave_type?.name
                ?.toLowerCase() ||
              "";
            const code =
              item.leave_type?.code
                ?.toLowerCase() ||
              "";

            return (
              name.includes(
                "tahunan"
              ) ||
              code.includes(
                "tahunan"
              )
            );
          }
        ) || balances[0],
      [balances]
    );

  const rows =
    useMemo(
      () =>
        balances.map(
          mapBalance
        ),
      [balances]
    );

  const used =
    annualBalance?.used ?? 0;

  const remaining =
    annualBalance?.remaining ?? 0;

  const entitlement =
    annualBalance?.entitlement ??
    used + remaining;

  return (
    <MainScreen>
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons
            name="chevron-back"
            size={21}
            color={Colors.textInk}
          />
        </Pressable>
        <View>
          <Text style={styles.title}>Saldo Cuti</Text>
          <Text style={styles.subtitle}>
            Hak cuti dan pemakaian tahun berjalan
          </Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>Cuti tahunan tersisa</Text>
        <View style={styles.heroValueRow}>
          <Text style={styles.heroValue}>
            {loading ? "--" : remaining}
          </Text>
          <Text style={styles.heroUnit}>hari tersisa</Text>
        </View>
        <View style={styles.bar}>
          <View
            style={[
              styles.barUsed,
              {
                flex:
                  used > 0
                    ? used
                    : 0.01,
              },
            ]}
          />
          <View
            style={[
              styles.barLeft,
              {
                flex:
                  remaining > 0
                    ? remaining
                    : 0.01,
              },
            ]}
          />
        </View>
        <Text style={styles.heroNote}>
          {loading
            ? "Mengambil data saldo dari backend"
            : `${used} hari terpakai dari total ${entitlement} hari tersedia`}
        </Text>
      </View>

      {loading ? (
        <View style={styles.stateBox}>
          <ActivityIndicator
            size="small"
            color={Colors.background}
          />
          <Text style={styles.stateText}>
            Memuat saldo cuti...
          </Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>
            Gagal memuat saldo
          </Text>
          <Text style={styles.errorText}>
            {error}
          </Text>
          <Pressable
            style={styles.retryButton}
            onPress={loadBalances}
          >
            <Text style={styles.retryText}>
              Coba Lagi
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !error ? (
        <View style={styles.list}>
          {rows.map((item) => (
            <View key={item.name} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>
                  {item.name}
                </Text>
                <Badge
                  label={item.value}
                  tone={item.tone}
                />
              </View>
              <Text style={styles.cardNote}>
                {item.note}
              </Text>
            </View>
          ))}

          {rows.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Saldo cuti tahun berjalan belum tersedia.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}
    </MainScreen>
  );
}

function mapBalance(
  item: ApiLeaveBalance
): BalanceRow {
  const name =
    item.leave_type?.name ||
    "Jenis Cuti";

  const remaining =
    Number(item.remaining) || 0;

  const entitlement =
    Number(item.entitlement) || 0;

  const used =
    Number(item.used) || 0;

  return {
    name,
    value: `${remaining} hari`,
    note: `${used} hari terpakai dari hak ${entitlement} hari`,
    tone:
      remaining <= 0
        ? "red"
        : remaining <= 3
        ? "amber"
        : "green",
  };
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
  title: {
    color: Colors.textInk,
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "600",
  },
  hero: {
    gap: 12,
    padding: 18,
    borderRadius: 20,
    backgroundColor: Colors.background,
  },
  heroLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  heroValueRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  heroValue: {
    color: Colors.white,
    fontSize: 44,
    fontWeight: "800",
    lineHeight: 48,
  },
  heroUnit: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 7,
  },
  bar: {
    height: 9,
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  barUsed: {
    flex: 4,
    backgroundColor: Colors.warning,
  },
  barLeft: {
    flex: 14,
    backgroundColor: Colors.success,
  },
  heroNote: {
    color: Colors.textMuted,
    fontSize: 11.5,
    fontWeight: "600",
  },
  stateBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 26,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  stateText: {
    color: "#7A8699",
    fontSize: 13,
    fontWeight: "700",
  },
  errorBox: {
    gap: 8,
    padding: 16,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#F0D5D5",
  },
  errorTitle: {
    color: Colors.textInk,
    fontSize: 14,
    fontWeight: "800",
  },
  errorText: {
    color: "#B45353",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: Colors.background,
  },
  retryText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  list: {
    gap: 10,
  },
  card: {
    gap: 8,
    padding: 15,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitle: {
    color: Colors.textInk,
    fontSize: 14.5,
    fontWeight: "800",
  },
  cardNote: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  empty: {
    alignItems: "center",
    padding: 26,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  emptyText: {
    color: "#94A0B3",
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
  },
});
