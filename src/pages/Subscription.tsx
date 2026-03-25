import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    period: "forever",
    icon: "📋",
    highlight: false,
    features: ["Basic listing", "Up to 3 services", "Contact info display", "Standard search ranking"],
    missing: ["Analytics dashboard", "AI insights", "Featured position", "Ad campaigns", "Priority support"],
  },
  {
    id: "basic",
    name: "Basic",
    price: 499,
    period: "/month",
    icon: "⭐",
    highlight: false,
    features: ["Enhanced listing", "Up to 10 services", "Contact + chat", "Better ranking", "Basic analytics"],
    missing: ["AI insights", "Featured position", "Ad campaigns", "Priority support"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 1999,
    period: "/month",
    icon: "👑",
    highlight: true,
    features: ["Premium listing", "Unlimited services", "Full analytics", "AI lead insights", "Featured position", "3 ad campaigns/month"],
    missing: ["Dedicated manager", "Custom branding"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 4999,
    period: "/month",
    icon: "🏆",
    highlight: false,
    features: ["Top-tier listing", "Unlimited everything", "Advanced AI analytics", "Unlimited ad campaigns", "Dedicated account manager", "Custom branding", "API access", "Priority support 24/7"],
    missing: [],
  },
];

const Subscription = () => {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const { user } = useAuth();
  const { currentPlan, subscribe } = useSubscription();

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast.error("Please sign in first");
      navigate("/auth");
      return;
    }
    if (planId === currentPlan) return;
    try {
      await subscribe.mutateAsync({ plan: planId, billing_cycle: billing });
      toast.success(`${plans.find((p) => p.id === planId)?.name} plan activated! 🎉`);
    } catch (err: any) {
      toast.error(err.message || "Failed to subscribe");
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Subscription Plans</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        <div className="flex items-center justify-center gap-2">
          <div className="flex rounded-xl bg-muted p-1">
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={cn(
                  "rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                  billing === b ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                {b === "monthly" ? "Monthly" : "Annual (Save 20%)"}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {plans.map((plan, i) => {
            const price = billing === "annual" && plan.price > 0 ? Math.round(plan.price * 0.8) : plan.price;
            const isCurrent = currentPlan === plan.id;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={cn(
                  "rounded-2xl border p-4 relative overflow-hidden",
                  plan.highlight ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card",
                  isCurrent && "ring-2 ring-primary"
                )}
              >
                {plan.highlight && (
                  <div className="absolute top-0 right-0 rounded-bl-xl bg-primary px-3 py-1 text-[10px] font-bold text-primary-foreground">
                    POPULAR
                  </div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{plan.icon}</span>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-foreground">
                        {price === 0 ? "Free" : `₹${price.toLocaleString()}`}
                      </span>
                      {price > 0 && <span className="text-xs text-muted-foreground">{plan.period}</span>}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 mb-4">
                  {plan.features.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs">
                      <Check className="h-3.5 w-3.5 text-success shrink-0" />
                      <span className="text-foreground">{f}</span>
                    </div>
                  ))}
                  {plan.missing.map((f) => (
                    <div key={f} className="flex items-center gap-2 text-xs">
                      <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </div>
                  ))}
                </div>

                <Button
                  className={cn("w-full rounded-xl", plan.highlight && !isCurrent ? "" : "bg-muted text-foreground hover:bg-muted/80")}
                  variant={plan.highlight && !isCurrent ? "default" : "secondary"}
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={isCurrent || subscribe.isPending}
                >
                  {isCurrent ? "Current Plan ✓" : subscribe.isPending ? "Processing..." : `Choose ${plan.name}`}
                </Button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Subscription;
