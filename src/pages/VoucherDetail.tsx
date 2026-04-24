import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Share2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useVoucher, useClaimVoucher } from "@/hooks/useVouchers";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { differenceInDays } from "date-fns";

const emojiMap: Record<string, string> = {
  travel: "🏖️", beauty: "💆", food: "🍽️", health: "💪",
  shopping: "🛍️", entertainment: "🎬", activities: "🏄", education: "📚", general: "🎁",
};

const VoucherDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: voucher, isLoading } = useVoucher(id || "");
  const claimVoucher = useClaimVoucher();
  const [showPurchase, setShowPurchase] = useState(false);
  const [showRedemption, setShowRedemption] = useState(false);
  const [claimedCode, setClaimedCode] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen px-4 py-20 space-y-4">
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    );
  }

  if (!voucher) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <span className="text-5xl mb-3">🔍</span>
        <p className="text-muted-foreground">Voucher not found</p>
        <Button variant="link" onClick={() => navigate(-1)}>Go back</Button>
      </div>
    );
  }

  const savings = voucher.original_price - voucher.discounted_price;
  const expiryDays = voucher.expires_at ? differenceInDays(new Date(voucher.expires_at), new Date()) : null;
  const expiryLabel = expiryDays === null ? "No expiry" : expiryDays < 0 ? "Expired" : expiryDays === 0 ? "Expires today" : `${expiryDays} days left`;

  const handlePurchase = async () => {
    if (!user) {
      toast.error("Please sign in first");
      navigate("/auth");
      return;
    }
    try {
      const result = await claimVoucher.mutateAsync(voucher.id);
      setClaimedCode(result.code);
      setShowPurchase(false);
      setShowRedemption(true);
    } catch (e: any) {
      // error toast is handled by useClaimVoucher hook
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="text-lg font-bold text-foreground">Voucher Details</h1>
        <button><Share2 className="h-5 w-5 text-muted-foreground" /></button>
      </div>

      <div className="px-4 py-5 space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative rounded-2xl bg-muted h-48 flex items-center justify-center overflow-hidden">
          <span className="text-7xl">{emojiMap[voucher.category] || "🎁"}</span>
          {voucher.discount_label && (
            <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-none text-sm px-3 py-1">{voucher.discount_label}</Badge>
          )}
          <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-background/80 px-3 py-1 text-xs font-medium text-foreground backdrop-blur-sm">
            <Clock className="h-3 w-3" /> {expiryLabel}
          </div>
        </motion.div>

        <div>
          <h2 className="text-xl font-bold text-foreground">{voucher.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{voucher.subtitle}</p>
          <div className="mt-3 flex items-center gap-3">
            <span className="text-2xl font-bold text-primary">₹{voucher.discounted_price.toLocaleString()}</span>
            <span className="text-lg text-muted-foreground line-through">₹{voucher.original_price.toLocaleString()}</span>
            <Badge className="bg-green-500/10 text-green-600 border-none">Save ₹{savings.toLocaleString()}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "✅", label: "Instant Delivery" },
            { icon: "🔄", label: "Easy Refund" },
            { icon: "📱", label: "Mobile Voucher" },
            { icon: "🎉", label: "Gift Ready" },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3">
              <span>{f.icon}</span>
              <span className="text-xs font-medium text-foreground">{f.label}</span>
            </div>
          ))}
        </div>

        {voucher.terms && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Terms & Conditions</h3>
            </div>
            <p className="text-xs text-muted-foreground whitespace-pre-line">{voucher.terms}</p>
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">How to Redeem</h3>
          <ol className="space-y-2 text-xs text-muted-foreground list-decimal list-inside">
            <li>Purchase the voucher</li>
            <li>Receive voucher code via app</li>
            <li>Show the QR code at the merchant</li>
            <li>Enjoy your discount!</li>
          </ol>
        </div>
      </div>

      <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card px-4 py-3">
        <Button className="w-full gap-2 rounded-xl py-6 text-base" onClick={() => setShowPurchase(true)} disabled={claimVoucher.isPending || (expiryDays !== null && expiryDays < 0)}>
          {expiryDays !== null && expiryDays < 0 ? "Voucher Expired" : `Buy Now — ₹${voucher.discounted_price.toLocaleString()}`}
        </Button>
      </div>

      <Dialog open={showPurchase} onOpenChange={setShowPurchase}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You're about to purchase <strong>{voucher.title}</strong> for <strong>₹{voucher.discounted_price.toLocaleString()}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-muted p-3 flex items-center justify-between">
            <span className="text-sm text-foreground font-medium">Total</span>
            <span className="text-lg font-bold text-primary">₹{voucher.discounted_price.toLocaleString()}</span>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button className="w-full rounded-xl py-5" onClick={handlePurchase} disabled={claimVoucher.isPending}>
              {claimVoucher.isPending ? "Processing..." : "Confirm & Pay"}
            </Button>
            <Button variant="outline" className="w-full rounded-xl" onClick={() => setShowPurchase(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRedemption} onOpenChange={setShowRedemption}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>Your Voucher is Ready!</DialogTitle>
            <DialogDescription>Show this QR code at the merchant to redeem your voucher.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <QRCodeSVG value={`instantly://voucher/${voucher.id}/redeem/${claimedCode}`} size={160} />
            <p className="mt-3 text-sm font-mono font-bold text-foreground">CODE: {claimedCode}</p>
            <p className="mt-1 text-xs text-muted-foreground">Valid until expiry</p>
          </div>
          <Button className="w-full rounded-xl" onClick={() => { setShowRedemption(false); navigate("/my-vouchers"); }}>View My Vouchers</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VoucherDetail;
