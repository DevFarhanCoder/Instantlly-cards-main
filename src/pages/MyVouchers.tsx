import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ticket, Clock, CheckCircle2, Gift, QrCode, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useMyVouchers, useTransferVoucher, useVoucherTransfers, type ClaimedVoucher } from "@/hooks/useVouchers";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  active: { label: "Active", color: "bg-green-500/10 text-green-600", icon: Ticket },
  redeemed: { label: "Redeemed", color: "bg-primary/10 text-primary", icon: CheckCircle2 },
  expired: { label: "Expired", color: "bg-muted text-muted-foreground", icon: Clock },
  transferred: { label: "Transferred", color: "bg-orange-500/10 text-orange-600", icon: Send },
};

const emojiMap: Record<string, string> = {
  travel: "🏖️", beauty: "💆", food: "🍽️", health: "💪",
  shopping: "🛍️", entertainment: "🎬", activities: "🏄", education: "📚", general: "🎁",
};

const tabs = ["All", "Active", "Redeemed", "Expired", "Transfers"];

const MyVouchers = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: claimedVouchers = [], isLoading } = useMyVouchers();
  const { mutate: transferVoucher, isPending: isTransferring } = useTransferVoucher();
  const { data: transfers = [] } = useVoucherTransfers();
  const [activeTab, setActiveTab] = useState("All");
  const [qrVoucher, setQrVoucher] = useState<ClaimedVoucher | null>(null);
  const [transferVoucherTarget, setTransferVoucherTarget] = useState<ClaimedVoucher | null>(null);
  const [transferPhone, setTransferPhone] = useState("");

  const filtered = activeTab === "All"
    ? claimedVouchers
    : activeTab === "Transfers"
    ? claimedVouchers // not used for transfers tab
    : claimedVouchers.filter((v) => v.status === activeTab.toLowerCase());

  const totalSaved = claimedVouchers
    .filter((v) => v.status !== "expired" && v.voucher)
    .reduce((s, v) => s + (v.voucher!.original_price - v.voucher!.discounted_price), 0);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <Gift className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Sign in to view your vouchers</p>
        <Button onClick={() => navigate("/auth")} className="rounded-xl">Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="text-lg font-bold text-foreground">My Vouchers</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total Savings</p>
              <p className="text-2xl font-bold text-foreground">₹{totalSaved.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{claimedVouchers.filter((v) => v.status === "active").length}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{claimedVouchers.filter((v) => v.status === "redeemed").length}</p>
                <p className="text-[10px] text-muted-foreground">Used</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn("flex-1 rounded-lg py-2 text-xs font-medium transition-colors",
                activeTab === tab ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Transfers" ? (
          /* Transfer History */
          transfers.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <Send className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No transfer history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((t, i) => {
                const isSent = t.sender_id === user?.id;
                return (
                  <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("flex h-10 w-10 items-center justify-center rounded-full shrink-0",
                        isSent ? "bg-destructive/10" : "bg-primary/10")}>
                        <Send className={cn("h-4 w-4", isSent ? "text-destructive rotate-0" : "text-primary rotate-180")} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {isSent ? "Sent" : "Received"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isSent ? `To: ${t.recipient_phone || "Unknown"}` : `From: ${t.sender_phone || "Unknown"}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className={cn("border-none text-[10px]", isSent ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary")}>
                          {isSent ? "Sent" : "Received"}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(t.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        ) : isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <Gift className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No vouchers found</p>
            <Button variant="outline" className="mt-3" onClick={() => navigate("/vouchers")}>Browse Vouchers</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((v, i) => {
              const config = statusConfig[v.status] || statusConfig.active;
              const StatusIcon = config.icon;
              const voucher = v.voucher;
              return (
                <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-2xl shrink-0">
                        {emojiMap[voucher?.category || "general"] || "🎁"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-semibold text-foreground line-clamp-1">{voucher?.title || "Voucher"}</h3>
                          <Badge className={cn("border-none text-[10px] shrink-0", config.color)}>
                            <StatusIcon className="h-3 w-3 mr-0.5" /> {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{voucher?.subtitle}</p>
                      </div>
                    </div>

                    {v.status === "active" && (
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Voucher Code</p>
                          <p className="text-sm font-mono font-bold text-foreground">{v.code}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="text-xs rounded-lg" onClick={() => setQrVoucher(v)}>
                            <QrCode className="h-3.5 w-3.5 mr-1" /> QR
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs rounded-lg" onClick={() => { navigator.clipboard.writeText(v.code); toast.success("Code copied!"); }}>
                            Copy
                          </Button>
                          <Button size="sm" variant="outline" className="text-xs rounded-lg" onClick={() => { setTransferVoucherTarget(v); setTransferPhone(""); }}>
                            <Send className="h-3.5 w-3.5 mr-1" /> Transfer
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Purchased: {format(new Date(v.purchased_at), "MMM d, yyyy")}</span>
                      {voucher?.expires_at && <span>Expires: {format(new Date(voucher.expires_at), "MMM d, yyyy")}</span>}
                    </div>
                  </div>

                  {v.status === "active" && voucher && (
                    <div className="border-t border-dashed border-border bg-primary/5 px-4 py-2.5 text-center">
                      <p className="text-xs font-medium text-primary">You saved ₹{(voucher.original_price - voucher.discounted_price).toLocaleString()}!</p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!qrVoucher} onOpenChange={(open) => !open && setQrVoucher(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader><DialogTitle>Redeem Voucher</DialogTitle></DialogHeader>
          {qrVoucher && (
            <div className="flex flex-col items-center py-4">
              <QRCodeSVG value={`instantly://voucher/${qrVoucher.voucher_id}/redeem/${qrVoucher.code}`} size={160} />
              <p className="mt-3 text-sm font-mono font-bold text-foreground">{qrVoucher.code}</p>
              <p className="mt-1 text-xs text-muted-foreground">Show this QR to the merchant</p>
            </div>
          )}
          <Button className="w-full rounded-xl" onClick={() => setQrVoucher(null)}>Done</Button>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={!!transferVoucherTarget} onOpenChange={(open) => !open && setTransferVoucherTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transfer Voucher</DialogTitle>
            <DialogDescription>Send this voucher to another user by their mobile number.</DialogDescription>
          </DialogHeader>
          {transferVoucherTarget && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-semibold text-foreground">{transferVoucherTarget.voucher?.title || "Voucher"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Code: {transferVoucherTarget.code}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Recipient Mobile Number</label>
                <Input
                  type="tel"
                  placeholder="Enter 10-digit mobile number"
                  value={transferPhone}
                  onChange={(e) => setTransferPhone(e.target.value)}
                  className="rounded-lg"
                  maxLength={10}
                />
              </div>
              <Button
                className="w-full rounded-xl"
                disabled={transferPhone.replace(/\D/g, "").length < 10 || isTransferring}
                onClick={() => {
                  transferVoucher(
                    { claimedVoucherId: transferVoucherTarget.id, recipientPhone: transferPhone.trim() },
                    { onSuccess: () => setTransferVoucherTarget(null) }
                  );
                }}
              >
                {isTransferring ? "Transferring..." : "Transfer Voucher"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyVouchers;
