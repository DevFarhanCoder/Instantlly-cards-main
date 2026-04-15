import { useState, useEffect } from "react";
import {
  View, Text, TextInput, Pressable, Image, Alert, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
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

type SendCreditsParams = {
  SendCredits: {
    recipient: { _id: number | string; name: string | null; phone: string; profilePic: string | null };
  };
};

const QUICK = [100, 250, 500, 1000];

const SendCreditsScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<SendCreditsParams, "SendCredits">>();
  const { recipient } = route.params;
  const { credits, refreshCredits } = useCredits();

  const [available, setAvailable] = useState(Number(credits));
  const [amount, setAmount] = useState<number | null>(null);
  const [amountText, setAmountText] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => { setAvailable(Number(credits)); }, [credits]);

  const initials = (recipient.name ?? recipient.phone)
    .split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const canSend = amount !== null && amount >= 10 && amount <= available && !sending;

  const handleQuick = (val: number) => {
    if (val <= available) { setAmount(val); setAmountText(String(val)); }
  };
  const handleMax = () => { setAmount(available); setAmountText(String(available)); };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, "");
    setAmountText(cleaned);
    const num = parseInt(cleaned, 10);
    setAmount(isNaN(num) ? null : num);
  };

  const handleSend = async () => {
    if (!amount || amount < 10) { Alert.alert("Minimum transfer is 10 credits"); return; }
    if (amount > available) { Alert.alert("Insufficient credits"); return; }
    try {
      setSending(true);
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_URL}/api/credits/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recipientId: recipient._id, amount, note: note.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert("Transfer Failed", data.error ?? data.message ?? "Something went wrong"); return; }
      await refreshCredits();
      Alert.alert(
        "Transfer Successful! 🎉",
        `${fmt(amount)} credits sent to ${recipient.name ?? recipient.phone}\n\nTransaction ID: ${data.transactionId}`,
        [{ text: "OK", onPress: () => navigation.navigate("CreditsHistory") }]
      );
    } catch { Alert.alert("Error", "Network error. Please try again.");
    } finally { setSending(false); }
  };

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header */}
      <LinearGradient colors={[C.primary, C.primaryLight]} style={s.headerGrad}>
        <View style={s.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={s.hBtn}>
            <Ionicons name="chevron-back" size={scale(24)} color="#fff" />
          </Pressable>
          <Text style={s.hTitle}>Send Credits</Text>
          <View style={{ width: scale(34) }} />
        </View>
      </LinearGradient>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Sending To Card */}
        <View style={s.card}>
          <Text style={s.sendingToLabel}>SENDING TO</Text>
          <View style={s.recipientRow}>
            <View style={s.avatarWrap}>
              {recipient.profilePic ? (
                <Image source={{ uri: recipient.profilePic }} style={s.avatar} />
              ) : (
                <LinearGradient colors={[C.primary, C.primaryLight]} style={s.avatarGrad}>
                  <Text style={s.avatarInit}>{initials}</Text>
                </LinearGradient>
              )}
              <View style={s.checkBadge}>
                <Ionicons name="checkmark-circle" size={scale(18)} color={C.accent} />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.recipientName} numberOfLines={1}>{recipient.name ?? "Unknown"}</Text>
              <View style={s.phoneRow}>
                <Ionicons name="call-outline" size={scale(13)} color={C.textMuted} />
                <Text style={s.recipientPhone}>{recipient.phone}</Text>
              </View>
            </View>
          </View>
          <View style={s.availRow}>
            <Ionicons name="wallet-outline" size={scale(14)} color={C.textSec} />
            <Text style={s.availText}>Available: <Text style={s.availAmt}>{fmt(available)} credits</Text></Text>
          </View>
        </View>

        {/* Amount Card */}
        <View style={s.card}>
          <View style={s.amtTopRow}>
            <View style={s.amtTopLeft}>
              <Ionicons name="wallet-outline" size={scale(16)} color={C.textSec} />
              <Text style={s.amtTopLabel}>Available</Text>
            </View>
            <Text style={s.amtTopValue}>{fmt(available)} credits</Text>
          </View>
          <View style={s.amtDivider} />

          {/* Large amount input */}
          <View style={s.amtDisplay}>
            <Text style={s.rupeeSymbol}>₹</Text>
            <TextInput
              value={amountText}
              onChangeText={handleAmountChange}
              placeholder="0"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              style={s.amtInput}
              maxLength={7}
            />
            <Text style={s.amtUnit}>credits</Text>
          </View>

          {/* Quick selects */}
          <View style={s.quickRow}>
            {QUICK.map((val) => (
              <Pressable
                key={val}
                onPress={() => handleQuick(val)}
                disabled={val > available}
                style={[s.quickBtn, amount === val && s.quickBtnActive, val > available && s.quickBtnDisabled]}
              >
                <Text style={[s.quickBtnText, amount === val && s.quickBtnTextActive]}>{fmt(val)}</Text>
              </Pressable>
            ))}
            <Pressable onPress={handleMax} style={[s.quickBtn, amount === available && s.quickBtnActive]}>
              <Text style={[s.quickBtnText, amount === available && s.quickBtnTextActive]}>MAX</Text>
            </Pressable>
          </View>
          <Text style={s.hintText}>Min: 10  •  Max: {fmt(available)}</Text>
        </View>

        {/* Note Card */}
        <View style={s.card}>
          <View style={s.noteHeader}>
            <MaterialCommunityIcons name="chat-outline" size={scale(18)} color={C.textSec} />
            <Text style={s.noteTitle}>Add a note (optional)</Text>
          </View>
          <TextInput
            value={note}
            onChangeText={(t) => setNote(t.slice(0, 100))}
            placeholder="What's this transfer for?"
            placeholderTextColor={C.textMuted}
            multiline
            maxLength={100}
            style={s.noteInput}
          />
          <Text style={s.noteCounter}>{note.length}/100</Text>
        </View>

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Fixed Send Button */}
      <View style={s.bottomWrap}>
        <Pressable onPress={handleSend} disabled={!canSend} style={({ pressed }) => ({ opacity: canSend && pressed ? 0.85 : 1 })}>
          <LinearGradient
            colors={canSend ? [C.secondary, C.primary] : ["#9CA3AF", "#6B7280"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={s.sendBtn}
          >
            {sending ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="send" size={scale(18)} color="#fff" />
                <Text style={s.sendBtnText}>
                  Send {amount !== null && amount > 0 ? fmt(amount) : "—"} Credits
                </Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerGrad: {},
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(16), paddingVertical: verticalScale(12) },
  hBtn: { padding: scale(6), minWidth: scale(34) },
  hTitle: { color: "#fff", fontSize: scale(17), fontWeight: "700", flex: 1, textAlign: "center" },
  scroll: { flex: 1 },
  scrollContent: { padding: scale(16), gap: scale(14) },
  card: { backgroundColor: "#fff", borderRadius: scale(16), padding: scale(16), elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: scale(8) },
  sendingToLabel: { fontSize: scale(10), fontWeight: "800", color: C.textMuted, letterSpacing: 1.5, marginBottom: scale(12) },
  recipientRow: { flexDirection: "row", alignItems: "center", gap: scale(14), marginBottom: scale(12) },
  avatarWrap: { position: "relative" },
  avatar: { width: scale(56), height: scale(56), borderRadius: scale(28) },
  avatarGrad: { width: scale(56), height: scale(56), borderRadius: scale(28), alignItems: "center", justifyContent: "center" },
  avatarInit: { color: "#fff", fontSize: scale(20), fontWeight: "700" },
  checkBadge: { position: "absolute", bottom: 0, right: -scale(2), backgroundColor: "#fff", borderRadius: scale(9) },
  recipientName: { fontSize: scale(17), fontWeight: "700", color: C.text },
  phoneRow: { flexDirection: "row", alignItems: "center", gap: scale(4), marginTop: scale(3) },
  recipientPhone: { fontSize: scale(13), color: C.textSec },
  availRow: { flexDirection: "row", alignItems: "center", gap: scale(5), paddingTop: scale(10), borderTopWidth: 1, borderTopColor: C.border },
  availText: { fontSize: scale(13), color: C.textSec },
  availAmt: { color: C.secondary, fontWeight: "700" },
  amtTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: scale(12) },
  amtTopLeft: { flexDirection: "row", alignItems: "center", gap: scale(6) },
  amtTopLabel: { fontSize: scale(13), color: C.textSec },
  amtTopValue: { fontSize: scale(13), fontWeight: "700", color: C.text },
  amtDivider: { height: 1, backgroundColor: C.border, marginBottom: scale(16) },
  amtDisplay: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: scale(4), marginBottom: scale(20) },
  rupeeSymbol: { fontSize: scale(22), fontWeight: "700", color: C.textMuted, marginBottom: scale(6) },
  amtInput: { fontSize: scale(40), fontWeight: "800", color: C.text, letterSpacing: -1, minWidth: scale(80), textAlign: "center", padding: 0 },
  amtUnit: { fontSize: scale(16), color: C.textMuted, marginBottom: scale(12) },
  quickRow: { flexDirection: "row", gap: scale(8), marginBottom: scale(10) },
  quickBtn: { flex: 1, paddingVertical: scale(10), borderRadius: scale(10), borderWidth: 1.5, borderColor: C.border, alignItems: "center", backgroundColor: "#fff" },
  quickBtnActive: { borderColor: C.primary, backgroundColor: C.primary },
  quickBtnDisabled: { opacity: 0.35 },
  quickBtnText: { fontSize: scale(12), fontWeight: "700", color: C.textSec },
  quickBtnTextActive: { color: "#fff" },
  hintText: { textAlign: "center", fontSize: scale(12), color: C.textMuted },
  noteHeader: { flexDirection: "row", alignItems: "center", gap: scale(8), marginBottom: scale(10) },
  noteTitle: { fontSize: scale(14), fontWeight: "600", color: C.text },
  noteInput: { borderWidth: 1, borderColor: C.border, borderRadius: scale(10), padding: scale(10), fontSize: scale(14), color: C.text, minHeight: scale(72), textAlignVertical: "top" },
  noteCounter: { textAlign: "right", fontSize: scale(11), color: C.textMuted, marginTop: scale(4) },
  bottomWrap: { paddingHorizontal: scale(16), paddingBottom: scale(24), paddingTop: scale(8), backgroundColor: C.bg },
  sendBtn: { borderRadius: scale(16), flexDirection: "row", alignItems: "center", justifyContent: "center", gap: scale(10), paddingVertical: scale(16) },
  sendBtnText: { color: "#fff", fontSize: scale(16), fontWeight: "700" },
});

export default SendCreditsScreen;
