import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft, Star, MapPin, MessageCircle, Phone, Filter, Search,
  Home, Store, CalendarCheck, Navigation, Crown, X, Heart,
} from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { Button } from "@/components/ui/button";
import { categories } from "@/data/categories";
import { subCategories } from "@/data/mockData";
import { motion, AnimatePresence } from "framer-motion";
import BookAppointmentModal from "@/components/BookAppointmentModal";
import BannerAdSlot from "@/components/ads/BannerAdSlot";
import { useDirectoryCards, type DirectoryCard } from "@/hooks/useDirectoryCards";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserLocation, getDistanceKm, formatDistance } from "@/hooks/useUserLocation";

type SortOption = "rating" | "newest";
type ServiceMode = "all" | "home" | "visit";

const CategoryDetail = () => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const { id } = useParams();
  const navigate = useNavigate();
  const category = categories.find((c) => c.id === id);
  const { data: allCards = [], isLoading } = useDirectoryCards();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [serviceMode, setServiceMode] = useState<ServiceMode>("all");
  const [bookingCard, setBookingCard] = useState<DirectoryCard | null>(null);
  const userLocation = useUserLocation();

  // Filter cards by category
  const categoryCards = useMemo(() =>
    allCards.filter((c) => {
      if (!c.category) return false;
      const catName = category?.name?.toLowerCase() || "";
      const catId = id?.replace(/-/g, "") || "";
      const cardCat = c.category.toLowerCase().replace(/[& ]/g, "");
      return cardCat === catId || c.category.toLowerCase() === catName;
    }), [allCards, id, category]);

  // Apply filters
  const filteredCards = useMemo(() => {
    let cards = [...categoryCards].filter((c) => {
      if (serviceMode === "home") return c.service_mode === "home" || c.service_mode === "both";
      if (serviceMode === "visit") return c.service_mode === "visit" || c.service_mode === "both";
      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      cards = cards.filter(
        (c) =>
          c.full_name.toLowerCase().includes(q) ||
          (c.services || []).some((s) => s.toLowerCase().includes(q)) ||
          (c.location?.toLowerCase().includes(q))
      );
    }

    cards.sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return 0;
    });

    return cards;
  }, [categoryCards, searchQuery, sortBy, serviceMode]);

  return (
    <div className="min-h-screen pb-20 bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xl">{category?.emoji || "📁"}</span>
            <h1 className="text-lg font-bold text-foreground">{category?.name || "Category"}</h1>
          </div>
          <div className="ml-auto">
            <Button
              variant={showFilters ? "default" : "ghost"}
              size="icon"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Service Mode Toggle */}
        <div className="flex gap-2 px-4 pb-2">
          {([
            { value: "all" as ServiceMode, label: "All", icon: "🔍" },
            { value: "home" as ServiceMode, label: "Home Services", icon: "🏠" },
            { value: "visit" as ServiceMode, label: "Visit Business", icon: "🏪" },
          ]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setServiceMode(opt.value)}
              className={`flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-semibold transition-colors ${
                serviceMode === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-muted-foreground"
              }`}
            >
              <span>{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search businesses, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-card"
          >
            <div className="px-4 py-3">
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sort by</p>
              <div className="flex gap-2">
                {[
                  { key: "newest" as SortOption, label: "Newest" },
                  { key: "rating" as SortOption, label: "Rating" },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                      sortBy === key
                        ? "bg-accent text-accent-foreground shadow-sm"
                        : "border border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
          </div>
        ) : (
          <>
            <BannerAdSlot variant="inline" />
            <p className="text-xs text-muted-foreground mb-3 mt-3">
              {filteredCards.length > 0
                ? `${filteredCards.length} businesses found`
                : "No businesses in this category yet"}
            </p>

            <div className="space-y-3">
              {filteredCards.length === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <span className="text-5xl mb-3">📭</span>
                  <p className="text-sm text-muted-foreground">No businesses found</p>
                  {searchQuery && (
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setSearchQuery("")}>
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                filteredCards.map((card, i) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link
                      to={`/business/${card.id}`}
                      className="block overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-xl overflow-hidden">
                            {card.logo_url ? (
                              <img src={card.logo_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span>🏢</span>
                            )}
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-foreground">{card.full_name}</h3>
                            <div className="mt-0.5 flex items-center gap-1.5">
                              {card.category && <p className="text-xs text-muted-foreground">{card.category}</p>}
                              <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${card.service_mode === "home" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" : card.service_mode === "both" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"}`}>
                                {card.service_mode === "home" ? "🏠 Home Service" : card.service_mode === "both" ? "🔄 Home & Visit" : "🏪 Visit"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(card.id); }} className="p-0.5">
                          <Heart className={`h-4 w-4 transition-colors ${isFavorite(card.id) ? "fill-destructive text-destructive" : "text-muted-foreground/40"}`} />
                        </button>
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
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {card.services.map((s) => (
                            <span key={s} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-3 gap-2" onClick={(e) => e.preventDefault()}>
                        <Button size="sm" className="gap-1 rounded-lg text-[11px] px-2" onClick={() => window.open(`tel:${card.phone}`)}>
                          <Phone className="h-3 w-3" /> Call
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 rounded-lg text-[11px] px-2" onClick={() => navigate("/messaging")}>
                          <MessageCircle className="h-3 w-3" /> Chat
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 rounded-lg text-[11px] px-2" onClick={() => setBookingCard(card)}>
                          <CalendarCheck className="h-3 w-3" /> Book
                        </Button>
                      </div>
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <BookAppointmentModal
        open={!!bookingCard}
        onOpenChange={(open) => !open && setBookingCard(null)}
        businessName={bookingCard?.full_name || ""}
        businessLogo={bookingCard?.logo_url || "🏢"}
        businessId={bookingCard?.id || ""}
      />
    </div>
  );
};

export default CategoryDetail;
