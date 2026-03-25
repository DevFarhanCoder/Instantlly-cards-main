import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, Clock, Megaphone, ArrowRight, CheckCircle2, Sparkles, Rocket,
  ChevronRight, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useBusinessCards } from "@/hooks/useBusinessCards";
import { useAuth } from "@/hooks/useAuth";

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  emoji: string;
  action: string;
  route: string;
  completed: boolean;
}

const BusinessOnboarding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cards } = useBusinessCards();
  const [dismissed, setDismissed] = useState(false);
  const [activeStep, setActiveStep] = useState(0);

  // Check localStorage for dismissal
  useEffect(() => {
    const key = `onboarding_dismissed_${user?.id}`;
    if (localStorage.getItem(key) === "true") {
      setDismissed(true);
    }
  }, [user?.id]);

  const hasCard = cards.length > 0;
  const primaryCard = cards[0];

  // We can't easily check business_hours from here, so we track it via localStorage
  const hoursSetKey = `hours_set_${user?.id}`;
  const hoursSet = typeof window !== "undefined" && localStorage.getItem(hoursSetKey) === "true";

  const adCreatedKey = `ad_created_${user?.id}`;
  const adCreated = typeof window !== "undefined" && localStorage.getItem(adCreatedKey) === "true";

  const steps: OnboardingStep[] = [
    {
      id: "card",
      title: "Create Your Business Card",
      subtitle: "Step 1 of 3",
      description: "Set up your digital presence with contact info, services, and location so customers can find you.",
      icon: <CreditCard className="h-6 w-6" />,
      emoji: "📇",
      action: "Create Card",
      route: "/my-cards/create",
      completed: hasCard,
    },
    {
      id: "hours",
      title: "Set Business Hours",
      subtitle: "Step 2 of 3",
      description: "Let customers know when you're available. Set your opening and closing hours for each day.",
      icon: <Clock className="h-6 w-6" />,
      emoji: "🕐",
      action: "Set Hours",
      route: hasCard ? "/business-dashboard" : "/my-cards/create",
      completed: hoursSet,
    },
    {
      id: "ad",
      title: "Run Your First Ad",
      subtitle: "Step 3 of 3",
      description: "Boost your visibility with a banner ad, featured listing, or sponsored card. Reach thousands of customers!",
      icon: <Megaphone className="h-6 w-6" />,
      emoji: "📣",
      action: "Create Ad",
      route: hasCard ? `/ads/create?cardId=${primaryCard?.id || ""}` : "/my-cards/create",
      completed: adCreated,
    },
  ];

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allDone = completedCount === steps.length;

  // Find first incomplete step
  useEffect(() => {
    const firstIncomplete = steps.findIndex((s) => !s.completed);
    if (firstIncomplete >= 0) setActiveStep(firstIncomplete);
  }, [hasCard, hoursSet, adCreated]);

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(`onboarding_dismissed_${user.id}`, "true");
    }
    setDismissed(true);
  };

  // Mark hours as set when user has a card (they'll set hours from dashboard)
  useEffect(() => {
    if (hasCard && user?.id) {
      localStorage.setItem(hoursSetKey, "true");
    }
  }, [hasCard, user?.id]);

  if (dismissed || allDone) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-accent/5 p-5 shadow-sm relative overflow-hidden"
    >
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded-full hover:bg-muted/80 transition-colors"
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Rocket className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
            Quick Start Guide
            <Sparkles className="h-4 w-4 text-warning" />
          </h2>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{steps.length} completed • Get discovered by customers
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <Progress value={progress} className="h-2" />
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const isActive = i === activeStep;
          const isLocked = i > 0 && !steps[i - 1].completed;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <button
                onClick={() => {
                  if (!isLocked) {
                    setActiveStep(i);
                  }
                }}
                disabled={isLocked}
                className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                  step.completed
                    ? "border-success/30 bg-success/5"
                    : isActive
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : isLocked
                    ? "border-border bg-muted/30 opacity-60"
                    : "border-border bg-card hover:border-primary/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Step indicator */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${
                      step.completed
                        ? "bg-success/10"
                        : isActive
                        ? "bg-primary/10"
                        : "bg-muted"
                    }`}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    ) : (
                      <span>{step.emoji}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          step.completed
                            ? "text-success line-through"
                            : "text-foreground"
                        }`}
                      >
                        {step.title}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{step.subtitle}</p>
                  </div>

                  {step.completed ? (
                    <span className="text-[10px] font-semibold text-success px-2 py-0.5 rounded-full bg-success/10">
                      Done ✓
                    </span>
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {/* Expanded content for active step */}
                <AnimatePresence>
                  {isActive && !step.completed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-xs text-muted-foreground mt-3 mb-3 leading-relaxed">
                        {step.description}
                      </p>
                      <Button
                        size="sm"
                        className="w-full gap-2 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(step.route);
                        }}
                      >
                        {step.action} <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Skip link */}
      <button
        onClick={handleDismiss}
        className="mt-3 w-full text-center text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        I'll set this up later →
      </button>
    </motion.div>
  );
};

export default BusinessOnboarding;
