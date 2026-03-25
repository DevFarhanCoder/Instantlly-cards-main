import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, CheckCircle2, XCircle, QrCode, Camera, KeyboardIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useVerifyRegistration } from "@/hooks/useEvents";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Html5Qrcode } from "html5-qrcode";

const EventScanner = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const verifyMutation = useVerifyRegistration();
  const [qrInput, setQrInput] = useState("");
  const [result, setResult] = useState<{ success: boolean; data?: any; error?: string } | null>(null);
  const [mode, setMode] = useState<"camera" | "manual">("camera");
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = "qr-reader";

  const handleVerify = async (code: string) => {
    if (!code.trim()) {
      toast({ title: "Please enter a QR code", variant: "destructive" });
      return;
    }
    setResult(null);
    try {
      const data = await verifyMutation.mutateAsync(code.trim());
      setResult({ success: true, data });
    } catch (err: any) {
      setResult({ success: false, error: err.message });
    }
  };

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode(scannerDivId);
      scannerRef.current = scanner;
      setScanning(true);
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          stopScanner();
          handleVerify(decodedText);
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      toast({ title: "Camera access denied or unavailable", variant: "destructive" });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
    }
    setScanning(false);
  };

  useEffect(() => {
    if (mode === "camera") {
      const timeout = setTimeout(() => startScanner(), 300);
      return () => {
        clearTimeout(timeout);
        stopScanner();
      };
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [mode]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-primary px-4 py-4">
        <button onClick={() => navigate("/events")} className="flex items-center gap-2 text-primary-foreground">
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to Events</span>
        </button>
      </div>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        <div className="text-center">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-4">
            <QrCode className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Verify Attendee</h1>
          <p className="text-sm text-muted-foreground mt-1">Scan or enter the QR code to verify registration</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2">
          <Button
            variant={mode === "camera" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("camera")}
          >
            <Camera className="h-4 w-4 mr-2" /> Camera
          </Button>
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            className="flex-1"
            onClick={() => setMode("manual")}
          >
            <KeyboardIcon className="h-4 w-4 mr-2" /> Manual
          </Button>
        </div>

        {/* Camera Scanner */}
        {mode === "camera" && (
          <Card>
            <CardContent className="p-4">
              <div
                id={scannerDivId}
                className="w-full rounded-lg overflow-hidden"
                style={{ minHeight: 300 }}
              />
              {!scanning && (
                <Button onClick={startScanner} className="w-full mt-3">
                  <Camera className="h-4 w-4 mr-2" /> Start Scanner
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Manual Input */}
        {mode === "manual" && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">QR Code</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter QR code (e.g., EVT-abc12345-...)"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify(qrInput)}
                    className="flex-1"
                  />
                  <Button onClick={() => handleVerify(qrInput)} disabled={verifyMutation.isPending}>
                    {verifyMutation.isPending ? "..." : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Result */}
        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {result.success ? (
              <Card className="border-success/50 bg-success/5">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                    <div>
                      <h3 className="font-bold text-foreground">✅ Verified Successfully</h3>
                      <p className="text-xs text-muted-foreground">Attendee registration confirmed</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 rounded-lg bg-success/10 p-3">
                    <p className="text-sm"><span className="font-medium">Name:</span> {result.data.full_name}</p>
                    <p className="text-sm"><span className="font-medium">Email:</span> {result.data.email}</p>
                    {result.data.phone && (
                      <p className="text-sm"><span className="font-medium">Phone:</span> {result.data.phone}</p>
                    )}
                    <p className="text-sm"><span className="font-medium">Event:</span> {result.data.events?.title}</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-8 w-8 text-destructive" />
                    <div>
                      <h3 className="font-bold text-foreground">❌ Verification Failed</h3>
                      <p className="text-sm text-muted-foreground">{result.error}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default EventScanner;
