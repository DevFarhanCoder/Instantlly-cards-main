import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Keyboard,
  QrCode,
  Search,
  XCircle,
} from "lucide-react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useVerifyRegistration } from "../hooks/useEvents";
import { toast } from "../lib/toast";

const EventScanner = () => {
  const navigation = useNavigation<any>();
  const verifyMutation = useVerifyRegistration();
  const [permission, requestPermission] = useCameraPermissions();
  const [qrInput, setQrInput] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    data?: any;
    error?: string;
  } | null>(null);
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
      setResult({ success: true, data });
    } catch (err: any) {
      setResult({ success: false, error: err?.message || "Verification failed" });
    }
  };

  useEffect(() => {
    setScanned(false);
  }, [mode]);

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

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-6 space-y-6">
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
            onPress={() => setMode("camera")}
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
            <CardContent className="p-4 space-y-3">
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
              {scanned && (
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onPress={() => setScanned(false)}
                >
                  Scan Again
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {mode === "manual" && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <View className="space-y-2">
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
                  >
                    {verifyMutation.isPending ? "..." : <Search size={16} color="#ffffff" />}
                  </Button>
                </View>
              </View>
            </CardContent>
          </Card>
        )}

        {result && (
          <View>
            {result.success ? (
              <Card className="border-success/50 bg-success/5">
                <CardContent className="p-5 space-y-3">
                  <View className="flex-row items-center gap-3">
                    <CheckCircle2 size={32} color="#16a34a" />
                    <View>
                      <Text className="font-bold text-foreground">✅ Verified Successfully</Text>
                      <Text className="text-xs text-muted-foreground">
                        Attendee registration confirmed
                      </Text>
                    </View>
                  </View>
                  <View className="space-y-1.5 rounded-lg bg-success/10 p-3">
                    <Text className="text-sm">
                      <Text className="font-medium">Name: </Text>
                      {result.data.full_name}
                    </Text>
                    <Text className="text-sm">
                      <Text className="font-medium">Email: </Text>
                      {result.data.email}
                    </Text>
                    {result.data.phone && (
                      <Text className="text-sm">
                        <Text className="font-medium">Phone: </Text>
                        {result.data.phone}
                      </Text>
                    )}
                    <Text className="text-sm">
                      <Text className="font-medium">Event: </Text>
                      {result.data.events?.title}
                    </Text>
                  </View>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-5">
                  <View className="flex-row items-center gap-3">
                    <XCircle size={32} color="#ef4444" />
                    <View>
                      <Text className="font-bold text-foreground">❌ Verification Failed</Text>
                      <Text className="text-sm text-muted-foreground">
                        {result.error}
                      </Text>
                    </View>
                  </View>
                </CardContent>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default EventScanner;

