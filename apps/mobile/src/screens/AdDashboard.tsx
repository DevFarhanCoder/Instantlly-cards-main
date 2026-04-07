import { useCallback, useState } from "react";
import { RefreshControl, ScrollView, Text, View, Pressable, Image, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Eye,
  IndianRupee,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  Trash2,
  TrendingUp,
  Trophy,
} from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Progress } from "../components/ui/progress";
import { useAdCampaigns, useUpdateAdCampaign, useDeleteAdCampaign, type AdCampaign } from "../hooks/useAds";
import { useAdVariants } from "../hooks/useActiveAds";

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
  banner: "🖼️",
  featured: "⭐",
  sponsored: "💳",
};

const VariantStats = ({ campaignId }: { campaignId: number }) => {
  const { data: variants = [] } = useAdVariants(campaignId);
  if (variants.length < 2) return null;

  const bestVariant = variants.reduce((best, v) =>
    (v.impressions > 0 ? v.clicks / v.impressions : 0) >
    (best.impressions > 0 ? best.clicks / best.impressions : 0)
      ? v
      : best
  , variants[0]);

  return (
    <View className="mt-2 gap-1.5">
      <Text className="text-[10px] font-semibold text-muted-foreground uppercase">A/B Variants</Text>
      {variants.map((v) => {
        const ctr = v.impressions > 0 ? ((v.clicks / v.impressions) * 100).toFixed(1) : "0";
        const isWinner = v.id === bestVariant.id && variants.length > 1;
        return (
          <View key={v.id} className="flex-row items-center gap-2">
            <View className="w-5">
              {isWinner ? <Trophy size={12} color="#ca8a04" /> : null}
            </View>
            {v.creative_url ? (
              <Image source={{ uri: v.creative_url }} style={{ height: 24, width: 24, borderRadius: 6 }} />
            ) : null}
            <Text className="text-[10px] text-muted-foreground">{v.impressions} views</Text>
            <Text className="text-[10px] text-muted-foreground">{v.clicks} clicks</Text>
            <Text className="text-[10px] text-foreground font-medium">{ctr}% CTR</Text>
          </View>
        );
      })}
    </View>
  );
};

