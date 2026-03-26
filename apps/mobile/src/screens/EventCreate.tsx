import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Calendar, Clock, MapPin, Users } from "lucide-react-native";
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
import { Switch } from "../components/ui/switch";
import { useAuth } from "../hooks/useAuth";
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

const EventCreate = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const preselectedCardId = route?.params?.cardId || "";
  const { user } = useAuth();
  const { cards } = useBusinessCards();
  const createEvent = useCreateEvent();

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

  const update = (field: string, value: any) =>
    setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in");
      navigation.navigate("Auth");
      return;
    }
    if (!form.title || !form.venue || !form.date || !form.time || !form.category) {
      toast.error("Please fill all required fields");
      return;
    }
    await createEvent.mutateAsync({
      title: form.title,
      description: form.description || undefined,
      venue: form.venue,
      date: form.date,
      time: form.time,
      category: form.category,
      is_free: form.is_free,
      price: form.is_free ? 0 : form.price,
      max_attendees: form.max_attendees
        ? parseInt(form.max_attendees, 10)
        : undefined,
      business_card_id: form.business_card_id || undefined,
      organizer_name: form.organizer_name || undefined,
    });
    navigation.navigate("Events");
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Create Event</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-5 space-y-4">
        {cards.length > 0 && (
          <View className="space-y-2">
            <Label>Link to Business Card</Label>
            <Select
              value={form.business_card_id}
              onValueChange={(v) => update("business_card_id", v)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select a card (optional)" />
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

        <View className="space-y-2">
          <Label>Event Title *</Label>
          <Input
            placeholder="e.g. Digital Marketing Summit 2026"
            value={form.title}
            onChangeText={(v) => update("title", v)}
          />
        </View>

        <View className="space-y-2">
          <Label>Description</Label>
          <Textarea
            placeholder="What's this event about?"
            value={form.description}
            onChangeText={(v) => update("description", v)}
            rows={3}
          />
        </View>

        <View className="space-y-2">
          <Label>Category *</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger className="rounded-xl">
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
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 space-y-2">
            <Label className="flex-row items-center gap-1">
              <Calendar size={14} color="#6a7181" /> Date *
            </Label>
            <Input
              placeholder="YYYY-MM-DD"
              value={form.date}
              onChangeText={(v) => update("date", v)}
            />
          </View>
          <View className="flex-1 space-y-2">
            <Label className="flex-row items-center gap-1">
              <Clock size={14} color="#6a7181" /> Time *
            </Label>
            <Input
              placeholder="HH:MM"
              value={form.time}
              onChangeText={(v) => update("time", v)}
            />
          </View>
        </View>

        <View className="space-y-2">
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
          <View className="space-y-2">
            <Label>Ticket Price (₹)</Label>
            <Input
              placeholder="500"
              value={form.price ? String(form.price) : ""}
              onChangeText={(v) => update("price", parseInt(v, 10) || 0)}
              keyboardType="number-pad"
            />
          </View>
        )}

        <View className="space-y-2">
          <Label>Organizer Name</Label>
          <Input
            placeholder="e.g. John Doe or Company Name"
            value={form.organizer_name}
            onChangeText={(v) => update("organizer_name", v)}
          />
        </View>

        <View className="space-y-2">
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

      <View className="absolute bottom-48 left-0 right-0 border-t border-border bg-card px-4 py-3">
        <Button
          className="w-full rounded-xl py-3"
          onPress={handleSubmit}
          disabled={createEvent.isPending}
        >
          {createEvent.isPending ? "Creating..." : "Create Event"}
        </Button>
      </View>
    </View>
  );
};

export default EventCreate;

