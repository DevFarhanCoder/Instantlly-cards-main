import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Calendar, ChevronLeft, ChevronRight, Clock, MapPin, Users } from "lucide-react-native";
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
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { useBusinessCards } from "../hooks/useBusinessCards";
import { useCreateEvent } from "../hooks/useEvents";
import { toast } from "../lib/toast";

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

const timeSlots: string[] = [];
for (let h = 6; h < 24; h++) {
  for (const m of ["00", "15", "30", "45"]) {
    const hh = String(h).padStart(2, "0");
    timeSlots.push(`${hh}:${m}`);
  }
}

const EventCreate = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const preselectedCardId = route?.params?.cardId || "";
  const { user } = useAuth();
  const { isBusiness } = useUserRole();
  const { cards } = useBusinessCards();
  const createEvent = useCreateEvent();

  // Block non-business users from accessing this screen
  if (!isBusiness) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-4xl mb-3">🔒</Text>
        <Text className="text-lg font-bold text-foreground text-center">Business Account Required</Text>
        <Text className="text-sm text-muted-foreground text-center mt-2">You need a business account to create events.</Text>
        <Button className="mt-4 rounded-xl" onPress={() => navigation.goBack()}>
          <Text className="text-sm font-medium text-primary-foreground">Go Back</Text>
        </Button>
      </View>
    );
  }

  const defaultCardId = useMemo(() => {
    if (preselectedCardId) return preselectedCardId;
    if (cards.length === 1) return cards[0].id;
    return "";
  }, [preselectedCardId, cards]);

  const defaultOrganizer = useMemo(() => {
    if (!defaultCardId) return "";
    return cards.find((c) => c.id === defaultCardId)?.full_name || "";
  }, [cards, defaultCardId]);

  const [form, setForm] = useState({
    title: "",
    description: "",
    venue: "",
    date: "",
    time: "",
    category: "",
    is_free: true,
    price: 0,
    max_attendees: "",
    business_card_id: defaultCardId,
    organizer_name: defaultOrganizer,
  });

  const selectedCardLabel = useMemo(() => {
    const card = cards.find((c) => c.id === form.business_card_id);
    if (!card) return "";
    return card.full_name + (card.company_name ? ` — ${card.company_name}` : "");
  }, [cards, form.business_card_id]);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const update = (field: string, value: any) =>
    setForm((p) => ({ ...p, [field]: value }));

  const todayStr = new Date().toISOString().split("T")[0];

  const formattedDate = form.date
    ? new Date(form.date + "T00:00:00").toLocaleDateString("en-IN", {
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

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in");
      navigation.navigate("Auth");
      return;
    }
    if (!form.title || !form.venue || !form.date || !form.time) {
      toast.error("Please fill all required fields");
      return;
    }

    const cardId = form.business_card_id || (cards.length > 0 ? cards[0].id : "");
    if (!cardId) {
      toast.error("No business card found. Please create a business card first.");
      return;
    }

    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        date: form.date,
        time: form.time,
        location: form.venue,
        ticket_price: form.is_free ? undefined : form.price,
        max_attendees: form.max_attendees
          ? parseInt(form.max_attendees, 10)
          : undefined,
        business_id: parseInt(String(cardId), 10),
      };
      console.log('[EventCreate] submitting payload:', JSON.stringify(payload));
      await createEvent.mutateAsync(payload);
      toast.success("Event created successfully!");
      navigation.navigate("Events");
    } catch (err: any) {
      console.error('[EventCreate] error:', JSON.stringify(err));
      const msg =
        err?.data?.error ||
        err?.data?.errors?.[0]?.msg ||
        err?.message ||
        "Failed to create event";
      toast.error(msg);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()} testID="back-button">
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Create Event</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16, gap: 16 }} className="px-4 py-5">
        {cards.length > 0 && (
          <View className="gap-2">
            <Label>Link to Business Card</Label>
            <Select
              value={form.business_card_id}
              onValueChange={(v) => update("business_card_id", v)}
            >
              <SelectTrigger className="rounded-xl">
                <Text className={`text-sm ${selectedCardLabel ? "text-foreground" : "text-muted-foreground"}`}>
                  {selectedCardLabel || "Select a business card"}
                </Text>
              </SelectTrigger>
              <SelectContent>
                {cards.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name} {c.company_name ? `— ${c.company_name}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </View>
        )}

        <View className="gap-2">
          <Label>Event Title *</Label>
          <Input
            placeholder="e.g. Digital Marketing Summit 2026"
            value={form.title}
            onChangeText={(v) => update("title", v)}
          />
        </View>

        <View className="gap-2">
          <Label>Description</Label>
          <Textarea
            placeholder="What's this event about?"
            value={form.description}
            onChangeText={(v) => update("description", v)}
            rows={3}
          />
        </View>

        <View className="gap-2">
          <Label>Category</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger className="rounded-xl">
              <Text className={`text-sm ${form.category ? "text-foreground" : "text-muted-foreground"}`}>
                {form.category || "Select category"}
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

        {/* Date Picker */}
        <View className="flex-row gap-3">
          <View className="flex-1 gap-2">
            <Label className="flex-row items-center gap-1">
              <Calendar size={14} color="#6a7181" /> Date *
            </Label>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              testID="date-picker-trigger"
              className="h-10 w-full flex-row items-center rounded-xl border border-input bg-background px-3"
            >
              <Calendar size={16} color={form.date ? "#111827" : "#9aa2b1"} />
              <Text className={`ml-2 text-sm flex-1 ${form.date ? "text-foreground" : "text-muted-foreground"}`}>
                {formattedDate || "Pick a date"}
              </Text>
            </Pressable>
          </View>

          {/* Time Picker */}
          <View className="flex-1 gap-2">
            <Label className="flex-row items-center gap-1">
              <Clock size={14} color="#6a7181" /> Time *
            </Label>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              testID="time-picker-trigger"
              className="h-10 w-full flex-row items-center rounded-xl border border-input bg-background px-3"
            >
              <Clock size={16} color={form.time ? "#111827" : "#9aa2b1"} />
              <Text className={`ml-2 text-sm flex-1 ${form.time ? "text-foreground" : "text-muted-foreground"}`}>
                {formattedTime || "Pick a time"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-2">
          <Label className="flex-row items-center gap-1">
            <MapPin size={14} color="#6a7181" /> Venue *
          </Label>
          <Input
            placeholder="e.g. Jio Convention Centre, Mumbai"
            value={form.venue}
            onChangeText={(v) => update("venue", v)}
          />
        </View>

        <View className="flex-row items-center justify-between rounded-xl border border-border bg-card p-4">
          <View>
            <Text className="text-sm font-medium text-foreground">Free Event</Text>
            <Text className="text-xs text-muted-foreground">
              Toggle off to set a ticket price
            </Text>
          </View>
          <Switch checked={form.is_free} onCheckedChange={(v) => update("is_free", v)} />
        </View>

        {!form.is_free && (
          <View className="gap-2">
            <Label>Ticket Price (₹)</Label>
            <Input
              placeholder="500"
              value={form.price ? String(form.price) : ""}
              onChangeText={(v) => update("price", parseInt(v, 10) || 0)}
              keyboardType="number-pad"
            />
          </View>
        )}

        <View className="gap-2">
          <Label>Organizer Name</Label>
          <Input
            placeholder="e.g. John Doe or Company Name"
            value={form.organizer_name}
            onChangeText={(v) => update("organizer_name", v)}
          />
        </View>

        <View className="gap-2">
          <Label className="flex-row items-center gap-1">
            <Users size={14} color="#6a7181" /> Max Attendees
          </Label>
          <Input
            placeholder="Leave empty for unlimited"
            value={form.max_attendees}
            onChangeText={(v) => update("max_attendees", v)}
            keyboardType="number-pad"
          />
        </View>
      </ScrollView>

      <View className="border-t border-border bg-card px-4 py-3">
        <Button
          className="w-full rounded-xl py-3"
          onPress={handleSubmit}
          disabled={createEvent.isPending}
        >
          {createEvent.isPending ? "Creating..." : "Create Event"}
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
                  ? { [form.date]: { selected: true, selectedColor: "#2563eb" } }
                  : {}
              }
              theme={{
                todayTextColor: "#2563eb",
                selectedDayBackgroundColor: "#2563eb",
                selectedDayTextColor: "#ffffff",
                arrowColor: "#2563eb",
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
          <View className="mx-3 mb-6 rounded-2xl bg-card border border-border overflow-hidden" style={{ maxHeight: "50%" }}>
            <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
              <Text className="text-base font-bold text-foreground">Select Time</Text>
              <Pressable onPress={() => setShowTimePicker(false)}>
                <Text className="text-sm font-semibold text-primary">Done</Text>
              </Pressable>
            </View>
            <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 8 }}>
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
                    className={`rounded-lg px-4 py-3 flex-row items-center ${isSelected ? "bg-primary/10" : ""}`}
                  >
                    <Clock size={14} color={isSelected ? "#2563eb" : "#9aa2b1"} />
                    <Text className={`ml-3 text-sm flex-1 ${isSelected ? "text-primary font-semibold" : "text-foreground"}`}>
                      {label}
                    </Text>
                    {isSelected && (
                      <Text className="text-primary font-bold">{"\u2713"}</Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default EventCreate;
