import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Keyboard,
  QrCode,
  XCircle,
} from "lucide-react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useRedeemVoucherByQrMutation } from "../store/api/vouchersApi";
import { useColors } from "../theme/colors";
import { toast } from "../lib/toast";

type ScanState =
  | { kind: "ok"; user: { name?: string; phone?: string }; justRedeemed: number; remainingUses: number; totalQty: number }
  | { kind: "already_redeemed"; user: { name?: string; phone?: string }; totalQty: number }
  | { kind: "error"; message: string }
  | { kind: "confirm"; parsed: { voucherId: number; claimId: number }; user?: { name?: string; phone?: string } };

/**
 * Parses QR value: instantllycards://voucher/{voucherId}/claim/{claimId}
 * Returns { voucherId, claimId } or null if not parseable.
 */
function parseVoucherQr(raw: string): { voucherId: number; claimId: number } | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Full URI format
  const m = trimmed.match(/(?:instantllycards:\/\/)?voucher\/(\d+)\/claim\/(\d+)/i);
  if (m) return { voucherId: parseInt(m[1], 10), claimId: parseInt(m[2], 10) };
  return null;
}

const VoucherScanner = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const filterVoucherId: number | undefined = route.params?.voucherId;
  const colors = useColors();

  const [redeemByQr] = useRedeemVoucherByQrMutation();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualVoucherId, setManualVoucherId] = useState(filterVoucherId ? String(filterVoucherId) : "");
  const [manualClaimId, setManualClaimId] = useState("");
  const [result, setResult] = useState<ScanState | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [scanned, setScanned] = useState(false);
  // Quantity to redeem in this scan (chosen in confirm step)
  const [redeemQty, setRedeemQty] = useState(1);
  // Info fetched from the QR (before confirming how many to use)
  const pendingRef = useRef<{ voucherId: number; claimId: number } | null>(null);

  const doRedeem = useCallback(async (voucherId: number, claimId: number, qty: number) => {
    try {
      const data = await redeemByQr({ voucher_id: voucherId, claim_id: claimId, redeem_quantity: qty }).unwrap();
      if (data.already_redeemed) {
        setResult({ kind: "already_redeemed", user: data.user ?? {}, totalQty: data.quantity ?? 1 });
      } else {
        setResult({
          kind: "ok",
          user: data.user ?? {},
          justRedeemed: data.just_redeemed ?? qty,
          remainingUses: data.remaining_uses ?? 0,
          totalQty: data.quantity ?? qty,
        });
      }
    } catch (err: any) {
      const msg: string = err?.data?.error ?? err?.message ?? "Redemption failed";
      setResult({ kind: "error", message: err?.status === 403 ? "You are not the owner of this voucher" : err?.status === 404 ? "QR code not found or invalid" : msg });
    }
  }, [redeemByQr]);

  const handleRedeem = useCallback(async (raw: string) => {
    const parsed = parseVoucherQr(raw.trim());
    if (!parsed) {
      setResult({ kind: "error", message: "Invalid QR code — not a voucher QR" });
      return;
    }
    if (filterVoucherId && parsed.voucherId !== filterVoucherId) {
      setResult({ kind: "error", message: "This QR belongs to a different voucher" });
      return;
    }
    // Show confirm/qty step first
    pendingRef.current = parsed;
    setRedeemQty(1);
    setResult({ kind: "confirm", parsed });
  }, [filterVoucherId]);

  const handleConfirm = useCallback(() => {
    const p = pendingRef.current;
    if (!p) return;
    setResult(null); // clear while loading
    doRedeem(p.voucherId, p.claimId, redeemQty);
  }, [doRedeem, redeemQty]);

  const onBarcodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    handleRedeem(data);
  }, [scanned, handleRedeem]);

  const reset = () => {
    setResult(null);
    setScanned(false);
    setManualClaimId("");
    setRedeemQty(1);
    pendingRef.current = null;
    if (!filterVoucherId) setManualVoucherId("");
  };

  if (!permission) return <View className="flex-1 bg-background" />;

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6 gap-4">
        <QrCode size={48} color="#6b7280" />
        <Text className="text-lg font-semibold text-foreground text-center">Camera permission required</Text>
        <Text className="text-sm text-muted-foreground text-center">Allow camera access to scan voucher QR codes</Text>
        <Button onPress={requestPermission} className="w-full rounded-xl">Grant Permission</Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View className="bg-primary px-4 py-4">
        <Pressable onPress={() => navigation.goBack()} className="flex-row items-center gap-2">
          <ArrowLeft size={20} color="#ffffff" />
          <Text className="font-medium text-primary-foreground">Voucher Scanner</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} className="px-4 py-4 gap-4">

        {/* Mode toggle */}
        <View className="flex-row gap-2">
          <Button
            variant={mode === "camera" ? "default" : "outline"}
            className="flex-1 rounded-xl"
            onPress={() => { setMode("camera"); reset(); }}
          >
            <View className="flex-row items-center gap-2">
              <QrCode size={16} color={mode === "camera" ? "#ffffff" : "#6b7280"} />
              <Text className={mode === "camera" ? "text-primary-foreground font-medium" : "text-muted-foreground"}>Camera</Text>
            </View>
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            className="flex-1 rounded-xl"
            onPress={() => { setMode("manual"); reset(); }}
          >
            <View className="flex-row items-center gap-2">
              <Keyboard size={16} color={mode === "manual" ? "#ffffff" : "#6b7280"} />
              <Text className={mode === "manual" ? "text-primary-foreground font-medium" : "text-muted-foreground"}>Manual</Text>
            </View>
          </Button>
        </View>

        {/* Camera view */}
        {mode === "camera" && !result && (
          <Card>
            <CardContent className="p-0 overflow-hidden rounded-xl">
              <CameraView
                style={{ height: 300 }}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                onBarcodeScanned={onBarcodeScanned}
              />
            </CardContent>
          </Card>
        )}

        {/* Manual input */}
        {mode === "manual" && !result && (
          <Card>
            <CardContent className="p-4 gap-3">
              <Text className="text-sm font-medium text-foreground">Enter claim details manually</Text>
              <Text className="text-xs text-muted-foreground">Ask the customer to open their voucher and read out the Claim ID shown there</Text>
              {!filterVoucherId && (
                <View className="gap-1">
                  <Text className="text-xs font-medium text-foreground">Voucher ID</Text>
                  <Input
                    placeholder="e.g. 42"
                    value={manualVoucherId}
                    onChangeText={setManualVoucherId}
                    keyboardType="numeric"
                  />
                </View>
              )}
              <View className="gap-1">
                <Text className="text-xs font-medium text-foreground">Claim ID</Text>
                <Input
                  placeholder="e.g. 108"
                  value={manualClaimId}
                  onChangeText={setManualClaimId}
                  keyboardType="numeric"
                />
              </View>
              <Button
                className="w-full rounded-xl"
                onPress={() => handleRedeem(`voucher/${manualVoucherId}/claim/${manualClaimId}`)}
                disabled={!manualVoucherId.trim() || !manualClaimId.trim()}
              >
                <Text className="text-primary-foreground font-semibold">Redeem</Text>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <View className="gap-4">
            {result.kind === "confirm" ? (
              <Card className="border-primary/40">
                <CardContent className="p-5 gap-4">
                  <Text className="font-bold text-base text-foreground">How many vouchers to use?</Text>
                  <Text className="text-xs text-muted-foreground">Customer has multiple vouchers. Choose how many to redeem in this visit.</Text>
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => setRedeemQty((q) => Math.max(1, q - 1))}
                      style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ fontSize: 22, color: colors.foreground }}>−</Text>
                    </Pressable>
                    <View style={{ width: 48, height: 40, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 18, fontWeight: "bold", color: colors.foreground }}>{redeemQty}</Text>
                    </View>
                    <Pressable
                      onPress={() => setRedeemQty((q) => q + 1)}
                      style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" }}
                    >
                      <Text style={{ fontSize: 22, color: colors.foreground }}>+</Text>
                    </Pressable>
                    <Text className="text-xs text-muted-foreground flex-1">
                      Voucher ID: {result.parsed.voucherId}{"\n"}Claim ID: {result.parsed.claimId}
                    </Text>
                  </View>
                  <View className="gap-2">
                    <Button className="w-full rounded-xl" onPress={handleConfirm}>
                      <Text className="text-primary-foreground font-semibold">Redeem {redeemQty} Voucher{redeemQty !== 1 ? "s" : ""}</Text>
                    </Button>
                    <Button variant="outline" className="w-full rounded-xl" onPress={reset}>
                      <Text className="text-foreground">Cancel</Text>
                    </Button>
                  </View>
                </CardContent>
              </Card>
            ) : result.kind === "ok" ? (
              <Card className="border-green-500/50 bg-green-50">
                <CardContent className="p-5 gap-3">
                  <View className="flex-row items-center gap-3">
                    <CheckCircle2 size={40} color="#16a34a" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">Voucher Redeemed ✓</Text>
                      <Text className="text-sm text-green-700">{result.justRedeemed} used this visit</Text>
                    </View>
                  </View>
                  <View className="flex-row gap-2">
                    <View className="flex-1 rounded-lg bg-green-500/10 p-2 items-center">
                      <Text className="text-xs text-green-700 font-semibold">Used Now</Text>
                      <Text className="text-lg font-bold text-green-700">{result.justRedeemed}</Text>
                    </View>
                    <View className="flex-1 rounded-lg bg-muted p-2 items-center">
                      <Text className="text-xs text-muted-foreground font-semibold">Remaining</Text>
                      <Text className="text-lg font-bold text-foreground">{result.remainingUses}</Text>
                    </View>
                    <View className="flex-1 rounded-lg bg-muted p-2 items-center">
                      <Text className="text-xs text-muted-foreground font-semibold">Total Bought</Text>
                      <Text className="text-lg font-bold text-foreground">{result.totalQty}</Text>
                    </View>
                  </View>
                  {(result.user.name || result.user.phone) && (
                    <View className="bg-white rounded-lg p-3 gap-1">
                      {result.user.name ? <Text className="text-sm font-semibold text-foreground">{result.user.name}</Text> : null}
                      {result.user.phone ? <Text className="text-xs text-muted-foreground">{result.user.phone}</Text> : null}
                    </View>
                  )}
                  {result.remainingUses > 0 && (
                    <View className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                      <Text className="text-xs text-amber-700 font-semibold">
                        Customer still has {result.remainingUses} unused voucher{result.remainingUses !== 1 ? "s" : ""} — they can use them on future visits.
                      </Text>
                    </View>
                  )}
                </CardContent>
              </Card>
            ) : result.kind === "already_redeemed" ? (
              <Card className="border-amber-500/60 bg-amber-50">
                <CardContent className="p-5 gap-3">
                  <View className="flex-row items-center gap-3">
                    <AlertTriangle size={40} color="#d97706" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">All Redeemed</Text>
                      <Text className="text-sm text-amber-700">All {result.totalQty} voucher{result.totalQty !== 1 ? "s" : ""} have already been used. Do NOT accept this again.</Text>
                    </View>
                  </View>
                  {(result.user.name || result.user.phone) && (
                    <View className="bg-white rounded-lg p-3 gap-1">
                      {result.user.name ? <Text className="text-sm font-semibold text-foreground">{result.user.name}</Text> : null}
                      {result.user.phone ? <Text className="text-xs text-muted-foreground">{result.user.phone}</Text> : null}
                    </View>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-destructive/50 bg-red-50">
                <CardContent className="p-5">
                  <View className="flex-row items-center gap-3">
                    <XCircle size={40} color="#ef4444" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">Invalid QR</Text>
                      <Text className="text-sm text-red-700">{result.message}</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            )}

            {result.kind !== "confirm" && (
              <Button className="w-full rounded-xl" onPress={reset}>
                <Text className="text-primary-foreground font-semibold">Scan Another</Text>
              </Button>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default VoucherScanner;
