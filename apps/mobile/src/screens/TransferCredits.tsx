import { useState, useCallback, useRef } from "react";
import {
  View, Text, TextInput, FlatList, Pressable, ActivityIndicator,
  Image, StyleSheet, KeyboardAvoidingView, Platform, RefreshControl, Keyboard, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useCredits } from "../contexts/CreditsContext";

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

function fmt(n: number) { return n.toLocaleString("en-IN"); }

interface UserResult {
  _id: number | string;
  name: string | null;
  phone: string;
  profilePic: string | null;
}

const TIPS = [
  { key: "instant", icon: "flash", color: "#FF9500", title: "Instant Transfer", sub: "Credits are transferred instantly" },
  { key: "secure", icon: "shield-checkmark", color: C.accent, title: "100% Secure", sub: "All transfers are encrypted" },
  { key: "history", icon: "time", color: C.secondary, title: "Transaction History", sub: "Track all your transfers" },
];

const TransferCreditsScreen = () => {
  const navigation = useNavigation<any>();
  const { credits, refreshCredits } = useCredits();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchUsers = useCallback(async (q: string) => {
    const digits = q.replace(/\D/g, "");
    if (digits.length < 2) { setResults([]); return; }
    try {
      setSearching(true);
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_URL}/api/credits/search-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: digits }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setResults(data.users ?? []);
    } catch { /* silent */ } finally { setSearching(false); }
  }, []);

  const handleChange = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUsers(text), 350);
  };

  const handleSelect = (user: UserResult) => {
    Keyboard.dismiss();
    navigation.navigate("SendCredits", {
      recipient: { _id: user._id, name: user.name, phone: user.phone, profilePic: user.profilePic },
    });
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshCredits();
    if (query) searchUsers(query);
    setTimeout(() => setRefreshing(false), 1000);
  }, [query, refreshCredits, searchUsers]);

  const hasResults = results.length > 0;
  const searched = query.replace(/\D/g, "").length >= 2;

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <LinearGradient colors={[C.primary, C.primaryLight]} style={s.headerGrad}>
        <View style={s.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={s.hBtn}>
            <Ionicons name="chevron-back" size={scale(24)} color="#fff" />
          </Pressable>
          <Text style={s.hTitle}>Transfer Credits</Text>
          <Pressable onPress={() => navigation.navigate("CreditsHistory")} style={s.hBtn}>
            <Feather name="clock" size={scale(20)} color="#fff" />
          </Pressable>
        </View>
      </LinearGradient>

      <FlatList
        data={hasResults ? results : []}
        keyExtractor={(item) => String(item._id)}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.secondary]} tintColor={C.secondary} />}
        contentContainerStyle={s.listContent}
        ListHeaderComponent={
          <>
            {/* Balance Card */}
            <LinearGradient colors={[C.primary, C.primaryLight]} style={s.balanceCard}>
              <View style={s.bTopRow}>
                <View style={s.walletBg}>
                  <Ionicons name="wallet-outline" size={scale(20)} color={C.primary} />
                </View>
                <View>
                  <Text style={s.bLabel}>Available Balance</Text>
                  <Text style={s.bAmount}>{fmt(credits)} <Text style={s.bUnit}>Credits</Text></Text>
                </View>
              </View>
              <View style={s.secureBadge}>
                <Ionicons name="shield-checkmark" size={scale(12)} color={C.accent} />
                <Text style={s.secureText}>Secured Transfer</Text>
              </View>
              <View style={s.divider} />
            </LinearGradient>

            {/* Search */}
            <Text style={s.secTitle}>Find Recipient</Text>
            <Text style={s.secSub}>Enter phone number to search</Text>
            <View style={[s.searchBox, focused && s.searchBoxFocused]}>
              <Feather name="search" size={scale(16)} color={focused ? C.secondary : C.textMuted} />
              <TextInput
                value={query}
                onChangeText={handleChange}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                placeholder="Search by phone number..."
                keyboardType="phone-pad"
                style={s.searchInput}
                placeholderTextColor={C.textMuted}
              />
              {searching
                ? <ActivityIndicator size="small" color={C.secondary} />
                : query.length > 0 && (
                  <Pressable onPress={() => { setQuery(""); setResults([]); }}>
                    <Ionicons name="close-circle" size={scale(18)} color={C.textMuted} />
                  </Pressable>
                )
              }
            </View>

            {/* Results header */}
            {hasResults && (
              <View style={s.resultsHeader}>
                <Text style={s.resultsLabel}>Search Results</Text>
                <View style={s.resultsBadge}><Text style={s.resultsBadgeText}>{results.length}</Text></View>
              </View>
            )}

            {/* No results */}
            {searched && !hasResults && !searching && (
              <View style={s.emptyState}>
                <Ionicons name="person-remove-outline" size={scale(48)} color={C.textMuted} />
                <Text style={s.emptyTitle}>No Users Found</Text>
                <Text style={s.emptySub}>No user found with that phone number</Text>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => handleSelect(item)} style={s.userCard}>
            {item.profilePic ? (
              <Image source={{ uri: item.profilePic }} style={s.avatar} />
            ) : (
              <LinearGradient colors={[C.primary, C.primaryLight]} style={s.avatarGrad}>
                <Text style={s.avatarInitials}>
                  {(item.name ?? item.phone).split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2)}
                </Text>
              </LinearGradient>
            )}
            <View style={s.checkBadge}>
              <Ionicons name="checkmark-circle" size={scale(16)} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.userName} numberOfLines={1}>{item.name ?? "Unknown"}</Text>
              <View style={s.phoneRow}>
                <Ionicons name="call-outline" size={scale(12)} color={C.textMuted} />
                <Text style={s.userPhone}>{item.phone}</Text>
              </View>
            </View>
            <LinearGradient colors={[C.secondary, C.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.arrowBtn}>
              <Ionicons name="arrow-forward" size={scale(16)} color="#fff" />
            </LinearGradient>
          </Pressable>
        )}
        ListFooterComponent={
          !hasResults && !searched ? (
            <View>
              <Text style={s.tipsTitle}>Quick Tips</Text>
              {TIPS.map((tip) => (
                <View key={tip.key} style={s.tipCard}>
                  <View style={[s.tipIconBg, { backgroundColor: tip.color + "20" }]}>
                    <Ionicons name={tip.icon as any} size={scale(20)} color={tip.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tipTitle}>{tip.title}</Text>
                    <Text style={s.tipSub}>{tip.sub}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null
        }
      />
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerGrad: {},
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(16), paddingVertical: verticalScale(12) },
  hBtn: { padding: scale(6), minWidth: scale(34) },
  hTitle: { color: "#fff", fontSize: scale(17), fontWeight: "700", flex: 1, textAlign: "center" },
  listContent: { padding: scale(16), gap: scale(12), paddingBottom: scale(40) },
  balanceCard: { borderRadius: scale(18), padding: scale(18), marginBottom: scale(4) },
  bTopRow: { flexDirection: "row", alignItems: "center", gap: scale(12), marginBottom: scale(6) },
  walletBg: { width: scale(42), height: scale(42), borderRadius: scale(12), backgroundColor: "rgba(255,255,255,0.9)", alignItems: "center", justifyContent: "center" },
  bLabel: { color: "rgba(255,255,255,0.7)", fontSize: scale(11), marginBottom: scale(2) },
  bAmount: { color: "#fff", fontSize: scale(24), fontWeight: "800" },
  bUnit: { color: "rgba(255,255,255,0.65)", fontSize: scale(14), fontWeight: "400" },
  secureBadge: { flexDirection: "row", alignItems: "center", gap: scale(5), alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: scale(20), paddingHorizontal: scale(10), paddingVertical: scale(4), marginBottom: scale(4) },
  secureText: { color: C.accent, fontSize: scale(11), fontWeight: "600" },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.18)", marginVertical: scale(10) },
  expiryRow: { flexDirection: "row", alignItems: "center", gap: scale(6) },
  expiryText: { color: "rgba(255,255,255,0.75)", fontSize: scale(12), flex: 1 },
  expiryDate: { color: C.warning, fontWeight: "700" },
  expiryDays: { color: "rgba(255,255,255,0.6)" },
  expiredText: { color: "#fca5a5", fontSize: scale(12), fontWeight: "600" },
  secTitle: { fontSize: scale(17), fontWeight: "700", color: C.text, marginTop: scale(4) },
  secSub: { fontSize: scale(13), color: C.textSec, marginBottom: scale(10) },
  searchBox: { flexDirection: "row", alignItems: "center", gap: scale(8), backgroundColor: "#fff", borderRadius: scale(14), paddingHorizontal: scale(14), paddingVertical: scale(12), borderWidth: 1.5, borderColor: C.border },
  searchBoxFocused: { borderColor: C.secondary },
  searchInput: { flex: 1, fontSize: scale(14), color: C.text },
  resultsHeader: { flexDirection: "row", alignItems: "center", gap: scale(8), marginTop: scale(6) },
  resultsLabel: { fontSize: scale(14), fontWeight: "700", color: C.text },
  resultsBadge: { backgroundColor: C.secondary, borderRadius: scale(10), paddingHorizontal: scale(8), paddingVertical: scale(2) },
  resultsBadgeText: { color: "#fff", fontSize: scale(12), fontWeight: "700" },
  emptyState: { alignItems: "center", paddingVertical: scale(40), gap: scale(10) },
  emptyTitle: { fontSize: scale(16), fontWeight: "700", color: C.text },
  emptySub: { fontSize: scale(13), color: C.textMuted, textAlign: "center" },
  userCard: { flexDirection: "row", alignItems: "center", gap: scale(12), backgroundColor: "#fff", borderRadius: scale(16), padding: scale(14), elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: scale(8), position: "relative" },
  avatar: { width: scale(48), height: scale(48), borderRadius: scale(24) },
  avatarGrad: { width: scale(48), height: scale(48), borderRadius: scale(24), alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontSize: scale(16), fontWeight: "700" },
  checkBadge: { position: "absolute", left: scale(44), top: scale(10), backgroundColor: "#fff", borderRadius: scale(8) },
  userName: { fontSize: scale(14), fontWeight: "700", color: C.text },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: scale(4), marginTop: scale(2) },
  userPhone: { fontSize: scale(12), color: C.textSec },
  arrowBtn: { width: scale(36), height: scale(36), borderRadius: scale(10), alignItems: "center", justifyContent: "center" },
  tipsTitle: { fontSize: scale(14), fontWeight: "700", color: C.text, marginBottom: scale(10), marginTop: scale(6) },
  tipCard: { flexDirection: "row", alignItems: "center", gap: scale(12), backgroundColor: "#fff", borderRadius: scale(14), padding: scale(14), marginBottom: scale(10), elevation: 1, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: scale(6) },
  tipIconBg: { width: scale(40), height: scale(40), borderRadius: scale(12), alignItems: "center", justifyContent: "center" },
  tipTitle: { fontSize: scale(13), fontWeight: "700", color: C.text },
  tipSub: { fontSize: scale(12), color: C.textSec, marginTop: scale(2) },
});

export default TransferCreditsScreen;
