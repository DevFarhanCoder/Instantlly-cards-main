import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Calendar,
  Filter,
  MapPin,
  Search,
  Ticket,
  Users,
} from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../hooks/useAuth";
import { useEvents } from "../hooks/useEvents";
import { supabase } from "../integrations/supabase/client";
import { cn } from "../lib/utils";

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
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: events = [], isLoading } = useEvents();
  const { user } = useAuth();

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

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.venue.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !selectedCategory || e.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [events, searchQuery, selectedCategory]);

  const featuredEvents = filteredEvents.filter((e) => e.is_featured);
  const upcomingEvents = filteredEvents;

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="text-xl">🎉</Text>
            <Text className="text-xl font-bold text-primary-foreground">
              Events Market
            </Text>
          </View>
          <View className="flex-row gap-2">
            <Pressable onPress={() => navigation.navigate("MyPasses")}>
              <View className="relative">
                <Button size="sm" variant="secondary" className="rounded-lg">
                  <Ticket size={14} color="#111827" /> My Passes
                </Button>
                {passCount > 0 && (
                  <View className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-destructive items-center justify-center px-1">
                    <Text className="text-[10px] font-bold text-destructive-foreground">
                      {passCount}
                    </Text>
                  </View>
                )}
              </View>
            </Pressable>
            <Button
              size="sm"
              variant="secondary"
              className="rounded-lg"
              onPress={() => navigation.navigate("EventScanner")}
            >
              📷 Scan QR
            </Button>
          </View>
        </View>
        <Text className="mt-1 text-xs text-primary-foreground/70">
          Discover & register for exciting events
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-4 space-y-5">
        <View className="relative">
          <View className="absolute left-3 top-3.5">
            <Search size={16} color="#9aa2b1" />
          </View>
          <Input
            placeholder="Search events, venues..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10 pr-10 bg-card"
          />
          <Pressable className="absolute right-2 top-2.5 h-8 w-8 items-center justify-center rounded-full">
            <Filter size={16} color="#9aa2b1" />
          </Pressable>
        </View>

        <Card className="overflow-hidden bg-primary">
          <CardContent className="p-6">
            <View className="items-center mb-4">
              <Badge className="bg-primary-foreground/20 text-primary-foreground border-none mb-2">
                🔥 Trending Events
              </Badge>
              <Text className="text-2xl font-bold text-primary-foreground mb-1 text-center">
                Discover Events Near You
              </Text>
              <Text className="text-sm text-primary-foreground/80 mb-4 text-center">
                Register instantly & get your QR pass
              </Text>
            </View>
            <View className="flex-row gap-4">
              {[
                ["100+", "Events"],
                ["10K+", "Attendees"],
                ["50+", "Cities"],
              ].map(([val, lbl]) => (
                <View key={lbl} className="flex-1 items-center">
                  <Text className="text-xl font-bold text-primary-foreground">{val}</Text>
                  <Text className="text-[11px] text-primary-foreground/80">{lbl}</Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>

        <View>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-semibold text-foreground">Browse Categories</Text>
          </View>
          <View className="flex-row flex-wrap gap-3">
            {eventCategories.map((cat) => {
              const selected = selectedCategory === cat.id;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() =>
                    setSelectedCategory(selected ? null : cat.id)
                  }
                  className={cn(
                    "w-[22%] items-center gap-1.5 p-3 rounded-xl bg-card",
                    selected && "border-2 border-primary"
                  )}
                >
                  <Text className="text-2xl">{cat.icon}</Text>
                  <Text className="text-xs font-medium text-foreground">
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {featuredEvents.length > 0 && (
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold text-foreground">
                ⭐ Featured Events
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 4 }}
            >
              {featuredEvents.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() =>
                    navigation.navigate("EventDetail", { id: event.id })
                  }
                  className="w-[280px] rounded-xl overflow-hidden bg-card"
                >
                  <View className="h-36 bg-primary/10 items-center justify-center relative">
                    <Text className="text-6xl">
                      {categoryEmoji[event.category] || "🎉"}
                    </Text>
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
                  </View>
                  <View className="p-3">
                    <Text
                      className="text-sm font-semibold text-foreground"
                      numberOfLines={1}
                    >
                      {event.title}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <Calendar size={12} color="#6a7181" />
                      <Text className="text-xs text-muted-foreground">
                        {event.date} • {event.time}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <MapPin size={12} color="#6a7181" />
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {event.venue}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1 mt-1">
                      <Users size={12} color="#6a7181" />
                      <Text className="text-xs text-muted-foreground">
                        {regCounts[event.id] || 0} registered
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        <View>
          <Text className="text-lg font-semibold text-foreground mb-3">
            All Upcoming Events 📅
          </Text>

          {isLoading ? (
            <View className="space-y-3">
              {[1, 2, 3].map((i) => (
                <View key={i} className="flex-row gap-3 bg-card rounded-xl overflow-hidden">
                  <Skeleton className="w-24 h-28" />
                  <View className="py-3 pr-3 space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </View>
                </View>
              ))}
            </View>
          ) : upcomingEvents.length === 0 ? (
            <View className="items-center justify-center py-16">
              <Text className="text-5xl mb-3">📭</Text>
              <Text className="text-sm text-muted-foreground">No events found</Text>
            </View>
          ) : (
            <View className="space-y-3">
              {upcomingEvents.map((event) => (
                <Pressable
                  key={event.id}
                  onPress={() =>
                    navigation.navigate("EventDetail", { id: event.id })
                  }
                  className="flex-row gap-3 bg-card rounded-xl overflow-hidden"
                >
                  <View className="w-24 h-28 bg-primary/10 items-center justify-center">
                    <Text className="text-4xl">
                      {categoryEmoji[event.category] || "🎉"}
                    </Text>
                  </View>
                  <View className="py-3 pr-4 flex-1">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Badge className="bg-primary/10 text-primary border-none text-[10px]">
                        {event.category}
                      </Badge>
                      {event.is_free ? (
                        <Badge className="bg-success/10 text-success border-none text-[10px]">
                          FREE
                        </Badge>
                      ) : (
                        <Badge className="bg-accent/10 text-accent border-none text-[10px]">
                          ₹{event.price}
                        </Badge>
                      )}
                    </View>
                    <Text
                      className="text-sm font-semibold text-foreground"
                      numberOfLines={1}
                    >
                      {event.title}
                    </Text>
                    <View className="flex-row items-center gap-1.5 mt-1">
                      <Calendar size={12} color="#6a7181" />
                      <Text className="text-[11px] text-muted-foreground">
                        {event.date} • {event.time}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 mt-0.5">
                      <MapPin size={12} color="#6a7181" />
                      <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                        {event.venue}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Users size={12} color="#6a7181" />
                      <Text className="text-[11px] text-muted-foreground">
                        {regCounts[event.id] || 0} registered
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

export default Events;

