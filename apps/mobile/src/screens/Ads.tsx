import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { BarChart3, Lock, Megaphone, Plus, RefreshCw, TrendingUp } from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { AppHeader } from "../components/ui/AppHeader";
import { useAdCampaigns } from "../hooks/useAds";
import { useAuth } from "../hooks/useAuth";
import { usePromotionContext } from "../contexts/PromotionContext";
import { hasFeature } from "../utils/tierFeatures";
import { UpgradePrompt } from "../components/business/UpgradePrompt";
import { NoPromotionCTA } from "../components/business/NoPromotionCTA";
import { useIconColor } from "../theme/colors";

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-600",
  paused: "bg-yellow-500/10 text-yellow-600",
  completed: "bg-muted text-muted-foreground",
};

const approvalColors: Record<string, string> = {
  approved: "bg-green-500/10 text-green-600",
  pending: "bg-orange-500/10 text-orange-600",
  rejected: "bg-red-500/10 text-red-600",
};

const approvalLabels: Record<string, string> = {
  approved: "Approved",
  pending: "Pending Approval",
  rejected: "Rejected",
};

const typeEmoji: Record<string, string> = {
  banner: "📣",
  featured: "⭐",
  sponsored: "🚀",
};

const demoAds = [
  { id: "demo-1", emoji: "📣", title: "Summer Sale Campaign", type: "Banner Ad", impressions: "12.5K", clicks: "342", status: "active" },
  { id: "demo-2", emoji: "⭐", title: "Featured Business Listing", type: "Featured", impressions: "8.2K", clicks: "189", status: "active" },
  { id: "demo-3", emoji: "🚀", title: "Diwali Special Promo", type: "Sponsored Card", impressions: "25.1K", clicks: "567", status: "completed" },
];

