import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Share2, Gift, Users, Trophy, Crown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useReferrals } from "@/hooks/useReferrals";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";

const customerRewards = [
  { emoji: "🎁", title: "Refer a Friend", desc: "Get ₹50 credit when your friend signs up", target: 1 },
  { emoji: "⭐", title: "5 Referrals", desc: "Unlock Premium badge for 1 month", target: 5 },
  { emoji: "👑", title: "10 Referrals", desc: "Get ₹500 voucher for any service", target: 10 },
  { emoji: "🏆", title: "25 Referrals", desc: "Lifetime VIP status + exclusive deals", target: 25 },
];

const businessRewards = [
  { emoji: "🎁", title: "Refer 1 Business", desc: "Get ₹100 ad credit for your next campaign", target: 1 },
  { emoji: "🚀", title: "Refer 3 Businesses", desc: "Featured listing for 7 days", target: 3 },
  { emoji: "👑", title: "Refer 5 Businesses", desc: "Free Premium plan upgrade for 30 days!", target: 5, highlight: true },
  { emoji: "🏆", title: "Refer 10 Businesses", desc: "Enterprise plan for 30 days + priority support", target: 10 },
];

const ReferAndEarn = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { referralCount, completedCount, totalEarnings } = useReferrals();
  const { isBusiness } = useUserRole();
  const { currentPlan } = useSubscription();

  const referralCode = user?.id ? `REF${user.id.slice(0, 6).toUpperCase()}` : "REF000000";
  const rewards = isBusiness ? businessRewards : customerRewards;
  const nextMilestone = rewards.find((r) => completedCount < r.target);
  const progressToNext = nextMilestone
    ? Math.min((completedCount / nextMilestone.target) * 100, 100)
    : 100;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied!");
  };

  const handleShare = async () => {
    const shareText = isBusiness
      ? `Join me on Instantlly! Use my referral code ${referralCode} to list your business and get ₹100 ad credit!`
      : `Use my referral code ${referralCode} to get ₹50 off your first booking!`;
    const shareData = {
      title: "Join me on Instantlly!",
      text: shareText,
      url: `https://instantlly.lovable.app/auth?ref=${referralCode}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        navigator.clipboard.writeText(shareData.url);
        toast.success("Link copied to clipboard!");
      }
    } catch {
      navigator.clipboard.writeText(shareData.url);
      toast.success("Link copied!");
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Refer & Earn</h1>
        {isBusiness && (
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
            Business
          </span>
        )}
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-5 text-center"
        >
          <span className="text-5xl">{isBusiness ? "🚀" : "🎉"}</span>
          <h2 className="mt-2 text-xl font-bold text-foreground">
            {isBusiness ? "Refer Businesses, Get Upgraded" : "Invite Friends, Earn Rewards"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {isBusiness
              ? "Refer 5 businesses and get a free Premium plan upgrade!"
              : "Share your code and earn ₹50 for every friend who joins"}
          </p>
        </motion.div>

        {/* Business plan upgrade banner */}
        {isBusiness && completedCount < 5 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border-2 border-primary/30 bg-gradient-to-r from-primary/5 to-warning/5 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground flex items-center gap-1">
                  Unlock Premium Free
                  <Sparkles className="h-3.5 w-3.5 text-warning" />
                </p>
                <p className="text-xs text-muted-foreground">
                  {5 - completedCount} more referral{5 - completedCount !== 1 ? "s" : ""} to go!
                </p>
              </div>
              <span className="text-2xl font-bold text-primary">
                {completedCount}/5
              </span>
            </div>
            <Progress value={(completedCount / 5) * 100} className="mt-3 h-2.5" />
          </motion.div>
        )}

        {/* Already upgraded */}
        {isBusiness && completedCount >= 5 && currentPlan === "premium" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-success/30 bg-success/5 p-4 text-center"
          >
            <span className="text-3xl">👑</span>
            <p className="text-sm font-bold text-foreground mt-1">Premium Plan Active!</p>
            <p className="text-xs text-muted-foreground">You earned this by referring 5 businesses. Keep referring for more rewards!</p>
          </motion.div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Users, label: "Referrals", value: referralCount },
            { icon: Gift, label: "Earned", value: `₹${totalEarnings}` },
            { icon: Trophy, label: "Completed", value: completedCount },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl border border-border bg-card p-3 text-center"
            >
              <s.icon className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Referral Code */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Your Referral Code</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-xl bg-muted px-4 py-3 text-center font-mono text-lg font-bold tracking-widest text-foreground">
              {referralCode}
            </div>
            <Button size="icon" variant="outline" onClick={handleCopy} className="rounded-xl shrink-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <Button className="mt-3 w-full rounded-xl" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            {isBusiness ? "Share with Business Owners" : "Share with Friends"}
          </Button>
        </div>

        {/* Next milestone progress */}
        {nextMilestone && (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-foreground">Next: {nextMilestone.title}</p>
              <p className="text-[10px] text-muted-foreground">{completedCount}/{nextMilestone.target}</p>
            </div>
            <Progress value={progressToNext} className="h-1.5" />
          </div>
        )}

        {/* Reward Milestones */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Reward Milestones</h3>
          <div className="space-y-3">
            {rewards.map((r, i) => {
              const achieved = completedCount >= r.target;
              const isHighlight = "highlight" in r && r.highlight;
              return (
                <motion.div
                  key={r.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    achieved
                      ? "border-success/30 bg-success/5"
                      : isHighlight
                      ? "border-primary/40 bg-primary/5 shadow-sm"
                      : "border-border bg-card"
                  }`}
                >
                  <span className="text-2xl">{r.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${isHighlight && !achieved ? "text-primary" : "text-foreground"}`}>
                      {r.title}
                      {isHighlight && !achieved && (
                        <span className="ml-1.5 inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                          FREE UPGRADE
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                  {achieved ? (
                    <span className="text-xs font-bold text-success">✓ Done</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">{r.target} refs</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferAndEarn;
