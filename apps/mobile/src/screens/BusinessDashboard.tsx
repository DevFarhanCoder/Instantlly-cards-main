import { useCallback, useState } from "react";
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronRight,
  MessageCircle,
  Tag,
  Trash2,
  Users,
  XCircle,
  QrCode,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../hooks/useAuth";
import { useBusinessCards } from "../hooks/useBusinessCards";
import { supabase } from "../integrations/supabase/client";
import { useListBusinessBookingsQuery, useUpdateBookingStatusMutation } from "../store/api/bookingsApi";
import { useListMyEventsQuery } from "../store/api/eventsApi";
import BookingCalendar from "../components/business/BookingCalendar";
import BusinessHoursEditor from "../components/business/BusinessHoursEditor";
import LeadsManager from "../components/business/LeadsManager";
import LocationManager from "../components/business/LocationManager";
import PhotoGalleryManager from "../components/business/PhotoGalleryManager";
import PushCampaigns from "../components/business/PushCampaigns";
import ReviewModeration from "../components/business/ReviewModeration";
import ServicePricingManager from "../components/business/ServicePricingManager";
import StaffManager from "../components/business/StaffManager";
import { toast } from "../lib/toast";

const BusinessDashboard = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { cards, isLoading, updateCard } = useBusinessCards();
  const queryClient = useQueryClient();

  const cardIds = cards.map((c) => c.id);
  const primaryCard = cards[0];

  const primaryCardId = primaryCard?.id;
  const numericCardId = typeof primaryCardId === 'string' ? parseInt(primaryCardId, 10) : primaryCardId;
  const { data: bookingsData, isLoading: bookingsLoading, refetch: refetchBookings } = useListBusinessBookingsQuery(
    { businessId: numericCardId! },
    { skip: !numericCardId }
  );
  const incomingBookings: any[] = bookingsData?.data ?? [];

  const { data: myEvents = [], refetch: refetchEvents } = useListMyEventsQuery(undefined, { skip: !user });

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchBookings(), refetchEvents()]); } finally { setRefreshing(false); }
  }, [refetchBookings, refetchEvents]);

  const eventIds = myEvents.map((e) => e.id);
  const eventIdStrings = eventIds.map(String);
  const { data: eventRegistrations = [] } = useQuery({
    queryKey: ["business-event-registrations", eventIds],
    queryFn: async () => {
      if (eventIdStrings.length === 0) return [];
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .in("event_id", eventIdStrings)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: eventIdStrings.length > 0,
  });

  const { data: myVouchers = [] } = useQuery({
    queryKey: ["business-vouchers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const voucherIds = myVouchers.map((v) => v.id);
  const { data: voucherClaims = [] } = useQuery({
    queryKey: ["business-voucher-claims", voucherIds],
    queryFn: async () => {
      if (voucherIds.length === 0) return [];
      const { data, error } = await supabase
        .from("claimed_vouchers")
        .select("*")
        .in("voucher_id", voucherIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: voucherIds.length > 0,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["business-reviews", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .in("business_id", cardIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: cardIds.length > 0,
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ["business-conversations", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .in("business_id", cardIds)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && cardIds.length > 0,
  });

  const { data: analyticsData = [] } = useQuery({
    queryKey: ["business-analytics-summary", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("card_analytics")
        .select("*")
        .in("business_card_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && cardIds.length > 0,
  });

  const [updateBookingStatusTrigger] = useUpdateBookingStatusMutation();
  const updateBookingStatus = {
    mutate: ({ id, status }: { id: any; status: string }) => {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      updateBookingStatusTrigger({ id: numId, status }).then(() => {
        toast.success("Booking updated!");
      });
    },
  };

  const updateVoucherStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("vouchers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-vouchers"] });
      toast.success("Voucher updated!");
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-events"] });
      toast.success("Event deleted!");
    },
  });


  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-sm text-muted-foreground mb-4">
          Sign in to access your business dashboard
        </Text>
        <Button onPress={() => navigation.navigate("Auth")} className="rounded-xl">
          Sign In
        </Button>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-foreground">Business Dashboard</Text>
        </View>
        <View className="items-center justify-center px-6 pt-24">
          <Text className="text-sm text-muted-foreground">Loading your business cards...</Text>
          <Text className="text-xs text-muted-foreground mt-2">Please check console logs for details</Text>
        </View>
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-foreground">Business Dashboard</Text>
        </View>
        <View className="items-center justify-center px-6 pt-24">
          <Text className="text-4xl mb-4">🏪</Text>
          <Text className="text-lg font-bold text-foreground">No business card yet</Text>
          <Text className="text-sm text-muted-foreground mt-1">
            Create a business card to access your dashboard
          </Text>
          <Text className="text-xs text-muted-foreground mt-2 text-center">
            Check console logs or try "My Cards" tab to see if cards exist
          </Text>
          <Button className="mt-6 rounded-xl" onPress={() => navigation.navigate("CardCreate")}>
            Create Business Card
          </Button>
          <Button 
            variant="outline" 
            className="mt-3 rounded-xl" 
            onPress={() => navigation.navigate("MyCards")}
          >
            View My Cards
          </Button>
        </View>
      </View>
    );
  }

  const pendingBookings = incomingBookings.filter((b) => b.status === "confirmed");
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "—";
  const totalViews = analyticsData.filter((a) => a.event_type === "view").length;
  const totalCalls = analyticsData.filter((a) => a.event_type === "phone_click").length;
  const totalDirections = analyticsData.filter((a) => a.event_type === "direction_click").length;

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Business Dashboard</Text>
        <Button
          size="sm"
          variant="outline"
          className="ml-auto gap-1 rounded-lg text-xs"
          onPress={() => navigation.navigate("BusinessAnalytics")}
        >
          <BarChart3 size={14} color="#111827" /> Analytics
        </Button>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4" refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }>
        {/* Live/Offline Toggle + Approval Status */}
        {primaryCard && (
          <View className="rounded-xl border border-border bg-card p-4 mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-sm font-bold text-foreground">
                  {(primaryCard as any).is_live ? "Live" : "Offline"}
                </Text>
                <Text className="text-xs text-muted-foreground">
                  {(primaryCard as any).is_live
                    ? "Your card appears in search results"
                    : "Your card is hidden from search results"}
                </Text>
              </View>
              <Switch
                value={(primaryCard as any).is_live ?? true}
                onValueChange={(val) => {
                  updateCard.mutateAsync({ id: primaryCard.id, is_live: val } as any);
                }}
                trackColor={{ false: "#d1d5db", true: "#22c55e" }}
                thumbColor="#ffffff"
              />
            </View>
            {(primaryCard as any).approval_status === "pending" && (
              <View className="mt-3 rounded-lg bg-amber-50 p-3">
                <Text className="text-xs font-semibold text-amber-700">
                  Pending Approval
                </Text>
                <Text className="text-xs text-amber-600 mt-0.5">
                  Your card is under review. It will appear in search results once approved.
                </Text>
              </View>
            )}
            {(primaryCard as any).approval_status === "rejected" && (
              <View className="mt-3 rounded-lg bg-red-50 p-3">
                <Text className="text-xs font-semibold text-red-700">
                  Card Rejected
                </Text>
                <Text className="text-xs text-red-600 mt-0.5">
                  Your card was not approved. Please edit and resubmit.
                </Text>
              </View>
            )}
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          <View className="flex-row gap-2">
            {[
              { label: "Views", value: totalViews, emoji: "👁️" },
              { label: "Calls", value: totalCalls, emoji: "📞" },
              { label: "Bookings", value: incomingBookings.length, emoji: "📅" },
              { label: "Rating", value: avgRating, emoji: "⭐" },
            ].map((s) => (
              <View key={s.label} className="w-24 rounded-xl border border-border bg-card p-2.5 items-center">
                <Text className="text-lg">{s.emoji}</Text>
                <Text className="text-base font-bold text-foreground">{s.value}</Text>
                <Text className="text-xs text-muted-foreground" numberOfLines={1}>{s.label}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <Tabs defaultValue="bookings" className="mt-4">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TabsList className="bg-muted p-1 rounded-lg flex-row">
              {[
                { v: "bookings", l: `Bookings${pendingBookings.length > 0 ? ` (${pendingBookings.length})` : ""}` },
                { v: "reviews", l: `Reviews (${reviews.length})` },
                { v: "events", l: "Events" },
                { v: "vouchers", l: "Vouchers" },
                { v: "messages", l: "Messages" },
                { v: "leads", l: "Leads" },
                { v: "calendar", l: "Calendar" },
                { v: "tools", l: "Tools" },
              ].map((t) => (
                <TabsTrigger key={t.v} value={t.v} className="px-4 py-2 text-xs whitespace-nowrap">
                  {t.l}
                </TabsTrigger>
              ))}
            </TabsList>
          </ScrollView>

          <TabsContent value="bookings" className="gap-3 mt-3">
            {bookingsLoading ? (
              <View className="items-center py-8">
                <Text className="text-xs text-muted-foreground">Loading...</Text>
              </View>
            ) : incomingBookings.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <Calendar size={32} color="#c0c4cc" />
                <Text className="text-sm text-muted-foreground mt-2">No bookings yet</Text>
              </View>
            ) : (
              incomingBookings.map((b: any) => (
                <View key={b.id} className="rounded-xl border border-border bg-card p-4 gap-2">
                  <View className="flex-row items-start justify-between">
                    <View>
                      <Text className="text-sm font-bold text-foreground">{b.customer_name}</Text>
                      <Text className="text-xs text-muted-foreground">{b.customer_phone}</Text>
                      <Text className="text-xs text-muted-foreground mt-0.5">
                        {b.mode === "instant" ? "⚡ Instant" : `📅 ${b.booking_date} at ${b.booking_time}`}
                      </Text>
                      {b.notes && <Text className="text-xs text-muted-foreground mt-1 italic">"{b.notes}"</Text>}
                    </View>
                    <Text
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        b.status === "confirmed"
                          ? "bg-amber-100 text-amber-700"
                          : b.status === "completed"
                          ? "bg-green-100 text-green-700"
                          : b.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {b.status}
                    </Text>
                  </View>
                  {b.status === "confirmed" && (
                    <View className="flex-row gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 gap-1 rounded-lg text-xs"
                        onPress={() => updateBookingStatus.mutate({ id: b.id, status: "completed" })}
                      >
                        <CheckCircle size={14} color="#ffffff" /> Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 gap-1 rounded-lg text-xs text-destructive"
                        onPress={() => updateBookingStatus.mutate({ id: b.id, status: "cancelled" })}
                      >
                        <XCircle size={14} color="#ef4444" /> Cancel
                      </Button>
                    </View>
                  )}
                </View>
              ))
            )}
          </TabsContent>

          <TabsContent value="reviews" className="gap-3 mt-3">
            {cardIds.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <Text className="text-sm text-muted-foreground">No business cards yet</Text>
              </View>
            ) : (
              <ReviewModeration cardIds={cardIds} />
            )}
          </TabsContent>

          <TabsContent value="events" className="gap-3 mt-3">
            <Button variant="outline" className="w-full gap-2 rounded-xl" onPress={() => navigation.navigate("EventCreate")}>
              <Calendar size={16} color="#111827" /> Create New Event
            </Button>
            {myEvents.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <Text className="text-sm text-muted-foreground">No events created yet</Text>
              </View>
            ) : (
              myEvents.map((e: any) => {
                const regs = eventRegistrations.filter((r: any) => String(r.event_id) === String(e.id));
                return (
                  <View key={e.id} className="rounded-xl border border-border bg-card p-4 gap-2">
                    <View className="flex-row items-start justify-between">
                      <Pressable onPress={() => navigation.navigate("EventDetail", { id: e.id })} className="flex-1">
                        <Text className="text-sm font-bold text-foreground">{e.title}</Text>
                        <Text className="text-xs text-muted-foreground">{e.location || ''} • {e.date ? new Date(e.date).toLocaleDateString() : ''}</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteEvent.mutate(e.id)}>
                        <Trash2 size={16} color="#ef4444" />
                      </Pressable>
                    </View>
                    <Pressable onPress={() => navigation.navigate("EventRegistrations", { id: e.id })}>
                      <View className="flex-row items-center gap-2 flex-wrap">
                        <Text className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                          <Users size={12} color="#2563eb" /> {e._count?.registrations ?? regs.length} registrations
                        </Text>
                        {e.max_attendees && (
                          <Text className="text-[10px] text-muted-foreground">/ {e.max_attendees} max</Text>
                        )}
                        {e.ticket_price && e.ticket_price > 0 ? (
                          <Text className="text-[10px] font-bold text-accent">₹{e.ticket_price}/ticket</Text>
                        ) : (
                          <Text className="text-[10px] font-bold text-success">FREE</Text>
                        )}
                      </View>
                    </Pressable>
                    <View className="flex-row gap-2 mt-1">
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs" onPress={() => navigation.navigate("EventEdit", { id: e.id })}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 rounded-lg text-xs" onPress={() => navigation.navigate("EventRegistrations", { id: e.id })}>
                        Attendees
                      </Button>
                    </View>
                  </View>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="vouchers" className="gap-3 mt-3">
            <Button variant="outline" className="w-full gap-2 rounded-xl" onPress={() => navigation.navigate("VoucherCreate")}>
              <Tag size={16} color="#111827" /> Create New Voucher
            </Button>
            {myVouchers.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <Text className="text-sm text-muted-foreground">No vouchers created yet</Text>
              </View>
            ) : (
              myVouchers.map((v: any) => {
                const claims = voucherClaims.filter((c: any) => c.voucher_id === v.id);
                return (
                  <View key={v.id} className="rounded-xl border border-border bg-card p-4 gap-2">
                    <View className="flex-row items-start justify-between">
                      <View>
                        <Text className="text-sm font-bold text-foreground">{v.title}</Text>
                        <Text className="text-xs text-muted-foreground">
                          ₹{v.discounted_price} <Text className="line-through">₹{v.original_price}</Text>
                        </Text>
                      </View>
                      <View className="items-end gap-2">
                        <Text className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          v.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                        }`}>
                          {v.status}
                        </Text>
                        {v.status === "active" ? (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onPress={() => updateVoucherStatus.mutate({ id: v.id, status: "inactive" })}>
                            Deactivate
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onPress={() => updateVoucherStatus.mutate({ id: v.id, status: "active" })}>
                            Activate
                          </Button>
                        )}
                      </View>
                    </View>
                    <Text className="text-xs text-muted-foreground">
                      🎫 {claims.length} claimed
                      {v.max_claims ? ` / ${v.max_claims} max` : ""}
                    </Text>
                  </View>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="messages" className="gap-3 mt-3">
            <Button variant="outline" className="w-full gap-2 rounded-xl" onPress={() => navigation.navigate("Messaging")}>
              <MessageCircle size={16} color="#111827" /> Open Messaging
            </Button>
            {conversations.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <MessageCircle size={32} color="#c0c4cc" />
                <Text className="text-sm text-muted-foreground mt-2">No customer messages yet</Text>
              </View>
            ) : (
              conversations.slice(0, 10).map((c: any) => (
                <Pressable
                  key={c.id}
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
                  onPress={() => navigation.navigate("Messaging")}
                >
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Text className="text-lg">{c.business_avatar || "📇"}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                      {c.business_name}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {new Date(c.updated_at).toLocaleDateString()}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#9aa2b1" />
                </Pressable>
              ))
            )}
          </TabsContent>

          <TabsContent value="leads" className="gap-3 mt-3">
            {primaryCard ? (
              <LeadsManager businessCardId={primaryCard.id} />
            ) : (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <Text className="text-sm text-muted-foreground">No business card yet</Text>
              </View>
            )}
          </TabsContent>

          <TabsContent value="calendar" className="mt-3">
            <BookingCalendar bookings={incomingBookings} />
          </TabsContent>

          <TabsContent value="tools" className="gap-3 mt-3">
            <View className="rounded-xl border border-border bg-card p-4">
              <View className="flex-row items-center gap-2 mb-3">
                <QrCode size={16} color="#2563eb" />
                <Text className="text-sm font-bold text-foreground">QR Code for Print</Text>
              </View>
              {primaryCard && (
                <View className="items-center gap-3">
                  <View className="bg-white p-4 rounded-xl">
                    <QRCode value={`https://instantlly.lovable.app/card/${primaryCard.id}`} size={160} />
                  </View>
                  <Text className="text-xs text-muted-foreground text-center">
                    Scan to view your business card
                  </Text>
                </View>
              )}
            </View>

            {primaryCard ? (
              <View className="gap-3">
                <BusinessHoursEditor businessCardId={primaryCard.id} />
                <ServicePricingManager businessCardId={primaryCard.id} />
                <PhotoGalleryManager businessCardId={primaryCard.id} />
                <LocationManager businessCardId={primaryCard.id} />
                <StaffManager businessCardId={primaryCard.id} />
                <PushCampaigns businessCardId={primaryCard.id} />
              </View>
            ) : (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <Text className="text-sm text-muted-foreground">Create a business card to access tools</Text>
              </View>
            )}
          </TabsContent>
        </Tabs>
      </ScrollView>
    </View>
  );
};

export default BusinessDashboard;
