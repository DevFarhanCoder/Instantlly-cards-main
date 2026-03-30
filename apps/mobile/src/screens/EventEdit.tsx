import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Calendar, Clock, MapPin, Users } from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useGetEventQuery, useUpdateEventMutation } from "../store/api/eventsApi";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../lib/toast";

const EventEdit = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id;
  const numericId = typeof id === "string" ? parseInt(id, 10) : id;
  const { data: event, isLoading } = useGetEventQuery(numericId, { skip: !numericId });
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const { user } = useAuth();

  const [form, setForm] = useState<Record<string, any>>({});
  const [initialized, setInitialized] = useState(false);

  if (event && !initialized) {
    setForm({
      title: event.title,
      description: event.description || "",
      date: event.date ? new Date(event.date).toISOString().split("T")[0] : "",
      time: event.time,
      location: event.location || "",
      ticket_price: event.ticket_price ? String(event.ticket_price) : "",
      max_attendees: event.max_attendees ? String(event.max_attendees) : "",
      status: event.status,
    });
    setInitialized(true);
  }

  const update = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.time) {
      toast.error("Title, date, and time are required");
      return;
    }
    try {
      await updateEvent({
        id: numericId,
        title: form.title,
        description: form.description || undefined,
        date: form.date,
        time: form.time,
        location: form.location || undefined,
        ticket_price: form.ticket_price ? parseFloat(form.ticket_price) : undefined,
        max_attendees: form.max_attendees ? parseInt(form.max_attendees, 10) : undefined,
        status: form.status,
      }).unwrap();
      toast.success("Event updated!");
      navigation.goBack();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to update event");
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-5xl mb-3">😕</Text>
        <Text className="text-sm text-muted-foreground">Event not found</Text>
        <Button className="mt-4" onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Edit Event</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-5 gap-4">
        <View className="gap-2">
          <Label>Event Title *</Label>
          <Input
            placeholder="Event title"
            value={form.title || ""}
            onChangeText={(v) => update("title", v)}
          />
        </View>

        <View className="gap-2">
          <Label>Description</Label>
          <Textarea
            placeholder="Event description..."
            value={form.description || ""}
            onChangeText={(v) => update("description", v)}
            rows={3}
          />
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1 gap-2">
            <Label className="flex-row items-center gap-1">
              <Calendar size={14} color="#6a7181" /> Date *
            </Label>
            <Input
              placeholder="YYYY-MM-DD"
              value={form.date || ""}
              onChangeText={(v) => update("date", v)}
            />
          </View>
          <View className="flex-1 gap-2">
            <Label className="flex-row items-center gap-1">
              <Clock size={14} color="#6a7181" /> Time *
            </Label>
            <Input
              placeholder="HH:MM"
              value={form.time || ""}
              onChangeText={(v) => update("time", v)}
            />
          </View>
        </View>

        <View className="gap-2">
          <Label className="flex-row items-center gap-1">
            <MapPin size={14} color="#6a7181" /> Location
          </Label>
          <Input
            placeholder="Event venue"
            value={form.location || ""}
            onChangeText={(v) => update("location", v)}
          />
        </View>

        <View className="gap-2">
          <Label>Ticket Price (₹)</Label>
          <Input
            placeholder="Leave empty for free"
            value={form.ticket_price || ""}
            onChangeText={(v) => update("ticket_price", v)}
            keyboardType="number-pad"
          />
        </View>

        <View className="gap-2">
          <Label className="flex-row items-center gap-1">
            <Users size={14} color="#6a7181" /> Max Attendees
          </Label>
          <Input
            placeholder="Leave empty for unlimited"
            value={form.max_attendees || ""}
            onChangeText={(v) => update("max_attendees", v)}
            keyboardType="number-pad"
          />
        </View>

        <View className="gap-2">
          <Label>Status</Label>
          <View className="flex-row gap-2">
            {["active", "cancelled", "completed"].map((s) => (
              <Pressable
                key={s}
                onPress={() => update("status", s)}
                className={`flex-1 items-center py-2.5 rounded-xl border ${
                  form.status === s ? "border-primary bg-primary/10" : "border-border bg-card"
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
      </ScrollView>

      <View className="border-t border-border bg-card px-4 py-3">
        <Button
          className="w-full rounded-xl"
          onPress={handleSubmit}
          disabled={isUpdating}
        >
          {isUpdating ? "Updating..." : "Save Changes"}
        </Button>
      </View>
    </View>
  );
};

export default EventEdit;
