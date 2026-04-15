import { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { useCredits } from "../contexts/CreditsContext";
import { toast } from "../lib/toast";
import { colors } from "../theme/colors";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  "http://localhost:8080";

const MAX_TRANSFER = 5;

interface Recipient {
  _id: number | string;
  name: string | null;
  phone: string;
  profilePic: string | null;
}

interface Props {
  visible: boolean;
  recipient: Recipient;
  onClose: () => void;
  onSuccess: () => void;
}

const QUICK_AMOUNTS = [1, 2, 3, 5];

const TransferCreditsModal = ({ visible, recipient, onClose, onSuccess }: Props) => {
  const { credits, refreshCredits } = useCredits();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsedAmount = parseInt(amount, 10);
  const isOverCap = !isNaN(parsedAmount) && parsedAmount > MAX_TRANSFER;
  const isBelowMin = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount < 10;

  const handleClose = useCallback(() => {
    setAmount("");
    setNote("");
    setError("");
    onClose();
  }, [onClose]);

  const handleTransfer = async () => {
    setError("");
    if (!parsedAmount || isNaN(parsedAmount)) {
      setError("Enter a valid amount");
      return;
    }
    if (isOverCap) {
      setError(`Maximum ${MAX_TRANSFER} credits per transfer`);
      return;
    }
    if (isBelowMin) {
      setError("Minimum transfer is 10 credits");
      return;
    }

    try {
      setLoading(true);
      const token = await SecureStore.getItemAsync("accessToken");
      const res = await fetch(`${API_URL}/api/credits/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientId: recipient._id, amount: parsedAmount, note: note || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Transfer failed");
        return;
      }
      toast.success(`Transferred ${parsedAmount} credits!\nTxn: ${data.transactionId}`);
      refreshCredits();
      onSuccess();
      handleClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" }}
        onPress={handleClose}
      >
        <Pressable
          style={{ backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 }}
          onPress={() => {}}
        >
          {/* Recipient Info */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {recipient.profilePic ? (
              <Image source={{ uri: recipient.profilePic }} style={{ width: 44, height: 44, borderRadius: 22 }} />
            ) : (
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary + "22", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.primary }}>
                  {(recipient.name ?? recipient.phone).charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>
                {recipient.name ?? "Unknown"}
              </Text>
              <Text style={{ fontSize: 12, color: colors.mutedForeground }}>{recipient.phone}</Text>
            </View>
          </View>

          {/* Balance */}
          <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
            Your balance: <Text style={{ fontWeight: "bold", color: colors.foreground }}>{credits} credits</Text>
          </Text>

          {/* Quick amounts */}
          <View style={{ flexDirection: "row", gap: 8 }}>
            {QUICK_AMOUNTS.map((q) => (
              <Pressable
                key={q}
                onPress={() => setAmount(String(q))}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: amount === String(q) ? colors.primary : colors.primary + "15",
                  alignItems: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: amount === String(q) ? "#fff" : colors.primary }}>
                  {q}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Custom amount */}
          <TextInput
            value={amount}
            onChangeText={(v) => { setAmount(v.replace(/[^0-9]/g, "")); setError(""); }}
            placeholder="Custom amount"
            keyboardType="number-pad"
            style={{
              borderWidth: 1,
              borderColor: isOverCap ? "#ef4444" : colors.primary + "44",
              borderRadius: 12,
              padding: 12,
              fontSize: 15,
              color: colors.foreground,
            }}
            placeholderTextColor={colors.mutedForeground}
          />
          {isOverCap && (
            <Text style={{ fontSize: 12, color: "#ef4444", marginTop: -8 }}>
              Max {MAX_TRANSFER} credits per transfer
            </Text>
          )}
          {isBelowMin && !isOverCap && (
            <Text style={{ fontSize: 12, color: "#f59e0b", marginTop: -8 }}>
              Server requires minimum 10 credits per transfer
            </Text>
          )}

          {/* Note */}
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Add a note (optional)"
            style={{
              borderWidth: 1,
              borderColor: colors.primary + "33",
              borderRadius: 12,
              padding: 12,
              fontSize: 14,
              color: colors.foreground,
            }}
            placeholderTextColor={colors.mutedForeground}
          />

          {error ? (
            <Text style={{ fontSize: 13, color: "#ef4444", textAlign: "center" }}>{error}</Text>
          ) : null}

          {/* Confirm */}
          <Pressable
            onPress={handleTransfer}
            disabled={loading || !amount}
            style={{
              backgroundColor: loading || !amount ? colors.primary + "66" : colors.primary,
              borderRadius: 14,
              padding: 14,
              alignItems: "center",
            }}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Confirm Transfer</Text>
            )}
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default TransferCreditsModal;
