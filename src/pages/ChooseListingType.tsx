import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Rocket, Building2, CheckCircle2, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const listingPlans = [
  {
    id: "free",
    name: "Free Business Listing",
    subtitle: "Perfect for getting started",
    icon: <Building2 className="h-7 w-7 text-primary" />,
    recommended: false,
    features: [
      "Online business presence",
      "Trust building with customers",
      "Upload photos & details",
      "Organic discovery in listings",
    ],
    cta: "Continue with Free",
  },
  {
    id: "premium",
    name: "Premium Business Listing",
    subtitle: "Maximize your business growth",
    icon: <Rocket className="h-7 w-7 text-primary" />,
    recommended: true,
    features: [
      "Higher ranking than competitors",
      "Increased customer visibility",
      "Direct customer leads (call / enquiry)",
      "Performance insights & analytics",
    ],
    cta: "Go Premium",
  },
];

const trustPoints = [
  {
    icon: <Shield className="h-8 w-8 text-emerald-500" />,
    title: "Secure & Trusted",
    desc: "Your business information is protected and verified",
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: "Reach More Customers",
    desc: "Connect with thousands of potential customers actively searching",
  },
];

const ChooseListingType = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const handleContinue = () => {
    navigate("/my-cards/create", { state: { plan: selected } });
  };

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Choose Listing Type</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {listingPlans.map((plan) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: plan.id === "premium" ? 0.1 : 0 }}
          >
            <button
              onClick={() => setSelected(plan.id)}
              className={`relative w-full text-left rounded-2xl border-2 p-5 transition-all ${
                selected === plan.id
                  ? plan.id === "premium"
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-accent bg-accent/5 shadow-md"
                  : "border-border bg-card"
              }`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-[11px] font-bold text-primary-foreground">
                    ⭐ RECOMMENDED
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  {plan.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">{plan.subtitle}</p>
                </div>
                <div
                  className={`mt-1 h-5 w-5 rounded-full border-2 transition-all ${
                    selected === plan.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/40"
                  }`}
                >
                  {selected === plan.id && (
                    <div className="flex h-full w-full items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </div>
              </div>

              <div className="my-4 border-t border-border" />

              <div className="space-y-3">
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <CheckCircle2
                      className={`h-5 w-5 shrink-0 ${
                        plan.id === "premium" ? "text-primary" : "text-accent"
                      }`}
                    />
                    <span className="text-sm text-foreground">{f}</span>
                  </div>
                ))}
              </div>

              <Button
                variant="outline"
                className={`mt-5 w-full gap-2 rounded-xl border-2 py-5 font-semibold ${
                  plan.id === "premium"
                    ? "border-primary text-primary hover:bg-primary/5"
                    : "border-accent text-accent-foreground hover:bg-accent/5"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(plan.id);
                  navigate("/my-cards/create", { state: { plan: plan.id } });
                }}
              >
                {plan.cta} <ArrowRight className="h-4 w-4" />
              </Button>
            </button>
          </motion.div>
        ))}

        {/* Separator */}
        <div className="flex items-center gap-3 pt-6 pb-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Boost with Ads</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Ad Formats */}
        <div>
          <p className="text-sm text-muted-foreground mb-3">Choose your ad format</p>
          <div className="space-y-3">
            {[
              { emoji: "🖼️", name: "Banner Ad", desc: "Display across Home, Events & Vouchers pages" },
              { emoji: "⭐", name: "Featured Listing", desc: "Appear at the top of category & search results" },
              { emoji: "💳", name: "Sponsored Card", desc: "Promoted business card in the directory" },
            ].map((ad) => (
              <div
                key={ad.name}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => navigate("/ads/create")}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl">
                  {ad.emoji}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{ad.name}</h4>
                  <p className="text-xs text-muted-foreground">{ad.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trust Points */}
        <div className="space-y-3 pt-2">
          {trustPoints.map((tp) => (
            <div key={tp.title} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
              {tp.icon}
              <div>
                <h4 className="text-sm font-bold text-foreground">{tp.title}</h4>
                <p className="text-xs text-muted-foreground">{tp.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fixed bottom CTA */}
      {selected && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-20 left-0 right-0 border-t border-border bg-card px-4 py-3"
        >
          <Button className="w-full gap-2 rounded-xl py-6" onClick={handleContinue}>
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default ChooseListingType;
