import { useState, useCallback } from "react";
import { ScrollView, Text, View, RefreshControl, Pressable, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useCredits } from "../contexts/CreditsContext";

const { width, height } = Dimensions.get("window");
const scale = (s: number) => (width / 375) * s;
const verticalScale = (s: number) => (height / 812) * s;

const C = {
  primary: "#1E3A5F", primaryLight: "#2D5A87", secondary: "#0A84FF",
  accent: "#34C759", warning: "#FF9500", error: "#FF3B30",
  bg: "#F5F7FA", text: "#1A1A2E", textSec: "#6B7280", textMuted: "#9CA3AF", border: "#E5E7EB",
};

function fmt(n: number) { return n.toLocaleString("en-IN"); }

const CreditsScreen = () => {
  const navigation = useNavigation<any>();
  const { credits, loading, refreshCredits } = useCredits();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshCredits();
    setTimeout(() => setRefreshing(false), 1000);
  }, [refreshCredits]);

  return (
    <View style={s.container}>
      <LinearGradient colors={[C.primary, C.primaryLight]} style={s.headerGrad}>
        <View style={s.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={s.hBtn}>
            <Ionicons name="chevron-back" size={scale(24)} color="#fff" />
          </Pressable>
          <Text style={s.hTitle}>My Credits</Text>
          <View style={s.hRight}>
            <Pressable onPress={() => navigation.navigate("TransferCredits")} style={s.hBtn}>
              <Ionicons name="swap-horizontal" size={scale(22)} color="#fff" />
            </Pressable>
            <Pressable onPress={() => navigation.navigate("CreditsHistory")} style={s.hBtn}>
              <Feather name="clock" size={scale(20)} color="#fff" />
            </Pressable>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.secondary]} tintColor={C.secondary} />}
      >
        {/* Balance Card — tappable */}
        <Pressable onPress={() => navigation.navigate("TransferCredits")} style={({ pressed }) => pressed && { opacity: 0.8 }}>
          <LinearGradient colors={[C.primary, C.primaryLight]} style={s.balanceCard}>
            <View style={s.bTopRow}>
              <View style={s.walletBg}>
                <Ionicons name="wallet-outline" size={scale(22)} color={C.primary} />
              </View>
              <Text style={s.bLabel}>Available Balance</Text>
            </View>
            <Text style={s.bAmount}>{loading ? "—" : fmt(credits)}</Text>
            <Text style={s.bUnit}>Credits</Text>
            <View style={s.secureBadge}>
              <Ionicons name="shield-checkmark" size={scale(13)} color={C.accent} />
              <Text style={s.secureText}>Secured Transfer</Text>
            </View>
            <View style={s.divider} />
            <Text style={s.tapHint}>Tap to transfer credits →</Text>
          </LinearGradient>
        </Pressable>

        {/* Info Card */}
        <View style={s.infoCard}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Wallet Balance</Text>
            <Text style={s.infoValue}>{fmt(credits)} Credits</Text>
          </View>
          <View style={s.infoDivider} />
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Status</Text>
            <View style={[s.statusBadge, { backgroundColor: "#dcfce7" }]}>
              <Text style={[s.statusText, { color: C.accent }]}>Active</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerGrad: {},
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(16), paddingVertical: verticalScale(12) },
  hBtn: { padding: scale(6), minWidth: scale(34) },
  hTitle: { color: "#fff", fontSize: scale(17), fontWeight: "700", flex: 1, textAlign: "center" },
  hRight: { flexDirection: "row", gap: scale(4) },
  scroll: { flex: 1 },
  scrollContent: { padding: scale(16), gap: scale(16), paddingBottom: scale(120) },
  balanceCard: { borderRadius: scale(20), padding: scale(22) },
  bTopRow: { flexDirection: "row", alignItems: "center", gap: scale(10), marginBottom: scale(8) },
  walletBg: { width: scale(44), height: scale(44), borderRadius: scale(12), backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  bLabel: { color: "rgba(255,255,255,0.8)", fontSize: scale(13), fontWeight: "600" },
  bAmount: { color: "#fff", fontSize: scale(48), fontWeight: "800", letterSpacing: -2 },
  bUnit: { color: "rgba(255,255,255,0.65)", fontSize: scale(14), marginTop: -scale(4), marginBottom: scale(8) },
  secureBadge: { flexDirection: "row", alignItems: "center", gap: scale(5), alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: scale(20), paddingHorizontal: scale(12), paddingVertical: scale(5) },
  secureText: { color: C.accent, fontSize: scale(12), fontWeight: "600" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginVertical: scale(12) },
  expiryRow: { flexDirection: "row", alignItems: "center", gap: scale(6) },
  expiryText: { color: "rgba(255,255,255,0.75)", fontSize: scale(12), flex: 1 },
  expiryDate: { color: C.warning, fontWeight: "700" },
  expiryDays: { color: "rgba(255,255,255,0.6)" },
  expiredText: { color: "#fca5a5", fontSize: scale(13), fontWeight: "600" },
  tapHint: { color: "rgba(255,255,255,0.4)", fontSize: scale(11), fontStyle: "italic", textAlign: "right", marginTop: scale(8) },
  sectionTitle: { fontSize: scale(16), fontWeight: "700", color: C.text },
  actionsRow: { flexDirection: "row", gap: scale(24) },
  actionItem: { alignItems: "center", gap: scale(8) },
  actionCircle: { width: scale(64), height: scale(64), borderRadius: scale(32), alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: scale(6) },
  actionLabel: { fontSize: scale(12), fontWeight: "600", color: C.textSec, textAlign: "center" },
  infoCard: { backgroundColor: "#fff", borderRadius: scale(16), padding: scale(16), elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: scale(8) },
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: scale(10) },
  infoDivider: { height: 1, backgroundColor: C.bg },
  infoLabel: { fontSize: scale(13), color: C.textSec },
  infoValue: { fontSize: scale(13), fontWeight: "600", color: C.text },
  statusBadge: { borderRadius: scale(20), paddingHorizontal: scale(12), paddingVertical: scale(4) },
  statusText: { fontSize: scale(12), fontWeight: "700" },
  ctaWrap: { paddingHorizontal: scale(16), paddingBottom: scale(24), paddingTop: scale(8) },
  ctaBtn: { borderRadius: scale(16), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: scale(10), paddingVertical: scale(16) },
  ctaText: { color: "#fff", fontSize: scale(16), fontWeight: "700" },
});

export default CreditsScreen;
