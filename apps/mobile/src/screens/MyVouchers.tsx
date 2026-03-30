import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, CheckCircle2, Clock, Gift, QrCode, Send, Ticket } from "lucide-react-native";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useAuth } from "../hooks/useAuth";
import {
  useMyVouchers,
  useTransferVoucher,
  useVoucherTransfers,
  type ClaimedVoucher,
} from "../hooks/useVouchers";
import { toast } from "../lib/toast";
import QRCode from "react-native-qrcode-svg";
import { format } from "date-fns";
import * as Clipboard from "expo-clipboard";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Active", color: "bg-green-500/10 text-green-600", icon: Ticket },
  redeemed: { label: "Redeemed", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground", icon: Clock },
};

const emojiMap: Record<string, string> = {
  travel: "🏖️",
  beauty: "💆",
  food: "🍽️",
  health: "💪",
  shopping: "🛍️",
  entertainment: "🎬",
  activities: "🏄",
  education: "📚",
  general: "🎁",
};

const tabs = ["All", "Active", "Redeemed", "Expired", "Transfers"];

const MyVouchers = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { data: claimedVouchers = [], isLoading } = useMyVouchers();
  const { mutate: transferVoucher, isPending: isTransferring } = useTransferVoucher();
  const { data: transfers = [] } = useVoucherTransfers();
  const [activeTab, setActiveTab] = useState("All");
  const [qrVoucher, setQrVoucher] = useState<ClaimedVoucher | null>(null);
  const [transferVoucherTarget, setTransferVoucherTarget] = useState<ClaimedVoucher | null>(null);
  const [transferPhone, setTransferPhone] = useState("");

  const filtered =
    activeTab === "All"
      ? claimedVouchers
      : activeTab === "Transfers"
      ? claimedVouchers
      : claimedVouchers.filter((v) => v.status === activeTab.toLowerCase());

  const totalSaved = claimedVouchers
    .filter((v) => v.status !== "expired" && v.voucher)
    .reduce(
      (s, v) => s + (v.voucher!.original_price - v.voucher!.discounted_price),
      0
    );

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Gift size={48} color="#6a7181" />
        <Text className="mt-3 text-sm text-muted-foreground">
          Sign in to view your vouchers
        </Text>
        <Button className="mt-4 rounded-xl" onPress={() => navigation.navigate("Auth")}>
          Sign In
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-4">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">My Vouchers</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="px-4 py-4 gap-4">
          <View className="rounded-2xl border border-border bg-primary/5 p-4">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-xs text-muted-foreground">Total Savings</Text>
                <Text className="text-2xl font-bold text-foreground">
                  ₹{totalSaved.toLocaleString()}
                </Text>
              </View>
              <View className="flex-row gap-3">
                <View className="items-center">
                  <Text className="text-lg font-bold text-foreground">
                    {claimedVouchers.filter((v) => v.status === "active").length}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">Active</Text>
                </View>
                <View className="items-center">
                  <Text className="text-lg font-bold text-foreground">
                    {claimedVouchers.filter((v) => v.status === "redeemed").length}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">Used</Text>
                </View>
              </View>
            </View>
          </View>

          <View className="flex-row gap-2">
            {tabs.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`flex-1 rounded-lg py-2 ${
                  activeTab === tab ? "bg-primary" : "bg-muted"
                }`}
              >
                <Text
                  className={`text-center text-xs font-medium ${
                    activeTab === tab ? "text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>

          {activeTab === "Transfers" ? (
            transfers.length === 0 ? (
              <View className="items-center py-16">
                <Send size={48} color="#6a7181" />
                <Text className="mt-3 text-sm text-muted-foreground">
                  No transfer history
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {transfers.map((t) => {
                  const isSent = String(t.sender_id) === String(user?.id ?? "");
                  return (
                    <View
                      key={t.id}
                      className="rounded-xl border border-border bg-card p-4"
                    >
                      <View className="flex-row items-center gap-3">
                        <View
                          className={`h-10 w-10 items-center justify-center rounded-full ${
                            isSent ? "bg-destructive/10" : "bg-primary/10"
                          }`}
                        >
                          <Send
                            size={16}
                            color={isSent ? "#ef4343" : "#2463eb"}
                            style={{ transform: [{ rotate: isSent ? "0deg" : "180deg" }] }}
                          />
                        </View>
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-foreground">
                            {isSent ? "Sent" : "Received"}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {isSent
                              ? `To: ${t.recipient_phone || "Unknown"}`
                              : `From: ${t.sender_phone || "Unknown"}`}
                          </Text>
                        </View>
                        <View className="items-end">
                          <Badge
                            className={`border-none text-[10px] ${
                              isSent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isSent ? "Sent" : "Received"}
                          </Badge>
                          <Text className="mt-1 text-[10px] text-muted-foreground">
                            {format(new Date(t.created_at), "MMM d, yyyy")}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )
          ) : isLoading ? (
            <View className="gap-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </View>
          ) : filtered.length === 0 ? (
            <View className="items-center py-16">
              <Gift size={48} color="#6a7181" />
              <Text className="mt-3 text-sm text-muted-foreground">
                No vouchers found
              </Text>
              <Button
                variant="outline"
                className="mt-3"
                onPress={() => navigation.navigate("Vouchers")}
              >
                Browse Vouchers
              </Button>
            </View>
          ) : (
            <View className="gap-3">
              {filtered.map((v) => {
                const config = statusConfig[v.status] || statusConfig.active;
                const StatusIcon = config.icon;
                const voucher = v.voucher;
                const iconColor =
                  v.status === "active"
                    ? "#28af60"
                    : v.status === "redeemed"
                    ? "#2463eb"
                    : "#6a7181";
                return (
                  <View
                    key={v.id}
                    className="overflow-hidden rounded-xl border border-border bg-card"
                  >
                    <View className="p-4">
                      <View className="flex-row items-start gap-3">
                        <View className="h-12 w-12 items-center justify-center rounded-xl bg-muted">
                          <Text className="text-2xl">
                            {emojiMap[voucher?.category || "general"] || "🎁"}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-start justify-between gap-2">
                            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                              {voucher?.title || "Voucher"}
                            </Text>
                            <Badge className={`border-none text-[10px] ${config.color}`}>
                              <StatusIcon size={12} color={iconColor} /> {config.label}
                            </Badge>
                          </View>
                          <Text className="mt-0.5 text-xs text-muted-foreground">
                            {voucher?.subtitle}
                          </Text>
                        </View>
                      </View>

                      {v.status === "active" && (
                        <View className="mt-3 rounded-lg bg-muted px-3 py-2">
                          <View className="flex-row items-center justify-between">
                            <View>
                              <Text className="text-[10px] text-muted-foreground">Voucher Code</Text>
                              <Text className="text-sm font-mono font-bold text-foreground">
                                {v.code}
                              </Text>
                            </View>
                            <View className="flex-row gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                onPress={() => setQrVoucher(v)}
                              >
                                <QrCode size={14} color="#111827" /> QR
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                onPress={async () => {
                                  await Clipboard.setStringAsync(v.code);
                                  toast.success("Code copied!");
                                }}
                              >
                                Copy
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                onPress={() => {
                                  setTransferVoucherTarget(v);
                                  setTransferPhone("");
                                }}
                              >
                                <Send size={14} color="#111827" /> Transfer
                              </Button>
                            </View>
                          </View>
                        </View>
                      )}

                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-[10px] text-muted-foreground">
                          Purchased: {format(new Date(v.purchased_at), "MMM d, yyyy")}
                        </Text>
                        {voucher?.expires_at && (
                          <Text className="text-[10px] text-muted-foreground">
                            Expires: {format(new Date(voucher.expires_at), "MMM d, yyyy")}
                          </Text>
                        )}
                      </View>
                    </View>

                    {v.status === "active" && voucher && (
                      <View className="border-t border-dashed border-border bg-primary/5 px-4 py-2.5">
                        <Text className="text-center text-xs font-medium text-primary">
                          You saved ₹{(voucher.original_price - voucher.discounted_price).toLocaleString()}!
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <Dialog open={!!qrVoucher} onOpenChange={(open) => !open && setQrVoucher(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Redeem Voucher</DialogTitle>
          </DialogHeader>
          {qrVoucher && (
            <View className="items-center py-4">
              <QRCode
                value={`instantly://voucher/${qrVoucher.voucher_id}/redeem/${qrVoucher.code}`}
                size={160}
              />
              <Text className="mt-3 text-sm font-mono font-bold text-foreground">
                {qrVoucher.code}
              </Text>
              <Text className="mt-1 text-xs text-muted-foreground">
                Show this QR to the merchant
              </Text>
            </View>
          )}
          <Button className="w-full rounded-xl" onPress={() => setQrVoucher(null)}>
            Done
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!transferVoucherTarget}
        onOpenChange={(open) => !open && setTransferVoucherTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer Voucher</DialogTitle>
            <DialogDescription>
              Send this voucher to another user by their mobile number.
            </DialogDescription>
          </DialogHeader>
          {transferVoucherTarget && (
            <View className="gap-4 py-2">
              <View className="rounded-lg bg-muted p-3">
                <Text className="text-sm font-semibold text-foreground">
                  {transferVoucherTarget.voucher?.title || "Voucher"}
                </Text>
                <Text className="mt-0.5 text-xs text-muted-foreground">
                  Code: {transferVoucherTarget.code}
                </Text>
              </View>
              <View className="gap-2">
                <Text className="text-sm font-medium text-foreground">
                  Recipient Mobile Number
                </Text>
                <Input
                  placeholder="Enter 10-digit mobile number"
                  value={transferPhone}
                  onChangeText={setTransferPhone}
                  keyboardType="phone-pad"
                  className="rounded-lg"
                  maxLength={10}
                />
              </View>
              <Button
                className="w-full rounded-xl"
                disabled={transferPhone.replace(/\D/g, "").length < 10 || isTransferring}
                onPress={() => {
                  transferVoucher(
                    { voucherId: transferVoucherTarget.voucher_id, recipientPhone: transferPhone.trim() },
                    { onSuccess: () => setTransferVoucherTarget(null) }
                  );
                }}
              >
                {isTransferring ? "Transferring..." : "Transfer Voucher"}
              </Button>
            </View>
          )}
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default MyVouchers;

