import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Keyboard,
  QrCode,
  Search,
  XCircle,
} from "lucide-react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useVerifyRegistration } from "../hooks/useEvents";
import { toast } from "../lib/toast";

type ScanState =
  | { kind: "ok"; data: any }
  | { kind: "already_used"; data: any }
  | { kind: "cancelled"; message: string }
  | { kind: "error"; message: string };

const EventScanner = () => {
  const navigation = useNavigation<any>();
  const verifyMutation = useVerifyRegistration();
  const [permission, requestPermission] = useCameraPermissions();
  const [qrInput, setQrInput] = useState("");
  const [result, setResult] = useState<ScanState | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [scanned, setScanned] = useState(false);

  const handleVerify = async (code: string) => {
    if (!code.trim()) {
      toast.error("Please enter a QR code");
      return;
    }
    setResult(null);
    try {
      const data = await verifyMutation.mutateAsync(code.trim());
      if (data?.already_used) {
        setResult({ kind: "already_used", data });
      } else {
        setResult({ kind: "ok", data });
      }
    } catch (err: any) {
      const status = err?.status;
      const errCode = err?.data?.code;
      const message: string =
        err?.data?.error ||
        err?.message ||
        "Verification failed";
      if (status === 410 || errCode === "REGISTRATION_CANCELLED") {
        setResult({ kind: "cancelled", message });
      } else {
        setResult({ kind: "error", message });
      }
    }
  };

  const resetScanner = () => {
    setResult(null);
    setScanned(false);
    setQrInput("");
  };

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4">
        <Pressable
          onPress={() => navigation.navigate("Events")}
          className="flex-row items-center gap-2"
        >
          <ArrowLeft size={20} color="#ffffff" />
          <Text className="font-medium text-primary-foreground">Back to Events</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-6 gap-6">

        {/* ── RESULT VIEW — camera is hidden, only result shown ── */}
        {result ? (
          <View className="gap-4">
            {result.kind === "ok" ? (
              <Card className="border-success/50 bg-success/5">
                <CardContent className="p-5 gap-3">
                  <View className="flex-row items-center gap-3">
                    <CheckCircle2 size={36} color="#16a34a" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">✅ Verified — Allow Entry</Text>
                      <Text className="text-xs text-muted-foreground">Attendee checked in just now.</Text>
                    </View>
                  </View>
                  <AttendeeBlock data={result.data} />
                </CardContent>
              </Card>
            ) : result.kind === "already_used" ? (
              <Card className="border-amber-500/60 bg-amber-50">
                <CardContent className="p-5 gap-3">
                  <View className="flex-row items-center gap-3">
                    <AlertTriangle size={36} color="#d97706" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">⚠️ Already Checked In</Text>
                      <Text className="text-xs text-amber-700">
                        {result.data?.checked_in_at
                          ? `Scanned ${format(new Date(result.data.checked_in_at), "MMM d, p")}`
                          : "This QR has already been used."}
                      </Text>
                      <Text className="text-xs text-amber-700 font-semibold mt-0.5">Do NOT allow re-entry.</Text>
                    </View>
                  </View>
                  <AttendeeBlock data={result.data} amber />
                </CardContent>
              </Card>
            ) : result.kind === "cancelled" ? (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-5">
                  <View className="flex-row items-center gap-3">
                    <XCircle size={36} color="#ef4444" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">❌ Cancelled or Refunded</Text>
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
                      <Text className="font-bold text-lg text-foreground">❌ Verification Failed</Text>
                      <Text className="text-sm text-muted-foreground">{result.message}</Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            )}

            <Button onPress={resetScanner} className="rounded-xl">
              <QrCode size={16} color="#ffffff" /> Scan Next Attendee
            </Button>
          </View>
        ) : (
          /* ── SCANNER VIEW — shown only when no result yet ── */
          <>
            <View className="items-center">
              <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-4">
                <QrCode size={40} color="#2563eb" />
              </View>
              <Text className="text-xl font-bold text-foreground">Verify Attendee</Text>
              <Text className="text-sm text-muted-foreground mt-1 text-center">
                Scan or enter the QR code to verify registration
              </Text>
            </View>

            <View className="flex-row gap-2">
              <Button
                variant={mode === "camera" ? "default" : "outline"}
                className="flex-1"
                onPress={() => { setMode("camera"); setScanned(false); }}
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
                        style={{ width: "100%", height: 280 }}
                        onBarcodeScanned={
                          scanned
                            ? undefined
                            : ({ data }) => {
                                setScanned(true);
                                handleVerify(String(data || ""));
                              }
                        }
                        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                      />
                    </View>
                  )}
                  {scanned && !result && (
                    <View className="items-center py-2">
                      <ActivityIndicator size="small" color="#2563eb" />
                      <Text className="text-sm text-muted-foreground mt-2">Verifying...</Text>
                    </View>
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
                        placeholder="Enter QR code (e.g., EVT-abc12345-...)"
                        value={qrInput}
                        onChangeText={setQrInput}
                        className="flex-1"
                      />
                      <Button
                        onPress={() => handleVerify(qrInput)}
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
    </View>
  );
};

/**
 * AttendeeBlock — shared body for verified + already_used result cards.
 * Keeps the layout identical so organizers don't have to relearn the layout
 * between green/orange paths.
 */
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
        {data?.event?.title || "—"}
      </Text>
      <Text className="text-sm">
        <Text className="font-medium">Tickets: </Text>
        {data?.ticket_count || 1}
      </Text>
      {data?.payment_status && data.payment_status !== "not_required" ? (
        <Text className="text-sm">
          <Text className="font-medium">Payment: </Text>
          {data.payment_status === "paid"
            ? `Paid${data.amount_paid != null ? ` ₹${data.amount_paid}` : ""}`
            : data.payment_status}
        </Text>
      ) : null}
    </View>
  );
}

export default EventScanner;

