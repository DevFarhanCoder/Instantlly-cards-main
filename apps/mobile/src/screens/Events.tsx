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
  Plus,
  Search,
  Ticket,
  Users,
} from "lucide-react-native";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../hooks/useAuth";
import { useEvents, useMyRegistrations } from "../hooks/useEvents";
import { useBusinessCards } from "../hooks/useBusinessCards";
import { cn } from "../lib/utils";

const Events = () => {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: events = [], isLoading } = useEvents();
  const { user } = useAuth();
  const { cards } = useBusinessCards();
  const isBusiness = cards.length > 0;
  const { registrations } = useMyRegistrations();
  const passCount = registrations.length;

  const filteredEvents = useMemo(() => {
    return events.filter((e: any) => {
      const matchesSearch =
        !searchQuery ||
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.location || "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [events, searchQuery]);

  const upcomingEvents = filteredEvents;

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-3">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg">🎉</Text>
            <Text className="text-lg font-bold text-primary-foreground">
              Events Market
            </Text>
          </View>
        </View>

        <View className="flex-row gap-2">
          <Pressable onPress={() => navigation.navigate("MyPasses")} className="flex-1">
            <View className="relative bg-white rounded-lg p-2.5 flex-row items-center justify-center gap-1.5">
              <Ticket size={16} color="#2563eb" />
              <Text className="text-sm font-semibold text-primary">My Passes</Text>
              {passCount > 0 && (
                <View className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-destructive items-center justify-center px-1">
                  <Text className="text-[10px] font-bold text-destructive-foreground">
                    {passCount}
                  </Text>
                </View>
              )}
            </View>
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate("EventScanner")}
            className="flex-1"
          >
            <View className="bg-white rounded-lg p-2.5 flex-row items-center justify-center gap-1.5">
              <Text className="text-base">📷</Text>
              <Text className="text-sm font-semibold text-primary">Scan QR</Text>
            </View>
          </Pressable>

          {isBusiness && (
            <Pressable
              onPress={() => navigation.navigate("EventCreate")}
              className="flex-1"
            >
              <View className="bg-white rounded-lg p-2.5 flex-row items-center justify-center gap-1.5">
                <Plus size={16} color="#2563eb" />
                <Text className="text-sm font-semibold text-primary">Create</Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4 gap-5">
        <View className="relative">
          <View className="absolute left-3 top-3.5">
            <Search size={16} color="#9aa2b1" />
          </View>
          <Input
            placeholder="Search events, locations..."
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
          <Text className="text-lg font-semibold text-foreground mb-3">
            All Upcoming Events 📅
          </Text>

          {isLoading ? (
            <View className="gap-3">
              {[1, 2, 3].map((i) => (
                <View key={i} className="flex-row gap-3 bg-card rounded-xl overflow-hidden">
                  <Skeleton className="w-24 h-28" />
                  <View className="py-3 pr-3 gap-2 flex-1">
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
            <View className="gap-3">
              {upcomingEvents.map((event: any) => (
                <Pressable
                  key={event.id}
                  onPress={() =>
                    navigation.navigate("EventDetail", { id: event.id })
                  }
                  className="flex-row gap-3 bg-card rounded-xl overflow-hidden"
                >
                  <View className="w-24 h-28 bg-primary/10 items-center justify-center">
                    <Text className="text-4xl">🎉</Text>
                  </View>
                  <View className="py-3 pr-4 flex-1">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      {!event.ticket_price || event.ticket_price === 0 ? (
                        <Badge className="bg-success/10 text-success border-none text-[10px]">
                          FREE
                        </Badge>
                      ) : (
                        <Badge className="bg-accent/10 text-accent border-none text-[10px]">
                          ₹{event.ticket_price}
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
                        {new Date(event.date).toLocaleDateString()} • {event.time}
                      </Text>
                    </View>
                    {event.location && (
                      <View className="flex-row items-center gap-1.5 mt-0.5">
                        <MapPin size={12} color="#6a7181" />
                        <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
                          {event.location}
                        </Text>
                      </View>
                    )}
                    <View className="flex-row items-center gap-1 mt-0.5">
                      <Users size={12} color="#6a7181" />
                      <Text className="text-[11px] text-muted-foreground">
                        {event._count?.registrations || event.attendee_count || 0} registered
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
