import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Plus, ArrowRight, MapPin, Phone, MessageCircle, Heart, Navigation, Star, Clock, X, SlidersHorizontal, Zap, Sparkles, Loader2, ShieldCheck, Ticket, TrendingUp, Gift } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/categories";
import { motion, AnimatePresence } from "framer-motion";
import BannerAdSlot from "@/components/ads/BannerAdSlot";
import { useNetworkCards } from "@/hooks/useContactSync";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useDirectoryCards, type DirectoryCard } from "@/hooks/useDirectoryCards";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserLocation, getDistanceKm, formatDistance } from "@/hooks/useUserLocation";
import { useReviews } from "@/hooks/useReviews";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTrendingBusinesses } from "@/hooks/useTrendingBusinesses";
import { useDealOfTheDay } from "@/hooks/useDealOfTheDay";

type ServiceMode = "all" | "home" | "visit";

// AI Recommendations Component
const AIRecommendations = ({ user, favoriteIds, userLocation, navigate }: {
  user: any;
  favoriteIds: string[];
  userLocation: any;
  navigate: (path: string) => void;
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai-recommendations", user?.id, favoriteIds.length],
    queryFn: async () => {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("ai-recommendations", {
        body: {
          userId: user.id,
          favoriteIds,
          location: userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null,
          recentCategories: [],
        },
      });
      if (fnError) throw fnError;
      return fnData?.recommendations || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="px-4 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary animate-pulse" />
          <h3 className="text-sm font-bold text-foreground">AI Recommendations</h3>
          <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin ml-auto" />
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-56 rounded-xl shrink-0" />)}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0 || error) return null;

  return (
    <div className="px-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Recommended for You</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
        {data.map((rec: any, i: number) => {
          const card = rec.card;
          if (!card) return null;
          return (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              onClick={() => navigate(`/business/${card.id}`)}
              className="w-56 shrink-0 cursor-pointer rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-card p-3.5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                  {card.logo_url ? <img src={card.logo_url} alt="" className="h-full w-full object-cover" /> : <span className="text-lg">🏢</span>}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-foreground truncate">{card.full_name}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{card.category}</p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{rec.reason}</p>
              {card.location && (
                <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {card.location}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Promoted Vouchers Component
const PromotedVouchers = ({ navigate }: { navigate: (path: string) => void }) => {
  const { data: vouchers = [], isLoading } = useQuery({
    queryKey: ["promoted-vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("status", "active")
        .eq("is_popular", true)
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || vouchers.length === 0) return null;

  return (
    <div className="px-4 mt-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Ticket className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Hot Deals & Vouchers</h3>
        </div>
        <button onClick={() => navigate("/vouchers")} className="text-xs font-medium text-primary">
          View All →
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
        {vouchers.map((v: any, i: number) => (
          <motion.div
            key={v.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => navigate(`/vouchers/${v.id}`)}
            className="w-48 shrink-0 cursor-pointer rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🎁</span>
              {v.discount_label && (
                <span className="rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[10px] font-bold">{v.discount_label}</span>
              )}
            </div>
            <h4 className="text-xs font-bold text-foreground line-clamp-2">{v.title}</h4>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-sm font-bold text-primary">₹{v.discounted_price}</span>
              <span className="text-[10px] text-muted-foreground line-through">₹{v.original_price}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Trending Businesses Section
const TrendingSection = ({ navigate }: { navigate: (path: string) => void }) => {
  const { data: trending = [], isLoading } = useTrendingBusinesses();
  if (isLoading || trending.length === 0) return null;

  return (
    <div className="px-4 mt-5">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Trending Now 🔥</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2">
        {trending.slice(0, 8).map((card: any, i: number) => (
          <motion.div
            key={card.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => navigate(`/business/${card.id}`)}
            className="w-44 shrink-0 cursor-pointer rounded-xl border border-border bg-card p-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                {card.logo_url ? <img src={card.logo_url} alt="" className="h-full w-full object-cover" /> : <span className="text-sm">🏢</span>}
              </div>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                #{i + 1}
              </span>
            </div>
            <h4 className="text-xs font-bold text-foreground truncate">{card.full_name}</h4>
            <p className="text-[10px] text-muted-foreground truncate">{card.category}</p>
            <p className="text-[10px] text-muted-foreground mt-1">👁 {card.viewCount} views this week</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// Deal of the Day Section
const DealOfTheDaySection = ({ navigate }: { navigate: (path: string) => void }) => {
  const { data: deal } = useDealOfTheDay();
  if (!deal) return null;

  const discountPct = Math.round(((deal.original_price - deal.discounted_price) / deal.original_price) * 100);

  return (
    <div className="px-4 mt-5">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={() => navigate(`/vouchers/${deal.id}`)}
        className="cursor-pointer rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-2 border-primary/20 p-4 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-2">
          <Gift className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">🔥 Deal of the Day</h3>
          <span className="ml-auto text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
            {discountPct}% OFF
          </span>
        </div>
        <h4 className="text-base font-bold text-foreground">{deal.title}</h4>
        {deal.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{deal.subtitle}</p>}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-lg font-bold text-primary">₹{deal.discounted_price}</span>
          <span className="text-sm text-muted-foreground line-through">₹{deal.original_price}</span>
        </div>
        <Button size="sm" className="mt-3 w-full rounded-xl gap-1.5">
          <Gift className="h-3.5 w-3.5" /> Grab This Deal
        </Button>
      </motion.div>
    </div>
  );
};


const Index = () => {
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(0); // 0 = any
  const searchRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toggleFavorite, isFavorite } = useFavorites();
  const { data: allCards = [], isLoading } = useDirectoryCards();
  const { data: networkCards = [], isLoading: isLoadingNetwork } = useNetworkCards();
  const userLocation = useUserLocation();
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  // Redirect admin users to admin dashboard
  useEffect(() => {
    if (!roleLoading && isAdmin) {
      navigate("/admin", { replace: true });
    }
  }, [isAdmin, roleLoading, navigate]);

  // Fetch featured/sponsored ad campaigns with linked business cards
  const { data: sponsoredCampaigns = [] } = useQuery({
    queryKey: ["sponsored-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*, business_cards!ad_campaigns_business_card_id_fkey(*)")
        .in("ad_type", ["featured", "sponsored"])
        .eq("status", "active")
        .eq("approval_status", "approved")
        .not("business_card_id", "is", null);
      if (error) throw error;
      return data || [];
    },
  });

  const displayedCategories = showAllCategories ? categories : categories.slice(0, 8);

  // Build auto-suggest from all cards
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const q = searchQuery.toLowerCase();
    const matches = new Set<string>();

    allCards.forEach((card) => {
      if (card.full_name.toLowerCase().includes(q)) matches.add(card.full_name);
      if (card.company_name?.toLowerCase().includes(q)) matches.add(card.company_name);
      if (card.category?.toLowerCase().includes(q)) matches.add(card.category);
      if (card.location?.toLowerCase().includes(q)) matches.add(card.location);
      (card.services || []).forEach((s) => {
        if (s.toLowerCase().includes(q)) matches.add(s);
      });
    });

    return Array.from(matches).slice(0, 6);
  }, [searchQuery, allCards]);

  // Check if business is likely open now (basic heuristic based on business_hours string)
  const isLikelyOpen = (hours: string | null): boolean | null => {
    if (!hours) return null;
    const now = new Date();
    const currentHour = now.getHours();
    // Simple heuristic: if "24" in hours -> always open; if hours mention AM/PM parse loosely
    if (hours.toLowerCase().includes("24 hours") || hours.toLowerCase().includes("24/7")) return true;
    if (hours.toLowerCase().includes("closed")) return false;
    // Default: assume open 9-21
    return currentHour >= 9 && currentHour <= 21;
  };

  // Get average rating for a card using reviews
  const { reviews } = useReviews(undefined as any);

  // Search + service mode + filter
  const filteredCards = useMemo(() => {
    let cards = allCards.filter((card) => {
      if (serviceMode === "home" && card.service_mode !== "home" && card.service_mode !== "both") return false;
      if (serviceMode === "visit" && card.service_mode !== "visit" && card.service_mode !== "both") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          card.full_name.toLowerCase().includes(q) ||
          (card.company_name?.toLowerCase().includes(q)) ||
          (card.category?.toLowerCase().includes(q)) ||
          (card.location?.toLowerCase().includes(q)) ||
          (card.services || []).some((s) => s.toLowerCase().includes(q)) ||
          (card.keywords?.toLowerCase().includes(q));
        if (!match) return false;
      }
      // Distance filter
      if (maxDistance > 0 && userLocation && card.latitude && card.longitude) {
        const dist = getDistanceKm(userLocation.latitude, userLocation.longitude, card.latitude, card.longitude);
        if (dist > maxDistance) return false;
      }
      return true;
    });

    return cards;
  }, [allCards, searchQuery, serviceMode, minRating, maxDistance, userLocation]);

  // Merge network cards (friends & family) at the top, then directory cards
  const displayCards = useMemo(() => {
    const networkIds = new Set(networkCards.map((c: any) => c.id));
    const directoryOnly = filteredCards.filter((c) => !networkIds.has(c.id));
    return [...networkCards.map((c: any) => ({ ...c, _isNetwork: true })), ...directoryOnly];
  }, [filteredCards, networkCards]);

  return (
    <div className="relative">
      {/* Service Mode Chooser */}
      <div className="sticky top-[60px] z-40 bg-card px-4 pb-3 pt-3 shadow-sm space-y-3">
        <div className="flex gap-2">
          {([
            { value: "all" as ServiceMode, label: "All", icon: "🔍" },
            { value: "home" as ServiceMode, label: "Home Services", icon: "🏠" },
            { value: "visit" as ServiceMode, label: "Visit Business", icon: "🏪" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setServiceMode(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold transition-colors ${
                serviceMode === opt.value
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              }`}
            >
              <span>{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>

        {/* Search with auto-suggest */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search businesses, services, location..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-20 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setShowSuggestions(false); }} className="p-1">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-1.5 rounded-lg transition-colors ${showFilters ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          {/* Auto-suggest dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-border bg-card shadow-lg overflow-hidden"
              >
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors text-left"
                    onMouseDown={(e) => { e.preventDefault(); setSearchQuery(s); setShowSuggestions(false); }}
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Min Rating:</span>
                  {[0, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      onClick={() => setMinRating(r)}
                      className={`flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                        minRating === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r === 0 ? "Any" : <><Star className="h-3 w-3 fill-current" /> {r}+</>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">Distance:</span>
                  {[0, 5, 10, 25, 50].map((d) => (
                    <button
                      key={d}
                      onClick={() => setMaxDistance(d)}
                      className={`flex items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] font-medium transition-colors ${
                        maxDistance === d ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {d === 0 ? "Any" : `${d}km`}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Onboarding Prompt */}
      {user && allCards.length === 0 && !isLoading && (
        <div className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <h3 className="text-sm font-bold text-foreground">Welcome to Instantly! 👋</h3>
          <p className="mt-1 text-xs text-muted-foreground">Create your first digital business card to appear in the directory and start networking.</p>
          <Button size="sm" className="mt-3 rounded-lg" onClick={() => navigate("/my-cards/create")}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Your Card
          </Button>
        </div>
      )}

      {/* Categories */}
      <div className="px-4 pt-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Categories</h2>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <Link to="/promote">
            <Button size="sm" className="rounded-lg bg-accent text-accent-foreground font-semibold text-xs px-4 hover:bg-accent/90">
              Promote Business
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {displayedCategories.map((cat, i) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => navigate(`/category/${cat.id}`)}
              className="group relative flex flex-col items-center gap-1.5"
            >
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-all group-hover:shadow-md group-hover:scale-105">
                <span className="text-2xl">{cat.emoji}</span>
              </div>
              <span className="text-[11px] font-medium text-foreground leading-tight text-center">
                {cat.name}
              </span>
            </motion.button>
          ))}
        </div>

        {!showAllCategories && (
          <button
            onClick={() => setShowAllCategories(true)}
            className="mt-3 flex w-full items-center justify-center gap-1 py-2 text-sm font-medium text-primary"
          >
            Show all categories <ArrowRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Promoted Vouchers */}
      <PromotedVouchers navigate={navigate} />

      {/* Deal of the Day */}
      <DealOfTheDaySection navigate={navigate} />

      {/* Trending Businesses */}
      <TrendingSection navigate={navigate} />

      {/* Sticky Banner Ad above bottom nav */}
      <BannerAdSlot variant="sticky" />

      {/* Sponsored Listings */}
      {sponsoredCampaigns.length > 0 && (
        <div className="px-4 mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-foreground">Sponsored</h3>
          </div>
          {sponsoredCampaigns.map((campaign: any) => {
            const card = campaign.business_cards;
            if (!card) return null;
            return (
              <Link key={campaign.id} to={`/business/${card.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-2xl border-2 border-amber-300/50 bg-gradient-to-r from-amber-50/50 to-card dark:from-amber-900/10 dark:to-card p-4 shadow-sm mb-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg overflow-hidden">
                        {card.logo_url ? <img src={card.logo_url} alt="" className="h-full w-full object-cover" /> : <span>🏢</span>}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground">{card.full_name}</h3>
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {card.category && <p className="text-xs text-muted-foreground">{card.category}</p>}
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 px-1.5 py-0.5 text-[10px] font-semibold">
                            <Zap className="h-2.5 w-2.5" /> Sponsored
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {campaign.description && (
                    <p className="mt-2 text-xs text-muted-foreground">{campaign.description}</p>
                  )}
                  {card.location && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {card.location}
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1 gap-1.5 rounded-lg text-xs" onClick={(e) => { e.preventDefault(); window.open(`tel:${card.phone}`); }}>
                      <Phone className="h-3.5 w-3.5" /> Call
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-lg text-xs" onClick={(e) => { e.preventDefault(); navigate("/messaging"); }}>
                      <MessageCircle className="h-3.5 w-3.5" /> Message
                    </Button>
                  </div>
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}

      {/* AI Recommendations */}
      {user && (
        <AIRecommendations
          user={user}
          favoriteIds={allCards.filter(c => isFavorite(c.id)).map(c => c.id)}
          userLocation={userLocation}
          navigate={navigate}
        />
      )}

      {/* Divider */}
      <div className="my-5 flex items-center gap-3 px-4">
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-base font-bold text-foreground">My Network Business Cards</h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Business Cards */}
      <div className="space-y-3 px-4 pb-4">
        {(isLoading || isLoadingNetwork) ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)
        ) : displayCards.length === 0 ? (
          <div className="flex flex-col items-center py-12">
            <span className="text-4xl mb-2">📭</span>
            <p className="text-sm text-muted-foreground">{searchQuery ? "No businesses match your search" : "No business cards yet"}</p>
            {searchQuery && (
              <Button variant="link" size="sm" onClick={() => setSearchQuery("")}>Clear search</Button>
            )}
          </div>
        ) : (
          displayCards.map((card: any) => {
            const openStatus = isLikelyOpen(card.business_hours);
            const isNetworkCard = card._isNetwork === true;
            return (
              <Link key={card.id} to={`/business/${card.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm mb-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg overflow-hidden">
                        {card.logo_url ? (
                          <img src={card.logo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span>🏢</span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-foreground flex items-center gap-1">
                          {card.full_name}
                          {(card as any).is_verified && <ShieldCheck className="h-4 w-4 text-primary" />}
                        </h3>
                        <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                          {card.category && <p className="text-xs text-muted-foreground">{card.category}</p>}
                          <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${card.service_mode === "home" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : card.service_mode === "both" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                            {card.service_mode === "home" ? "🏠 Home Service" : card.service_mode === "both" ? "🔄 Home & Visit" : "🏪 Visit"}
                          </span>
                          {openStatus !== null && (
                            <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${openStatus ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
                              <Clock className="h-2.5 w-2.5" />
                              {openStatus ? "Open" : "Closed"}
                            </span>
                          )}
                          {isNetworkCard && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 text-[10px] font-semibold">
                              👥 Friend
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(card.id); }}
                        className="p-1"
                      >
                        <Heart className={`h-4 w-4 transition-colors ${isFavorite(card.id) ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
                      </button>
                    </div>
                  </div>

                  {card.location && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="flex-1">{card.location}</span>
                      {userLocation && card.latitude && card.longitude && (
                        <span className="flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                          <Navigation className="h-3 w-3" />
                          {formatDistance(getDistanceKm(userLocation.latitude, userLocation.longitude, card.latitude, card.longitude))}
                        </span>
                      )}
                    </div>
                  )}

                  {card.offer && (
                    <div className="mt-2 rounded-lg bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                      🎁 {card.offer}
                    </div>
                  )}

                  {card.services && card.services.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {card.services.map((s) => (
                        <span key={s} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1 gap-1.5 rounded-lg text-xs" onClick={(e) => { e.preventDefault(); window.open(`tel:${card.phone}`); }}>
                      <Phone className="h-3.5 w-3.5" /> Call
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5 rounded-lg text-xs" onClick={(e) => { e.preventDefault(); navigate("/messaging"); }}>
                      <MessageCircle className="h-3.5 w-3.5" /> Message
                    </Button>
                  </div>
                </motion.div>
              </Link>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/my-cards/create")}
        className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 active:scale-95"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
};

export default Index;
