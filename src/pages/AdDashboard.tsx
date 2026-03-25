import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, TrendingUp, Eye, MousePointerClick, Pause, Play, Loader2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAdCampaigns, useUpdateAdCampaign, type AdCampaign } from "@/hooks/useAds";
import { useAdVariants, type ActiveAdVariant } from "@/hooks/useActiveAds";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

function VariantStats({ campaignId }: { campaignId: string }) {
  const { data: variants = [] } = useAdVariants(campaignId);
  if (variants.length < 2) return null;

  const bestVariant = variants.reduce((best, v) =>
    (v.impressions > 0 ? v.clicks / v.impressions : 0) > (best.impressions > 0 ? best.clicks / best.impressions : 0) ? v : best
  , variants[0]);

  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase">A/B Variants</p>
      {variants.map((v) => {
        const ctr = v.impressions > 0 ? ((v.clicks / v.impressions) * 100).toFixed(1) : "0";
        const isWinner = v.id === bestVariant.id && variants.length > 1;
        return (
          <div key={v.id} className="flex items-center gap-2 text-xs">
            <span className={cn("font-bold w-5", isWinner ? "text-yellow-600" : "text-muted-foreground")}>
              {isWinner && <Trophy className="h-3 w-3 inline" />} {v.label}
            </span>
            {v.creative_url && (
              <img src={v.creative_url} alt={v.label} className="h-6 w-6 rounded object-cover" />
            )}
            <span className="text-muted-foreground">{v.impressions} views</span>
            <span className="text-muted-foreground">{v.clicks} clicks</span>
            <span className="text-foreground font-medium">{ctr}% CTR</span>
          </div>
        );
      })}
    </div>
  );
}

const AdDashboard = () => {
  const navigate = useNavigate();
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
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
          <h1 className="text-lg font-bold text-foreground">Ad Dashboard</h1>
        </div>
        <Button size="sm" className="gap-1 rounded-lg" onClick={() => navigate("/ads/create")}>
          <Plus className="h-3.5 w-3.5" /> New Ad
        </Button>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Impressions", value: totalImpressions.toLocaleString(), icon: Eye, color: "text-primary" },
            { label: "Clicks", value: totalClicks.toLocaleString(), icon: MousePointerClick, color: "text-accent-foreground" },
            { label: "CTR", value: `${ctr}%`, icon: TrendingUp, color: "text-green-600" },
            { label: "Spent", value: `₹${totalSpent.toLocaleString()}`, icon: TrendingUp, color: "text-yellow-600" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <s.icon className={cn("h-4 w-4", s.color)} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Campaigns */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">Your Campaigns</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <span className="text-5xl mb-3">📭</span>
              <p className="text-sm text-muted-foreground">No campaigns yet</p>
              <Button className="mt-4 rounded-xl" onClick={() => navigate("/ads/create")}>Create First Ad</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((ad, i) => {
                const budgetPct = ad.total_budget > 0 ? Math.min((ad.spent / ad.total_budget) * 100, 100) : 0;
                return (
                  <motion.div key={ad.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-start gap-3">
                        {ad.creative_url ? (
                          <img src={ad.creative_url} alt={ad.title} className="h-10 w-10 rounded-lg object-cover" />
                        ) : (
                          <span className="text-2xl">{typeEmoji[ad.ad_type] || "📣"}</span>
                        )}
                        <div>
                          <h3 className="text-sm font-semibold text-foreground">{ad.title}</h3>
                          <p className="text-xs text-muted-foreground capitalize">{ad.ad_type} Ad</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge className={cn("border-none text-[10px]", statusColors[ad.status] || statusColors.active)}>{ad.status}</Badge>
                        <Badge variant="outline" className="text-[10px]">{ad.approval_status}</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="text-center"><p className="text-xs text-muted-foreground">Views</p><p className="text-sm font-semibold text-foreground">{ad.impressions.toLocaleString()}</p></div>
                      <div className="text-center"><p className="text-xs text-muted-foreground">Clicks</p><p className="text-sm font-semibold text-foreground">{ad.clicks.toLocaleString()}</p></div>
                      <div className="text-center"><p className="text-xs text-muted-foreground">Spent</p><p className="text-sm font-semibold text-foreground">₹{ad.spent.toLocaleString()}</p></div>
                    </div>

                    {/* Budget progress bar */}
                    <div className="mb-2">
                      <Progress value={budgetPct} className="h-2" />
                      <p className="text-[10px] text-muted-foreground mt-1">
                        ₹{ad.spent.toLocaleString()} / ₹{ad.total_budget?.toLocaleString() || "—"} ({budgetPct.toFixed(0)}%)
                      </p>
                    </div>

                    {/* A/B Variant Stats */}
                    <VariantStats campaignId={ad.id} />

                    {ad.status !== "completed" && (
                      <Button variant="outline" size="sm" className="w-full gap-1 rounded-lg text-xs mt-2" onClick={() => toggleStatus(ad)} disabled={updateCampaign.isPending}>
                        {ad.status === "active" ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdDashboard;
