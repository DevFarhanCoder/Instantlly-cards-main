import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
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
import { usePromotionContext } from "../contexts/PromotionContext";
import { supabase } from "../integrations/supabase/client";
import { useListBusinessBookingsQuery, useListPromotionBookingsQuery, useUpdateBookingStatusMutation } from "../store/api/bookingsApi";
import { useGetCardReviewsQuery, useGetPromotionReviewsQuery } from "../store/api/reviewsApi";
import { useListBusinessLeadsQuery, useListPromotionLeadsQuery } from "../store/api/leadsApi";
import { useListMyEventsQuery } from "../store/api/eventsApi";
import { useGetMyCreatedVouchersQuery, useUpdateVoucherStatusMutation } from "../store/api/vouchersApi";
import BookingCalendar from "../components/business/BookingCalendar";
import BusinessHoursEditor from "../components/business/BusinessHoursEditor";
import LeadsManager from "../components/business/LeadsManager";
import LocationManager from "../components/business/LocationManager";
import PhotoGalleryManager from "../components/business/PhotoGalleryManager";
import PushCampaigns from "../components/business/PushCampaigns";
import ReviewModeration from "../components/business/ReviewModeration";
import ServicePricingManager from "../components/business/ServicePricingManager";
import StaffManager from "../components/business/StaffManager";
import { AppHeader } from "../components/ui/AppHeader";
import { NoPromotionCTA } from "../components/business/NoPromotionCTA";
import { toast } from "../lib/toast";

