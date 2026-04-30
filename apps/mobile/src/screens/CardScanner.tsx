import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Check, QrCode, Repeat2, Send, UserPlus } from "lucide-react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "../lib/toast";
import { useDirectoryCard } from "../hooks/useDirectoryCards";
import {
  useGetMyCardsQuery,
  useExchangeCardsMutation,
  useSaveReceivedCardMutation,
  useShareCardMutation,
} from "../store/api/businessCardsApi";

/**
 * Extracts a card ID out of a scanned QR value.
 * Returns a directory id ("card-<n>" / "promo-<n>") OR null.
 */
const extractCardId = (raw: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();

  let candidate: string | null = null;

  if (/^[a-zA-Z0-9_-]+$/.test(trimmed) && !trimmed.includes("/")) {
    candidate = trimmed;
  } else {
    const match = trimmed.match(/\/card\/([^/?#]+)/i);
    if (match) candidate = match[1];
  }

  if (!candidate) return null;
  if (/^\d+$/.test(candidate)) return `card-${candidate}`;
  return candidate;
};

const numericFromDirectoryId = (id: string): number | null => {
  if (!id) return null;
  const stripped = id.startsWith("card-")
    ? id.slice(5)
    : id.startsWith("promo-")
    ? id.slice(6)
    : id;
  const n = Number(stripped);
  return Number.isFinite(n) && n > 0 ? n : null;
};

type Mode = "exchange" | "send-only" | "save-only";

const CardScanner = () => {
  const navigation = useNavigation<any>();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMyCardId, setSelectedMyCardId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<Mode | null>(null);

  const { data: myCards = [], isLoading: myCardsLoading } = useGetMyCardsQuery();
  const { data: scannedCard } = useDirectoryCard(scannedId || "");
  const [exchangeCards] = useExchangeCardsMutation();
  const [saveReceivedCard] = useSaveReceivedCardMutation();
  const [shareCard] = useShareCardMutation();

  // The directoryId may be promo-XX or card-XX. The exchange/share endpoints
  // need the underlying numeric business_card_id.
  const scannedBusinessCardId = useMemo<number | null>(() => {
    if (!scannedId) return null;
    if (scannedId.startsWith("card-")) return numericFromDirectoryId(scannedId);
    const fromCard = (scannedCard as any)?.business_card_id;
    if (fromCard) {
      const n = Number(fromCard);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  }, [scannedId, scannedCard]);

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) {
      requestPermission();
    }
  }, [permission?.granted, permission?.canAskAgain, requestPermission]);

  useEffect(() => {
    if (!selectedMyCardId && myCards.length > 0) {
      setSelectedMyCardId(Number(myCards[0].id));
    }
  }, [myCards, selectedMyCardId]);

  const handleScan = (data: string) => {
    if (scanned) return;
    setScanned(true);
    const id = extractCardId(data);
    if (!id) {
      toast.error("Not a valid card QR");
      setTimeout(() => setScanned(false), 1500);
      return;
    }
    setScannedId(id);
    setPickerOpen(true);
  };

  const closePicker = () => setPickerOpen(false);

  const goToCard = () => {
    if (scannedId) navigation.replace("PublicCard", { id: scannedId });
  };

  const ensureScannedReady = (): boolean => {
    if (!scannedBusinessCardId) {
      toast.error("Card details still loading. Try again in a moment.");
      return false;
    }
    return true;
  };

  const handleSaveOnly = async () => {
    if (!scannedId || !ensureScannedReady()) return;
    setSubmitting("save-only");
    try {
      await saveReceivedCard({ scanned_card_id: scannedBusinessCardId! }).unwrap();
      toast.success("Saved to Received");
      closePicker();
      goToCard();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to save card");
    } finally {
      setSubmitting(null);
    }
  };

  const handleSendOnly = async () => {
    if (!scannedId || !ensureScannedReady() || !selectedMyCardId) return;
    setSubmitting("send-only");
    try {
      const recipientUserId =
        (scannedCard as any)?.user_id ?? (scannedCard as any)?.user?.id;
      if (!recipientUserId) {
        toast.error("Cannot determine recipient");
        return;
      }
      await shareCard({
        card_id: selectedMyCardId,
        recipient_user_id: Number(recipientUserId),
      }).unwrap();
      toast.success("Card sent");
      closePicker();
      goToCard();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to send card");
    } finally {
      setSubmitting(null);
    }
  };

  const handleExchange = async () => {
    if (!scannedId || !ensureScannedReady() || !selectedMyCardId) return;
    setSubmitting("exchange");
    try {
      await exchangeCards({
        my_card_id: selectedMyCardId,
        scanned_card_id: scannedBusinessCardId!,
      }).unwrap();
      toast.success("Cards exchanged");
      closePicker();
      goToCard();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to exchange cards");
    } finally {
      setSubmitting(null);
    }
  };

  const cancelPicker = () => {
    closePicker();
    setScanned(false);
    setScannedId(null);
  };

  const recipientName =
    (scannedCard as any)?.full_name ||
    (scannedCard as any)?.company_name ||
    "this contact";
  const isLoading = !!submitting;

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4">
        <Pressable
          onPress={() => navigation.goBack()}
          className="flex-row items-center gap-2"
        >
          <ArrowLeft size={20} color="#ffffff" />
          <Text className="font-medium text-primary-foreground">Back</Text>
        </Pressable>
      </View>

      <View className="flex-1 px-4 py-6 gap-6">
        <View className="items-center">
          <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-4">
            <QrCode size={40} color="#2563eb" />
          </View>
          <Text className="text-xl font-bold text-foreground">Scan Business Card</Text>
          <Text className="text-sm text-muted-foreground mt-1 text-center">
            Point your camera at a card's QR to exchange contacts
          </Text>
        </View>

        {!permission?.granted ? (
          <View className="items-center gap-3 py-10">
            <Text className="text-sm text-muted-foreground text-center">
              Camera permission is required to scan QR codes
            </Text>
            <Button onPress={() => requestPermission()} className="rounded-xl">
              Grant Permission
            </Button>
          </View>
        ) : (
          <View className="overflow-hidden rounded-2xl border border-border self-center">
            <CameraView
              style={{ width: 320, height: 320 }}
              onBarcodeScanned={
                scanned
                  ? undefined
                  : ({ data }) => handleScan(String(data || ""))
              }
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            />
          </View>
        )}

        {scanned && !pickerOpen && (
          <Button
            variant="outline"
            className="rounded-xl self-center"
            onPress={() => {
              setScanned(false);
              setScannedId(null);
            }}
          >
            Scan Again
          </Button>
        )}
      </View>

      <Dialog open={pickerOpen} onOpenChange={(v) => { if (!v) cancelPicker(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Card Detected</DialogTitle>
            <DialogDescription>
              How do you want to handle the card from {recipientName}?
            </DialogDescription>
          </DialogHeader>

          <View className="gap-2 py-2">
            <Text className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Share my card
            </Text>
            {myCardsLoading ? (
              <View className="py-3 items-center">
                <ActivityIndicator color="#2563eb" />
              </View>
            ) : myCards.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border p-3">
                <Text className="text-xs text-muted-foreground">
                  You have no cards yet. Create one to enable sending or exchanging.
                </Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 180 }}>
                <View className="gap-2">
                  {myCards.map((c: any) => {
                    const selected = Number(c.id) === selectedMyCardId;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => setSelectedMyCardId(Number(c.id))}
                        className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                          selected ? "border-primary bg-primary/5" : "border-border bg-card"
                        }`}
                      >
                        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <Text className="text-base">🏢</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                            {c.full_name || "Card"}
                          </Text>
                          {c.company_name ? (
                            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                              {c.company_name}
                            </Text>
                          ) : null}
                        </View>
                        {selected ? <Check size={16} color="#2563eb" /> : null}
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            )}
          </View>

          <View className="gap-2 pt-2">
            <Button
              className="w-full rounded-xl gap-2"
              onPress={handleExchange}
              disabled={isLoading || myCards.length === 0 || !scannedBusinessCardId}
            >
              <Repeat2 size={16} color="#ffffff" />
              <Text className="text-primary-foreground font-medium">
                {submitting === "exchange" ? "Exchanging…" : "Exchange Cards"}
              </Text>
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onPress={handleSendOnly}
              disabled={isLoading || myCards.length === 0 || !scannedBusinessCardId}
            >
              <Send size={16} color="#111827" />
              <Text className="text-foreground font-medium">
                {submitting === "send-only" ? "Sending…" : "Send Mine Only"}
              </Text>
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onPress={handleSaveOnly}
              disabled={isLoading || !scannedBusinessCardId}
            >
              <UserPlus size={16} color="#111827" />
              <Text className="text-foreground font-medium">
                {submitting === "save-only" ? "Saving…" : "Save Theirs Only"}
              </Text>
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onPress={cancelPicker}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default CardScanner;
