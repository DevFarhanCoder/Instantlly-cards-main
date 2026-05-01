import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Keyboard,
  QrCode,
  Repeat2,
  Search,
  Send,
  UserPlus,
  XCircle,
} from "lucide-react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { toast } from "../lib/toast";
import { useUserRole } from "../hooks/useUserRole";
import { useVerifyRegistration } from "../hooks/useEvents";
import { useDirectoryCard } from "../hooks/useDirectoryCards";
import { useAppDispatch } from "../store";
import { setActiveRole } from "../store/authSlice";
import {
  useExchangeCardsMutation,
  useGetMyCardsQuery,
  useSaveReceivedCardMutation,
  useShareCardMutation,
} from "../store/api/businessCardsApi";

type EventScanState =
  | { kind: "ok"; data: any }
  | { kind: "already_used"; data: any }
  | { kind: "cancelled"; message: string }
  | { kind: "error"; message: string };

type Mode = "exchange" | "send-only" | "save-only";

const extractCardId = (raw: string): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();

  const explicit = trimmed.match(/\/card\/([^/?#]+)/i);
  if (explicit?.[1]) {
    const id = explicit[1].trim();
    if (id) return id;
  }

  if (/^(card|promo)-\d+$/i.test(trimmed)) {
    const prefix = trimmed.toLowerCase().startsWith("promo-") ? "promo-" : "card-";
    const suffix = trimmed.replace(/^(card|promo)-/i, "");
    return `${prefix}${suffix}`;
  }

  if (/^\d+$/.test(trimmed)) {
    return `card-${trimmed}`;
  }

  return null;
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

const UnifiedScanner = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { isBusiness, hasBusinessRole } = useUserRole();
  const verifyMutation = useVerifyRegistration();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [qrInput, setQrInput] = useState("");
  const [scanned, setScanned] = useState(false);

  const [eventResult, setEventResult] = useState<EventScanState | null>(null);
  const [scannedCardId, setScannedCardId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedMyCardId, setSelectedMyCardId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState<Mode | null>(null);

  const { data: myCards = [], isLoading: myCardsLoading } = useGetMyCardsQuery();
  const { data: scannedCard } = useDirectoryCard(scannedCardId || "");
  const [exchangeCards] = useExchangeCardsMutation();
  const [saveReceivedCard] = useSaveReceivedCardMutation();
  const [shareCard] = useShareCardMutation();

  const scannedBusinessCardId = useMemo<number | null>(() => {
    if (!scannedCardId) return null;
    if (scannedCardId.startsWith("card-")) return numericFromDirectoryId(scannedCardId);
    const fromCard = (scannedCard as any)?.business_card_id;
    if (fromCard) {
      const n = Number(fromCard);
      return Number.isFinite(n) && n > 0 ? n : null;
    }
    return null;
  }, [scannedCardId, scannedCard]);

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

  const resetAll = () => {
    setScanned(false);
    setQrInput("");
    setEventResult(null);
    setScannedCardId(null);
    setPickerOpen(false);
  };

  const closePicker = () => setPickerOpen(false);

  const goToCard = () => {
    if (scannedCardId) navigation.replace("PublicCard", { id: scannedCardId });
  };

  const ensureScannedReady = (): boolean => {
    if (!scannedBusinessCardId) {
      toast.error("Card details still loading. Try again in a moment.");
      return false;
    }
    return true;
  };

  const handleSaveOnly = async () => {
    if (!scannedCardId || !ensureScannedReady()) return;
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
    if (!scannedCardId || !ensureScannedReady() || !selectedMyCardId) return;
    setSubmitting("send-only");
    try {
      const recipientUserId = (scannedCard as any)?.user_id ?? (scannedCard as any)?.user?.id;
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
    if (!scannedCardId || !ensureScannedReady() || !selectedMyCardId) return;
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
    setScannedCardId(null);
  };

  const verifyEventCode = async (code: string) => {
    setEventResult(null);
    try {
      const data = await verifyMutation.mutateAsync(code.trim());
      if (data?.already_used) {
        setEventResult({ kind: "already_used", data });
      } else {
        setEventResult({ kind: "ok", data });
      }
    } catch (err: any) {
      const status = err?.status;
      const errCode = err?.data?.code;
      const message: string = err?.data?.error || err?.message || "Verification failed";
      if (status === 410 || errCode === "REGISTRATION_CANCELLED") {
        setEventResult({ kind: "cancelled", message });
      } else {
        setEventResult({ kind: "error", message });
      }
    }
  };

  const handleUnifiedScan = async (raw: string) => {
    const value = String(raw || "").trim();
    if (!value) return;

    setScanned(true);

    const cardId = extractCardId(value);
    if (cardId) {
      setEventResult(null);
      setScannedCardId(cardId);
      setPickerOpen(true);
      return;
    }

    if (!isBusiness) {
      toast.error("This QR isn't a business card. Event QR check-in is for business mode.");
      setTimeout(() => setScanned(false), 1200);
      return;
    }

    await verifyEventCode(value);
  };

  const recipientName =
    (scannedCard as any)?.full_name ||
    (scannedCard as any)?.company_name ||
    "this contact";

  const isCardSubmitting = !!submitting;

  const switchRole = async (targetRole: "customer" | "business") => {
    if (targetRole === "business" && !hasBusinessRole) {
      toast.error("Business mode is not available on this account.");
      return;
    }

    if ((targetRole === "business" && isBusiness) || (targetRole === "customer" && !isBusiness)) {
      return;
    }

    dispatch(setActiveRole(targetRole));
    await SecureStore.setItemAsync("activeRole", targetRole);

    if (targetRole === "business") {
      toast.success("Switched to business mode");
      navigation.navigate("ChooseListingType");
    } else {
      toast.success("Switched to customer mode");
    }
  };

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

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-6 gap-6">
        {eventResult ? (
          <View className="gap-4">
            {eventResult.kind === "ok" ? (
              <Card className="border-success/50 bg-success/5">
                <CardContent className="p-5 gap-3">
                  <View className="flex-row items-center gap-3">
                    <CheckCircle2 size={36} color="#16a34a" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">Verified - Allow Entry</Text>
                      <Text className="text-xs text-muted-foreground">Attendee checked in just now.</Text>
                    </View>
                  </View>
                  <AttendeeBlock data={eventResult.data} />
                </CardContent>
              </Card>
            ) : eventResult.kind === "already_used" ? (
              <Card className="border-amber-500/60 bg-amber-50">
                <CardContent className="p-5 gap-3">
                  <View className="flex-row items-center gap-3">
                    <AlertTriangle size={36} color="#d97706" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">Already Checked In</Text>
                      <Text className="text-xs text-amber-700">
                        {eventResult.data?.checked_in_at
                          ? `Scanned ${format(new Date(eventResult.data.checked_in_at), "MMM d, p")}`
                          : "This QR has already been used."}
                      </Text>
                      <Text className="text-xs text-amber-700 font-semibold mt-0.5">Do not allow re-entry.</Text>
                    </View>
                  </View>
                  <AttendeeBlock data={eventResult.data} amber />
                </CardContent>
              </Card>
            ) : eventResult.kind === "cancelled" ? (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-5">
                  <View className="flex-row items-center gap-3">
                    <XCircle size={36} color="#ef4444" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">Cancelled or Refunded</Text>
                      <Text className="text-sm text-muted-foreground">This pass is no longer valid. Do not allow entry.</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-5">
                  <View className="flex-row items-center gap-3">
                    <XCircle size={36} color="#ef4444" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">Verification Failed</Text>
                      <Text className="text-sm text-muted-foreground">{eventResult.message}</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            )}

            <Button
              onPress={() => {
                setEventResult(null);
                setScanned(false);
                setQrInput("");
              }}
              className="rounded-xl"
            >
              <QrCode size={16} color="#ffffff" /> Scan Next
            </Button>
          </View>
        ) : (
          <>
            <View className="items-center">
              <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-4">
                <QrCode size={40} color="#2563eb" />
              </View>
              <Text className="text-xl font-bold text-foreground">Unified QR Scanner</Text>
              <Text className="text-sm text-muted-foreground mt-1 text-center">
                Scan business cards or event ticket QRs from one place
              </Text>
            </View>

            <View className="rounded-xl border border-border bg-card p-3">
              <View className="mb-2 flex-row items-center">
                <View
                  className={`rounded-full px-3 py-1 ${
                    isBusiness ? "bg-primary/10" : "bg-emerald-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      isBusiness ? "text-primary" : "text-emerald-700"
                    }`}
                  >
                    {isBusiness ? "Business Mode" : "Customer Mode"}
                  </Text>
                </View>
              </View>
              <View className="mb-3 rounded-full border border-border bg-muted p-1 flex-row">
                <Pressable
                  onPress={() => {
                    void switchRole("customer");
                  }}
                  className={`flex-1 rounded-full py-2 items-center justify-center ${
                    !isBusiness ? "bg-card" : "bg-transparent"
                  }`}
                >
                  <Text className={`text-xs font-semibold ${!isBusiness ? "text-foreground" : "text-muted-foreground"}`}>
                    Customer
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void switchRole("business");
                  }}
                  disabled={!hasBusinessRole}
                  className={`flex-1 rounded-full py-2 items-center justify-center ${
                    isBusiness ? "bg-card" : "bg-transparent"
                  } ${!hasBusinessRole ? "opacity-50" : ""}`}
                >
                  <Text className={`text-xs font-semibold ${isBusiness ? "text-foreground" : "text-muted-foreground"}`}>
                    Business
                  </Text>
                </Pressable>
              </View>
              <Text className="text-xs text-muted-foreground">
                Card QR will open exchange options automatically. Event QR verification works in business mode.
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Button
                variant={mode === "camera" ? "default" : "outline"}
                className="flex-1"
                onPress={() => {
                  setMode("camera");
                  setScanned(false);
                }}
              >
                <Camera size={16} color={mode === "camera" ? "#ffffff" : "#111827"} /> Camera
              </Button>
              <Button
                variant={mode === "manual" ? "default" : "outline"}
                className="flex-1"
                onPress={() => setMode("manual")}
              >
                <Keyboard size={16} color={mode === "manual" ? "#ffffff" : "#111827"} /> Manual
              </Button>
            </View>

            {mode === "camera" && (
              <Card>
                <CardContent className="p-4 gap-3">
                  {!permission?.granted ? (
                    <View className="items-center gap-3 py-6">
                      <Text className="text-sm text-muted-foreground text-center">
                        Camera permission is required to scan QR codes
                      </Text>
                      <Button onPress={() => requestPermission()} className="rounded-xl">
                        Grant Permission
                      </Button>
                    </View>
                  ) : (
                    <View className="overflow-hidden rounded-lg">
                      <CameraView
                        style={{ width: "100%", height: 300 }}
                        onBarcodeScanned={
                          scanned || pickerOpen || !!eventResult
                            ? undefined
                            : ({ data }) => {
                                void handleUnifiedScan(String(data || ""));
                              }
                        }
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                      />
                    </View>
                  )}

                  {scanned && verifyMutation.isPending && (
                    <View className="items-center py-2">
                      <ActivityIndicator size="small" color="#2563eb" />
                      <Text className="text-sm text-muted-foreground mt-2">Verifying...</Text>
                    </View>
                  )}

                  {scanned && !pickerOpen && !verifyMutation.isPending && !eventResult && (
                    <Button
                      variant="outline"
                      className="rounded-xl self-center"
                      onPress={() => {
                        setScanned(false);
                        setScannedCardId(null);
                      }}
                    >
                      Scan Again
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {mode === "manual" && (
              <Card>
                <CardContent className="p-5 gap-4">
                  <View className="gap-2">
                    <Text className="text-sm font-medium text-foreground">QR Code</Text>
                    <View className="flex-row gap-2">
                      <Input
                        placeholder="Paste QR value"
                        value={qrInput}
                        onChangeText={setQrInput}
                        className="flex-1"
                      />
                      <Button
                        onPress={() => {
                          if (!qrInput.trim()) {
                            toast.error("Please enter a QR value");
                            return;
                          }
                          void handleUnifiedScan(qrInput);
                        }}
                        disabled={verifyMutation.isPending}
                        testID="verify-btn"
                      >
                        {verifyMutation.isPending ? "..." : <Search size={16} color="#ffffff" />}
                      </Button>
                    </View>
                  </View>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <Dialog
        open={pickerOpen}
        onOpenChange={(v) => {
          if (!v) cancelPicker();
        }}
      >
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
              disabled={isCardSubmitting || myCards.length === 0 || !scannedBusinessCardId}
            >
              <Repeat2 size={16} color="#ffffff" />
              <Text className="text-primary-foreground font-medium">
                {submitting === "exchange" ? "Exchanging..." : "Exchange Cards"}
              </Text>
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onPress={handleSendOnly}
              disabled={isCardSubmitting || myCards.length === 0 || !scannedBusinessCardId}
            >
              <Send size={16} color="#111827" />
              <Text className="text-foreground font-medium">
                {submitting === "send-only" ? "Sending..." : "Send Mine Only"}
              </Text>
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl gap-2"
              onPress={handleSaveOnly}
              disabled={isCardSubmitting || !scannedBusinessCardId}
            >
              <UserPlus size={16} color="#111827" />
              <Text className="text-foreground font-medium">
                {submitting === "save-only" ? "Saving..." : "Save Theirs Only"}
              </Text>
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onPress={cancelPicker}
              disabled={isCardSubmitting}
            >
              Cancel
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
};

function AttendeeBlock({ data, amber = false }: { data: any; amber?: boolean }) {
  const tone = amber ? "bg-amber-100" : "bg-success/10";
  return (
    <View className={`gap-1.5 rounded-lg p-3 ${tone}`}>
      <Text className="text-sm">
        <Text className="font-medium">Name: </Text>
        {data?.user?.name || "N/A"}
      </Text>
      {data?.user?.phone ? (
        <Text className="text-sm">
          <Text className="font-medium">Phone: </Text>
          {data.user.phone}
        </Text>
      ) : null}
      <Text className="text-sm">
        <Text className="font-medium">Event: </Text>
        {data?.event?.title || "-"}
      </Text>
      <Text className="text-sm">
        <Text className="font-medium">Tickets: </Text>
        {data?.ticket_count || 1}
      </Text>
      {data?.payment_status && data.payment_status !== "not_required" ? (
        <Text className="text-sm">
          <Text className="font-medium">Payment: </Text>
          {data.payment_status === "paid"
            ? `Paid${data.amount_paid != null ? ` Rs ${data.amount_paid}` : ""}`
            : data.payment_status}
        </Text>
      ) : null}
    </View>
  );
}

export default UnifiedScanner;
