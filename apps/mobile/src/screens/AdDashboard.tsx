import { ScrollView, Text, View, Pressable, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Eye,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  TrendingUp,
  Trophy,
} from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import { Progress } from "../components/ui/progress";
import { useAdCampaigns, useUpdateAdCampaign, type AdCampaign } from "../hooks/useAds";
import { useAdVariants } from "../hooks/useActiveAds";

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-600",
  paused: "bg-yellow-500/10 text-yellow-600",
  completed: "bg-muted text-muted-foreground",
};

const typeEmoji: Record<string, string> = {
  banner: "🖼️",
  featured: "⭐",
  sponsored: "💳",
};

const VariantStats = ({ campaignId }: { campaignId: string }) => {
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
  const { data: campaigns = [], isLoading } = useAdCampaigns();
  const updateCampaign = useUpdateAdCampaign();

  const totalImpressions = campaigns.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = campaigns.reduce((s, a) => s + a.clicks, 0);
  const totalSpent = campaigns.reduce((s, a) => s + a.spent, 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0";

  const toggleStatus = (ad: AdCampaign) => {
    const newStatus = ad.status === "active" ? "paused" : "active";
    updateCampaign.mutate({ id: ad.id, status: newStatus });
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

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-5">
        <View className="flex-row flex-wrap gap-3">
          {[
            { label: "Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "#2563eb" },
            { label: "Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "#0f766e" },
            { label: "CTR", value: `${ctr}%`, icon: TrendingUp, color: "#16a34a" },
            { label: "Spent", value: `₹${totalSpent.toLocaleString()}`, icon: TrendingUp, color: "#ca8a04" },
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
                  ad.total_budget > 0 ? Math.min((ad.spent / ad.total_budget) * 100, 100) : 0;
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
                        <Badge className={`border-none text-[10px] ${statusColors[ad.status] || statusColors.active}`}>
                          {ad.status}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">{ad.approval_status}</Badge>
                      </View>
                    </View>

                    <View className="flex-row justify-between mb-3">
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

                    <View className="mb-2">
                      <Progress value={budgetPct} className="h-2" />
                      <Text className="text-[10px] text-muted-foreground mt-1">
                        ₹{ad.spent.toLocaleString()} / ₹{ad.total_budget?.toLocaleString() || "—"} ({budgetPct.toFixed(0)}%)
                      </Text>
                    </View>

                    <VariantStats campaignId={ad.id} />

                    {ad.status !== "completed" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-1 rounded-lg text-xs mt-2"
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

