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
import { toast } from "../lib/toast";

type ScanState =
  | { kind: "ok"; user: { name?: string; phone?: string } }
  | { kind: "already_redeemed"; user: { name?: string; phone?: string } }
  | { kind: "error"; message: string };

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
  // Optional: pre-filter to a specific voucherId so scanner only accepts that voucher
  const filterVoucherId: number | undefined = route.params?.voucherId;

  const [redeemByQr] = useRedeemVoucherByQrMutation();
  const [permission, requestPermission] = useCameraPermissions();
  const [qrInput, setQrInput] = useState("");
  const [manualVoucherId, setManualVoucherId] = useState(filterVoucherId ? String(filterVoucherId) : "");
  const [manualClaimId, setManualClaimId] = useState("");
  const [result, setResult] = useState<ScanState | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [scanned, setScanned] = useState(false);

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
    try {
      const data = await redeemByQr({ voucher_id: parsed.voucherId, claim_id: parsed.claimId }).unwrap();
      if (data.already_redeemed) {
        setResult({ kind: "already_redeemed", user: data.user ?? {} });
      } else {
        setResult({ kind: "ok", user: data.user ?? {} });
      }
    } catch (err: any) {
      const msg: string = err?.data?.error ?? err?.message ?? "Redemption failed";
      if (err?.status === 403) {
        setResult({ kind: "error", message: "You are not the owner of this voucher" });
      } else if (err?.status === 404) {
        setResult({ kind: "error", message: "QR code not found or invalid" });
      } else {
        setResult({ kind: "error", message: msg });
      }
    }
  }, [redeemByQr, filterVoucherId]);

  const onBarcodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    handleRedeem(data);
  }, [scanned, handleRedeem]);

  const reset = () => {
    setResult(null);
    setScanned(false);
    setQrInput("");
    setManualClaimId("");
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
            {result.kind === "ok" ? (
              <Card className="border-green-500/50 bg-green-50">
                <CardContent className="p-5 gap-3">
                  <View className="flex-row items-center gap-3">
                    <CheckCircle2 size={40} color="#16a34a" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">Voucher Redeemed ✓</Text>
                      <Text className="text-sm text-green-700">Successfully marked as redeemed</Text>
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
            ) : result.kind === "already_redeemed" ? (
              <Card className="border-amber-500/60 bg-amber-50">
                <CardContent className="p-5 gap-3">
                  <View className="flex-row items-center gap-3">
                    <AlertTriangle size={40} color="#d97706" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">Already Redeemed</Text>
                      <Text className="text-sm text-amber-700">This voucher was already redeemed. Do NOT accept it again.</Text>
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

            <Button className="w-full rounded-xl" onPress={reset}>
              <Text className="text-primary-foreground font-semibold">Scan Another</Text>
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default VoucherScanner;
