import { useState, useCallback, useMemo } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as SecureStore from "expo-secure-store";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Image as ImageIcon,
  MapPin,
  Plus,
  Ticket,
  Trash2,
  Users,
} from "lucide-react-native";
import { Calendar as RNCalendar } from "react-native-calendars";
import { PageLoader } from "../components/ui/page-loader";
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
import {
  useGetEventQuery,
  useUpdateEventMutation,
  useCreateTicketTierMutation,
  useUpdateTicketTierMutation,
  useDeleteTicketTierMutation,
  type AppTicketTier,
} from "../store/api/eventsApi";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../lib/toast";
import { useColors, useIconColor, useMutedIconColor } from "../theme/colors";
import { API_URL } from "../store/api/baseApi";

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

const eventCategories = [
  "Awards", "Conference", "Networking", "Workshop",
  "Seminar", "Exhibition", "Concert", "Sports", "Festival", "Other",
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

interface TierDraft {
  _localId: string;
  serverId?: number;
  name: string;
  price: number;
  quantity_total: number | null;
  min_per_order: number;
  max_per_order: number;
  is_active: boolean;
  deleted?: boolean;
}

const EventEdit = () => {
  const iconColor = useIconColor();
  const mutedIcon = useMutedIconColor();
  const colors = useColors();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id;
  const numericId = typeof id === "string" ? parseInt(id, 10) : id;
  const { user } = useAuth();

  const { data: event, isLoading } = useGetEventQuery(numericId, { skip: !numericId });
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const [createTier] = useCreateTicketTierMutation();
  const [updateTierMutation] = useUpdateTicketTierMutation();
  const [deleteTierMutation] = useDeleteTicketTierMutation();

  const [initialized, setInitialized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    venue: "",
    date: "",
    end_date: "",
    time: "",
    max_attendees: "",
    status: "active",
    company_logo: "",
    venue_images: [] as string[],
  });

  const [tiers, setTiers] = useState<TierDraft[]>([]);

  if (event && !initialized) {
    const serverTiers: AppTicketTier[] = Array.isArray(event.ticket_tiers)
      ? event.ticket_tiers.filter((t: AppTicketTier) => !t.is_virtual)
      : [];
    setForm({
      title: event.title || "",
      description: event.description || "",
      category: (event as any).category || "",
      venue: event.location || "",
      date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
      end_date: event.end_date ? new Date(event.end_date).toISOString().split("T")[0] : "",
      time: event.time || "",
      max_attendees: event.max_attendees ? String(event.max_attendees) : "",
      status: event.status || "active",
      company_logo: (event as any).company_logo || "",
      venue_images: Array.isArray((event as any).venue_images) ? (event as any).venue_images : [],
    });
    setTiers(
      serverTiers.map((t) => ({
        _localId: `tier-${t.id}`,
        serverId: t.id ?? undefined,
        name: t.name,
        price: t.price,
        quantity_total: t.quantity_total ?? null,
        min_per_order: t.min_per_order ?? 1,
        max_per_order: t.max_per_order ?? 10,
        is_active: t.is_active ?? true,
      }))
    );
    setInitialized(true);
  }

  const update = useCallback(
    (field: string, value: any) => setForm((p) => ({ ...p, [field]: value })),
    []
  );

  const handlePickLogo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { toast.error("Gallery permission required"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    try {
      setUploadingMedia(true);
      const token = await SecureStore.getItemAsync("accessToken");
      const url = await uploadEventMedia(uri, "logo", token ?? "");
      update("company_logo", url);
    } catch { toast.error("Logo upload failed"); } finally { setUploadingMedia(false); }
  }, [update]);

  const handlePickVenueImage = useCallback(async () => {
    const current = form.venue_images as string[];
    const remaining = 5 - current.length;
    if (remaining <= 0) { toast.error("Maximum 5 venue images"); return; }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") { toast.error("Gallery permission required"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, allowsMultipleSelection: true, selectionLimit: remaining, quality: 0.8 });
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
      update("venue_images", [...current, ...urls]);
      if (urls.length < assets.length) toast.error(`Uploaded ${urls.length} of ${assets.length}`);
    } finally { setUploadingMedia(false); }
  }, [form.venue_images, update]);

  const handleRemoveVenueImage = useCallback((idx: number) => {
    update("venue_images", (form.venue_images as string[]).filter((_: string, i: number) => i !== idx));
  }, [form.venue_images, update]);

  const todayStr = new Date().toISOString().split("T")[0];

  const formattedDate = form.date
    ? new Date(form.date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const formattedEndDate = form.end_date
    ? new Date(form.end_date + "T00:00:00").toLocaleDateString("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const formattedTime = form.time
    ? (() => {
        const [hh, mm] = form.time.split(":");
        const h = parseInt(hh, 10);
        const ampm = h >= 12 ? "PM" : "AM";
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${h12}:${mm} ${ampm}`;
      })()
    : "";

  const activeTiers = tiers.filter((t) => !t.deleted);

  const tierErrors = useMemo(() => {
    const errs: string[] = [];
    activeTiers.forEach((t, i) => {
      const label = t.name?.trim() || `Tier ${i + 1}`;
      if (!t.name?.trim()) errs.push(`${label}: name required`);
      if (!(t.price >= 0)) errs.push(`${label}: price must be ≥ 0`);
    });
    return errs;
  }, [activeTiers]);

  const formValid =
    !!form.title.trim() &&
    !!form.venue.trim() &&
    !!form.category &&
    !!form.date &&
    !!form.time &&
    tierErrors.length === 0;

  const handleSubmit = useCallback(async () => {
    if (submitting || !user) return;
    if (!formValid) {
      setShowErrors(true);
      return;
    }
    setSubmitting(true);
    try {
      const updatePayload = {
        id: numericId,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        date: form.date,
        end_date: form.end_date || undefined,
        time: form.time,
        location: form.venue.trim(),
        max_attendees: form.max_attendees ? parseInt(form.max_attendees, 10) : undefined,
        status: form.status,
        company_logo: form.company_logo || undefined,
        venue_images: (form.venue_images as string[]).length > 0 ? form.venue_images : undefined,
      };
      console.log("[EventEdit] updatePayload:", JSON.stringify(updatePayload));
      await updateEvent(updatePayload).unwrap();

      for (const t of tiers) {
        if (t.deleted && t.serverId) {
          await deleteTierMutation({ eventId: numericId, tierId: t.serverId }).unwrap();
        } else if (!t.deleted && t.serverId) {
          await updateTierMutation({
            eventId: numericId,
            tierId: t.serverId,
            tier: {
              name: t.name.trim(),
              price: t.price,
              quantity_total: t.quantity_total,
              min_per_order: t.min_per_order,
              max_per_order: t.max_per_order,
              is_active: t.is_active,
            },
          }).unwrap();
        } else if (!t.deleted && !t.serverId) {
          await createTier({
            eventId: numericId,
            tier: {
              name: t.name.trim(),
              price: t.price,
              currency: "INR",
              quantity_total: t.quantity_total,
              min_per_order: t.min_per_order,
              max_per_order: t.max_per_order,
              sort_order: activeTiers.indexOf(t),
              is_active: true,
            },
          }).unwrap();
        }
      }

      toast.success("Event updated!");
      navigation.goBack();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to update event");
    } finally {
      setSubmitting(false);
    }
  }, [
    submitting,
    user,
    formValid,
    form,
    tiers,
    numericId,
    activeTiers,
    updateEvent,
    createTier,
    updateTierMutation,
    deleteTierMutation,
    navigation,
  ]);

  const addTier = () =>
    setTiers((prev) => [
      ...prev,
      {
        _localId: `new-${Date.now()}`,
        name: "",
        price: 0,
        quantity_total: null,
        min_per_order: 1,
        max_per_order: 10,
        is_active: true,
      },
    ]);

  const updateTierField = (localId: string, patch: Partial<TierDraft>) =>
    setTiers((prev) =>
      prev.map((t) => (t._localId === localId ? { ...t, ...patch } : t))
    );

  const removeTier = (localId: string) =>
    setTiers((prev) =>
      prev
        .map((t) => (t._localId === localId ? { ...t, deleted: true } : t))
        .filter((t) => !(t.deleted && !t.serverId))
    );

  if (isLoading) return <PageLoader />;

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-5xl mb-3">😕</Text>
        <Text className="text-sm text-muted-foreground">Event not found</Text>
        <Button className="mt-4" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      {/* Header */}
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground flex-1">Edit Event</Text>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: 24,
          paddingHorizontal: 16,
          paddingTop: 16,
          gap: 16,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View className="gap-2">
          <Label>Event Title *</Label>
          <Input
            placeholder="e.g. Digital Marketing Summit 2026"
            value={form.title}
            onChangeText={(v) => update("title", v)}
            className={showErrors && !form.title.trim() ? "border-destructive" : ""}
          />
          {showErrors && !form.title.trim() ? (
            <Text className="text-xs text-destructive">Event title is required</Text>
          ) : null}
        </View>

        {/* Description */}
        <View className="gap-2">
          <Label>Description</Label>
          <Textarea
            placeholder="What's this event about?"
            value={form.description}
            onChangeText={(v) => update("description", v)}
            rows={3}
          />
        </View>

        {/* Category */}
        <View className="gap-2">
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger className={`rounded-xl ${showErrors && !form.category ? "border-destructive" : ""}`}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {eventCategories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {showErrors && !form.category ? (
            <Text className="text-xs text-destructive">Please select a category</Text>
          ) : null}
        </View>

        {/* Date & Time */}
        <View className="flex-row gap-3">
          <View className="flex-1 gap-2">
            <View className="flex-row items-center gap-1">
              <Calendar size={14} color={mutedIcon} />
              <Label>Start Date *</Label>
            </View>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className={`h-10 w-full flex-row items-center rounded-xl border bg-background px-3 ${
                showErrors && !form.date ? "border-destructive" : "border-input"
              }`}
            >
              <Calendar size={16} color={mutedIcon} />
              <Text
                className={`ml-2 text-sm flex-1 ${form.date ? "text-foreground" : "text-muted-foreground"}`}
              >
                {formattedDate || "Pick a date"}
              </Text>
            </Pressable>
            {showErrors && !form.date ? (
              <Text className="text-xs text-destructive">Start date is required</Text>
            ) : null}
          </View>
          <View className="flex-1 gap-2">
            <View className="flex-row items-center gap-1">
              <Clock size={14} color={mutedIcon} />
              <Label>Time *</Label>
            </View>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              className={`h-10 w-full flex-row items-center rounded-xl border bg-background px-3 ${
                showErrors && !form.time ? "border-destructive" : "border-input"
              }`}
            >
              <Clock size={16} color={mutedIcon} />
              <Text
                className={`ml-2 text-sm flex-1 ${form.time ? "text-foreground" : "text-muted-foreground"}`}
              >
                {formattedTime || "Pick a time"}
              </Text>
            </Pressable>
            {showErrors && !form.time ? (
              <Text className="text-xs text-destructive">Time is required</Text>
            ) : null}
          </View>
        </View>

        {/* End Date */}
        <View className="gap-2">
          <View className="flex-row items-center gap-1">
            <Calendar size={14} color={mutedIcon} />
            <Label>End Date</Label>
          </View>
          <Pressable
            onPress={() => setShowEndDatePicker(true)}
            className="h-10 w-full flex-row items-center rounded-xl border border-input bg-background px-3"
          >
            <Calendar size={16} color={mutedIcon} />
            <Text
              className={`ml-2 text-sm flex-1 ${form.end_date ? "text-foreground" : "text-muted-foreground"}`}
            >
              {formattedEndDate || "Pick an end date (optional)"}
            </Text>
            {form.end_date ? (
              <Pressable onPress={() => update("end_date", "")} hitSlop={8}>
                <Text className="text-xs text-muted-foreground">✕</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </View>

        {/* Venue */}
        <View className="gap-2">
          <Label>Venue *</Label>
          <Input
            placeholder="e.g. Jio Convention Centre, Mumbai"
            value={form.venue}
            onChangeText={(v) => update("venue", v)}
            className={showErrors && !form.venue.trim() ? "border-destructive" : ""}
          />
          {showErrors && !form.venue.trim() ? (
            <Text className="text-xs text-destructive">Venue is required</Text>
          ) : null}
        </View>

        {/* Max Attendees */}
        <View className="gap-2">
          <View className="flex-row items-center gap-1">
            <Users size={14} color={mutedIcon} />
            <Label>Max Attendees</Label>
          </View>
          <Input
            placeholder="Leave empty for unlimited"
            value={form.max_attendees}
            onChangeText={(v) => update("max_attendees", v)}
            keyboardType="number-pad"
          />
        </View>

        {/* Company Logo */}
        <View className="gap-2">
          <View className="flex-row items-center gap-1">
            <ImageIcon size={14} color={mutedIcon} />
            <Label>Company Logo</Label>
          </View>
          {form.company_logo ? (
            <View className="relative w-24 h-24">
              <Image source={{ uri: form.company_logo }} className="w-24 h-24 rounded-xl" resizeMode="cover" />
              <Pressable
                onPress={() => update("company_logo", "")}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive items-center justify-center"
                hitSlop={8}
              >
                <Text className="text-[10px] text-white font-bold">✕</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={handlePickLogo}
              className="h-24 w-24 rounded-xl border-2 border-dashed border-input items-center justify-center gap-1"
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
            {(form.venue_images as string[]).map((uri: string, idx: number) => (
              <View key={idx} className="relative w-24 h-24">
                <Image source={{ uri }} className="w-24 h-24 rounded-xl" resizeMode="cover" />
                <Pressable
                  onPress={() => handleRemoveVenueImage(idx)}
                  className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive items-center justify-center"
                  hitSlop={8}
                >
                  <Text className="text-[10px] text-white font-bold">✕</Text>
                </Pressable>
              </View>
            ))}
            {(form.venue_images as string[]).length < 5 ? (
              <Pressable
                onPress={handlePickVenueImage}
                className="h-24 w-24 rounded-xl border-2 border-dashed border-input items-center justify-center gap-1"
              >
                <Plus size={20} color={mutedIcon} />
                <Text className="text-[10px] text-muted-foreground">Add Image</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Status */}
        <View className="gap-2">
          <Label>Status</Label>
          <View className="flex-row gap-2">
            {["active", "cancelled", "completed"].map((s) => (
              <Pressable
                key={s}
                onPress={() => update("status", s)}
                className={`flex-1 items-center py-2.5 rounded-xl border ${
                  form.status === s
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    form.status === s ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Ticket Tiers */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ticket size={16} color={colors.primary} />
              <Text className="text-base font-bold text-foreground">Ticket Tiers</Text>
            </View>
            <Pressable
              onPress={addTier}
              className="flex-row items-center gap-1 rounded-lg bg-primary/10 px-3 py-1.5"
            >
              <Plus size={14} color={colors.primary} />
              <Text className="text-xs font-semibold text-primary">Add Tier</Text>
            </Pressable>
          </View>

          {activeTiers.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border p-4 items-center">
              <Text className="text-sm text-muted-foreground">
                No tiers — tap "Add Tier" to create one
              </Text>
            </View>
          ) : (
            activeTiers.map((t, i) => (
              <View
                key={t._localId}
                className="rounded-xl border border-border bg-card p-4 gap-3"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-foreground">Tier {i + 1}</Text>
                  <Pressable onPress={() => removeTier(t._localId)} hitSlop={8}>
                    <Trash2 size={16} color="#ef4444" />
                  </Pressable>
                </View>
                <View className="gap-2">
                  <Label>Tier Name *</Label>
                  <Input
                    placeholder="e.g. VIP, General Admission"
                    value={t.name}
                    onChangeText={(v) => updateTierField(t._localId, { name: v })}
                  />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1 gap-2">
                    <Label>Price (₹)</Label>
                    <Input
                      placeholder="0"
                      value={String(t.price)}
                      onChangeText={(v) =>
                        updateTierField(t._localId, { price: parseFloat(v) || 0 })
                      }
                      keyboardType="number-pad"
                    />
                  </View>
                  <View className="flex-1 gap-2">
                    <Label>Capacity</Label>
                    <Input
                      placeholder="Unlimited"
                      value={t.quantity_total != null ? String(t.quantity_total) : ""}
                      onChangeText={(v) =>
                        updateTierField(t._localId, {
                          quantity_total: v ? parseInt(v, 10) : null,
                        })
                      }
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
                <Pressable
                  onPress={() => updateTierField(t._localId, { is_active: !t.is_active })}
                  className={`self-start flex-row items-center gap-2 rounded-lg px-3 py-1.5 border ${
                    t.is_active
                      ? "bg-success/10 border-success/30"
                      : "bg-muted border-border"
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      t.is_active ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {t.is_active ? "Active" : "Inactive"}
                  </Text>
                </Pressable>
              </View>
            ))
          )}

          {tierErrors.length > 0 && (
            <Text className="text-xs text-destructive">{tierErrors[0]}</Text>
          )}
        </View>
      </ScrollView>

      {/* Footer */}
      <View className="border-t border-border bg-card px-4 py-3">
        <Button
          className="w-full rounded-xl"
          onPress={handleSubmit}
          disabled={submitting || isUpdating || uploadingMedia}
        >
          {submitting || isUpdating ? "Saving…" : "Save Changes"}
        </Button>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="absolute inset-0" onPress={() => setShowDatePicker(false)} />
          <View className="mx-3 mb-6 rounded-2xl bg-card border border-border overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
              <Text className="text-base font-bold text-foreground">Select Date</Text>
              <Pressable onPress={() => setShowDatePicker(false)}>
                <Text className="text-sm font-semibold text-primary">Done</Text>
              </Pressable>
            </View>
            <RNCalendar
              current={form.date || todayStr}
              minDate={todayStr}
              onDayPress={(day: any) => {
                update("date", day.dateString);
                setShowDatePicker(false);
              }}
              markedDates={
                form.date
                  ? { [form.date]: { selected: true, selectedColor: colors.primary } }
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

      {/* End Date Picker Modal */}
      <Modal
        visible={showEndDatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEndDatePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="absolute inset-0" onPress={() => setShowEndDatePicker(false)} />
          <View className="mx-3 mb-6 rounded-2xl bg-card border border-border overflow-hidden">
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
              <Text className="text-base font-bold text-foreground">Select End Date</Text>
              <Pressable onPress={() => setShowEndDatePicker(false)}>
                <Text className="text-sm font-semibold text-primary">Done</Text>
              </Pressable>
            </View>
            <RNCalendar
              current={form.end_date || form.date || todayStr}
              minDate={form.date || todayStr}
              onDayPress={(day: any) => {
                update("end_date", day.dateString);
                setShowEndDatePicker(false);
              }}
              markedDates={
                form.end_date
                  ? { [form.end_date]: { selected: true, selectedColor: colors.primary } }
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

      {/* Time Picker Modal */}
      <Modal
        visible={showTimePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <Pressable className="absolute inset-0" onPress={() => setShowTimePicker(false)} />
          <View
            className="mx-3 mb-6 rounded-2xl bg-card border border-border overflow-hidden"
            style={{ maxHeight: "50%" }}
          >
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
              <Text className="text-base font-bold text-foreground">Select Time</Text>
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
                const isSelected = form.time === slot;
                return (
                  <Pressable
                    key={slot}
                    onPress={() => {
                      update("time", slot);
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
                    {isSelected && (
                      <Text className="text-primary font-bold">✓</Text>
                    )}
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

export default EventEdit;
