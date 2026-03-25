import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Megaphone, TrendingUp, BarChart3, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdCampaigns, type AdCampaign } from "@/hooks/useAds";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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

const demoAds = [
  { id: "demo-1", emoji: "🖼️", title: "Summer Sale Campaign", type: "Banner Ad", impressions: "12.5K", clicks: "342", status: "active" },
  { id: "demo-2", emoji: "⭐", title: "Featured Business Listing", type: "Featured", impressions: "8.2K", clicks: "189", status: "active" },
  { id: "demo-3", emoji: "💳", title: "Diwali Special Promo", type: "Sponsored Card", impressions: "25.1K", clicks: "567", status: "completed" },
];

const Ads = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading } = useAdCampaigns();

  const activeAds = campaigns.filter((a) => a.status === "active");
  const totalImpressions = campaigns.reduce((s, a) => s + a.impressions, 0);
  const totalClicks = campaigns.reduce((s, a) => s + a.clicks, 0);

  return (
    <div className="min-h-screen">
      <div className="bg-primary px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📣</span>
            <h1 className="text-xl font-bold text-primary-foreground">Ads Manager</h1>
          </div>
          <div className="flex gap-2">
            <Link to="/ads/dashboard">
              <Button size="sm" variant="secondary" className="text-xs gap-1">
                <BarChart3 className="h-3.5 w-3.5" /> Dashboard
              </Button>
            </Link>
          </div>
        </div>
        <p className="mt-1 text-xs text-primary-foreground/70">Promote your business to thousands</p>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-5">
        {/* Sign-in banner for non-logged-in users */}
        {!user && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
            <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
            <h2 className="text-base font-bold text-foreground">Sign in to manage your ads</h2>
            <p className="mt-1 text-xs text-muted-foreground">Create targeted campaigns and track performance</p>
            <Button className="mt-3 rounded-xl" onClick={() => navigate("/auth")}>Sign In</Button>
          </div>
        )}

        {/* Demo campaigns for non-logged-in users */}
        {!user && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">📊 Preview: Sample Campaigns</p>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-foreground">3</p>
                <p className="text-[10px] text-muted-foreground">Active Ads</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-foreground">45.8K</p>
                <p className="text-[10px] text-muted-foreground">Impressions</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3 text-center">
                <p className="text-lg font-bold text-foreground">1,098</p>
                <p className="text-[10px] text-muted-foreground">Clicks</p>
              </div>
            </div>
            <div className="space-y-3 opacity-80">
              {demoAds.map((ad, i) => (
                <motion.div
                  key={ad.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
                >
                  <span className="text-2xl">{ad.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{ad.title}</h3>
                    <p className="text-xs text-muted-foreground">{ad.impressions} views • {ad.clicks} clicks</p>
                  </div>
                  <Badge className={cn("border-none text-[10px]", statusColors[ad.status] || statusColors.active)}>{ad.status}</Badge>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
        {/* Quick Stats */}
        {user && <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{activeAds.length}</p>
            <p className="text-[10px] text-muted-foreground">Active Ads</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{totalImpressions > 1000 ? `${(totalImpressions / 1000).toFixed(1)}K` : totalImpressions}</p>
            <p className="text-[10px] text-muted-foreground">Impressions</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-lg font-bold text-foreground">{totalClicks.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Clicks</p>
          </div>
        </motion.div>}

        {/* Create Ad CTA */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <div className="rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-border p-5 text-center">
            <Megaphone className="h-10 w-10 text-primary mx-auto mb-3" />
            <h2 className="text-lg font-bold text-foreground mb-1">Reach More Customers</h2>
            <p className="text-sm text-muted-foreground mb-4">Create targeted ads that appear across the platform</p>
            <div className="flex gap-2">
              <Link to="/ads/create" className="flex-1">
                <Button className="w-full gap-2 rounded-xl"><Plus className="h-4 w-4" /> Create Ad</Button>
              </Link>
              <Link to="/ads/dashboard" className="flex-1">
                <Button variant="outline" className="w-full gap-2 rounded-xl"><TrendingUp className="h-4 w-4" /> View Stats</Button>
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Ad Types */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <h2 className="text-lg font-semibold text-foreground mb-3">Ad Formats</h2>
          <div className="space-y-3">
            {[
              { emoji: "🖼️", name: "Banner Ads", desc: "Eye-catching banners across Home, Events & Vouchers", price: "From ₹100/day" },
              { emoji: "⭐", name: "Featured Listing", desc: "Top placement in category and search results", price: "From ₹200/day" },
              { emoji: "💳", name: "Sponsored Card", desc: "Promoted business card in the directory", price: "From ₹150/day" },
            ].map((t) => (
              <Link key={t.name} to="/ads/create" className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 hover:shadow-md transition-shadow active:scale-[0.98]">
                <span className="text-3xl">{t.emoji}</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{t.name}</h3>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </div>
                <span className="text-xs font-medium text-primary">{t.price}</span>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* Recent Campaigns */}
        {user && <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Recent Campaigns</h2>
            <Link to="/ads/dashboard" className="text-sm text-primary font-medium">See All</Link>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center py-8">
              <Megaphone className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-xs text-muted-foreground">No campaigns yet. Create your first ad!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.slice(0, 3).map((ad) => (
                <div key={ad.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <span className="text-2xl">{typeEmoji[ad.ad_type] || "📣"}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{ad.title}</h3>
                    <p className="text-xs text-muted-foreground">{ad.impressions.toLocaleString()} views • {ad.clicks} clicks</p>
                  </div>
                  <Badge className={cn("border-none text-[10px]", statusColors[ad.status] || statusColors.active)}>{ad.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </motion.section>}
      </div>
    </div>
  );
};

export default Ads;
