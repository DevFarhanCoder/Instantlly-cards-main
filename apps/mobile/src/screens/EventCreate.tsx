import { useState, useMemo, useCallback } from "react";
import { Modal, Pressable, ScrollView, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  Plus,
  Ticket,
  Trash2,
  Users,
} from "lucide-react-native";
import { Calendar as RNCalendar } from "react-native-calendars";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";

import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { usePromotionContext } from "../contexts/PromotionContext";
import { useCreateEvent } from "../hooks/useEvents";
import {
  useCreateTicketTierMutation,
  type CreateTicketTierInput,
} from "../store/api/eventsApi";
import { toast } from "../lib/toast";
import { useColors, useIconColor, useMutedIconColor } from "../theme/colors";

/**
 * EventCreate — three-step creation flow.
 *
 *   Step 1: Basic info       (title, description, category, date, time, venue)
 *   Step 2: Ticket setup     (free OR one-or-more priced tiers)
 *   Step 3: Review + Create  (confirm + submit)
 *
 * Submit strategy (server is unchanged):
 *   1. POST /events with the legacy fields. If the user picked "Free" we
 *      send `ticket_price` undefined and stop. If they configured tiers we
 *      send a sentinel `ticket_price = first tier's price` so legacy
 *      consumers still see a sane number, then…
 *   2. For each draft tier, POST /events/:id/tickets. The first such call
 *      flips `is_legacy=false` server-side, so the new tiers immediately
 *      drive both the buyer flow and the analytics.
 *
 * Backward-compat: the form still defaults to "Free event" so legacy
 * organizers see no extra friction.
 */

const eventCategories = [
  "Awards",
  "Conference",
  "Networking",
  "Workshop",
  "Seminar",
  "Exhibition",
  "Concert",
  "Sports",
  "Festival",
  "Other",
];

const timeSlots: string[] = (() => {
  const out: string[] = [];
  for (let h = 6; h < 24; h++) {
    for (const m of ["00", "15", "30", "45"]) {
      out.push(`${String(h).padStart(2, "0")}:${m}`);
    }
  }
  return out;
})();

interface TierDraft extends CreateTicketTierInput {
  /** Local-only id used as React key. Never sent to the server. */
  _localId: string;
}

const newTierDraft = (i: number): TierDraft => ({
  _localId: `tier-${Date.now()}-${i}`,
  name: "",
  price: 0,
  quantity_total: null,
  min_per_order: 1,
  max_per_order: 10,
  sort_order: i,
});

type PricingMode = "free" | "tiered";

