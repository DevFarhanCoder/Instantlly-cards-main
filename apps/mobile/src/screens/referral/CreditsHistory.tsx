import { useState, useCallback, useEffect } from "react";
import {
  ScrollView, View, Text, Pressable, RefreshControl,
  ActivityIndicator, StyleSheet, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useCredits } from "../../contexts/CreditsContext";

const { width, height } = Dimensions.get("window");
const scale = (s: number) => (width / 375) * s;
const verticalScale = (s: number) => (height / 812) * s;

const C = {
  primary: "#1E3A5F", primaryLight: "#2D5A87", secondary: "#0A84FF",
  accent: "#34C759", warning: "#FF9500", error: "#FF3B30",
  bg: "#F5F7FA", text: "#1A1A2E", textSec: "#6B7280", textMuted: "#9CA3AF", border: "#E5E7EB",
};

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  "http://localhost:8080";

function fmt(n: number) { return Math.abs(n).toLocaleString("en-IN"); }

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const txDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - txDay.getTime()) / 86400000);
  const time = d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `Today, ${time}`;
  if (diffDays === 1) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}, ${time}`;
}

interface Breakdown {
  transferReceived: number;
  transferSent: number;
  adDeductions: number;
  quizCredits: number;
  referralCredits: number;
  signupBonus: number;
}

interface Transaction {
  id: number;
  type: string;
  transaction_id: string | null;
  amount: number;
  description: string;
  note: string | null;
  created_at: string;
  from_user?: { id: number; name: string | null; phone: string } | null;
  to_user?: { id: number; name: string | null; phone: string } | null;
}

interface HistoryData {
  success: boolean;
  totalCredits: number;
  breakdown: Breakdown;
  transactions: Transaction[];
}

const TX_ICON: Record<string, { name: string; color: string }> = {
  transfer_received: { name: "arrow-down-circle", color: C.accent },
  transfer_sent:     { name: "arrow-up-circle", color: C.error },
  ad_deduction:      { name: "megaphone-outline", color: C.error },
  admin_adjustment:  { name: "settings-outline", color: "#8b5cf6" },
};

const CreditsHistoryScreen = () => {
  const navigation = useNavigation<any>();
  const { credits, creditsExpiryDate, daysRemaining } = useCredits();
  const [data, setData] = useState<HistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const expiryLabel = creditsExpiryDate
    ? new Date(creditsExpiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "31 December 2026";

  const fetchHistory = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_URL}/api/credits/history?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      setData(await res.json());
    } catch { /* silent */ } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

  const onRefresh = () => { setRefreshing(true); fetchHistory(); };

  const allTx = (data?.transactions ?? []).filter((t) => t.type !== "signup_bonus");
  const visibleTx = showAll ? allTx : allTx.slice(0, 5);
  const hiddenCount = allTx.length - 5;

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={s.hBtn}>
            <Ionicons name="arrow-back" size={scale(22)} color={C.text} />
          </Pressable>
          <Text style={s.hTitle}>Credits History</Text>
          <View style={{ width: scale(34) }} />
        </View>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.secondary]} tintColor={C.secondary} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={C.secondary} style={{ marginTop: scale(60) }} />
        ) : (
          <>
            {/* Balance Banner */}
            <View style={s.bannerCard}>
              <View style={s.bannerAvatar}>
                <Ionicons name="person" size={scale(28)} color="#fff" />
              </View>
              <Text style={s.bannerBalanceLabel}>Your Total Balance</Text>
              <View style={s.bannerAmtRow}>
                <Ionicons name="sparkles" size={scale(20)} color="#FFD700" />
                <Text style={s.bannerAmt}>{fmt(credits)}</Text>
              </View>
              <View style={s.bannerSubRow}>
                <Text style={s.bannerSubText}>Credits Available</Text>
                <View style={s.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={scale(13)} color={C.accent} />
                  <Text style={s.verifiedText}>Verified</Text>
                </View>
              </View>
              <View style={s.bannerDivider} />
              <View style={s.bannerExpiryRow}>
                <Ionicons name="time-outline" size={scale(14)} color={C.warning} />
                <Text style={s.bannerExpiry}>
                  {"Expires: "}
                  <Text style={{ color: C.warning, fontWeight: "700" }}>{expiryLabel}</Text>
                  {daysRemaining != null && <Text>{`  •  ${daysRemaining} days left`}</Text>}
                </Text>
              </View>
            </View>

            {/* Transfer Credits Button */}
            <Pressable onPress={() => navigation.navigate("TransferCredits")} style={s.transferBtn}>
              <View style={s.transferLeft}>
                <View style={[s.iconBg, { backgroundColor: C.accent + "20" }]}>
                  <Ionicons name="swap-horizontal" size={scale(20)} color={C.accent} />
                </View>
                <View>
                  <Text style={s.transferTitle}>Transfer Credits</Text>
                  <Text style={s.transferSub}>Send credits to other users instantly</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={scale(18)} color={C.accent} />
            </Pressable>

            {/* Breakdown */}
            <View style={s.section}>
              <View style={s.sectionHeader}>
                <Text style={s.sectionTitle}>Credits Breakdown</Text>
                <View style={s.iconBg}>
                  <Ionicons name="pie-chart-outline" size={scale(16)} color={C.secondary} />
                </View>
              </View>

              <Text style={s.subSectionLabel}>Earnings</Text>
              <View style={[s.breakdownCard, { borderLeftColor: C.accent }]}>
                <View style={[s.bdIconBg, { backgroundColor: C.accent + "20" }]}>
                  <Ionicons name="arrow-down-circle" size={scale(20)} color={C.accent} />
                </View>
                <Text style={s.bdLabel}>Credits Received</Text>
                <Text style={[s.bdAmt, { color: C.accent }]}>+{fmt(data?.breakdown?.transferReceived ?? 0)}</Text>
              </View>

              <Text style={[s.subSectionLabel, { marginTop: scale(12) }]}>Spending</Text>
              <View style={[s.breakdownCard, { borderLeftColor: C.error }]}>
                <View style={[s.bdIconBg, { backgroundColor: C.error + "20" }]}>
                  <Ionicons name="arrow-up-circle" size={scale(20)} color={C.error} />
                </View>
                <Text style={s.bdLabel}>Transfer Sent</Text>
                <Text style={[s.bdAmt, { color: C.error }]}>-{fmt(data?.breakdown?.transferSent ?? 0)}</Text>
              </View>
              {(data?.breakdown?.adDeductions ?? 0) > 0 && (
                <View style={[s.breakdownCard, { borderLeftColor: "#b91c1c" }]}>
                  <View style={[s.bdIconBg, { backgroundColor: "#b91c1c20" }]}>
                    <Ionicons name="megaphone-outline" size={scale(20)} color="#b91c1c" />
                  </View>
                  <Text style={s.bdLabel}>Ad Deduction</Text>
                  <Text style={[s.bdAmt, { color: "#b91c1c" }]}>-{fmt(data?.breakdown?.adDeductions ?? 0)}</Text>
                </View>
              )}
            </View>

            {/* Transaction History */}
            <View style={s.section}>
              <Text style={s.sectionTitle}>Transaction History</Text>
              {allTx.length === 0 ? (
                <Text style={s.emptyTx}>No transactions yet</Text>
              ) : (
                <>
                  {visibleTx.map((tx) => {
                    const iconCfg = TX_ICON[tx.type] ?? { name: "wallet-outline", color: C.textSec };
                    const isPos = tx.amount > 0;
                    const isSent = tx.type === "transfer_sent";
                    const counterUser = isSent ? tx.to_user : tx.from_user;
                    return (
                      <View key={tx.id} style={s.txCard}>
                        <View style={[s.txIconBg, { backgroundColor: iconCfg.color + "20" }]}>
                          <Ionicons name={iconCfg.name as any} size={scale(22)} color={iconCfg.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.txDesc} numberOfLines={1}>{tx.description}</Text>
                          {counterUser && (
                            <View style={s.txPhoneRow}>
                              <Ionicons name="call-outline" size={scale(11)} color={C.textMuted} />
                              <Text style={s.txPhone}>
                                {isSent ? "To: " : "From: "}{counterUser.phone}
                              </Text>
                            </View>
                          )}
                          {tx.note ? <Text style={s.txNote}>"{tx.note}"</Text> : null}
                          <Text style={s.txDate}>{formatDate(tx.created_at)}</Text>
                        </View>
                        <Text style={[s.txAmt, { color: isPos ? C.accent : C.error }]}>
                          {isPos ? "+" : ""}{fmt(tx.amount)}
                        </Text>
                      </View>
                    );
                  })}
                  {allTx.length > 5 && (
                    <Pressable onPress={() => setShowAll((v) => !v)} style={s.viewMoreBtn}>
                      <Text style={s.viewMoreText}>
                        {showAll ? "Show Less" : `View ${hiddenCount} More Transactions`}
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: C.border },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(16), paddingVertical: verticalScale(12) },
  hBtn: { padding: scale(6), minWidth: scale(34) },
  hTitle: { fontSize: scale(17), fontWeight: "700", color: C.text, flex: 1, textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: scale(16), gap: scale(16), paddingBottom: scale(40) },
  bannerCard: { backgroundColor: "#1F2937", borderRadius: scale(20), padding: scale(20), gap: scale(6) },
  bannerAvatar: { width: scale(52), height: scale(52), borderRadius: scale(26), backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginBottom: scale(4) },
  bannerBalanceLabel: { color: "rgba(255,255,255,0.7)", fontSize: scale(13) },
  bannerAmtRow: { flexDirection: "row", alignItems: "center", gap: scale(8) },
  bannerAmt: { color: "#fff", fontSize: scale(40), fontWeight: "800", letterSpacing: -1 },
  bannerSubRow: { flexDirection: "row", alignItems: "center", gap: scale(10), marginTop: scale(2) },
  bannerSubText: { color: "rgba(255,255,255,0.7)", fontSize: scale(13) },
  verifiedBadge: { flexDirection: "row", alignItems: "center", gap: scale(4), backgroundColor: "rgba(255,255,255,0.1)", borderRadius: scale(20), paddingHorizontal: scale(8), paddingVertical: scale(3) },
  verifiedText: { color: C.accent, fontSize: scale(11), fontWeight: "600" },
  bannerDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginVertical: scale(10) },
  bannerExpiryRow: { flexDirection: "row", alignItems: "center", gap: scale(6) },
  bannerExpiry: { color: "rgba(255,255,255,0.75)", fontSize: scale(12), flex: 1 },
  transferBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: scale(16), padding: scale(14), borderWidth: 1, borderColor: C.border, elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: scale(6) },
  transferLeft: { flexDirection: "row", alignItems: "center", gap: scale(12) },
  transferTitle: { fontSize: scale(14), fontWeight: "700", color: C.text },
  transferSub: { fontSize: scale(12), color: C.textSec, marginTop: scale(2) },
  section: { backgroundColor: "#fff", borderRadius: scale(16), padding: scale(16), elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: scale(8), gap: scale(8) },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: scale(15), fontWeight: "700", color: C.text },
  subSectionLabel: { fontSize: scale(12), fontWeight: "700", color: C.textMuted, textTransform: "uppercase", letterSpacing: 0.8 },
  iconBg: { width: scale(30), height: scale(30), borderRadius: scale(8), backgroundColor: C.secondary + "20", alignItems: "center", justifyContent: "center" },
  breakdownCard: { flexDirection: "row", alignItems: "center", gap: scale(12), borderLeftWidth: 3, paddingLeft: scale(10), paddingVertical: scale(8) },
  bdIconBg: { width: scale(36), height: scale(36), borderRadius: scale(10), alignItems: "center", justifyContent: "center" },
  bdLabel: { flex: 1, fontSize: scale(13), color: C.text, fontWeight: "600" },
  bdAmt: { fontSize: scale(14), fontWeight: "800" },
  txCard: { flexDirection: "row", alignItems: "flex-start", gap: scale(12), paddingVertical: scale(10), borderBottomWidth: 1, borderBottomColor: C.bg },
  txIconBg: { width: scale(40), height: scale(40), borderRadius: scale(12), alignItems: "center", justifyContent: "center", marginTop: scale(2) },
  txDesc: { fontSize: scale(13), fontWeight: "600", color: C.text, flex: 1 },
  txPhoneRow: { flexDirection: "row", alignItems: "center", gap: scale(4), marginTop: scale(3) },
  txPhone: { fontSize: scale(11), color: C.textSec },
  txNote: { fontSize: scale(11), color: C.textMuted, fontStyle: "italic", marginTop: scale(2) },
  txDate: { fontSize: scale(11), color: C.textMuted, marginTop: scale(3) },
  txAmt: { fontSize: scale(15), fontWeight: "800", marginTop: scale(2) },
  viewMoreBtn: { alignItems: "center", paddingVertical: scale(12), borderTopWidth: 1, borderTopColor: C.bg, marginTop: scale(4) },
  viewMoreText: { fontSize: scale(13), fontWeight: "700", color: C.secondary },
  emptyTx: { textAlign: "center", color: C.textMuted, paddingVertical: scale(24), fontSize: scale(13) },
});

export default CreditsHistoryScreen;