const Ads = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { tier, selectedPromotionId, selectedPromotion, promotions } = usePromotionContext();
  const hasSelectedListing = Boolean(selectedPromotionId);
  const hasAnyPromotion = (promotions?.length ?? 0) > 0;
  const canViewAds = hasSelectedListing && hasFeature(tier, "basic_ads");
  const canCreateAds = hasSelectedListing && hasFeature(tier, "ads");
  const promotionStatus = selectedPromotion?.status || "active";
  const businessName = selectedPromotion?.business_name || "Business";
  const { data: campaigns = [], isLoading, refetch: refetchCampaigns } = useAdCampaigns();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user && !selectedPromotionId && hasAnyPromotion) {
      navigation.navigate("BusinessSelectorScreen");
    }
  }, [user, selectedPromotionId, hasAnyPromotion, navigation]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchCampaigns();
    } finally {
      setRefreshing(false);
    }
  }, [refetchCampaigns]);

  const activeAds = campaigns.filter((a) => a.status === "active");
  const totalImpressions = campaigns.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = campaigns.reduce((s, a) => s + a.clicks, 0);

  if (user && !selectedPromotionId) {
    if (!hasAnyPromotion) {
      return (
        <View className="flex-1 bg-background">
          <AppHeader
            title="Ads Manager"
            className="bg-primary"
            titleClassName="text-xl font-bold text-primary-foreground"
          />
          <NoPromotionCTA
            title="Ads need a promoted business"
            description="Promote your business first to launch banner, featured and sponsored ad campaigns."
            ctaLabel="Promote Business"
            featurePills={["📣 Banner Ads", "⭐ Featured", "🚀 Sponsored", "📊 Stats"]}
          />
        </View>
      );
    }
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-muted-foreground">Opening business selector...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <AppHeader
        title="Ads Manager"
        className="bg-primary"
        titleClassName="text-xl font-bold text-primary-foreground"
        rightWidth={116}
        rightAction={
          <Button
            size="sm"
            variant="secondary"
            className="h-9 w-full gap-1"
            onPress={() => navigation.navigate("AdDashboard")}
          >
            <BarChart3 size={14} color={iconColor} /> Dashboard
          </Button>
        }
        switchLabel={user && hasSelectedListing ? businessName : undefined}
        onSwitchPress={user && hasSelectedListing ? () => navigation.navigate("BusinessSelectorScreen") : undefined}
        switchIcon={<RefreshCw size={14} color="#ffffff" />}
        switchClassName="min-h-[44px] w-full flex-row items-center rounded-xl border border-white/25 bg-white/15 px-3 py-2"
      />
      <View className="bg-primary px-4 pb-3">
        <Text className="text-xs text-primary-foreground/75">Promote your business to thousands</Text>
      </View>

      {user && promotionStatus === "pending_payment" ? (
        <UpgradePrompt
          feature="basic_ads"
          promotionId={selectedPromotionId}
          businessName={businessName}
          ctaLabel={`Complete payment for ${businessName}`}
          message={`Complete payment for ${businessName} to enable ads.`}
        />
      ) : user && promotionStatus === "expired" ? (
        <UpgradePrompt
          feature="basic_ads"
          promotionId={selectedPromotionId}
          businessName={businessName}
          ctaLabel={`Renew ${businessName}`}
          message={`Renew your plan to continue ads for ${businessName}.`}
        />
      ) : user && !canViewAds ? (
        <UpgradePrompt
          feature="basic_ads"
          promotionId={selectedPromotionId}
          businessName={businessName}
          message={`Upgrade ${businessName} to access ads.`}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 16 }}
          className="flex-1 px-4 py-4"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />}
        >
          {!user && (
            <View className="rounded-2xl border border-primary/20 bg-primary/5 p-4 items-center">
              <Lock size={32} color="#2563eb" />
              <Text className="text-base font-bold text-foreground mt-2">Sign in to manage your ads</Text>
              <Text className="text-xs text-muted-foreground mt-1 text-center">Create targeted campaigns and track performance</Text>
              <Button className="mt-3 rounded-xl" onPress={() => navigation.navigate("Auth")}>Sign In</Button>
            </View>
          )}

          {!user && (
            <View className="mt-4">
              <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Preview: Sample Campaigns</Text>
              <View className="flex-row gap-3 mb-4">
                {[
                  { value: "3", label: "Active Ads" },
                  { value: "45.8K", label: "Impressions" },
                  { value: "1,098", label: "Clicks" },
                ].map((s) => (
                  <View key={s.label} className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
                    <Text className="text-lg font-bold text-foreground">{s.value}</Text>
                    <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
                  </View>
                ))}
              </View>
              <View className="gap-3 opacity-80">
                {demoAds.map((ad) => (
                  <View key={ad.id} className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
                    <Text className="text-2xl">{ad.emoji}</Text>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{ad.title}</Text>
                      <Text className="text-xs text-muted-foreground">{ad.impressions} views • {ad.clicks} clicks</Text>
                    </View>
                    <Badge className={`border-none text-[10px] ${statusColors[ad.status] || statusColors.active}`}>{ad.status}</Badge>
                  </View>
                ))}
              </View>
            </View>
          )}

          {user && (
            <View className="mt-2 flex-row gap-3">
              <View className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
                <Text className="text-lg font-bold text-foreground">{activeAds.length}</Text>
                <Text className="text-[10px] text-muted-foreground">Active Ads</Text>
              </View>
              <View className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
                <Text className="text-lg font-bold text-foreground">{totalImpressions > 1000 ? `${(totalImpressions / 1000).toFixed(1)}K` : totalImpressions}</Text>
                <Text className="text-[10px] text-muted-foreground">Impressions</Text>
              </View>
              <View className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
                <Text className="text-lg font-bold text-foreground">{totalClicks.toLocaleString()}</Text>
                <Text className="text-[10px] text-muted-foreground">Clicks</Text>
              </View>
            </View>
          )}

          <View className="mt-4 rounded-2xl border border-border p-5 items-center overflow-hidden">
            <View className="absolute inset-0 bg-primary/10" />
            <View className="absolute right-0 top-0 bottom-0 w-1/2 bg-accent/10" />
            <Megaphone size={32} color="#2563eb" />
            <Text className="text-lg font-bold text-foreground mt-2">Reach More Customers</Text>
            <Text className="text-sm text-muted-foreground text-center mt-1">Create targeted ads that appear across the platform</Text>
            <View className="flex-row gap-2 mt-4 w-full">
              <Button className="flex-1 gap-2 rounded-xl" disabled={!canCreateAds} onPress={() => navigation.navigate("AdCreate")}>
                <Plus size={16} color="#ffffff" /> {canCreateAds ? "Create Ad" : "Boost+ Required"}
              </Button>
              <Button variant="outline" className="flex-1 gap-2 rounded-xl" onPress={() => navigation.navigate("AdDashboard")}>
                <TrendingUp size={16} color={iconColor} /> View Stats
              </Button>
            </View>
          </View>

          <View className="mt-4">
            <Text className="text-lg font-semibold text-foreground mb-3">Ad Formats</Text>
            <View className="gap-3">
              {[
                { emoji: "📣", name: "Banner Ads", desc: "Eye-catching banners across Home, Events & Vouchers", price: "From Rs 100/day" },
                { emoji: "⭐", name: "Featured Listing", desc: "Top placement in category and search results", price: "From Rs 200/day" },
                { emoji: "🚀", name: "Sponsored Card", desc: "Promoted business card in the directory", price: "From Rs 150/day" },
              ].map((t) => (
                <Pressable key={t.name} onPress={() => canCreateAds && navigation.navigate("AdCreate")} className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-4">
                  <Text className="text-3xl">{t.emoji}</Text>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{t.name}</Text>
                    <Text className="text-xs text-muted-foreground">{t.desc}</Text>
                  </View>
                  <Text className="text-xs font-medium text-primary">{t.price}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {user && (
            <View className="mt-5">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-lg font-semibold text-foreground">Recent Campaigns</Text>
                <Pressable onPress={() => navigation.navigate("AdDashboard")}>
                  <Text className="text-sm text-primary font-medium">See All</Text>
                </Pressable>
              </View>
              {isLoading ? (
                <View className="gap-3">{[1, 2].map((i) => (<Skeleton key={i} className="h-16 w-full rounded-xl" />))}</View>
              ) : campaigns.length === 0 ? (
                <View className="items-center py-8">
                  <Megaphone size={32} color="#c0c4cc" />
                  <Text className="text-xs text-muted-foreground mt-2">No campaigns yet. Create your first ad!</Text>
                </View>
              ) : (
                <View className="gap-3">
                  {campaigns.slice(0, 3).map((ad) => (
                    <View key={ad.id} className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
                      <Text className="text-2xl">{typeEmoji[ad.ad_type] || "📣"}</Text>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>{ad.title}</Text>
                        <Text className="text-xs text-muted-foreground">{ad.impressions.toLocaleString()} views • {ad.clicks} clicks</Text>
                      </View>
                      {ad.approval_status !== "approved" ? (
                        <Badge className={`border-none text-[10px] ${approvalColors[ad.approval_status] || approvalColors.pending}`}>
                          {approvalLabels[ad.approval_status] || ad.approval_status}
                        </Badge>
                      ) : (
                        <Badge className={`border-none text-[10px] ${statusColors[ad.status] || statusColors.active}`}>
                          {ad.status}
                        </Badge>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

export default Ads;