const AdDashboard = () => {
  const navigation = useNavigation<any>();
  const { data: campaigns = [], isLoading, refetch: refetchCampaigns } = useAdCampaigns();
  const updateCampaign = useUpdateAdCampaign();
  const deleteCampaign = useDeleteAdCampaign();

  const totalImpressions = campaigns.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = campaigns.reduce((s, a) => s + a.clicks, 0);
  const totalSpent = campaigns.reduce((s, a) => s + a.spent, 0);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchCampaigns(); } finally { setRefreshing(false); }
  }, [refetchCampaigns]);

  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0";
  const cpc = totalClicks > 0 ? (totalSpent / totalClicks).toFixed(1) : "—";
  const cpm = totalImpressions > 0 ? ((totalSpent / totalImpressions) * 1000).toFixed(1) : "—";

  const toggleStatus = (ad: AdCampaign) => {
    const newStatus = ad.status === "active" ? "paused" : "active";
    updateCampaign.mutate({ id: ad.id, status: newStatus });
  };

  const handleDelete = (ad: AdCampaign) => {
    Alert.alert("Delete Campaign", `Delete "${ad.title}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => deleteCampaign.mutateAsync(ad.id).catch(() => {}),
      },
    ]);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color="#111827" />
          </Pressable>
          <Text className="text-lg font-bold text-foreground">Ad Dashboard</Text>
        </View>
        <Button size="sm" className="gap-1 rounded-lg" onPress={() => navigation.navigate("AdCreate")}>
          <Plus size={14} color="#ffffff" /> New Ad
        </Button>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-5" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />}>
        <View className="flex-row flex-wrap gap-3">
          {[
            { label: "Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "#2563eb" },
            { label: "Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "#0f766e" },
            { label: "CTR", value: `${ctr}%`, icon: TrendingUp, color: "#16a34a" },
            { label: "CPC", value: cpc === "—" ? "—" : `₹${cpc}`, icon: MousePointerClick, color: "#7c3aed" },
            { label: "CPM", value: cpm === "—" ? "—" : `₹${cpm}`, icon: IndianRupee, color: "#dc2626" },
            { label: "Spent", value: `₹${totalSpent.toLocaleString()}`, icon: IndianRupee, color: "#ca8a04" },
          ].map((s) => (
            <View key={s.label} className="w-[48%] rounded-xl border border-border bg-card p-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <s.icon size={14} color={s.color} />
                <Text className="text-xs text-muted-foreground">{s.label}</Text>
              </View>
              <Text className="text-lg font-bold text-foreground">{s.value}</Text>
            </View>
          ))}
        </View>

        <View className="mt-5">
          <Text className="text-base font-semibold text-foreground mb-3">Your Campaigns</Text>
          {isLoading ? (
            <View className="gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-xl" />
              ))}
            </View>
          ) : campaigns.length === 0 ? (
            <View className="items-center py-16">
              <Text className="text-5xl mb-3">📭</Text>
              <Text className="text-sm text-muted-foreground">No campaigns yet</Text>
              <Button className="mt-4 rounded-xl" onPress={() => navigation.navigate("AdCreate")}>
                Create First Ad
              </Button>
            </View>
          ) : (
            <View className="gap-3">
              {campaigns.map((ad) => {
                const budgetPct =
                  (ad.total_budget ?? 0) > 0 ? Math.min((ad.spent / ad.total_budget!) * 100, 100) : 0;
                return (
                  <View key={ad.id} className="rounded-xl border border-border bg-card p-4">
                    <View className="flex-row items-start justify-between mb-2">
                      <View className="flex-row items-start gap-3">
                        {ad.creative_url ? (
                          <Image source={{ uri: ad.creative_url }} style={{ height: 40, width: 40, borderRadius: 8 }} />
                        ) : (
                          <Text className="text-2xl">{typeEmoji[ad.ad_type] || "📣"}</Text>
                        )}
                        <View>
                          <Text className="text-sm font-semibold text-foreground">{ad.title}</Text>
                          <Text className="text-xs text-muted-foreground capitalize">{ad.ad_type} Ad</Text>
                        </View>
                      </View>
                      <View className="items-end gap-1">
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
                    </View>

                    <View className="flex-row justify-between mb-1">
                      {[
                        { label: "Views", value: ad.impressions.toLocaleString() },
                        { label: "Clicks", value: ad.clicks.toLocaleString() },
                        { label: "Spent", value: `₹${ad.spent.toLocaleString()}` },
                      ].map((s) => (
                        <View key={s.label} className="items-center flex-1">
                          <Text className="text-xs text-muted-foreground">{s.label}</Text>
                          <Text className="text-sm font-semibold text-foreground">{s.value}</Text>
                        </View>
                      ))}
                    </View>
                    <View className="flex-row justify-between mb-3">
                      {(() => {
                        const adCtr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0";
                        const adCpc = ad.clicks > 0 ? (ad.spent / ad.clicks).toFixed(1) : "—";
                        const adCpm = ad.impressions > 0 ? ((ad.spent / ad.impressions) * 1000).toFixed(1) : "—";
                        return [
                          { label: "CTR", value: `${adCtr}%` },
                          { label: "CPC", value: adCpc === "—" ? "—" : `₹${adCpc}` },
                          { label: "CPM", value: adCpm === "—" ? "—" : `₹${adCpm}` },
                        ];
                      })().map((s) => (
                        <View key={s.label} className="items-center flex-1">
                          <Text className="text-xs text-muted-foreground">{s.label}</Text>
                          <Text className="text-sm font-semibold text-foreground">{s.value}</Text>
                        </View>
                      ))}
                    </View>

                    <View className="mb-2">
                      <Progress value={budgetPct} className="h-2" />
                      <Text className="text-[10px] text-muted-foreground mt-1">
                        ₹{ad.spent.toLocaleString()} / ₹{ad.total_budget?.toLocaleString() || "—"} ({budgetPct.toFixed(0)}%)
                      </Text>
                    </View>

                    <VariantStats campaignId={ad.id} />

                    {ad.status !== "completed" && ad.approval_status === "approved" && (
                      <View className="flex-row gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-1 rounded-lg text-xs"
                          onPress={() => toggleStatus(ad)}
                          disabled={updateCampaign.isPending}
                        >
                          {ad.status === "active" ? (
                            <>
                              <Pause size={12} color="#111827" /> Pause
                            </>
                          ) : (
                            <>
                              <Play size={12} color="#111827" /> Resume
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 rounded-lg text-xs"
                          onPress={() => handleDelete(ad)}
                          disabled={deleteCampaign.isPending}
                        >
                          <Trash2 size={12} color="#ef4444" />
                        </Button>
                      </View>
                    )}
                    {(ad.status === "completed" || ad.approval_status !== "approved") && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 rounded-lg text-xs mt-2"
                        onPress={() => handleDelete(ad)}
                        disabled={deleteCampaign.isPending}
                      >
                        <Trash2 size={12} color="#ef4444" /> Delete
                      </Button>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default AdDashboard;

