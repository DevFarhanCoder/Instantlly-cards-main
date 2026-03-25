import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Star, ChevronRight, Clock, Ticket, Users } from "lucide-react";
import BannerAdSlot from "@/components/ads/BannerAdSlot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { voucherCategories } from "@/data/categories";
import { useVouchers, type Voucher } from "@/hooks/useVouchers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";

const emojiImages: Record<string, string> = {
  travel: "🏖️", beauty: "💆", food: "🍽️", health: "💪",
  shopping: "🛍️", entertainment: "🎬", activities: "🏄", education: "📚", general: "🎁",
};

const getExpiryLabel = (expiresAt: string | null) => {
  if (!expiresAt) return "No expiry";
  const days = differenceInDays(new Date(expiresAt), new Date());
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  return `${days} days left`;
};

const Vouchers = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: vouchers = [], isLoading } = useVouchers();

  // Fetch claim counts per voucher
  const { data: claimCounts = {} } = useQuery({
    queryKey: ["voucher-claim-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claimed_vouchers")
        .select("voucher_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.voucher_id] = (counts[r.voucher_id] || 0) + 1;
      });
      return counts;
    },
  });

  const filteredVouchers = vouchers.filter((v) => {
    const matchesSearch =
      !searchQuery ||
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (v.subtitle || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || v.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredVouchers = filteredVouchers.filter((v) => v.is_popular);
  const trendingDeals = filteredVouchers.slice(0, 4);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-primary px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💎</span>
            <h1 className="text-xl font-bold text-primary-foreground">Vouchers Market</h1>
          </div>
          <Link to="/my-vouchers">
            <Button size="sm" variant="secondary" className="text-xs gap-1">
              <Ticket className="h-3.5 w-3.5" /> My Vouchers
            </Button>
          </Link>
        </div>
        <p className="mt-1 text-xs text-primary-foreground/70">Best deals & discounts near you</p>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-5">
        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search vouchers, merchants..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 pr-10 bg-card" />
          <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8">
            <Filter className="h-4 w-4 text-muted-foreground" />
          </Button>
        </motion.div>

        {/* Hero Banner */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="overflow-hidden bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-none mb-2">Most Trusted Platform</Badge>
                <h2 className="text-2xl font-bold mb-1">India's #1 Voucher Marketplace</h2>
                <p className="text-sm opacity-80 mb-4">Trusted by 1M+ Happy Customers</p>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[["1M+", "Happy Customers"], ["5000+", "Partners"], ["50+", "Cities"]].map(([val, lbl]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-xl font-bold">{val}</p>
                    <p className="text-[11px] opacity-80">{lbl}</p>
                  </div>
                ))}
              </div>
              <Button className="w-full bg-primary-foreground text-primary hover:bg-primary-foreground/90 font-semibold active:scale-[0.97] transition-transform">
                Start Shopping →
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <BannerAdSlot />

        {/* Categories */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Browse Categories</h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {voucherCategories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card shadow-sm hover:shadow-md transition-all active:scale-[0.96]",
                  selectedCategory === cat.id && "ring-2 ring-primary shadow-md")}>
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium text-foreground">{cat.name}</span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Featured */}
        {featuredVouchers.length > 0 && (
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">Featured Vouchers</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {featuredVouchers.map((v) => (
                <Link key={v.id} to={`/vouchers/${v.id}`} className="min-w-[260px] snap-start rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]">
                  <div className="relative h-36 bg-muted flex items-center justify-center">
                    <span className="text-6xl">{emojiImages[v.category] || "🎁"}</span>
                    {v.discount_label && (
                      <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground border-none text-xs">{v.discount_label}</Badge>
                    )}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur-sm">
                      <Clock className="h-3 w-3" />{getExpiryLabel(v.expires_at)}
                    </div>
                  </div>
                   <div className="p-3">
                    <h3 className="font-semibold text-sm text-foreground">{v.title}</h3>
                    <p className="text-xs text-muted-foreground">{v.subtitle}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary">₹{v.discounted_price.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground line-through">₹{v.original_price.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" />{claimCounts[v.id] || 0} bought
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* Trending/All */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {isLoading ? "Loading..." : filteredVouchers.length === 0 ? "No vouchers found" : "Trending Deals 🔥"}
          </h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
            </div>
          ) : filteredVouchers.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <span className="text-5xl mb-3">📭</span>
              <p className="text-sm text-muted-foreground">No vouchers available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredVouchers.map((d) => (
                <Link key={d.id} to={`/vouchers/${d.id}`} className="flex gap-3 bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] relative">
                  <div className="w-24 h-24 bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl">{emojiImages[d.category] || "🎁"}</span>
                  </div>
                  <div className="py-3 pr-4 flex flex-col justify-center flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      {d.discount_label && (
                        <Badge className="w-fit bg-primary/10 text-primary border-none text-[10px]">{d.discount_label}</Badge>
                      )}
                      <span className="flex items-center gap-0.5 ml-auto text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" />{claimCounts[d.id] || 0} bought
                      </span>
                    </div>
                    <h3 className="font-semibold text-sm leading-tight text-foreground">{d.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-primary">₹{d.discounted_price.toLocaleString()}</span>
                      <span className="text-xs text-muted-foreground line-through">₹{d.original_price.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />{getExpiryLabel(d.expires_at)}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default Vouchers;
