import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Rocket,
  Sparkles,
  X,
} from "lucide-react-native";
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { useBusinessCards } from "../../hooks/useBusinessCards";
import { useAuth } from "../../hooks/useAuth";

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  emoji: string;
  action: string;
  route: string;
  completed: boolean;
}

const BusinessOnboarding = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { cards } = useBusinessCards();
  const [dismissed, setDismissed] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [hoursSet, setHoursSet] = useState(false);
  const [adCreated, setAdCreated] = useState(false);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const key = `onboarding_dismissed_${userId}`;
    AsyncStorage.getItem(key).then((val) => {
      if (val === "true") setDismissed(true);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const hoursKey = `hours_set_${userId}`;
    const adKey = `ad_created_${userId}`;
    AsyncStorage.getItem(hoursKey).then((val) => setHoursSet(val === "true"));
    AsyncStorage.getItem(adKey).then((val) => setAdCreated(val === "true"));
  }, [userId]);

  const hasCard = cards.length > 0;
  const primaryCard = cards[0];

  useEffect(() => {
    if (!hasCard || !userId) return;
    const hoursKey = `hours_set_${userId}`;
    AsyncStorage.setItem(hoursKey, "true").catch(() => {});
    setHoursSet(true);
  }, [hasCard, userId]);

  const steps: OnboardingStep[] = useMemo(
    () => [
      {
        id: "card",
        title: "Create Your Business Card",
        subtitle: "Step 1 of 3",
        description:
          "Set up your digital presence with contact info, services, and location so customers can find you.",
        emoji: "📇",
        action: "Create Card",
        route: "CardCreate",
        completed: hasCard,
      },
      {
        id: "hours",
        title: "Set Business Hours",
        subtitle: "Step 2 of 3",
        description:
          "Let customers know when you're available. Set your opening and closing hours for each day.",
        emoji: "🕐",
        action: "Set Hours",
        route: hasCard ? "BusinessDashboard" : "CardCreate",
        completed: hoursSet,
      },
      {
        id: "ad",
        title: "Run Your First Ad",
        subtitle: "Step 3 of 3",
        description:
          "Boost your visibility with a banner ad, featured listing, or sponsored card. Reach thousands of customers!",
        emoji: "📣",
        action: "Create Ad",
        route: "AdCreate",
        completed: adCreated,
      },
    ],
    [hasCard, hoursSet, adCreated]
  );

  const completedCount = steps.filter((s) => s.completed).length;
  const progress = (completedCount / steps.length) * 100;
  const allDone = completedCount === steps.length;

  useEffect(() => {
    const firstIncomplete = steps.findIndex((s) => !s.completed);
    if (firstIncomplete >= 0) setActiveStep(firstIncomplete);
  }, [steps]);

  const handleDismiss = () => {
    if (userId) {
      AsyncStorage.setItem(`onboarding_dismissed_${userId}`, "true").catch(() => {});
    }
    setDismissed(true);
  };

  if (dismissed || allDone) return null;

  return (
    <View className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 shadow-sm relative overflow-hidden">
      <Pressable
        onPress={handleDismiss}
        className="absolute right-3 top-3 rounded-full p-1"
      >
        <X size={16} color="#6a7181" />
      </Pressable>

      <View className="mb-4 flex-row items-center gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
          <Rocket size={22} color="#2463eb" />
        </View>
        <View>
          <Text className="text-base font-bold text-foreground">
            Quick Start Guide{" "}
            <Sparkles size={14} color="#f59f0a" />
          </Text>
          <Text className="text-xs text-muted-foreground">
            {completedCount}/{steps.length} completed • Get discovered by customers
          </Text>
        </View>
      </View>

      <View className="mb-5">
        <Progress value={progress} />
      </View>

      <View className="gap-3">
        {steps.map((step, i) => {
          const isActive = i === activeStep;
          const isLocked = i > 0 && !steps[i - 1].completed;
          const isCompleted = step.completed;

          return (
            <Pressable
              key={step.id}
              onPress={() => {
                if (!isLocked) setActiveStep(i);
              }}
              disabled={isLocked}
              className={`
                w-full rounded-xl border p-3.5
                ${isCompleted ? "border-success/30 bg-success/5" : ""}
                ${!isCompleted && isActive ? "border-primary/40 bg-primary/5" : ""}
                ${!isCompleted && !isActive && isLocked ? "border-border bg-muted/30 opacity-60" : ""}
                ${!isCompleted && !isActive && !isLocked ? "border-border bg-card" : ""}
              `}
            >
              <View className="flex-row items-center gap-3">
                <View
                  className={`h-10 w-10 items-center justify-center rounded-xl ${
                    isCompleted
                      ? "bg-success/10"
                      : isActive
                      ? "bg-primary/10"
                      : "bg-muted"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={18} color="#28af60" />
                  ) : (
                    <Text className="text-lg">{step.emoji}</Text>
                  )}
                </View>

                <View className="flex-1">
                  <Text
                    className={`text-sm font-semibold ${
                      isCompleted ? "text-success line-through" : "text-foreground"
                    }`}
                  >
                    {step.title}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">
                    {step.subtitle}
                  </Text>
                </View>

                {isCompleted ? (
                  <Text className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">
                    Done ✓
                  </Text>
                ) : (
                  <ChevronRight size={16} color="#6a7181" />
                )}
              </View>

              {isActive && !isCompleted && (
                <View className="mt-3">
                  <Text className="mb-3 text-xs text-muted-foreground">
                    {step.description}
                  </Text>
                  <Button
                    size="sm"
                    className="w-full rounded-xl"
                    onPress={() => navigation.navigate(step.route, step.id === "ad" ? { cardId: primaryCard?.id } : undefined)}
                  >
                    {step.action} <ArrowRight size={14} color="#ffffff" />
                  </Button>
                </View>
              )}
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={handleDismiss} className="mt-3">
        <Text className="text-center text-[11px] text-muted-foreground">
          I'll set this up later →
        </Text>
      </Pressable>
    </View>
  );
};

export default BusinessOnboarding;
