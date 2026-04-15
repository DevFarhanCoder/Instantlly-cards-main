import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
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
import { PromotionSelector } from "../components/business/PromotionSelector";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const BusinessAnalytics = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { tier, selectedPromotionId } = usePromotionContext();
  const selectedCardId = useSelectedBusinessCardId();
  // Scope analytics to the selected promotion's business card only
  const cardIds = selectedCardId ? [selectedCardId] : [];
  console.log(`[BusinessAnalytics] render: selectedPromotionId=${selectedPromotionId} tier=${tier} canAccess=${hasFeature(tier, 'analytics')} selectedCardId=${selectedCardId} cardIds=${JSON.stringify(cardIds)}`);

  const { data: analytics = [], isLoading, refetch: refetchAnalytics } = useQuery({
    queryKey: ["card-analytics-full", cardIds, selectedPromotionId],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("card_analytics")
        .select("*")
        .in("business_card_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && cardIds.length > 0,
  });

  const { data: bookings = [], refetch: refetchBookings } = useQuery({
    queryKey: ["analytics-bookings", cardIds, selectedPromotionId],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("business_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && cardIds.length > 0,
  });

  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ["analytics-reviews", cardIds, selectedPromotionId],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .in("business_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && cardIds.length > 0,
  });

  const { data: leads = [] } = useQuery({
    queryKey: ["analytics-leads", cardIds, selectedPromotionId],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("business_leads" as any)
        .select("*")
        .in("business_card_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user && cardIds.length > 0,
  });

  const views = analytics.filter((a) => a.event_type === "view").length;
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchAnalytics(), refetchBookings(), refetchReviews()]); } finally { setRefreshing(false); }
  }, [refetchAnalytics, refetchBookings, refetchReviews]);
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

  if (!user || cardIds.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <BarChart3 size={48} color="#c0c4cc" />
        <Text className="text-sm text-muted-foreground mt-3 mb-4">
          {!user ? "Sign in to view analytics" : !selectedPromotionId ? "Select a business listing first" : "No business card linked to this listing"}
        </Text>
        {!user && (
          <Button
            onPress={() => navigation.navigate("Auth")}
            className="rounded-xl"
          >
            Sign In
          </Button>
        )}
        {user && <PromotionSelector title="Select a listing" />}
      </View>
    );
  }

  if (!hasFeature(tier, 'analytics')) {
    return (
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-foreground">Business Insights</Text>
        </View>
        <PromotionSelector title="Select a listing to view analytics" />
        <UpgradePrompt feature="analytics" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Business Insights</Text>
        <View className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 flex-row items-center gap-1">
          <Zap size={12} color="#2563eb" />
          <Text className="text-[10px] font-semibold text-primary">Live</Text>
        </View>
      </View>

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
    </View>
  );
};

export default BusinessAnalytics;

