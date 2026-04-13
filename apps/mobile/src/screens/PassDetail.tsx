import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { PageLoader } from "../components/ui/page-loader";
import { ArrowLeft, Calendar, Clock, MapPin, Ticket, Users } from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { format } from "date-fns";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useMyRegistrations } from "../hooks/useEvents";

const PassDetail = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const passId = route?.params?.passId;
  const { registrations, isLoading, refetch: refetchRegistrations } = useMyRegistrations();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchRegistrations(); } finally { setRefreshing(false); }
  }, [refetchRegistrations]);

  const pass = registrations.find(
    (r: any) => String(r.id) === String(passId)
  );

  if (isLoading) {
    return <PageLoader />;
  }

  if (!pass) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-5xl mb-3">🎫</Text>
        <Text className="text-sm text-muted-foreground">Pass not found</Text>
        <Button className="mt-4" onPress={() => navigation.navigate("MyPasses")}>
          Back to My Passes
        </Button>
      </View>
    );
  }

  const event = pass.event;
  const isFree = !event?.ticket_price || event.ticket_price === 0;

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#ffffff" />
        </Pressable>
        <Text className="text-lg font-bold text-primary-foreground">Event Pass</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} className="px-4 py-6" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />}>
        <Card className="overflow-hidden">
          {/* Header */}
          <View className="bg-primary/5 p-6 items-center gap-2">
            <Text className="text-4xl">🎫</Text>
            <Text className="text-xl font-bold text-foreground text-center">
              {event?.title || "Event"}
            </Text>
            <View className="flex-row items-center gap-2">
              <Badge className="bg-success/10 text-success border-none">
                Registered
              </Badge>
              {pass.payment_status === 'paid' && (
                <Badge className="bg-emerald-100 text-emerald-700 border-none font-bold">
                  Paid{pass.amount_paid != null ? ` ₹${pass.amount_paid}` : ''}
                </Badge>
              )}
              {pass.payment_status === 'not_required' && !isFree && (
                <Badge className="bg-amber-100 text-amber-700 border-none">
                  Unpaid
                </Badge>
              )}
              {!isFree && (
                <Badge className="bg-accent/10 text-accent border-none font-bold">
                  ₹{event?.ticket_price}
                </Badge>
              )}
              {isFree && (
                <Badge className="bg-primary/10 text-primary border-none">
                  FREE
                </Badge>
              )}
            </View>
          </View>

          <CardContent className="p-6 gap-6">
            {/* QR Code */}
            {pass.qr_code ? (
              <View className="items-center gap-3">
                <View className="bg-white p-5 rounded-2xl shadow-md">
                  <QRCode value={pass.qr_code} size={220} />
                </View>
                <Text className="text-[11px] text-muted-foreground font-mono text-center">
                  {pass.qr_code}
                </Text>
                <Text className="text-xs text-muted-foreground text-center">
                  Show this QR code at the event entrance
                </Text>
              </View>
            ) : (
              <View className="items-center py-4">
                <Ticket size={40} color="#c0c4cc" />
                <Text className="text-sm text-muted-foreground mt-2">
                  QR code not available
                </Text>
              </View>
            )}

            {/* Event Details */}
            <View className="gap-3 rounded-xl bg-muted p-4">
              {event?.date && (
                <View className="flex-row items-center gap-3">
                  <Calendar size={16} color="#2563eb" />
                  <View>
                    <Text className="text-xs text-muted-foreground">Date</Text>
                    <Text className="text-sm font-medium text-foreground">
                      {format(new Date(event.date), "EEEE, MMM d, yyyy")}
                    </Text>
                  </View>
                </View>
              )}
              {event?.time && (
                <View className="flex-row items-center gap-3">
                  <Clock size={16} color="#2563eb" />
                  <View>
                    <Text className="text-xs text-muted-foreground">Time</Text>
                    <Text className="text-sm font-medium text-foreground">{event.time}</Text>
                  </View>
                </View>
              )}
              {event?.location && (
                <View className="flex-row items-center gap-3">
                  <MapPin size={16} color="#2563eb" />
                  <View>
                    <Text className="text-xs text-muted-foreground">Location</Text>
                    <Text className="text-sm font-medium text-foreground">{event.location}</Text>
                  </View>
                </View>
              )}
              {pass.ticket_count > 1 && (
                <View className="flex-row items-center gap-3">
                  <Users size={16} color="#2563eb" />
                  <View>
                    <Text className="text-xs text-muted-foreground">Tickets</Text>
                    <Text className="text-sm font-medium text-foreground">
                      {pass.ticket_count} tickets
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Registration info */}
            <View className="items-center">
              <Text className="text-xs text-muted-foreground">
                Registered on {format(new Date(pass.registered_at), "MMM d, yyyy 'at' h:mm a")}
              </Text>
            </View>

            {/* Navigate to event */}
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onPress={() => navigation.navigate("EventDetail", { id: pass.event_id })}
            >
              View Event Details
            </Button>
          </CardContent>
        </Card>
      </ScrollView>
    </View>
  );
};

export default PassDetail;
