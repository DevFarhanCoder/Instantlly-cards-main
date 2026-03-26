import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useEvent, useRegisterForEvent, EventRegistration } from "../hooks/useEvents";
import { toast } from "../lib/toast";
import { cn } from "../lib/utils";

const categoryEmoji: Record<string, string> = {
  Awards: "🏆",
  Conference: "🎤",
  Networking: "🤝",
  Festival: "🎪",
  Wellness: "🧘",
  Workshop: "🔧",
  Music: "🎵",
  Sports: "⚽",
};

const EventDetail = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id as string | undefined;
  const { data: event, isLoading } = useEvent(id || "");
  const registerMutation = useRegisterForEvent();

  const [showForm, setShowForm] = useState(false);
  const [registration, setRegistration] = useState<EventRegistration | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });

  const eventEmoji = useMemo(
    () => (event ? categoryEmoji[event.category] || "🎉" : "🎉"),
    [event]
  );

  const handleRegister = async () => {
    if (!form.full_name || !form.email) {
      toast.error("Please fill in your name and email");
      return;
    }
    try {
      const result = await registerMutation.mutateAsync({
        event_id: id!,
        full_name: form.full_name,
        email: form.email,
        phone: form.phone || undefined,
      });
      setRegistration(result);
      toast.success("🎉 Registration successful! Your QR pass is ready");
    } catch (err: any) {
      toast.error(err?.message || "Registration failed");
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
        <Button className="mt-4" onPress={() => navigation.navigate("Events")}>
          Back to Events
        </Button>
      </View>
    );
  }

  if (registration) {
    return (
      <View className="flex-1 bg-background">
        <View className="bg-primary px-4 py-4">
          <Pressable
            onPress={() => navigation.navigate("Events")}
            className="flex-row items-center gap-2"
          >
            <ArrowLeft size={20} color="#ffffff" />
            <Text className="font-medium text-primary-foreground">Back to Events</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-8">
          <Card className="overflow-hidden">
            <View className="bg-success/10 p-6 items-center">
              <Text className="text-5xl">🎉</Text>
              <Text className="text-xl font-bold text-foreground mt-3">
                You're Registered!
              </Text>
              <Text className="text-sm text-muted-foreground mt-1">
                {event.title}
              </Text>
            </View>
            <CardContent className="p-6 space-y-6">
              <View className="items-center">
                <View className="bg-white p-4 rounded-2xl shadow-md">
                  <QRCode value={registration.qr_code} size={200} />
                </View>
              </View>
              <View className="items-center">
                <Text className="text-xs text-muted-foreground">Your QR Code</Text>
                <Text className="text-sm font-mono font-medium text-foreground mt-1">
                  {registration.qr_code}
                </Text>
              </View>
              <View className="space-y-2 rounded-xl bg-muted p-4">
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-medium text-foreground">Name:</Text>
                  <Text className="text-sm text-muted-foreground">
                    {registration.full_name}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Text className="text-sm font-medium text-foreground">Email:</Text>
                  <Text className="text-sm text-muted-foreground">
                    {registration.email}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <Calendar size={14} color="#6a7181" />
                  <Text className="text-sm text-muted-foreground">
                    {event.date} • {event.time}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <MapPin size={14} color="#6a7181" />
                  <Text className="text-sm text-muted-foreground">{event.venue}</Text>
                </View>
              </View>
              <Text className="text-center text-xs text-muted-foreground">
                Show this QR code at the event entrance for verification
              </Text>
            </CardContent>
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4">
        <Pressable
          onPress={() => navigation.navigate("Events")}
          className="flex-row items-center gap-2"
        >
          <ArrowLeft size={20} color="#ffffff" />
          <Text className="font-medium text-primary-foreground">Back</Text>
        </Pressable>
      </View>

      <View className="h-48 bg-primary/10 items-center justify-center">
        <Text className="text-7xl">{eventEmoji}</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 -mt-6">
        <Card>
          <CardContent className="p-5 space-y-4">
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <Badge className="bg-primary/10 text-primary border-none text-xs">
                  {event.category}
                </Badge>
                {event.is_free ? (
                  <Badge className="bg-success/10 text-success border-none text-xs">
                    FREE
                  </Badge>
                ) : (
                  <Badge className="bg-accent/10 text-accent border-none text-xs font-bold">
                    ₹{event.price}
                  </Badge>
                )}
              </View>
              <Text className="text-xl font-bold text-foreground">{event.title}</Text>
            </View>

            {event.description && (
              <Text className="text-sm text-muted-foreground">{event.description}</Text>
            )}

            <View className="space-y-2.5 rounded-xl bg-muted p-4">
              <View className="flex-row items-center gap-3">
                <Calendar size={16} color="#2563eb" />
                <Text className="text-sm text-foreground">{event.date}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Clock size={16} color="#2563eb" />
                <Text className="text-sm text-foreground">{event.time}</Text>
              </View>
              <View className="flex-row items-center gap-3">
                <MapPin size={16} color="#2563eb" />
                <Text className="text-sm text-foreground">{event.venue}</Text>
              </View>
              {event.max_attendees && (
                <View className="flex-row items-center gap-3">
                  <Users size={16} color="#2563eb" />
                  <Text className="text-sm text-foreground">
                    {event.max_attendees} seats
                  </Text>
                </View>
              )}
              {event.organizer_name && (
                <View className="flex-row items-center gap-3">
                  <Text className="text-sm text-muted-foreground">Organized by</Text>
                  <Text className="text-sm font-medium text-foreground">
                    {event.organizer_name}
                  </Text>
                </View>
              )}
            </View>

            {!showForm ? (
              <Button className="w-full" size="lg" onPress={() => setShowForm(true)}>
                Register Now →
              </Button>
            ) : (
              <View className="space-y-3">
                <Text className="font-semibold text-foreground">Registration Details</Text>
                <View className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Enter your full name"
                    value={form.full_name}
                    onChangeText={(v) => setForm({ ...form, full_name: v })}
                  />
                </View>
                <View className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    placeholder="your@email.com"
                    value={form.email}
                    onChangeText={(v) => setForm({ ...form, email: v })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View className="space-y-2">
                  <Label>Phone (Optional)</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChangeText={(v) => setForm({ ...form, phone: v })}
                    keyboardType="phone-pad"
                  />
                </View>
                <Button
                  className="w-full"
                  size="lg"
                  onPress={handleRegister}
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending
                    ? "Registering..."
                    : "Confirm Registration 🎟️"}
                </Button>
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
};

export default EventDetail;

