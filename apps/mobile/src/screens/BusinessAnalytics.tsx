import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  BarChart3,
  CalendarCheck,
  Eye,
  Globe,
  MapPin,
  MessageSquare,
  MousePointer,
  Phone,
  Star,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";
import { usePromotionContext, useSelectedBusinessCardId } from "../contexts/PromotionContext";
import { hasFeature } from "../utils/tierFeatures";
import { UpgradePrompt } from "../components/business/UpgradePrompt";
import { NoPromotionCTA } from "../components/business/NoPromotionCTA";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { useListPromotionBookingsQuery, useListBusinessBookingsQuery } from "../store/api/bookingsApi";
import { useGetPromotionReviewsQuery, useGetCardReviewsQuery } from "../store/api/reviewsApi";
import { useListPromotionLeadsQuery, useListBusinessLeadsQuery } from "../store/api/leadsApi";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { AppHeader } from "../components/ui/AppHeader";

const BusinessAnalytics = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { tier, selectedPromotionId, selectedPromotion, promotions } = usePromotionContext();
  const hasSelectedListing = Boolean(selectedPromotionId);
  const hasAnyPromotion = (promotions?.length ?? 0) > 0;
  const businessName = selectedPromotion?.business_name || "Business";
  const selectedCardId = useSelectedBusinessCardId();
  // Promotion is the source of truth; business card linkage is optional.
  const promotionIdNum = selectedPromotionId ? Number(selectedPromotionId) : null;
  const cardIds = selectedCardId ? [selectedCardId] : [];
  const hasAnalyticsScope = Boolean(promotionIdNum);
  console.log(`[BusinessAnalytics] render: selectedPromotionId=${selectedPromotionId} tier=${tier} canAccess=${hasFeature(tier, 'analytics')} selectedCardId=${selectedCardId} cardIds=${JSON.stringify(cardIds)}`);

  useEffect(() => {
    if (user && !selectedPromotionId && hasAnyPromotion) {
      navigation.navigate("BusinessSelectorScreen");
    }
  }, [user, selectedPromotionId, hasAnyPromotion, navigation]);

  const { data: analytics = [], isLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["card-analytics-full", selectedPromotionId, cardIds],
    queryFn: async () => {
      if (!promotionIdNum && cardIds.length === 0) return [];
      let query = supabase
        .from("card_analytics")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (promotionIdNum && cardIds.length > 0) {
        query = query.or(`business_promotion_id.eq.${promotionIdNum},business_card_id.in.(${cardIds.join(",")})`);
      } else if (promotionIdNum) {
        query = query.eq("business_promotion_id", promotionIdNum);
      } else {
        query = query.in("business_card_id", cardIds);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && hasSelectedListing && hasAnalyticsScope,
  });

  const cardIdForBackend = cardIds.length > 0 ? Number(cardIds[0]) : null;
  const promoIdForBackend = promotionIdNum ?? null;

  // Bookings: prefer card-scoped query (OR-includes promotion) when a card exists, else promotion-scoped.
  const bookingsCardQuery = useListBusinessBookingsQuery(
    cardIdForBackend ? { businessId: cardIdForBackend, promotionId: promoIdForBackend ?? undefined } : ({} as any),
    { skip: !cardIdForBackend }
  );
  const bookingsPromoQuery = useListPromotionBookingsQuery(
    promoIdForBackend ? { promotionId: promoIdForBackend } : ({} as any),
    { skip: !promoIdForBackend || !!cardIdForBackend }
  );
  const bookingsRaw = cardIdForBackend ? bookingsCardQuery.data : bookingsPromoQuery.data;
  const refetchBookings = cardIdForBackend ? bookingsCardQuery.refetch : bookingsPromoQuery.refetch;
  const bookings: any[] = bookingsRaw?.data ?? [];

  // Reviews via backend
  const reviewsCardQuery = useGetCardReviewsQuery(cardIdForBackend ?? 0, { skip: !cardIdForBackend });
  const reviewsPromoQuery = useGetPromotionReviewsQuery(promoIdForBackend ?? 0, { skip: !promoIdForBackend || !!cardIdForBackend });
  const reviews: any[] = (cardIdForBackend ? reviewsCardQuery.data : reviewsPromoQuery.data) ?? [];
  const refetchReviews = cardIdForBackend ? reviewsCardQuery.refetch : reviewsPromoQuery.refetch;

  // Leads via backend
  const leadsCardQuery = useListBusinessLeadsQuery(
    cardIdForBackend ? { businessId: cardIdForBackend, promotionId: promoIdForBackend ?? undefined } : ({} as any),
    { skip: !cardIdForBackend }
  );
  const leadsPromoQuery = useListPromotionLeadsQuery(
    promoIdForBackend ? { promotionId: promoIdForBackend } : ({} as any),
    { skip: !promoIdForBackend || !!cardIdForBackend }
  );
  const leadsRaw = cardIdForBackend ? leadsCardQuery.data : leadsPromoQuery.data;
  const refetchLeads = cardIdForBackend ? leadsCardQuery.refetch : leadsPromoQuery.refetch;
  const leads: any[] = leadsRaw?.data ?? [];

  const views = analytics.filter((a) => a.event_type === "view").length;
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchAnalytics(), refetchBookings(), refetchReviews(), refetchLeads()]); } finally { setRefreshing(false); }
  }, [refetchAnalytics, refetchBookings, refetchReviews, refetchLeads]);
  const phoneClicks = analytics.filter((a) => a.event_type === "phone_click").length;
  const directionClicks = analytics.filter((a) => a.event_type === "direction_click").length;
  const messageClicks = analytics.filter((a) => a.event_type === "message_click").length;
  const websiteClicks = analytics.filter((a) => a.event_type === "website_click").length;
  const uniqueVisitors = new Set(
    analytics.filter((a) => a.visitor_id).map((a) => a.visitor_id)
  ).size;

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "—";
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const newLeads = leads.filter((l: any) => l.status === "new").length;

  const dailyData = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - i));
      const dayStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
      const viewCount = analytics.filter((a) => {
        const d = new Date(a.created_at);
        return d >= dayStart && d <= dayEnd && a.event_type === "view";
      }).length;
      const bookingCount = bookings.filter((b) => {
        const d = new Date(b.created_at);
        return d >= dayStart && d <= dayEnd;
      }).length;
      const leadCount = leads.filter((l: any) => {
        const d = new Date(l.created_at);
        return d >= dayStart && d <= dayEnd;
      }).length;
      return { day: dayStr, views: viewCount, bookings: bookingCount, leads: leadCount };
    });
  }, [analytics, bookings, leads]);

  const hourlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const hour = i + 8;
      const label = hour <= 12 ? `${hour}AM` : `${hour - 12}PM`;
      const count = analytics.filter((a) => new Date(a.created_at).getHours() === hour).length;
      return { hour: label, views: count };
    });
  }, [analytics]);

  const isPendingPayment = selectedPromotion?.status === "pending_payment";
  const isExpired = selectedPromotion?.status === "expired";
  const isTierLocked = !hasFeature(tier, "analytics");
  const canShowAnalyticsBody = !!user && hasSelectedListing && hasAnalyticsScope && !isPendingPayment && !isExpired && !isTierLocked;

  const body = !user ? (
    <View className="flex-1 items-center justify-center px-6">
      <BarChart3 size={48} color="#c0c4cc" />
      <Text className="text-sm text-muted-foreground mt-3 mb-4">Sign in to view analytics</Text>
      <Button onPress={() => navigation.navigate("Auth")} className="rounded-xl">
        Sign In
      </Button>
    </View>
  ) : !hasSelectedListing ? (
    hasAnyPromotion ? (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-sm text-muted-foreground">Opening business selector...</Text>
      </View>
    ) : (
      <NoPromotionCTA
        title="Analytics needs a promoted business"
        description="Promote a business to unlock views, clicks, bookings and lead analytics."
        ctaLabel="Promote Business"
      />
    )
  ) : isPendingPayment ? (
    <UpgradePrompt
      feature="analytics"
      promotionId={selectedPromotionId}
      businessName={selectedPromotion?.business_name}
      ctaLabel={`Complete payment for ${selectedPromotion?.business_name || "this business"}`}
      message={`Complete payment for ${selectedPromotion?.business_name || "this business"} to view analytics.`}
    />
  ) : isExpired ? (
    <UpgradePrompt
      feature="analytics"
      promotionId={selectedPromotionId}
      businessName={selectedPromotion?.business_name}
      ctaLabel={`Renew ${selectedPromotion?.business_name || "this business"} plan`}
      message={`Renew your plan to continue analytics for ${selectedPromotion?.business_name || "this business"}.`}
    />
  ) : isTierLocked ? (
    <UpgradePrompt
      feature="analytics"
      promotionId={selectedPromotionId}
      businessName={selectedPromotion?.business_name}
      message={`Upgrade this business to view analytics for ${selectedPromotion?.business_name || "this listing"}.`}
    />
  ) : (
    <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />}>
      <View className="rounded-2xl border border-border bg-primary/5 p-4 gap-3">
        <View className="flex-row items-center gap-2">
          <TrendingUp size={16} color="#2563eb" />
          <Text className="text-sm font-bold text-foreground">This Week's Summary</Text>
        </View>
        <View className="flex-row flex-wrap gap-2">
          {[
            { label: "Views", value: views, emoji: "👁️" },
            { label: "Bookings", value: bookings.length, emoji: "📅" },
            { label: "Leads", value: leads.length, emoji: "🎯" },
            { label: "Rating", value: avgRating, emoji: "⭐" },
          ].map((s) => (
            <View key={s.label} className="w-[48%] rounded-xl bg-card border border-border p-2.5 items-center">
              <Text className="text-lg">{s.emoji}</Text>
              <Text className="text-base font-bold text-foreground">{isLoading ? "..." : s.value}</Text>
              <Text className="text-[9px] text-muted-foreground">{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <Tabs defaultValue="overview" className="mt-4">
        <TabsList className="w-full bg-muted p-1 rounded-lg">
          <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
          <TabsTrigger value="engagement" className="flex-1 text-xs">Engagement</TabsTrigger>
          <TabsTrigger value="performance" className="flex-1 text-xs">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="gap-4 mt-3">
          <View className="flex-row gap-2">
            {[
              { icon: Eye, label: "Total Views", value: views },
              { icon: Phone, label: "Phone Clicks", value: phoneClicks },
              { icon: MapPin, label: "Directions", value: directionClicks },
            ].map((s) => (
              <View key={s.label} className="flex-1 rounded-xl border border-border bg-card p-3">
                <s.icon size={16} color="#2563eb" />
                <Text className="text-xl font-bold text-foreground mt-1">{isLoading ? "..." : s.value}</Text>
                <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
              </View>
            ))}
          </View>
          <View className="flex-row gap-2">
            {[
              { icon: MessageSquare, label: "Messages", value: messageClicks },
              { icon: Globe, label: "Website", value: websiteClicks },
              { icon: Users, label: "Unique Leads", value: uniqueVisitors },
            ].map((s) => (
              <View key={s.label} className="flex-1 rounded-xl border border-border bg-card p-3">
                <s.icon size={16} color="#2563eb" />
                <Text className="text-xl font-bold text-foreground mt-1">{isLoading ? "..." : s.value}</Text>
                <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
              </View>
            ))}
          </View>

          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-sm font-bold text-foreground mb-3">14-Day Trend</Text>
            <View className="gap-2">
              {dailyData.map((d) => (
                <View key={d.day} className="flex-row items-center gap-2">
                  <Text className="text-[10px] text-muted-foreground w-10">{d.day}</Text>
                  <View className="flex-1">
                    <Progress value={Math.min(100, (d.views / Math.max(1, views)) * 100)} className="h-2" />
                  </View>
                  <Text className="text-[10px] text-muted-foreground w-10">{d.views}</Text>
                </View>
              ))}
            </View>
          </View>
        </TabsContent>

        <TabsContent value="engagement" className="gap-4 mt-3">
          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-sm font-bold text-foreground mb-3">Activity Breakdown</Text>
            {[
              { label: "Views", value: views },
              { label: "Calls", value: phoneClicks },
              { label: "Directions", value: directionClicks },
              { label: "Messages", value: messageClicks },
              { label: "Website", value: websiteClicks },
            ].map((d) => (
              <View key={d.label} className="flex-row items-center justify-between py-1">
                <Text className="text-xs text-muted-foreground">{d.label}</Text>
                <Text className="text-xs font-semibold text-foreground">{d.value}</Text>
              </View>
            ))}
          </View>

          <View className="rounded-xl border border-border bg-card p-4">
            <Text className="text-sm font-bold text-foreground mb-3">Peak Activity Hours</Text>
            <View className="gap-2">
              {hourlyData.map((h) => (
                <View key={h.hour} className="flex-row items-center gap-2">
                  <Text className="text-[10px] text-muted-foreground w-12">{h.hour}</Text>
                  <View className="flex-1">
                    <Progress value={Math.min(100, (h.views / Math.max(1, views)) * 100)} className="h-2" />
                  </View>
                  <Text className="text-[10px] text-muted-foreground w-8">{h.views}</Text>
                </View>
              ))}
            </View>
          </View>
        </TabsContent>

        <TabsContent value="performance" className="gap-4 mt-3">
          <View className="flex-row flex-wrap gap-2">
            {[
              { icon: CalendarCheck, label: "Total Bookings", value: bookings.length, sub: `${completedBookings} completed` },
              { icon: Star, label: "Avg Rating", value: avgRating, sub: `${reviews.length} reviews` },
              { icon: Target, label: "Total Leads", value: leads.length, sub: `${newLeads} new` },
              { icon: Users, label: "Unique Visitors", value: uniqueVisitors, sub: "from analytics" },
            ].map((s) => (
              <View key={s.label} className="w-[48%] rounded-xl border border-border bg-card p-3">
                <s.icon size={16} color="#2563eb" />
                <Text className="text-xl font-bold text-foreground mt-1">{isLoading ? "..." : s.value}</Text>
                <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
                <Text className="text-[9px] text-muted-foreground/70">{s.sub}</Text>
              </View>
            ))}
          </View>

          <View className="rounded-xl border border-border bg-card p-4 gap-3">
            <Text className="text-sm font-bold text-foreground">Conversion Funnel</Text>
            {[
              { label: "Profile Views", value: views, pct: 100 },
              {
                label: "Contact Actions",
                value: phoneClicks + messageClicks + directionClicks,
                pct: views > 0 ? Math.round(((phoneClicks + messageClicks + directionClicks) / views) * 100) : 0,
              },
              {
                label: "Lead Inquiries",
                value: leads.length,
                pct: views > 0 ? Math.round((leads.length / views) * 100) : 0,
              },
              {
                label: "Bookings Made",
                value: bookings.length,
                pct: views > 0 ? Math.round((bookings.length / views) * 100) : 0,
              },
            ].map((step) => (
              <View key={step.label} className="gap-1">
                <View className="flex-row justify-between">
                  <Text className="text-xs text-foreground">{step.label}</Text>
                  <Text className="text-xs text-muted-foreground">
                    {step.value} ({step.pct}%)
                  </Text>
                </View>
                <Progress value={step.pct} className="h-2" />
              </View>
            ))}
          </View>

          <View>
            <View className="flex-row items-center gap-2 mb-3">
              <Target size={16} color="#2563eb" />
              <Text className="text-sm font-bold text-foreground">Recent Leads</Text>
            </View>
            {leads.length === 0 ? (
              <View className="rounded-xl border border-dashed border-border bg-muted/30 p-6 items-center">
                <Text className="text-xs text-muted-foreground">
                  No leads yet. Share your card to start getting inquiries.
                </Text>
              </View>
            ) : (
              <View className="gap-2">
                {leads.slice(0, 5).map((lead: any) => (
                  <View key={lead.id} className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <View className="h-9 w-9 items-center justify-center rounded-full bg-muted">
                      <Text>🎯</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium text-foreground">{lead.full_name}</Text>
                      <Text className="text-[10px] text-muted-foreground">
                        {new Date(lead.created_at).toLocaleString("en-IN", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <Text
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        lead.status === "new"
                          ? "bg-blue-100 text-blue-700"
                          : lead.status === "converted"
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {lead.status}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </TabsContent>
      </Tabs>
    </ScrollView>
  );

  return (
    <View className="flex-1 bg-background">
      <AppHeader
        title="Business Insights"
        onBack={() => navigation.goBack()}
        rightWidth={72}
        rightAction={
          canShowAnalyticsBody ? (
            <View className="rounded-full bg-primary/10 px-2 py-0.5 flex-row items-center gap-1">
              <Zap size={12} color="#2563eb" />
              <Text className="text-[10px] font-semibold text-primary">Live</Text>
            </View>
          ) : undefined
        }
        switchLabel={hasSelectedListing ? businessName : undefined}
        onSwitchPress={hasSelectedListing ? () => navigation.navigate("BusinessSelectorScreen") : undefined}
      />

      {body}
    </View>
  );
};

export default BusinessAnalytics;