const BusinessDashboard = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { selectedPromotionId, selectedPromotion, promotions } = usePromotionContext();
  const hasAnyPromotion = (promotions?.length ?? 0) > 0;
  const businessName = selectedPromotion?.business_name || "Business";
  const queryClient = useQueryClient();

  const selectedCardIdNum = selectedPromotion?.business_card_id ? Number(selectedPromotion.business_card_id) : null;
  const selectedCardId = selectedCardIdNum ? String(selectedCardIdNum) : null;
  const cardIdsNum = selectedCardIdNum ? [selectedCardIdNum] : [];
  const cardIds = selectedCardId ? [selectedCardId] : [];

  useEffect(() => {
    if (user && !selectedPromotionId && hasAnyPromotion) {
      navigation.navigate("BusinessSelectorScreen");
    }
  }, [user, selectedPromotionId, hasAnyPromotion, navigation]);

  const numericCardId = selectedCardIdNum;
  const promoIdForBookings = selectedPromotionId ? Number(selectedPromotionId) : null;
  const cardBookingsQuery = useListBusinessBookingsQuery(
    numericCardId ? { businessId: numericCardId, promotionId: promoIdForBookings ?? undefined } : ({} as any),
    { skip: !numericCardId }
  );
  const promoBookingsQuery = useListPromotionBookingsQuery(
    promoIdForBookings ? { promotionId: promoIdForBookings } : ({} as any),
    { skip: !promoIdForBookings || !!numericCardId }
  );
  const bookingsData = numericCardId ? cardBookingsQuery.data : promoBookingsQuery.data;
  const bookingsLoading = numericCardId ? cardBookingsQuery.isLoading : promoBookingsQuery.isLoading;
  const refetchBookings = numericCardId ? cardBookingsQuery.refetch : promoBookingsQuery.refetch;
  const incomingBookings: any[] = bookingsData?.data ?? [];

  const { data: myEvents = [], refetch: refetchEvents } = useListMyEventsQuery(undefined, { skip: !user });
  const scopedEvents = (myEvents as any[]).filter((e: any) =>
    selectedPromotionId ? Number(e.business_promotion_id) === Number(selectedPromotionId) : false
  );

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchBookings(), refetchEvents()]); } finally { setRefreshing(false); }
  }, [refetchBookings, refetchEvents]);

  const eventIds = scopedEvents.map((e: any) => e.id);
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

  const promotionIdNum = selectedPromotionId ? Number(selectedPromotionId) : undefined;
  const { data: scopedVouchersRaw = [] } = useGetMyCreatedVouchersQuery(
    promotionIdNum ? { promotionId: promotionIdNum } : undefined,
    { skip: !user }
  );
  const scopedVouchers = scopedVouchersRaw as any[];

  const { data: reviewsCard = [] } = useGetCardReviewsQuery(selectedCardIdNum ?? 0, { skip: !selectedCardIdNum });
  const { data: reviewsPromo = [] } = useGetPromotionReviewsQuery(promotionIdNum ?? 0, { skip: !promotionIdNum || !!selectedCardIdNum });
  const reviews: any[] = selectedCardIdNum ? (reviewsCard as any[]) : (reviewsPromo as any[]);

  const leadsCardQuery = useListBusinessLeadsQuery(
    selectedCardIdNum ? { businessId: selectedCardIdNum, promotionId: promotionIdNum ?? undefined } : ({} as any),
    { skip: !selectedCardIdNum }
  );
  const leadsPromoQuery = useListPromotionLeadsQuery(
    promotionIdNum ? { promotionId: promotionIdNum } : ({} as any),
    { skip: !promotionIdNum || !!selectedCardIdNum }
  );
  const leadsData = selectedCardIdNum ? leadsCardQuery.data : leadsPromoQuery.data;
  const leads: any[] = leadsData?.data ?? [];

  const { data: conversations = [] } = useQuery({
    queryKey: ["business-conversations", cardIdsNum, selectedPromotionId],
    queryFn: async () => {
      if (cardIdsNum.length === 0) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .in("business_id", cardIdsNum)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && cardIdsNum.length > 0,
  });

  const { data: analyticsData = [] } = useQuery({
    queryKey: ["business-analytics-summary", selectedPromotionId, cardIdsNum],
    queryFn: async () => {
      if (!promotionIdNum && cardIdsNum.length === 0) return [];
      let query = supabase
        .from("card_analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (promotionIdNum && cardIdsNum.length > 0) {
        query = query.or(`business_promotion_id.eq.${promotionIdNum},business_card_id.in.(${cardIdsNum.join(",")})`);
      } else if (promotionIdNum) {
        query = query.eq("business_promotion_id", promotionIdNum);
      } else {
        query = query.in("business_card_id", cardIdsNum);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && (!!promotionIdNum || cardIdsNum.length > 0),
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

  const [updateVoucherStatusTrigger] = useUpdateVoucherStatusMutation();
  const updateVoucherStatus = {
    mutate: ({ id, status }: { id: any; status: string }) => {
      const numId = typeof id === 'string' ? parseInt(id, 10) : id;
      updateVoucherStatusTrigger({ id: numId, status }).then(() => {
        toast.success("Voucher updated!");
      });
    },
  };

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

  const showHeaderActions = !!selectedPromotionId;
  const header = (
    <AppHeader
      title="Business Dashboard"
      onBack={() => navigation.goBack()}
      rightWidth={108}
      rightAction={
        showHeaderActions ? (
          <Button
            size="sm"
            variant="outline"
            className="h-9 w-full gap-1 rounded-lg text-xs"
            onPress={() => navigation.navigate("BusinessAnalytics")}
          >
            <BarChart3 size={14} color="#111827" /> Analytics
          </Button>
        ) : undefined
      }
      switchLabel={showHeaderActions ? businessName : undefined}
      onSwitchPress={showHeaderActions ? () => navigation.navigate("BusinessSelectorScreen") : undefined}
    />
  );


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

  if (!selectedPromotionId) {
    return (
      <View className="flex-1 bg-background">
        {header}
        {hasAnyPromotion ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-sm text-muted-foreground text-center">Opening business selector...</Text>
          </View>
        ) : (
          <NoPromotionCTA
            title="Your dashboard awaits"
            description="Promote your business to manage bookings, reviews, leads and ads from one place."
            ctaLabel="Promote Business"
            featurePills={["📅 Bookings", "⭐ Reviews", "🎯 Leads", "📣 Ads"]}
          />
        )}
      </View>
    );
  }

  if (!selectedCardId && !selectedPromotionId) {
    return (
      <View className="flex-1 bg-background">
        {header}
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-bold text-foreground">No Promotion Selected</Text>
          <Text className="text-sm text-muted-foreground text-center mt-1">
            Select a promoted business from the business selector to view its dashboard.
          </Text>
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
      {header}

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4" refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }>
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
            {scopedEvents.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <Text className="text-sm text-muted-foreground">No events created yet</Text>
              </View>
            ) : (
              scopedEvents.map((e: any) => {
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
            {scopedVouchers.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <Text className="text-sm text-muted-foreground">No vouchers created yet</Text>
              </View>
            ) : (
              scopedVouchers.map((v: any) => {
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
                      🎫 {v.claimed_count || 0} claimed
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
            {selectedCardId || selectedPromotionId ? (
              <LeadsManager businessCardId={selectedCardId ?? undefined} promotionId={selectedPromotionId} />
            ) : (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <Text className="text-sm text-muted-foreground">No listing selected</Text>
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
              {selectedCardId && (
                <View className="items-center gap-3">
                  <View className="bg-white p-4 rounded-xl">
                    <QRCode value={`https://instantlly.lovable.app/card/${selectedCardId}`} size={160} />
                  </View>
                  <Text className="text-xs text-muted-foreground text-center">
                    Scan to view your business card
                  </Text>
                </View>
              )}
            </View>

            {selectedCardId ? (
              <View className="gap-3">
                <BusinessHoursEditor businessCardId={selectedCardId} />
                <ServicePricingManager businessCardId={selectedCardId} />
                <PhotoGalleryManager businessCardId={selectedCardId} />
                <LocationManager businessCardId={selectedCardId} />
                <StaffManager businessCardId={selectedCardId} />
                <PushCampaigns businessCardId={selectedCardId} />
              </View>
            ) : (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
                <Text className="text-sm text-muted-foreground">Complete promotion profile setup to access tools</Text>
              </View>
            )}
          </TabsContent>
        </Tabs>
      </ScrollView>
    </View>
  );
};

export default BusinessDashboard;
