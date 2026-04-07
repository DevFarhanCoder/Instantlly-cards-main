import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { PageLoader } from "../components/ui/page-loader";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Users,
  CheckCircle,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../hooks/useAuth";
import { useEvent, useRegisterForEvent, useMyRegistrations } from "../hooks/useEvents";
import { toast } from "../lib/toast";

const EventDetail = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id;
  const { data: event, isLoading } = useEvent(id || "");
  const registerMutation = useRegisterForEvent();
  const { user } = useAuth();
  const { registrations } = useMyRegistrations();

  // Check if user already registered for this event
  const existingPass = registrations.find(
    (r: any) => String(r.event_id) === String(id)
  );

  const [showForm, setShowForm] = useState(false);
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);
  const [registration, setRegistration] = useState<any>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "" });

  const handleRegister = async () => {
    if (!user) {
      toast.error("Please sign in to register");
      navigation.navigate("Auth");
      return;
    }
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
      toast.success("Registration successful! Your QR pass is ready");
    } catch (err: any) {
      // Handle 409 — already registered
      if (err?.status === 409 || err?.data?.error === "Already registered") {
        toast.error("You are already registered for this event");
        return;
      }
      toast.error(err?.data?.error || err?.message || "Registration failed");
    }
  };

  const handleRegisterPress = () => {
    if (!user) {
      toast.error("Please sign in to register");
      navigation.navigate("Auth");
      return;
    }
    // For paid events, show price confirmation first
    if (event && event.ticket_price && event.ticket_price > 0) {
      setShowPriceConfirm(true);
    } else {
      setShowForm(true);
    }
  };

  const handleConfirmPaid = () => {
    setShowPriceConfirm(false);
    setShowForm(true);
  };

  if (isLoading) {
    return <PageLoader />;
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

  // Show QR pass after fresh registration
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
        <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-8">
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
            <CardContent className="p-6 gap-6">
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
              <View className="gap-2 rounded-xl bg-muted p-4">
                <View className="flex-row items-center gap-2">
                  <Calendar size={14} color="#6a7181" />
                  <Text className="text-sm text-muted-foreground">
                    {new Date(event.date).toLocaleDateString()} • {event.time}
                  </Text>
                </View>
                {event.location && (
                  <View className="flex-row items-center gap-2">
                    <MapPin size={14} color="#6a7181" />
                    <Text className="text-sm text-muted-foreground">{event.location}</Text>
                  </View>
                )}
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

  const isFree = !event.ticket_price || event.ticket_price === 0;

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
        <Text className="text-7xl">🎉</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 -mt-6">
        <Card>
          <CardContent className="p-5 gap-4">
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                {isFree ? (
                  <Badge className="bg-success/10 text-success border-none text-xs">
                    FREE
                  </Badge>
                ) : (
                  <Badge className="bg-accent/10 text-accent border-none text-xs font-bold">
                    ₹{event.ticket_price}
                  </Badge>
                )}
              </View>
              <Text className="text-xl font-bold text-foreground">{event.title}</Text>
            </View>

            {event.description && (
              <Text className="text-sm text-muted-foreground">{event.description}</Text>
            )}

            <View className="gap-2.5 rounded-xl bg-muted p-4">
              <View className="flex-row items-center gap-3">
                <Calendar size={16} color="#2563eb" />
                <Text className="text-sm text-foreground">
                  {new Date(event.date).toLocaleDateString()}
                </Text>
              </View>
              <View className="flex-row items-center gap-3">
                <Clock size={16} color="#2563eb" />
                <Text className="text-sm text-foreground">{event.time}</Text>
              </View>
              {event.location && (
                <View className="flex-row items-center gap-3">
                  <MapPin size={16} color="#2563eb" />
                  <Text className="text-sm text-foreground">{event.location}</Text>
                </View>
              )}
              {event.max_attendees && (
                <View className="flex-row items-center gap-3">
                  <Users size={16} color="#2563eb" />
                  <Text className="text-sm text-foreground">
                    {event.max_attendees} seats ({event.attendee_count || 0} registered)
                  </Text>
                </View>
              )}
              {event.business && (
                <View className="flex-row items-center gap-3">
                  <Text className="text-sm text-muted-foreground">Organized by</Text>
                  <Text className="text-sm font-medium text-foreground">
                    {event.business.company_name || event.business.full_name}
                  </Text>
                </View>
              )}
            </View>

            {/* Already registered — show pass */}
            {existingPass ? (
              <View className="gap-3">
                <View className="flex-row items-center gap-2 bg-success/10 rounded-xl p-4">
                  <CheckCircle size={20} color="#16a34a" />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-success">Already Registered</Text>
                    <Text className="text-xs text-muted-foreground">
                      You have a pass for this event
                    </Text>
                  </View>
                </View>
                {existingPass.qr_code && (
                  <View className="items-center bg-muted/30 rounded-xl p-4 gap-2 border border-dashed border-border">
                    <QRCode value={existingPass.qr_code} size={160} />
                    <Text className="text-[10px] text-muted-foreground font-mono">
                      {existingPass.qr_code}
                    </Text>
                  </View>
                )}
                <Button
                  variant="outline"
                  className="w-full"
                  onPress={() => navigation.navigate("MyPasses")}
                >
                  View All Passes
                </Button>
              </View>
            ) : showPriceConfirm ? (
              /* Price confirmation for paid events */
              <View className="gap-3 rounded-xl border border-border bg-card p-4">
                <Text className="font-semibold text-foreground text-center">Confirm Registration</Text>
                <View className="items-center py-3">
                  <Text className="text-3xl font-bold text-primary">₹{event.ticket_price}</Text>
                  <Text className="text-xs text-muted-foreground mt-1">Ticket Price</Text>
                </View>
                <Text className="text-xs text-muted-foreground text-center">
                  Payment will be collected at the venue. By proceeding, you confirm your intent to attend.
                </Text>
                <Button className="w-full" size="lg" onPress={handleConfirmPaid}>
                  Proceed to Register
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onPress={() => setShowPriceConfirm(false)}
                >
                  Cancel
                </Button>
              </View>
            ) : !showForm ? (
              <Button className="w-full" size="lg" onPress={handleRegisterPress}>
                {isFree ? "Register Now →" : `Register — ₹${event.ticket_price}`}
              </Button>
            ) : (
              <View className="gap-3">
                <Text className="font-semibold text-foreground">Registration Details</Text>
                {!isFree && (
                  <View className="flex-row items-center gap-2 bg-primary/5 rounded-lg px-3 py-2">
                    <Text className="text-xs text-muted-foreground">Ticket:</Text>
                    <Text className="text-sm font-bold text-primary">₹{event.ticket_price}</Text>
                    <Text className="text-xs text-muted-foreground">(pay at venue)</Text>
                  </View>
                )}
                <View className="gap-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Enter your full name"
                    value={form.full_name}
                    onChangeText={(v) => setForm({ ...form, full_name: v })}
                  />
                </View>
                <View className="gap-2">
                  <Label>Email *</Label>
                  <Input
                    placeholder="your@email.com"
                    value={form.email}
                    onChangeText={(v) => setForm({ ...form, email: v })}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                <View className="gap-2">
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
                    : isFree
                    ? "Confirm Registration"
                    : `Confirm & Register — ₹${event.ticket_price}`}
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
