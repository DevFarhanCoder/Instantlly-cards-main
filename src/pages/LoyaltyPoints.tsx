import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Star, Gift, TrendingUp, Award, Sparkles, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useLoyaltyPoints, useRedeemPoints } from "@/hooks/useLoyaltyPoints";
import { toast } from "sonner";

const pointsRewards = [
  { id: 1, name: "₹50 Off Voucher", points: 200, emoji: "🎫", desc: "Get ₹50 off any service" },
  { id: 2, name: "₹100 Off Voucher", points: 400, emoji: "🎟️", desc: "Get ₹100 off any service" },
  { id: 3, name: "Free Consultation", points: 500, emoji: "💼", desc: "Free 30-min consultation" },
  { id: 4, name: "Premium Badge (7 days)", points: 750, emoji: "👑", desc: "Premium profile badge" },
  { id: 5, name: "₹500 Off Voucher", points: 1000, emoji: "🏆", desc: "Get ₹500 off any service" },
];

const earningRules = [
  { action: "Book an appointment", points: 50, emoji: "📅" },
  { action: "Write a review", points: 25, emoji: "⭐" },
  { action: "Successful referral", points: 100, emoji: "🤝" },
];

const LoyaltyPoints = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { points, transactions, isLoading } = useLoyaltyPoints();
  const redeemMutation = useRedeemPoints();
  const [redeeming, setRedeeming] = useState<number | null>(null);

  const currentPoints = points?.points ?? 0;
  const lifetimePoints = points?.lifetime_points ?? 0;

  const handleRedeem = async (reward: typeof pointsRewards[0]) => {
    if (currentPoints < reward.points) {
      toast.error("Not enough points");
      return;
    }
    setRedeeming(reward.id);
    try {
      const success = await redeemMutation.mutateAsync({
        points: reward.points,
        description: reward.name,
      });
      if (success) {
        toast.success(`Redeemed ${reward.name}!`);
      } else {
        toast.error("Not enough points");
      }
    } catch {
      toast.error("Redemption failed");
    }
    setRedeeming(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-sm text-muted-foreground mb-4">Sign in to view your loyalty points</p>
        <Button onClick={() => navigate("/auth")} className="rounded-xl">Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="text-lg font-bold text-foreground">Loyalty Points</h1>
      </div>

      {/* Points Balance Card */}
      <div className="px-4 pt-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white relative overflow-hidden"
        >
          <div className="absolute top-2 right-2 opacity-20">
            <Sparkles className="h-24 w-24" />
          </div>
          <p className="text-sm font-medium opacity-80">Available Points</p>
          <h2 className="text-4xl font-black mt-1">{currentPoints.toLocaleString()}</h2>
          <div className="flex items-center gap-4 mt-4">
            <div>
              <p className="text-[10px] opacity-70">Lifetime Earned</p>
              <p className="text-sm font-bold">{lifetimePoints.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] opacity-70">Tier</p>
              <p className="text-sm font-bold">{lifetimePoints >= 1000 ? "🏆 Gold" : lifetimePoints >= 500 ? "🥈 Silver" : "🥉 Bronze"}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* How to Earn */}
      <div className="px-4 pt-5">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> How to Earn Points
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {earningRules.map((rule) => (
            <div key={rule.action} className="rounded-xl border border-border bg-card p-3 text-center">
              <span className="text-2xl">{rule.emoji}</span>
              <p className="text-xs font-semibold text-foreground mt-1">+{rule.points}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{rule.action}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Redeem Rewards */}
      <div className="px-4 pt-5">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" /> Redeem Rewards
        </h3>
        <div className="space-y-2">
          {pointsRewards.map((reward, i) => (
            <motion.div
              key={reward.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <span className="text-2xl">{reward.emoji}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-foreground">{reward.name}</h4>
                <p className="text-[10px] text-muted-foreground">{reward.desc}</p>
              </div>
              <Button
                size="sm"
                variant={currentPoints >= reward.points ? "default" : "outline"}
                className="rounded-lg text-xs shrink-0"
                disabled={currentPoints < reward.points || redeeming === reward.id}
                onClick={() => handleRedeem(reward)}
              >
                {reward.points} pts
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="px-4 pt-5">
        <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
          <Award className="h-4 w-4 text-primary" /> Recent Activity
        </h3>
        {transactions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <ShoppingBag className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No points activity yet</p>
            <p className="text-xs text-muted-foreground mt-1">Book services, leave reviews, or refer friends to earn!</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 rounded-xl bg-muted/30 px-3 py-2.5">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${tx.type === "earn" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                  {tx.type === "earn" ? "+" : "-"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{tx.description || tx.source}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <span className={`text-sm font-bold ${tx.type === "earn" ? "text-green-600" : "text-orange-600"}`}>
                  {tx.type === "earn" ? "+" : ""}{tx.points}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoyaltyPoints;
