import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Filter,
  Calendar,
  MapPin,
  Users,
  Ticket,
  Loader2,
} from "lucide-react";
import BannerAdSlot from "@/components/ads/BannerAdSlot";
import StaticImageAd from "@/components/ads/StaticImageAd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteEvents } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const eventCategories = [
  { id: "Awards", name: "Awards", icon: "🏆" },
  { id: "Conference", name: "Conference", icon: "🎤" },
  { id: "Networking", name: "Networking", icon: "🤝" },
  { id: "Festival", name: "Festival", icon: "🎪" },
  { id: "Wellness", name: "Wellness", icon: "🧘" },
  { id: "Workshop", name: "Workshop", icon: "🔧" },
  { id: "Music", name: "Music", icon: "🎵" },
  { id: "Sports", name: "Sports", icon: "⚽" },
];

const categoryEmoji: Record<string, string> = {
  Awards: "🏆",
  Conference: "🎤",
  Networking: "🤝",
  Festival: "🎪",
  Wellness: "🧘",
  Workshop: "🔧",
  Music: "🎵",
  Sports: "⚽",
};

const Events = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useInfiniteEvents(debouncedSearch, selectedCategory ?? undefined);

  const allEvents = data?.pages.flatMap((p) => p.events) ?? [];
  const featuredEvents = allEvents.filter((e) => e.is_featured);

  // Infinite scroll — load next page when sentinel enters viewport
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { data: passCount = 0 } = useQuery({
    queryKey: ["pass-count", user?.email],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("email", user!.email!);
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!user?.email,
  });

  // Fetch registration counts per event
  const { data: regCounts = {} } = useQuery({
    queryKey: ["event-reg-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_registrations")
        .select("event_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.event_id] = (counts[r.event_id] || 0) + 1;
      });
      return counts;
    },
  });

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-primary px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎉</span>
            <h1 className="text-xl font-bold text-primary-foreground">
              Events Market
            </h1>
          </div>
          <div className="flex gap-2">
            <Link to="/my-passes">
              <Button
                size="sm"
                variant="secondary"
                className="text-xs gap-1 relative"
              >
                <Ticket className="h-3.5 w-3.5" /> My Passes
                {passCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {passCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link to="/events/scanner">
              <Button size="sm" variant="secondary" className="text-xs gap-1">
                📷 Scan QR
              </Button>
            </Link>
          </div>
        </div>
        <p className="mt-1 text-xs text-primary-foreground/70">
          Discover & register for exciting events
        </p>
      </div>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-5">
        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events, venues..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-card"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
          >
            <Filter className="h-4 w-4 text-muted-foreground" />
          </Button>
        </motion.div>

        {/* Hero Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
        >
          <Card className="overflow-hidden bg-primary text-primary-foreground">
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <Badge className="bg-primary-foreground/20 text-primary-foreground border-none mb-2">
                  🔥 Trending Events
                </Badge>
                <h2 className="text-2xl font-bold mb-1">
                  Discover Events Near You
                </h2>
                <p className="text-sm opacity-80 mb-4">
                  Register instantly & get your QR pass
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                {[
                  ["100+", "Events"],
                  ["10K+", "Attendees"],
                  ["50+", "Cities"],
                ].map(([val, lbl]) => (
                  <div key={lbl} className="text-center">
                    <p className="text-xl font-bold">{val}</p>
                    <p className="text-[11px] opacity-80">{lbl}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sponsored */}
        <BannerAdSlot />

        {/* Categories */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">
              Browse Categories
            </h2>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {eventCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === cat.id ? null : cat.id,
                  )
                }
                className={cn(
                  "flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card shadow-sm hover:shadow-md transition-all active:scale-[0.96]",
                  selectedCategory === cat.id &&
                    "ring-2 ring-primary shadow-md",
                )}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs font-medium text-foreground">
                  {cat.name}
                </span>
              </button>
            ))}
          </div>
        </motion.section>

        {/* Featured Events - Horizontal Scroll */}
        {featuredEvents.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-foreground">
                ⭐ Featured Events
              </h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {featuredEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="min-w-[280px] snap-start rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow active:scale-[0.98]"
                >
                  <div className="relative h-36 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <span className="text-6xl">
                      {categoryEmoji[event.category] || "🎉"}
                    </span>
                    <Badge className="absolute top-2 left-2 bg-primary text-primary-foreground border-none text-xs">
                      {event.category}
                    </Badge>
                    {event.is_free ? (
                      <Badge className="absolute top-2 right-2 bg-success text-success-foreground border-none text-xs">
                        FREE
                      </Badge>
                    ) : (
                      <Badge className="absolute top-2 right-2 bg-accent text-accent-foreground border-none text-xs">
                        ₹{event.price}
                      </Badge>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-sm text-foreground line-clamp-1">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {event.start_date || event.date}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-1">
                        {event.venue}
                        {event.city ? `, ${event.city}` : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>{regCounts[event.id] || 0} registered</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* All Events */}
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.32 }}
        >
          <h2 className="text-lg font-semibold text-foreground mb-3">
            All Upcoming Events 📅
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex gap-3 bg-card rounded-xl overflow-hidden"
                >
                  <Skeleton className="w-24 h-28" />
                  <div className="py-3 pr-3 space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : allEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <span className="text-5xl mb-3">📭</span>
              <p className="text-muted-foreground text-sm">No events found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="flex gap-3 bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow active:scale-[0.98] relative"
                >
                  <div className="w-24 h-28 bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl">
                      {categoryEmoji[event.category ?? ""] || "🎉"}
                    </span>
                  </div>
                  <div className="py-3 pr-4 flex flex-col justify-center flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      {event.category && (
                        <Badge className="bg-primary/10 text-primary border-none text-[10px]">
                          {event.category}
                        </Badge>
                      )}
                      {event.is_free ? (
                        <Badge className="bg-success/10 text-success border-none text-[10px]">
                          FREE
                        </Badge>
                      ) : (
                        <Badge className="bg-accent/10 text-accent border-none text-[10px]">
                          ₹{event.price}
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm leading-tight text-foreground line-clamp-1">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {event.start_date || event.date}
                      {event.end_date &&
                      event.end_date !== (event.start_date || event.date)
                        ? ` – ${event.end_date}`
                        : ""}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      <span className="line-clamp-1">
                        {event.venue || event.location}
                        {event.city ? `, ${event.city}` : ""}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="h-4" />

              {/* Loading more spinner */}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}

              {/* End of list */}
              {!hasNextPage && allEvents.length > 0 && (
                <p className="text-center text-xs text-muted-foreground py-4">
                  All {allEvents.length} events loaded
                </p>
              )}
            </div>
          )}
        </motion.section>
      </div>

      {/* Static sticky bottom ad (Wealthy & Life campaign) */}
      <StaticImageAd
        bannerSrc="/ads/wealthy-life-banner.jpg"
        fullscreenSrc="/ads/wealthy-life-fullscreen.jpg"
        alt="Wealthy & Life Seminar"
      />
    </div>
  );
};

export default Events;
