import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import Avatar from "../../components/Avatar";
import Badge from "../../components/Badge";
import MainScreen from "../../components/MainScreen";
import { Colors } from "../../constants/colors";
import { usePrototype } from "../../contexts/PrototypeContext";

export default function PersetujuanScreen() {
  const [tab, setTab] = useState<
    "menunggu" | "riwayat"
  >("menunggu");

  const {
    approvals,
    approvalHistory,
    decideApproval,
    loadingApprovalId,
  } = usePrototype();

  const showingPending =
    tab === "menunggu";

  /**
   * Mengecek apakah item tertentu
   * sedang diproses.
   */
  const isProcessing = (id: string) => {
    return loadingApprovalId === id;
  };

  /**
   * Mengecek apakah ada proses
   * approval yang sedang berjalan.
   */
  const isAnyProcessing =
    loadingApprovalId !== null;

  /**
   * Proses keputusan approval.
   */
  const handleDecision = async (
    id: string,
    decision: "Ditolak" | "Disetujui"
  ) => {
    /**
     * Cegah klik jika sedang ada
     * approval yang diproses.
     */
    if (isAnyProcessing) {
      return;
    }

    /**
     * Tunggu proses sampai selesai.
     *
     * Loading dan notifikasi
     * ditangani oleh PrototypeContext.
     */
    await decideApproval(id, decision);
  };

  return (
    <MainScreen>
      {/* HEADER */}
      <View style={styles.headerRow}>
        <Pressable
          onPress={() => {
            if (!isAnyProcessing) {
              router.back();
            }
          }}
          style={[
            styles.back,
            isAnyProcessing
              ? styles.backDisabled
              : null,
          ]}
          disabled={isAnyProcessing}
        >
          <Text style={styles.backText}>
            {"<"}
          </Text>
        </Pressable>

        <View>
          <Text style={styles.title}>
            Persetujuan
          </Text>

          <Text style={styles.subtitle}>
            {approvals.length} pengajuan menunggu
            tinjauan
          </Text>
        </View>
      </View>

      {/* TAB */}
      <View style={styles.tabs}>
        <Pressable
          style={
            showingPending
              ? styles.activeTab
              : styles.tab
          }
          onPress={() => {
            if (!isAnyProcessing) {
              setTab("menunggu");
            }
          }}
          disabled={isAnyProcessing}
        >
          <Text
            style={
              showingPending
                ? styles.activeTabText
                : styles.tabText
            }
          >
            Menunggu - {approvals.length}
          </Text>
        </Pressable>

        <Pressable
          style={
            !showingPending
              ? styles.activeTab
              : styles.tab
          }
          onPress={() => {
            if (!isAnyProcessing) {
              setTab("riwayat");
            }
          }}
          disabled={isAnyProcessing}
        >
          <Text
            style={
              !showingPending
                ? styles.activeTabText
                : styles.tabText
            }
          >
            Riwayat - {approvalHistory.length}
          </Text>
        </Pressable>
      </View>

      {/* ================================
          TAB MENUNGGU
          ================================= */}
      {showingPending
        ? approvals.map((item, index) => {
            const processing =
              isProcessing(item.id);

            return (
              <View
                key={`${item.name}-${item.range}`}
                style={[
                  styles.card,
                  processing
                    ? styles.cardProcessing
                    : null,
                ]}
              >
                {/* PERSON */}
                <View style={styles.personRow}>
                  <Avatar
                    initials={item.name
                      .slice(0, 2)
                      .toUpperCase()}
                    size={42}
                    color={
                      index === 1
                        ? "#0F766E"
                        : "#1D4ED8"
                    }
                  />

                  <View style={styles.personInfo}>
                    <Text style={styles.name}>
                      {item.name}
                    </Text>

                    <Text style={styles.unit}>
                      {item.unit}
                    </Text>
                  </View>
                </View>

                {/* META */}
                <View style={styles.metaRow}>
                  <Badge
                    label={item.type}
                    tone={
                      item.type.includes("Cuti")
                        ? "purple"
                        : item.type.includes("WFH")
                        ? "green"
                        : "blue"
                    }
                  />

                  <Text style={styles.range}>
                    {item.range}
                  </Text>
                </View>

                {/* REASON */}
                <Text style={styles.reason}>
                  {item.reason}
                </Text>

                <Text style={styles.info}>
                  {item.info}
                </Text>

                {/* ACTION */}
                <View style={styles.actions}>
                  {/* TOLAK */}
                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.rejectButton,

                      isAnyProcessing
                        ? styles.actionDisabled
                        : null,
                    ]}
                    onPress={() =>
                      handleDecision(
                        item.id,
                        "Ditolak"
                      )
                    }
                    disabled={isAnyProcessing}
                  >
                    <Text
                      style={styles.rejectText}
                    >
                      {processing
                        ? "Memproses..."
                        : "Tolak"}
                    </Text>
                  </Pressable>

                  {/* SETUJUI */}
                  <Pressable
                    style={[
                      styles.actionButton,
                      styles.approveButton,

                      isAnyProcessing
                        ? styles.actionDisabled
                        : null,
                    ]}
                    onPress={() =>
                      handleDecision(
                        item.id,
                        "Disetujui"
                      )
                    }
                    disabled={isAnyProcessing}
                  >
                    <Text
                      style={styles.approveText}
                    >
                      {processing
                        ? "Memproses..."
                        : "Setujui"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        : /* ================================
            TAB RIWAYAT
            ================================= */
          approvalHistory.map(
            (item, index) => (
              <View
                key={`${item.id}-${item.decision}`}
                style={styles.card}
              >
                {/* PERSON */}
                <View style={styles.personRow}>
                  <Avatar
                    initials={item.name
                      .slice(0, 2)
                      .toUpperCase()}
                    size={42}
                    color={
                      index === 1
                        ? "#0F766E"
                        : "#1D4ED8"
                    }
                  />

                  <View style={styles.personInfo}>
                    <Text style={styles.name}>
                      {item.name}
                    </Text>

                    <Text style={styles.unit}>
                      {item.unit}
                    </Text>
                  </View>
                </View>

                {/* META */}
                <View style={styles.metaRow}>
                  <Badge
                    label={item.type}
                    tone={
                      item.type.includes("Cuti")
                        ? "purple"
                        : item.type.includes("WFH")
                        ? "green"
                        : "blue"
                    }
                  />

                  <Badge
                    label={item.decision}
                    tone={
                      item.decision ===
                      "Disetujui"
                        ? "green"
                        : "red"
                    }
                  />
                </View>

                <Text style={styles.reason}>
                  {item.range} - {item.reason}
                </Text>
              </View>
            )
          )}

      {/* EMPTY STATE */}
      {(
        showingPending
          ? approvals
          : approvalHistory
      ).length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>
            {showingPending
              ? "Semua sudah ditinjau"
              : "Belum ada riwayat"}
          </Text>

          <Text style={styles.emptyText}>
            {showingPending
              ? "Tidak ada pengajuan menunggu persetujuan"
              : "Keputusan yang Anda buat akan muncul di sini"}
          </Text>
        </View>
      ) : null}
    </MainScreen>
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

  backDisabled: {
    opacity: 0.5,
  },

  backText: {
    color: Colors.textInk,
    fontSize: 20,
    fontWeight: "800",
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

  tabs: {
    flexDirection: "row",
    gap: 8,
    padding: 4,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  activeTab: {
    flex: 1,
    alignItems: "center",
    borderRadius: 9,
    paddingVertical: 9,
    backgroundColor: Colors.background,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    borderRadius: 9,
    paddingVertical: 9,
  },

  empty: {
    alignItems: "center",
    gap: 5,
    padding: 34,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  emptyTitle: {
    color: Colors.textInk,
    fontSize: 15,
    fontWeight: "800",
  },

  emptyText: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  activeTabText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: "800",
  },

  tabText: {
    color: "#7A8699",
    fontSize: 12,
    fontWeight: "800",
  },

  card: {
    gap: 11,
    padding: 15,
    borderRadius: 15,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.line,
  },

  cardProcessing: {
    borderColor: "#B9CDF3",
    opacity: 0.9,
  },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },

  personInfo: {
    flex: 1,
  },

  name: {
    color: Colors.textInk,
    fontSize: 13.5,
    fontWeight: "800",
  },

  unit: {
    color: "#7A8699",
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: 2,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },

  range: {
    color: Colors.textBody,
    fontSize: 12,
    fontWeight: "800",
  },

  reason: {
    color: Colors.textInk,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },

  info: {
    color: Colors.primaryDark,
    fontSize: 11.5,
    fontWeight: "700",
  },

  actions: {
    flexDirection: "row",
    gap: 10,
  },

  actionButton: {
    flex: 1,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },

  actionDisabled: {
    opacity: 0.55,
  },

  rejectButton: {
    backgroundColor: "#FDE8E8",
  },

  approveButton: {
    backgroundColor: "#0F7A4A",
  },

  rejectText: {
    color: "#B91C1C",
    fontSize: 12.5,
    fontWeight: "800",
  },

  approveText: {
    color: Colors.white,
    fontSize: 12.5,
    fontWeight: "800",
  },
});