const EventCreate = () => {
  const iconColor = useIconColor();
  const mutedIcon = useMutedIconColor();
  const colors = useColors();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const preselectedCardId = route?.params?.cardId || "";
  const { user } = useAuth();
  const { isBusiness } = useUserRole();
  const { selectedPromotion, selectedPromotionId, promotions, selectPromotion } = usePromotionContext();
  const createEvent = useCreateEvent();
  const [createTier, createTierState] = useCreateTicketTierMutation();

  // ── Form state ────────────────────────────────────────────────────────────
  const defaultPromotionId = selectedPromotionId
    ? Number(selectedPromotionId)
    : 0;
  const defaultOrganizer = selectedPromotion?.business_name || "";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  const [basic, setBasic] = useState({
    title: "",
    description: "",
    category: "",
    venue: "",
    date: "",
    time: "",
    max_attendees: "",
    organizer_name: defaultOrganizer,
    business_promotion_id: defaultPromotionId,
  });

  const [pricingMode, setPricingMode] = useState<PricingMode>("free");
  const [tiers, setTiers] = useState<TierDraft[]>([
    { ...newTierDraft(0), name: "General Admission", price: 500 },
  ]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ── Auth / role guard ─────────────────────────────────────────────────────
  if (!isBusiness) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-4xl mb-3">🔒</Text>
        <Text className="text-lg font-bold text-foreground text-center">
          Business Account Required
        </Text>
        <Text className="text-sm text-muted-foreground text-center mt-2">
          You need a business account to create events.
        </Text>
        <Button className="mt-4 rounded-xl" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const updateBasic = useCallback(
    (field: keyof typeof basic, value: any) =>
      setBasic((p) => ({ ...p, [field]: value })),
    [],
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const formattedDate = basic.date
    ? new Date(basic.date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const formattedTime = basic.time
    ? (() => {
        const [hh, mm] = basic.time.split(":");
        const h = parseInt(hh, 10);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${h12}:${mm} ${ampm}`;
      })()
    : "";

  // ── Validation ────────────────────────────────────────────────────────────
  const step1Valid =
    !!basic.title.trim() &&
    !!basic.venue.trim() &&
    !!basic.date &&
    !!basic.time &&
    !!basic.business_promotion_id;

  const tierErrors = useMemo(() => {
    if (pricingMode === "free") return [] as string[];
    const errs: string[] = [];
    if (tiers.length === 0) errs.push("Add at least one tier");
    tiers.forEach((t, i) => {
      const label = t.name?.trim() || `Tier ${i + 1}`;
      if (!t.name?.trim()) errs.push(`${label}: name is required`);
      if (!(t.price >= 0)) errs.push(`${label}: price must be ≥ 0`);
      if (
        t.quantity_total != null &&
        (!Number.isFinite(t.quantity_total) || t.quantity_total < 1)
      )
        errs.push(`${label}: quantity must be ≥ 1 (or empty)`);
      const min = t.min_per_order ?? 1;
      const max = t.max_per_order ?? 10;
      if (min < 1) errs.push(`${label}: min per order must be ≥ 1`);
      if (max < min) errs.push(`${label}: max must be ≥ min`);
    });
    return errs;
  }, [pricingMode, tiers]);

  const step2Valid = tierErrors.length === 0;

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (!user) {
      toast.error("Please sign in");
      navigation.navigate("Auth");
      return;
    }
    if (!step1Valid) {
      setStep(1);
      toast.error("Please complete the basics first");
      return;
    }
    if (!step2Valid) {
      setStep(2);
      toast.error(tierErrors[0] ?? "Please fix tier setup");
      return;
    }

    setSubmitting(true);
    try {
      // Step A — create the event itself.
      const headlinePrice =
        pricingMode === "tiered" && tiers.length > 0
          ? Math.min(...tiers.map((t) => Number(t.price) || 0))
          : undefined;

      const payload = {
        title: basic.title.trim(),
        description: basic.description.trim() || undefined,
        date: basic.date,
        time: basic.time,
        location: basic.venue.trim(),
        ticket_price: headlinePrice,
        max_attendees: basic.max_attendees
          ? parseInt(basic.max_attendees, 10)
          : undefined,
        business_promotion_id: basic.business_promotion_id,
      };
      console.log("[EventCreate] step A — payload:", JSON.stringify(payload));
      const created = await createEvent.mutateAsync(payload);

      // Step B — post each tier.
      if (pricingMode === "tiered" && tiers.length > 0) {
        for (let i = 0; i < tiers.length; i++) {
          const t = tiers[i];
          const tierBody: CreateTicketTierInput = {
            name: t.name.trim(),
            description: t.description?.trim() || undefined,
            price: Number(t.price) || 0,
            currency: "INR",
            quantity_total:
              t.quantity_total == null
                ? null
                : Number(t.quantity_total),
            sort_order: i,
            min_per_order: t.min_per_order ?? 1,
            max_per_order: t.max_per_order ?? 10,
            sale_starts_at: t.sale_starts_at ?? null,
            sale_ends_at: t.sale_ends_at ?? null,
            is_active: true,
          };
          console.log("[EventCreate] step B — tier", i, JSON.stringify(tierBody));
          await createTier({
            eventId: created.id,
            tier: tierBody,
          }).unwrap();
        }
      }

      toast.success("Event created successfully!");
      navigation.navigate("MyEvents");
    } catch (err: any) {
      console.error("[EventCreate] error:", JSON.stringify(err));
      const msg =
        err?.data?.error ||
        err?.data?.errors?.[0]?.msg ||
        err?.message ||
        "Failed to create event";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    user,
    step1Valid,
    step2Valid,
    tierErrors,
    pricingMode,
    tiers,
    basic,
    createEvent,
    createTier,
    navigation,
  ]);

  const goNext = () => {
    if (step === 1 && !step1Valid) {
      toast.error("Please complete the basics first");
      return;
    }
    if (step === 2 && !step2Valid) {
      toast.error(tierErrors[0] ?? "Please fix tier setup");
      return;
    }
    setStep((s) => (s === 3 ? 3 : ((s + 1) as 1 | 2 | 3)));
  };
  const goBack = () => {
    if (step === 1) {
      navigation.goBack();
      return;
    }
    setStep((s) => ((s - 1) as 1 | 2 | 3));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={goBack} hitSlop={10} testID="back-button">
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <View className="flex-1">
          <Text className="text-lg font-bold text-foreground">
            Create Event
          </Text>
          <Text className="text-xs text-muted-foreground">
            Step {step} of 3 ·{" "}
            {step === 1 ? "Basics" : step === 2 ? "Tickets" : "Review"}
          </Text>
        </View>
      </View>

      <Stepper step={step} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 16, paddingTop: 12, gap: 16 }}
        className="px-4"
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 ? (
          <Step1Basics
            basic={basic}
            update={updateBasic}
            iconColor={iconColor}
            mutedIcon={mutedIcon}
            selectedPromotionName={selectedPromotion?.business_name}
            hasPromotion={!!basic.business_promotion_id}
            promotions={promotions}
            onSelectPromotion={(id, name) => {
              selectPromotion(id);
              updateBasic("business_promotion_id", id);
              if (name && !basic.organizer_name) {
                updateBasic("organizer_name", name);
              }
            }}
            onCreatePromotion={() => navigation.navigate("BusinessPromotionForm" as never)}
            formattedDate={formattedDate}
            formattedTime={formattedTime}
            onPickDate={() => setShowDatePicker(true)}
            onPickTime={() => setShowTimePicker(true)}
          />
        ) : step === 2 ? (
          <Step2Tickets
            mode={pricingMode}
            setMode={setPricingMode}
            tiers={tiers}
            setTiers={setTiers}
            errors={tierErrors}
            mutedIcon={mutedIcon}
            primary={colors.primary}
          />
        ) : (
          <Step3Review
            basic={basic}
            formattedDate={formattedDate}
            formattedTime={formattedTime}
            mode={pricingMode}
            tiers={tiers}
            primary={colors.primary}
          />
        )}
      </ScrollView>

      <View className="border-t border-border bg-card px-4 py-3 flex-row gap-2">
        {step > 1 ? (
          <Button
            variant="outline"
            className="flex-1 rounded-xl"
            onPress={goBack}
            disabled={submitting}
          >
            Back
          </Button>
        ) : null}
        {step < 3 ? (
          <Button
            className="flex-1 rounded-xl"
            onPress={goNext}
            disabled={
              (step === 1 && !step1Valid) || (step === 2 && !step2Valid)
            }
          >
            Continue
          </Button>
        ) : (
          <Button
            className="flex-1 rounded-xl"
            onPress={handleSubmit}
            disabled={
              submitting || createEvent.isPending || createTierState.isLoading
            }
          >
            {submitting ? "Creating…" : "Create Event"}
          </Button>
        )}
      </View>

      {/* Date Picker */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            className="absolute inset-0"
            onPress={() => setShowDatePicker(false)}
          />
          <View className="mx-3 mb-6 rounded-2xl bg-card border border-border overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
              <Text className="text-base font-bold text-foreground">
                Select Date
              </Text>
              <Pressable onPress={() => setShowDatePicker(false)}>
                <Text className="text-sm font-semibold text-primary">Done</Text>
              </Pressable>
            </View>
            <RNCalendar
              current={basic.date || todayStr}
              minDate={todayStr}
              onDayPress={(day: any) => {
                updateBasic("date", day.dateString);
                setShowDatePicker(false);
              }}
              markedDates={
                basic.date
                  ? {
                      [basic.date]: {
                        selected: true,
                        selectedColor: colors.primary,
                      },
                    }
                  : {}
              }
              theme={{
                todayTextColor: colors.primary,
                selectedDayBackgroundColor: colors.primary,
                selectedDayTextColor: "#ffffff",
                arrowColor: colors.primary,
                textDayFontSize: 15,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13,
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Time Picker */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            className="absolute inset-0"
            onPress={() => setShowTimePicker(false)}
          />
          <View
            className="mx-3 mb-6 rounded-2xl bg-card border border-border overflow-hidden"
            style={{ maxHeight: "50%" }}
          >
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
              <Text className="text-base font-bold text-foreground">
                Select Time
              </Text>
              <Pressable onPress={() => setShowTimePicker(false)}>
                <Text className="text-sm font-semibold text-primary">Done</Text>
              </Pressable>
            </View>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ padding: 8 }}
            >
              {timeSlots.map((slot) => {
                const [hh, mm] = slot.split(":");
                const h = parseInt(hh, 10);
                const ampm = h >= 12 ? "PM" : "AM";
                const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
                const label = `${h12}:${mm} ${ampm}`;
                const isSelected = basic.time === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => {
                      updateBasic("time", slot);
                      setShowTimePicker(false);
                    }}
                    className={`rounded-lg px-4 py-3 flex-row items-center ${
                      isSelected ? "bg-primary/10" : ""
                    }`}
                  >
                    <Clock
                      size={14}
                      color={isSelected ? colors.primary : mutedIcon}
                    />
                    <Text
                      className={`ml-3 text-sm flex-1 ${
                        isSelected
                          ? "text-primary font-semibold"
                          : "text-foreground"
                      }`}
                    >
                      {label}
                    </Text>
                    {isSelected ? (
                      <Text className="text-primary font-bold">✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function Stepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <View className="flex-row items-center px-4 py-3 gap-2">
      {[1, 2, 3].map((n) => (
        <View key={n} className="flex-1 flex-row items-center gap-2">
          <View
            className={`h-2 flex-1 rounded-full ${
              step >= n ? "bg-primary" : "bg-muted"
            }`}
          />
        </View>
      ))}
    </View>
  );
}

interface Step1Props {
  basic: any;
  update: (field: any, value: any) => void;
  iconColor: string;
  mutedIcon: string;
  selectedPromotionName?: string;
  hasPromotion: boolean;
  promotions: any[];
  onSelectPromotion: (id: number, name?: string) => void;
  onCreatePromotion: () => void;
  formattedDate: string;
  formattedTime: string;
  onPickDate: () => void;
  onPickTime: () => void;
}

function Step1Basics({
  basic,
  update,
  mutedIcon,
  selectedPromotionName,
  hasPromotion,
  promotions,
  onSelectPromotion,
  onCreatePromotion,
  formattedDate,
  formattedTime,
  onPickDate,
  onPickTime,
}: Step1Props) {
  return (
    <>
      <View
        className={`rounded-xl border p-3 gap-2 ${
          hasPromotion ? "border-border bg-card" : "border-destructive/40 bg-destructive/5"
        }`}
      >
        <Text className="text-xs text-muted-foreground">
          Event will be linked to selected promotion
          {selectedPromotionName ? `: ${selectedPromotionName}` : ""}.
        </Text>
        {!hasPromotion ? (
          promotions.length > 0 ? (
            <View className="gap-2">
              <Text className="text-xs font-semibold text-destructive">
                Choose a promoted business to host this event:
              </Text>
              <Select
                value={
                  basic.business_promotion_id
                    ? String(basic.business_promotion_id)
                    : ""
                }
                onValueChange={(v) => {
                  const id = parseInt(v, 10);
                  const promo = promotions.find((p: any) => p.id === id);
                  onSelectPromotion(id, promo?.business_name);
                }}
              >
                <SelectTrigger
                  className="rounded-xl bg-card"
                  testID="promo-select-trigger"
                >
                  <SelectValue placeholder="Select a promoted business" />
                </SelectTrigger>
                <SelectContent>
                  {promotions.map((p: any) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.business_name || `Promotion #${p.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </View>
          ) : (
            <View className="gap-2">
              <Text className="text-xs font-semibold text-destructive">
                You don't have any promoted businesses yet.
              </Text>
              <Pressable
                onPress={onCreatePromotion}
                className="rounded-lg bg-primary px-3 py-2 self-start"
                testID="promo-create-cta"
              >
                <Text className="text-xs font-semibold text-primary-foreground">
                  Promote a business
                </Text>
              </Pressable>
            </View>
          )
        ) : null}
      </View>

      <View className="gap-2">
        <Label>Event Title *</Label>
        <Input
          placeholder="e.g. Digital Marketing Summit 2026"
          value={basic.title}
          onChangeText={(v) => update("title", v)}
        />
      </View>

      <View className="gap-2">
        <Label>Description</Label>
        <Textarea
          placeholder="What's this event about?"
          value={basic.description}
          onChangeText={(v) => update("description", v)}
          rows={3}
        />
      </View>

      <View className="gap-2">
        <Label>Category</Label>
        <Select
          value={basic.category}
          onValueChange={(v) => update("category", v)}
        >
          <SelectTrigger className="rounded-xl">
            <Text
              className={`text-sm ${
                basic.category ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {basic.category || "Select category"}
            </Text>
          </SelectTrigger>
          <SelectContent>
            {eventCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-1">
            <Calendar size={14} color={mutedIcon} />
            <Label>Date *</Label>
          </View>
          <Pressable
            onPress={onPickDate}
            testID="date-picker-trigger"
            className="h-10 w-full flex-row items-center rounded-xl border border-input bg-background px-3"
          >
            <Calendar size={16} color={basic.date ? mutedIcon : mutedIcon} />
            <Text
              className={`ml-2 text-sm flex-1 ${
                basic.date ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {formattedDate || "Pick a date"}
            </Text>
          </Pressable>
        </View>

        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-1">
            <Clock size={14} color={mutedIcon} />
            <Label>Time *</Label>
          </View>
          <Pressable
            onPress={onPickTime}
            testID="time-picker-trigger"
            className="h-10 w-full flex-row items-center rounded-xl border border-input bg-background px-3"
          >
            <Clock size={16} color={mutedIcon} />
            <Text
              className={`ml-2 text-sm flex-1 ${
                basic.time ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {formattedTime || "Pick a time"}
            </Text>
          </Pressable>
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-1">
          <MapPin size={14} color={mutedIcon} />
          <Label>Venue *</Label>
        </View>
        <Input
          placeholder="e.g. Jio Convention Centre, Mumbai"
          value={basic.venue}
          onChangeText={(v) => update("venue", v)}
        />
      </View>

      <View className="gap-2">
        <Label>Organizer Name</Label>
        <Input
          placeholder="e.g. John Doe or Company Name"
          value={basic.organizer_name}
          onChangeText={(v) => update("organizer_name", v)}
        />
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-1">
          <Users size={14} color={mutedIcon} />
          <Label>Max Attendees</Label>
        </View>
        <Input
          placeholder="Leave empty for unlimited"
          value={basic.max_attendees}
          onChangeText={(v) => update("max_attendees", v)}
          keyboardType="number-pad"
        />
      </View>
    </>
  );
}

interface Step2Props {
  mode: PricingMode;
  setMode: (m: PricingMode) => void;
  tiers: TierDraft[];
  setTiers: React.Dispatch<React.SetStateAction<TierDraft[]>>;
  errors: string[];
  mutedIcon: string;
  primary: string;
}

function Step2Tickets({
  mode,
  setMode,
  tiers,
  setTiers,
  errors,
  mutedIcon,
}: Step2Props) {
  const updateTier = (index: number, patch: Partial<TierDraft>) =>
    setTiers((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    );
  const removeTier = (index: number) =>
    setTiers((prev) => prev.filter((_, i) => i !== index));
  const addTier = () =>
    setTiers((prev) => [...prev, newTierDraft(prev.length)]);

  return (
    <>
      {/* Mode toggle */}
      <View className="flex-row gap-2">
        <Pressable
          onPress={() => setMode("free")}
          className={`flex-1 rounded-xl border p-4 ${
            mode === "free"
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <Text className="text-sm font-semibold text-foreground">
            Free Event
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">
            Anyone can register at no cost.
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setMode("tiered")}
          className={`flex-1 rounded-xl border p-4 ${
            mode === "tiered"
              ? "border-primary bg-primary/5"
              : "border-border bg-card"
          }`}
        >
          <Text className="text-sm font-semibold text-foreground">
            Paid Tickets
          </Text>
          <Text className="text-xs text-muted-foreground mt-1">
            Add one or more pricing tiers.
          </Text>
        </Pressable>
      </View>

      {mode === "tiered" ? (
        <>
          {tiers.map((tier, index) => (
            <TicketTierForm
              key={tier._localId}
              index={index}
              tier={tier}
              onChange={(patch) => updateTier(index, patch)}
              onRemove={tiers.length > 1 ? () => removeTier(index) : undefined}
              mutedIcon={mutedIcon}
            />
          ))}

          <Button variant="outline" className="rounded-xl" onPress={addTier}>
            <View className="flex-row items-center gap-2">
              <Plus size={14} color={mutedIcon} />
              <Text className="text-sm font-medium text-foreground">
                Add another tier
              </Text>
            </View>
          </Button>

          {errors.length > 0 ? (
            <View className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 gap-1">
              {errors.map((e, i) => (
                <Text key={i} className="text-xs text-destructive">
                  • {e}
                </Text>
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <View className="rounded-xl border border-border bg-card p-4 gap-2">
          <View className="flex-row items-center gap-2">
            <CheckCircle2 size={16} color="#16a34a" />
            <Text className="text-sm font-semibold text-foreground">
              Free for everyone
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground">
            Attendees can RSVP instantly. You can convert to paid tickets later
            from the organizer dashboard.
          </Text>
        </View>
      )}
    </>
  );
}

interface TicketTierFormProps {
  index: number;
  tier: TierDraft;
  onChange: (patch: Partial<TierDraft>) => void;
  onRemove?: () => void;
  mutedIcon: string;
}

/**
 * TicketTierForm — single tier card. Memo-friendly but exported as a normal
 * function component because the parent passes fresh closures on every
 * render anyway (cheap).
 */
function TicketTierForm({
  index,
  tier,
  onChange,
  onRemove,
  mutedIcon,
}: TicketTierFormProps) {
  return (
    <View className="rounded-xl border border-border bg-card p-4 gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Ticket size={14} color={mutedIcon} />
          <Text className="text-sm font-semibold text-foreground">
            Tier {index + 1}
          </Text>
        </View>
        {onRemove ? (
          <Pressable
            onPress={onRemove}
            accessibilityLabel={`Remove tier ${index + 1}`}
            hitSlop={8}
            className="p-1"
          >
            <Trash2 size={16} color="#dc2626" />
          </Pressable>
        ) : null}
      </View>

      <View className="gap-1">
        <Label>Name *</Label>
        <Input
          placeholder="e.g. Early Bird, VIP, General"
          value={tier.name}
          onChangeText={(v) => onChange({ name: v })}
        />
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1 gap-1">
          <Label>Price (₹) *</Label>
          <Input
            placeholder="500"
            keyboardType="number-pad"
            value={tier.price ? String(tier.price) : ""}
            onChangeText={(v) => onChange({ price: parseInt(v, 10) || 0 })}
          />
        </View>
        <View className="flex-1 gap-1">
          <Label>Quantity</Label>
          <Input
            placeholder="Unlimited"
            keyboardType="number-pad"
            value={
              tier.quantity_total != null ? String(tier.quantity_total) : ""
            }
            onChangeText={(v) =>
              onChange({
                quantity_total: v ? parseInt(v, 10) || 0 : null,
              })
            }
          />
        </View>
      </View>

      <View className="flex-row gap-2">
        <View className="flex-1 gap-1">
          <Label>Min / order</Label>
          <Input
            keyboardType="number-pad"
            value={String(tier.min_per_order ?? 1)}
            onChangeText={(v) =>
              onChange({ min_per_order: parseInt(v, 10) || 1 })
            }
          />
        </View>
        <View className="flex-1 gap-1">
          <Label>Max / order</Label>
          <Input
            keyboardType="number-pad"
            value={String(tier.max_per_order ?? 10)}
            onChangeText={(v) =>
              onChange({ max_per_order: parseInt(v, 10) || 10 })
            }
          />
        </View>
      </View>

      <View className="gap-1">
        <Label>Description</Label>
        <Input
          placeholder="Optional — what's included?"
          value={tier.description ?? ""}
          onChangeText={(v) => onChange({ description: v })}
        />
      </View>
    </View>
  );
}

interface Step3Props {
  basic: any;
  formattedDate: string;
  formattedTime: string;
  mode: PricingMode;
  tiers: TierDraft[];
  primary: string;
}

function Step3Review({
  basic,
  formattedDate,
  formattedTime,
  mode,
  tiers,
}: Step3Props) {
  return (
    <>
      <View className="rounded-xl border border-border bg-card p-4 gap-3">
        <Text className="text-sm font-semibold text-foreground">
          Event Summary
        </Text>
        <Row label="Title" value={basic.title || "—"} />
        {basic.description ? (
          <Row label="Description" value={basic.description} />
        ) : null}
        {basic.category ? <Row label="Category" value={basic.category} /> : null}
        <Row
          label="When"
          value={
            formattedDate
              ? `${formattedDate}${formattedTime ? " · " + formattedTime : ""}`
              : "—"
          }
        />
        <Row label="Where" value={basic.venue || "—"} />
        {basic.max_attendees ? (
          <Row label="Capacity" value={basic.max_attendees} />
        ) : null}
      </View>

      <View className="rounded-xl border border-border bg-card p-4 gap-3">
        <Text className="text-sm font-semibold text-foreground">Tickets</Text>
        {mode === "free" ? (
          <Text className="text-sm text-muted-foreground">
            Free event — anyone can RSVP.
          </Text>
        ) : (
          tiers.map((t, i) => (
            <View
              key={t._localId}
              className="flex-row items-start justify-between gap-3 border-t border-border pt-2 first:border-0 first:pt-0"
            >
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">
                  {t.name || `Tier ${i + 1}`}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  Qty:{" "}
                  {t.quantity_total != null ? t.quantity_total : "Unlimited"} ·
                  min {t.min_per_order ?? 1} · max {t.max_per_order ?? 10}
                </Text>
              </View>
              <Text className="text-sm font-semibold text-primary">
                ₹{t.price}
              </Text>
            </View>
          ))
        )}
      </View>

      <View className="rounded-xl bg-primary/5 border border-primary/30 p-3">
        <Text className="text-xs text-foreground">
          Once you tap <Text className="font-semibold">Create Event</Text>,
          attendees can immediately discover and register.
        </Text>
      </View>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-2">
      <Text className="text-xs text-muted-foreground w-20">{label}</Text>
      <Text className="text-xs text-foreground flex-1">{value}</Text>
    </View>
  );
}

export default EventCreate;
