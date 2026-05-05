import { useState, useMemo, useCallback } from "react";
import { Image, Modal, Pressable, ScrollView, Switch, Text, View, KeyboardAvoidingView, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Image as ImageIcon,
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
  useAddEventStaffMutation,
  type CreateTicketTierInput,
} from "../store/api/eventsApi";
import { toast } from "../lib/toast";
import { useColors, useIconColor, useMutedIconColor } from "../theme/colors";
import { API_URL } from "../store/api/baseApi";
import * as SecureStore from "expo-secure-store";

async function uploadEventMedia(uri: string, folder: "logo" | "venue", token: string): Promise<string> {
  const filename = uri.split("/").pop() ?? "image.jpg";
  const ext = filename.split(".").pop() ?? "jpg";
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  const formData = new FormData();
  formData.append("file", { uri, name: filename, type: mimeType } as any);
  const res = await fetch(`${API_URL}/api/uploads/event-media?folder=${folder}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Upload failed");
  const json = await res.json();
  return json.url as string;
}

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
  const cloneFrom = route?.params?.cloneFrom ?? null;
  const { user } = useAuth();
  const { isBusiness } = useUserRole();
  const { selectedPromotion, selectedPromotionId, promotions, selectPromotion } = usePromotionContext();
  const createEvent = useCreateEvent();
  const [createTier, createTierState] = useCreateTicketTierMutation();

  // ── Form state ────────────────────────────────────────────────────────────
  const defaultPromotionId = selectedPromotionId
    ? Number(selectedPromotionId)
    : (cloneFrom?.business_promotion_id ? Number(cloneFrom.business_promotion_id) : 0);
  const defaultOrganizer = selectedPromotion?.business_name || (cloneFrom?.business_promotion?.business_name ?? "");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);

  // ── Team members ────────────────────────────────────────────────────────
  const [addTeam, setAddTeam] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ phone: string; role: 'co_organizer' | 'scanner' }[]>([]);
  const [addStaff] = useAddEventStaffMutation();

  const [basic, setBasic] = useState({
    title: cloneFrom?.title ?? "",
    description: cloneFrom?.description ?? "",
    category: (cloneFrom as any)?.category ?? "",
    venue: cloneFrom?.location ?? (cloneFrom as any)?.venue ?? "",
    date: "",
    end_date: "",
    time: "",
    max_attendees: cloneFrom?.max_attendees ? String(cloneFrom.max_attendees) : "",
    organizer_name: (cloneFrom as any)?.organizer_name ?? defaultOrganizer,
    business_promotion_id: defaultPromotionId,
    company_logo: (cloneFrom as any)?.company_logo ?? "",
    venue_images: (cloneFrom as any)?.venue_images ?? [] as string[],
  });

  // Pre-fill tiers from the cloned event (non-virtual tiers only)
  const clonedTiers: TierDraft[] = cloneFrom?.ticket_tiers
    ?.filter((t: any) => !t.is_virtual)
    .map((t: any, i: number) => ({
      _localId: `clone-tier-${Date.now()}-${i}`,
      name: t.name ?? "",
      price: t.price ?? 0,
      quantity_total: t.quantity_total ?? null,
      min_per_order: t.min_per_order ?? 1,
      max_per_order: t.max_per_order ?? 10,
      sort_order: i,
    })) ?? [];

  const [pricingMode, setPricingMode] = useState<PricingMode>(
    clonedTiers.length > 0 ? "tiered" : "free"
  );
  const [tiers, setTiers] = useState<TierDraft[]>(
    clonedTiers.length > 0
      ? clonedTiers
      : [{ ...newTierDraft(0), name: "General Admission", price: 500 }]
  );

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Recurrence state
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [addAgenda, setAddAgenda] = useState(false);
  const [recurrenceFreq, setRecurrenceFreq] = useState<"weekly" | "monthly">("weekly");
  const [recurrenceDays, setRecurrenceDays] = useState<string[]>([]);
  const [recurrenceEndsAt, setRecurrenceEndsAt] = useState("");
  const [showRecurrenceEndPicker, setShowRecurrenceEndPicker] = useState(false);

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

  const handlePickLogo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { toast.error("Gallery permission required"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    try {
      setUploadingMedia(true);
      const token = await SecureStore.getItemAsync("accessToken");
      const url = await uploadEventMedia(uri, "logo", token ?? "");
      updateBasic("company_logo", url);
    } catch { toast.error("Logo upload failed"); } finally { setUploadingMedia(false); }
  }, [updateBasic]);

  const handlePickVenueImage = useCallback(async () => {
    const current = basic.venue_images as string[];
    const remaining = 5 - current.length;
    if (remaining <= 0) { toast.error("Maximum 5 venue images"); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { toast.error("Gallery permission required"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const assets = result.assets.slice(0, remaining);
    try {
      setUploadingMedia(true);
      const token = await SecureStore.getItemAsync("accessToken");
      const urls: string[] = [];
      for (const a of assets) {
        try { const u = await uploadEventMedia(a.uri, "venue", token ?? ""); urls.push(u); }
        catch { /* skip failed */ }
      }
      if (urls.length === 0) { toast.error("Image upload failed"); return; }
      updateBasic("venue_images", [...current, ...urls]);
      if (urls.length < assets.length) toast.error(`Uploaded ${urls.length} of ${assets.length}`);
    } finally { setUploadingMedia(false); }
  }, [basic.venue_images, updateBasic]);

  const handleRemoveVenueImage = useCallback((idx: number) => {
    updateBasic("venue_images", (basic.venue_images as string[]).filter((_: string, i: number) => i !== idx));
  }, [basic.venue_images, updateBasic]);

  const todayStr = new Date().toISOString().split("T")[0];
  const formattedDate = basic.date
    ? new Date(basic.date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";
  const formattedEndDate = basic.end_date
    ? new Date(basic.end_date + "T00:00:00").toLocaleDateString("en-IN", {
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
    !!basic.category &&
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

      const recurrenceRule = recurrenceEnabled
        ? JSON.stringify({
            freq: recurrenceFreq,
            days: recurrenceFreq === "weekly" ? recurrenceDays : undefined,
            interval: 1,
          })
        : undefined;

      const payload = {
        title: basic.title.trim(),
        description: basic.description.trim() || undefined,
        date: basic.date,
        end_date: basic.end_date || undefined,
        time: basic.time,
        location: basic.venue.trim(),
        ticket_price: headlinePrice,
        max_attendees: basic.max_attendees
          ? parseInt(basic.max_attendees, 10)
          : undefined,
        business_promotion_id: basic.business_promotion_id,
        company_logo: basic.company_logo || undefined,
        venue_images: basic.venue_images.length > 0 ? basic.venue_images : undefined,
        recurrence_rule: recurrenceRule,
        recurrence_ends_at: recurrenceEnabled && recurrenceEndsAt ? recurrenceEndsAt : undefined,
      };
      console.log("[EventCreate] step A — payload:", JSON.stringify(payload));
      const created = await createEvent.mutateAsync(payload);

      // Step B — post tiers (parallel).
      const tierPromise =
        pricingMode === "tiered" && tiers.length > 0
          ? Promise.all(
              tiers.map((t, i) => {
                const tierBody: CreateTicketTierInput = {
                  name: t.name.trim(),
                  description: t.description?.trim() || undefined,
                  price: Number(t.price) || 0,
                  currency: "INR",
                  quantity_total: t.quantity_total == null ? null : Number(t.quantity_total),
                  sort_order: i,
                  min_per_order: t.min_per_order ?? 1,
                  max_per_order: t.max_per_order ?? 10,
                  sale_starts_at: t.sale_starts_at ?? null,
                  sale_ends_at: t.sale_ends_at ?? null,
                  is_active: true,
                };
                return createTier({ eventId: created.id, tier: tierBody }).unwrap();
              })
            )
          : Promise.resolve();

      // Step C — add team members (parallel, best-effort).
      const staffPromise =
        addTeam && teamMembers.length > 0
          ? Promise.allSettled(
              teamMembers
                .filter((m) => m.phone.trim().length >= 10)
                .map((m) =>
                  addStaff({ eventId: created.id, phone: m.phone.trim(), role: m.role }).unwrap()
                )
            ).then((results) => {
              const failed = results.filter((r) => r.status === 'rejected').length;
              if (failed > 0) toast.error(`${failed} team member(s) could not be added`);
            })
          : Promise.resolve();

      toast.success("Event created successfully!");
      if (addAgenda) {
        // Navigate immediately; tiers + staff finish in background.
        navigation.navigate("EventAgendaEdit" as never, { id: created.id } as never);
        await Promise.all([tierPromise, staffPromise]);
      } else {
        await Promise.all([tierPromise, staffPromise]);
        navigation.navigate("MyEvents");
      }
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
    recurrenceEnabled,
    recurrenceFreq,
    recurrenceDays,
    recurrenceEndsAt,
    addTeam,
    teamMembers,
    addStaff,
  ]);

  const goNext = () => {
    if (step === 1 && !step1Valid) {
      setShowErrors(true);
      return;
    }
    if (step === 2 && !step2Valid) {
      toast.error(tierErrors[0] ?? "Please fix tier setup");
      return;
    }
    setShowErrors(false);
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
            {cloneFrom ? "Duplicate Event" : "Create Event"}
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
              const promo = promotions.find((p: any) => p.id === id);
              if (promo?.company_logo) {
                updateBasic("company_logo", promo.company_logo);
              }
              if (name && !basic.organizer_name) {
                updateBasic("organizer_name", name);
              }
            }}
            onClearPromotion={() => {
              selectPromotion(0);
              updateBasic("business_promotion_id", 0);
            }}
            onCreatePromotion={() => navigation.navigate("BusinessPromotionForm" as never)}
            formattedDate={formattedDate}
            formattedEndDate={formattedEndDate}
            formattedTime={formattedTime}
            onPickDate={() => setShowDatePicker(true)}
            onPickEndDate={() => setShowEndDatePicker(true)}
            onPickTime={() => setShowTimePicker(true)}
            onPickLogo={handlePickLogo}
            onPickVenueImage={handlePickVenueImage}
            onRemoveVenueImage={handleRemoveVenueImage}
            showErrors={showErrors}
            recurrenceEnabled={recurrenceEnabled}
            onToggleRecurrence={setRecurrenceEnabled}
            recurrenceFreq={recurrenceFreq}
            onSetRecurrenceFreq={setRecurrenceFreq}
            recurrenceDays={recurrenceDays}
            onToggleRecurrenceDay={(day) =>
              setRecurrenceDays((prev) =>
                prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
              )
            }
            recurrenceEndsAt={recurrenceEndsAt}
            onPickRecurrenceEnd={() => setShowRecurrenceEndPicker(true)}
            addAgenda={addAgenda}
            onToggleAddAgenda={setAddAgenda}
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
          <>
            <Step3Review
              basic={basic}
              formattedDate={formattedDate}
              formattedEndDate={formattedEndDate}
              formattedTime={formattedTime}
              mode={pricingMode}
              tiers={tiers}
              primary={colors.primary}
            />
            <TeamMembersSection
              enabled={addTeam}
              onToggle={setAddTeam}
              members={teamMembers}
              onChange={setTeamMembers}
            />
            <View className="rounded-xl bg-primary/5 border border-primary/30 p-3">
              <Text className="text-xs text-foreground">
                Once you tap <Text className="font-semibold">Create Event</Text>,
                attendees can immediately discover and register.
              </Text>
            </View>
          </>
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
          >
            Continue
          </Button>
        ) : (
          <Button
            className="flex-1 rounded-xl"
            onPress={handleSubmit}
            disabled={
              submitting || createEvent.isPending || createTierState.isLoading || uploadingMedia
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

      {/* End Date Picker */}
      <Modal
        visible={showEndDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            className="absolute inset-0"
            onPress={() => setShowEndDatePicker(false)}
          />
          <View className="mx-3 mb-6 rounded-2xl bg-card border border-border overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
              <Text className="text-base font-bold text-foreground">
                Select End Date
              </Text>
              <Pressable onPress={() => setShowEndDatePicker(false)}>
                <Text className="text-sm font-semibold text-primary">Done</Text>
              </Pressable>
            </View>
            <RNCalendar
              current={basic.end_date || basic.date || todayStr}
              minDate={basic.date || todayStr}
              onDayPress={(day: any) => {
                updateBasic("end_date", day.dateString);
                setShowEndDatePicker(false);
              }}
              markedDates={
                basic.end_date
                  ? {
                      [basic.end_date]: {
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
      {/* Recurrence End Date Picker */}
      <Modal
        visible={showRecurrenceEndPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRecurrenceEndPicker(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable
            className="absolute inset-0"
            onPress={() => setShowRecurrenceEndPicker(false)}
          />
          <View className="mx-3 mb-6 rounded-2xl bg-card border border-border overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
              <Text className="text-base font-bold text-foreground">
                Repeat Until
              </Text>
              <Pressable onPress={() => setShowRecurrenceEndPicker(false)}>
                <Text className="text-sm font-semibold text-primary">Done</Text>
              </Pressable>
            </View>
            <RNCalendar
              current={recurrenceEndsAt || basic.date || todayStr}
              minDate={basic.date || todayStr}
              onDayPress={(day: any) => {
                setRecurrenceEndsAt(day.dateString);
                setShowRecurrenceEndPicker(false);
              }}
              markedDates={
                recurrenceEndsAt
                  ? { [recurrenceEndsAt]: { selected: true, selectedColor: colors.primary } }
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
  onClearPromotion: () => void;
  onCreatePromotion: () => void;
  formattedDate: string;
  formattedEndDate: string;
  formattedTime: string;
  onPickDate: () => void;
  onPickEndDate: () => void;
  onPickTime: () => void;
  onPickLogo: () => void;
  onPickVenueImage: () => void;
  onRemoveVenueImage: (idx: number) => void;
  showErrors?: boolean;
  // Recurrence
  recurrenceEnabled: boolean;
  onToggleRecurrence: (v: boolean) => void;
  recurrenceFreq: "weekly" | "monthly";
  onSetRecurrenceFreq: (v: "weekly" | "monthly") => void;
  recurrenceDays: string[];
  onToggleRecurrenceDay: (day: string) => void;
  recurrenceEndsAt: string;
  onPickRecurrenceEnd: () => void;
  addAgenda: boolean;
  onToggleAddAgenda: (v: boolean) => void;
}

function Step1Basics({
  basic,
  update,
  mutedIcon,
  selectedPromotionName,
  hasPromotion,
  promotions,
  onSelectPromotion,
  onClearPromotion,
  onCreatePromotion,
  formattedDate,
  formattedEndDate,
  formattedTime,
  onPickDate,
  onPickEndDate,
  onPickTime,
  onPickLogo,
  onPickVenueImage,
  onRemoveVenueImage,
  showErrors,
  recurrenceEnabled,
  onToggleRecurrence,
  recurrenceFreq,
  onSetRecurrenceFreq,
  recurrenceDays,
  onToggleRecurrenceDay,
  recurrenceEndsAt,
  onPickRecurrenceEnd,
  addAgenda,
  onToggleAddAgenda,
}: Step1Props) {
  const [changingPromo, setChangingPromo] = useState(false);
  const err = (val: boolean, msg: string) =>
    showErrors && !val ? (
      <Text className="text-xs text-destructive mt-0.5">{msg}</Text>
    ) : null;
  return (
    <>
      <View
        className={`rounded-xl border p-3 gap-2 ${
          hasPromotion && !changingPromo ? "border-border bg-card" : "border-destructive/40 bg-destructive/5"
        }`}
      >
        {hasPromotion && !changingPromo ? (
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-xs text-muted-foreground">Linked promotion</Text>
              <Text className="text-sm font-semibold text-foreground mt-0.5">{selectedPromotionName}</Text>
            </View>
            <Pressable
              onPress={() => setChangingPromo(true)}
              className="ml-3 px-3 py-1.5 rounded-lg border border-border bg-muted"
            >
              <Text className="text-xs font-semibold text-foreground">Change</Text>
            </Pressable>
          </View>
        ) : (
          <Text className="text-xs text-muted-foreground">
            {changingPromo ? "Select a different promotion:" : "Event will be linked to selected promotion."}
          </Text>
        )}
        {(!hasPromotion || changingPromo) ? (
          promotions.length > 0 ? (
            <View className="gap-2">
              {!changingPromo && (
                <Text className="text-xs font-semibold text-destructive">
                  Choose a promoted business to host this event:
                </Text>
              )}
              <View className="gap-1.5">
                {promotions.map((p: any) => {
                  const selected = basic.business_promotion_id === p.id;
                  return (
                    <Pressable
                      key={p.id}
                      onPress={() => {
                        onSelectPromotion(p.id, p.business_name);
                        setChangingPromo(false);
                      }}
                      className={`flex-row items-center gap-3 rounded-xl border px-3 py-2.5 ${
                        selected ? "border-primary bg-primary/5" : "border-border bg-card"
                      }`}
                    >
                      {p.company_logo ? (
                        <Image
                          source={{ uri: p.company_logo }}
                          className="w-8 h-8 rounded-lg"
                          resizeMode="cover"
                        />
                      ) : (
                        <View className="w-8 h-8 rounded-lg bg-muted items-center justify-center">
                          <Text className="text-xs font-bold text-muted-foreground">
                            {(p.business_name?.[0] ?? "B").toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text className={`flex-1 text-sm font-medium ${selected ? "text-primary" : "text-foreground"}`}>
                        {p.business_name || `Promotion #${p.id}`}
                      </Text>
                      {selected && (
                        <View className="w-4 h-4 rounded-full bg-primary items-center justify-center">
                          <Text className="text-[9px] text-white font-bold">✓</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
              {changingPromo && (
                <Pressable onPress={() => setChangingPromo(false)} className="self-start">
                  <Text className="text-xs text-muted-foreground">Cancel</Text>
                </Pressable>
              )}
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
          className={showErrors && !basic.title.trim() ? "border-destructive" : ""}
        />
        {err(!!basic.title.trim(), "Event title is required")}
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
        <Label>Category *</Label>
        <Select
          value={basic.category}
          onValueChange={(v) => update("category", v)}
        >
          <SelectTrigger className={`rounded-xl ${showErrors && !basic.category ? "border-destructive" : ""}`}>
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
        {err(!!basic.category, "Please select a category")}
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-1">
            <Calendar size={14} color={mutedIcon} />
            <Label>Start Date *</Label>
          </View>
          <Pressable
            onPress={onPickDate}
            testID="date-picker-trigger"
            className={`h-10 w-full flex-row items-center rounded-xl border bg-background px-3 ${
              showErrors && !basic.date ? "border-destructive" : "border-input"
            }`}
          >
            <Calendar size={16} color={mutedIcon} />
            <Text
              className={`ml-2 text-sm flex-1 ${
                basic.date ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {formattedDate || "Pick a date"}
            </Text>
          </Pressable>
          {err(!!basic.date, "Start date is required")}
        </View>

        <View className="flex-1 gap-2">
          <View className="flex-row items-center gap-1">
            <Clock size={14} color={mutedIcon} />
            <Label>Time *</Label>
          </View>
          <Pressable
            onPress={onPickTime}
            testID="time-picker-trigger"
            className={`h-10 w-full flex-row items-center rounded-xl border bg-background px-3 ${
              showErrors && !basic.time ? "border-destructive" : "border-input"
            }`}
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
          {err(!!basic.time, "Time is required")}
        </View>
      </View>

      <View className="gap-2">
        <View className="flex-row items-center gap-1">
          <Calendar size={14} color={mutedIcon} />
          <Label>End Date</Label>
        </View>
        <Pressable
          onPress={onPickEndDate}
          testID="end-date-picker-trigger"
          className="h-10 w-full flex-row items-center rounded-xl border border-input bg-background px-3"
        >
          <Calendar size={16} color={mutedIcon} />
          <Text
            className={`ml-2 text-sm flex-1 ${
              basic.end_date ? "text-foreground" : "text-muted-foreground"
            }`}
          >
            {formattedEndDate || "Pick an end date (optional)"}
          </Text>
          {basic.end_date ? (
            <Pressable
              onPress={() => update("end_date", "")}
              hitSlop={8}
            >
              <Text className="text-xs text-muted-foreground">✕</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </View>

      {/* Repeat Event (Recurrence) */}
      <View className="rounded-xl border border-border bg-card p-3 gap-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-semibold text-foreground">Repeat Event</Text>
          </View>
          <Switch
            value={recurrenceEnabled}
            onValueChange={onToggleRecurrence}
          />
        </View>

        {recurrenceEnabled && (
          <>
            {/* Frequency selector */}
            <View className="flex-row gap-2">
              {(["weekly", "monthly"] as const).map((freq) => (
                <Pressable
                  key={freq}
                  onPress={() => onSetRecurrenceFreq(freq)}
                  className={`flex-1 py-2 rounded-xl border items-center ${
                    recurrenceFreq === freq
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background"
                  }`}
                >
                  <Text
                    className={`text-sm font-medium capitalize ${
                      recurrenceFreq === freq ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {freq}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Day chips for weekly */}
            {recurrenceFreq === "weekly" && (
              <View>
                <Text className="text-xs text-muted-foreground mb-2">Repeat on days:</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
                    <Pressable
                      key={day}
                      onPress={() => onToggleRecurrenceDay(day)}
                      className={`px-3 py-1.5 rounded-full border ${
                        recurrenceDays.includes(day)
                          ? "border-primary bg-primary"
                          : "border-border bg-background"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          recurrenceDays.includes(day) ? "text-white" : "text-muted-foreground"
                        }`}
                      >
                        {day}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {recurrenceFreq === "monthly" && (
              <Text className="text-xs text-muted-foreground">
                Repeats on the same day each month.
              </Text>
            )}

            {/* Repeat Until date */}
            <View>
              <Text className="text-xs text-muted-foreground mb-1">Repeat until:</Text>
              <Pressable
                onPress={onPickRecurrenceEnd}
                className="h-10 flex-row items-center rounded-xl border border-input bg-background px-3"
              >
                <Calendar size={16} color="#999" />
                <Text
                  className={`ml-2 text-sm flex-1 ${
                    recurrenceEndsAt ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {recurrenceEndsAt || "Pick end date (required)"}
                </Text>
              </Pressable>
            </View>
          </>
        )}
      </View>

      {/* Add Agenda */}
      <View className="rounded-xl border border-border bg-card p-3 flex-row items-center justify-between">
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-semibold text-foreground">Add Agenda</Text>
          <Text className="text-xs text-muted-foreground">Set up sessions &amp; speakers after creating</Text>
        </View>
        <Switch
          value={addAgenda}
          onValueChange={onToggleAddAgenda}
          trackColor={{ false: "#e2e8f0", true: "#2463eb" }}
          thumbColor="#fff"
        />
      </View>

      <View className="gap-2">
        <Label>Venue *</Label>
        <Input
          placeholder="e.g. Jio Convention Centre, Mumbai"
          value={basic.venue}
          onChangeText={(v) => update("venue", v)}
          className={showErrors && !basic.venue.trim() ? "border-destructive" : ""}
        />
        {err(!!basic.venue.trim(), "Venue is required")}
      </View>

      <View className="gap-2">
        <Label>Organizer Name</Label>
        <Input
          placeholder="e.g. John Doe or Company Name"
          value={basic.organizer_name}
          onChangeText={(v) => update("organizer_name", v)}
        />
      </View>

      {/* Company Logo — fixed display */}
      <View className="gap-2">
        <View className="flex-row items-center gap-1">
          <ImageIcon size={14} color={mutedIcon} />
          <Label>Company Logo</Label>
        </View>
        {basic.company_logo ? (
          <Pressable
            onPress={onPickLogo}
            className="rounded-xl overflow-hidden border border-border"
            style={{ height: 100 }}
          >
            <Image
              source={{ uri: basic.company_logo }}
              style={{ width: "100%", height: 100 }}
              resizeMode="contain"
            />
            <View
              style={{
                position: "absolute", bottom: 6, right: 8,
                backgroundColor: "rgba(0,0,0,0.55)",
                borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>Change</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={onPickLogo}
            className="rounded-xl border-2 border-dashed border-input items-center justify-center gap-1"
            style={{ height: 100 }}
          >
            <ImageIcon size={20} color={mutedIcon} />
            <Text className="text-[10px] text-muted-foreground">Upload Logo</Text>
          </Pressable>
        )}
      </View>

      {/* Venue Images */}
      <View className="gap-2">
        <View className="flex-row items-center gap-1">
          <ImageIcon size={14} color={mutedIcon} />
          <Label>Venue Images (up to 5)</Label>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {(basic.venue_images as string[]).map((uri: string, idx: number) => (
            <View key={idx} className="relative w-24 h-24">
              <Image
                source={{ uri }}
                className="w-24 h-24 rounded-xl"
                resizeMode="cover"
              />
              <Pressable
                onPress={() => onRemoveVenueImage(idx)}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive items-center justify-center"
                hitSlop={8}
              >
                <Text className="text-[10px] text-white font-bold">✕</Text>
              </Pressable>
            </View>
          ))}
          {(basic.venue_images as string[]).length < 5 ? (
            <Pressable
              onPress={onPickVenueImage}
              className="h-24 w-24 rounded-xl border-2 border-dashed border-input items-center justify-center gap-1"
            >
              <Plus size={20} color={mutedIcon} />
              <Text className="text-[10px] text-muted-foreground">Add Image</Text>
            </Pressable>
          ) : null}
        </View>
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
  formattedEndDate: string;
  formattedTime: string;
  mode: PricingMode;
  tiers: TierDraft[];
  primary: string;
}

function Step3Review({
  basic,
  formattedDate,
  formattedEndDate,
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
          label="Starts"
          value={
            formattedDate
              ? `${formattedDate}${formattedTime ? " · " + formattedTime : ""}`
              : "—"
          }
        />
        {formattedEndDate ? (
          <Row label="Ends" value={formattedEndDate} />
        ) : null}
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

// ─── TeamMembersSection ───────────────────────────────────────────────────────

interface TeamMember { phone: string; role: 'co_organizer' | 'scanner' }

function TeamMembersSection({
  enabled,
  onToggle,
  members,
  onChange,
}: {
  enabled: boolean;
  onToggle: (v: boolean) => void;
  members: TeamMember[];
  onChange: (m: TeamMember[]) => void;
}) {
  const addRow = () => onChange([...members, { phone: '', role: 'scanner' }]);
  const removeRow = (i: number) => onChange(members.filter((_, idx) => idx !== i));
  const updateRow = (i: number, patch: Partial<TeamMember>) =>
    onChange(members.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  return (
    <View className="rounded-2xl bg-card border border-border p-4 gap-3">
      {/* Toggle header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Users size={16} color="#2563eb" />
          <Text className="text-sm font-semibold text-foreground">Add Team Members</Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={onToggle}
          trackColor={{ false: "#d1d5db", true: "#93c5fd" }}
          thumbColor={enabled ? "#2563eb" : "#9ca3af"}
        />
      </View>

      {enabled && (
        <View className="gap-3">
          <Text className="text-xs text-muted-foreground">
            Team members will get a push notification after the event is created.
          </Text>

          {members.map((m, i) => (
            <View key={i} className="gap-2">
              {/* Phone + remove */}
              <View className="flex-row gap-2 items-center">
                <Input
                  placeholder="Phone number"
                  value={m.phone}
                  onChangeText={(v) => updateRow(i, { phone: v })}
                  keyboardType="phone-pad"
                  className="flex-1"
                />
                <Pressable onPress={() => removeRow(i)} hitSlop={8}>
                  <Trash2 size={16} color="#ef4444" />
                </Pressable>
              </View>
              {/* Role chips */}
              <View className="flex-row gap-2">
                {(['scanner', 'co_organizer'] as const).map((role) => {
                  const active = m.role === role;
                  const label = role === 'scanner' ? 'Scanner' : 'Co-organizer';
                  return (
                    <Pressable
                      key={role}
                      onPress={() => updateRow(i, { role })}
                      className={`flex-1 py-2 rounded-lg border items-center ${
                        active
                          ? 'bg-primary border-primary'
                          : 'bg-background border-border'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          active ? 'text-primary-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Button variant="outline" onPress={addRow} className="rounded-xl">
            <View className="flex-row items-center gap-2">
              <Plus size={14} color="#2563eb" />
              <Text className="text-sm text-primary">Add Member</Text>
            </View>
          </Button>
        </View>
      )}
    </View>
  );
}

export default EventCreate;
