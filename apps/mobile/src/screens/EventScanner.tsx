import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  CloudDownload,
  CloudOff,
  Keyboard,
  QrCode,
  RefreshCw,
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
import { API_URL } from "../store/api/baseApi";
import { useAppSelector } from "../store";
import { selectAccessToken } from "../store/authSlice";
import {
  downloadCheckinList,
  getLastDownloadTime,
  getPendingSync,
  lookupQrCode,
  markCheckedInCache,
  markCheckedInLocally,
  syncPendingCheckins,
} from "../lib/offlineCheckin";

type ScanState =
  | { kind: "ok"; data: any; offline?: boolean }
  | { kind: "already_used"; data: any; offline?: boolean }
  | { kind: "cancelled"; message: string }
  | { kind: "error"; message: string };

const EventScanner = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const eventId: number | undefined = route.params?.eventId ?? route.params?.id;

  const token = useAppSelector(selectAccessToken);
  const verifyMutation = useVerifyRegistration();
  const [permission, requestPermission] = useCameraPermissions();
  const [qrInput, setQrInput] = useState("");
  const [result, setResult] = useState<ScanState | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [scanned, setScanned] = useState(false);

  // Offline state
  const [lastDownload, setLastDownload] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const refreshOfflineStatus = useCallback(async () => {
    if (!eventId) return;
    const [dl, pending] = await Promise.all([
      getLastDownloadTime(eventId),
      getPendingSync(eventId),
    ]);
    setLastDownload(dl);
    setPendingCount(pending.length);
  }, [eventId]);

  useEffect(() => { refreshOfflineStatus(); }, [refreshOfflineStatus]);

  // Silent auto-sync: runs when app comes to foreground or every 30 s
  const silentSync = useCallback(async () => {
    if (!eventId || !token) return;
    const pending = await getPendingSync(eventId);
    if (pending.length === 0) return;
    try {
      await syncPendingCheckins(eventId, API_URL, token);
      await refreshOfflineStatus();
      toast.success("Offline check-ins synced automatically");
    } catch {
      // Still offline — stay quiet, try again later
    }
  }, [eventId, token, refreshOfflineStatus]);

  // AppState: sync when app comes back to foreground
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && next === "active") {
        silentSync();
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [silentSync]);

  // Interval: try every 30 s while screen is open
  useEffect(() => {
    const timer = setInterval(silentSync, 30_000);
    return () => clearInterval(timer);
  }, [silentSync]);

  const handleDownload = async () => {
    if (!eventId || !token) { toast.error("Cannot download â€” missing event or auth"); return; }
    setDownloading(true);
    try {
      const { count } = await downloadCheckinList(eventId, API_URL, token);
      await refreshOfflineStatus();
      toast.success(`Downloaded ${count} attendees for offline use`);
    } catch (err: any) {
      toast.error("Download failed: " + (err?.message ?? "Unknown error"));
    } finally {
      setDownloading(false);
    }
  };

  const handleSync = async () => {
    if (!eventId || !token) return;
    setSyncing(true);
    try {
      const result = await syncPendingCheckins(eventId, API_URL, token);
      await refreshOfflineStatus();
      toast.success(`Synced ${result.synced} check-ins${result.already_used ? `, ${result.already_used} already used` : ""}`);
    } catch (err: any) {
      toast.error("Sync failed: " + (err?.message ?? "No internet?"));
    } finally {
      setSyncing(false);
    }
  };

  const handleVerify = async (code: string) => {
    if (!code.trim()) { toast.error("Please enter a QR code"); return; }
    setResult(null);

    // 1. Try online first
    try {
      const data = await verifyMutation.mutateAsync(code.trim());
      // Keep local cache in sync so re-scans show "already used" immediately
      // Use markCheckedInCache (not markCheckedInLocally) — no sync queue needed for online scans
      if (eventId && !data?.already_used) {
        await markCheckedInCache(eventId, code.trim());
      }
      setResult(data?.already_used ? { kind: "already_used", data } : { kind: "ok", data });
      await refreshOfflineStatus();
      return;
    } catch (err: any) {
      const status = err?.status;
      const errCode = err?.data?.code;
      const message: string = err?.data?.error ?? err?.message ?? "Verification failed";

      // Known server rejections â€” don't fall back to offline
      if (status === 410 || errCode === "REGISTRATION_CANCELLED") {
        setResult({ kind: "cancelled", message }); return;
      }
      if (status === 403 || status === 401) {
        setResult({ kind: "error", message }); return;
      }
      if (status === 404) {
        setResult({ kind: "error", message: "QR code not found" }); return;
      }
      // Network error or 5xx â€” try offline cache
    }

    // 2. Offline fallback
    if (!eventId) {
      setResult({ kind: "error", message: "No internet and no event ID for offline lookup" }); return;
    }
    const cached = await lookupQrCode(eventId, code.trim());
    if (!cached) {
      setResult({ kind: "error", message: "No internet and QR not in offline cache. Download the attendee list first." }); return;
    }
    if (cached.is_cancelled) {
      setResult({ kind: "cancelled", message: "This ticket is cancelled or refunded." }); return;
    }
    if (cached.checked_in) {
      setResult({ kind: "already_used", data: { user: { name: cached.user_name, phone: cached.user_phone }, ticket_count: cached.ticket_count, checked_in_at: cached.checked_in_at }, offline: true }); return;
    }
    // Mark locally and queue for sync
    await markCheckedInLocally(eventId, code.trim());
    await refreshOfflineStatus();
    setResult({
      kind: "ok",
      offline: true,
      data: { user: { name: cached.user_name, phone: cached.user_phone }, ticket_count: cached.ticket_count },
    });
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
          onPress={() => navigation.goBack()}
          className="flex-row items-center gap-2"
        >
          <ArrowLeft size={20} color="#ffffff" />
          <Text className="font-medium text-primary-foreground">Back</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4 gap-4">

        {/* â”€â”€ Offline toolbar â”€â”€ */}
        {eventId ? (
          <Card>
            <CardContent className="p-3 gap-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  {lastDownload ? (
                    <>
                      <CloudDownload size={14} color="#16a34a" />
                      <Text className="text-xs text-muted-foreground">
                        Cached {format(new Date(lastDownload), "MMM d, p")}
                      </Text>
                    </>
                  ) : (
                    <>
                      <CloudOff size={14} color="#d97706" />
                      <Text className="text-xs text-amber-600">No offline cache</Text>
                    </>
                  )}
                </View>
                <Button size="sm" variant="outline" onPress={handleDownload} disabled={downloading}>
                  <View className="flex-row items-center gap-1">
                    {downloading ? <ActivityIndicator size={12} color="#2563eb" /> : <CloudDownload size={12} color="#2563eb" />}
                    <Text className="text-xs text-primary">{downloading ? "Downloading..." : "Download"}</Text>
                  </View>
                </Button>
              </View>
              {pendingCount > 0 && (
                <View className="flex-row items-center justify-between bg-amber-50 rounded-lg px-3 py-2">
                  <Text className="text-xs text-amber-700 font-medium">
                    {pendingCount} offline check-in{pendingCount > 1 ? "s" : ""} pending sync
                  </Text>
                  <Button size="sm" variant="outline" onPress={handleSync} disabled={syncing}>
                    <View className="flex-row items-center gap-1">
                      {syncing ? <ActivityIndicator size={12} color="#d97706" /> : <RefreshCw size={12} color="#d97706" />}
                      <Text className="text-xs" style={{ color: "#d97706" }}>{syncing ? "Syncing..." : "Sync Now"}</Text>
                    </View>
                  </Button>
                </View>
              )}
            </CardContent>
          </Card>
        ) : null}

        {/* â”€â”€ RESULT VIEW â”€â”€ */}
        {result ? (
          <View className="gap-4">
            {result.kind === "ok" ? (
              <Card className="border-success/50 bg-success/5">
                <CardContent className="p-5 gap-3">
                  <View className="flex-row items-center gap-3">
                    <CheckCircle2 size={36} color="#16a34a" />
                    <View className="flex-1">
                      <Text className="font-bold text-lg text-foreground">Verified — Allow Entry</Text>
                      <Text className="text-xs text-muted-foreground">
                        {result.offline ? "Checked in offline — will sync when online" : "Attendee checked in just now."}
                      </Text>
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
                      <Text className="font-bold text-lg text-foreground">Already Checked In</Text>
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
      {data?.event?.title ? (
        <Text className="text-sm">
          <Text className="font-medium">Event: </Text>
          {data.event.title}
        </Text>
      ) : null}
      <Text className="text-sm">
        <Text className="font-medium">Tickets: </Text>
        {data?.ticket_count || 1}
      </Text>
      {data?.payment_status && data.payment_status !== "not_required" ? (
        <Text className="text-sm">
          <Text className="font-medium">Payment: </Text>
          {data.payment_status === "paid"
            ? `Paid${data.amount_paid != null ? ` â‚¹${data.amount_paid}` : ""}`
            : data.payment_status}
        </Text>
      ) : null}
    </View>
  );
}

export default EventScanner;
