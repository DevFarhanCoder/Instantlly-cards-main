import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
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
  X,
} from "lucide-react-native";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { useMyRegistrations } from "../hooks/useEvents";
import { useListEventsQuery } from "../store/api/eventsApi";
import { useUserLocation } from "../hooks/useUserLocation";
import { cn } from "../lib/utils";

const PAGE_SIZE = 20;

async function reverseGeocodeCity(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (
      json.address?.city ||
      json.address?.town ||
      json.address?.village ||
      json.address?.county ||
      null
    );
  } catch {
    return null;
  }
}

const Events = () => {
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const isFirstLoad = useRef(true);

  // Location-based filtering
  const userLocation = useUserLocation();
  const [detectedCity, setDetectedCity] = useState<string | null>(null);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [cityInput, setCityInput] = useState("");

  // Reverse geocode when location is available
  useEffect(() => {
    if (!userLocation || detectedCity) return;
    reverseGeocodeCity(userLocation.latitude, userLocation.longitude).then((city) => {
      if (city) {
        setDetectedCity(city);
        setCityFilter(city);
      }
    });
  }, [userLocation]);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useListEventsQuery(
    { page, limit: PAGE_SIZE, search: searchQuery || undefined, city: (!searchQuery && cityFilter) ? cityFilter : undefined },
    { refetchOnMountOrArgChange: true }
  );

  const { user } = useAuth();
  const { isBusiness } = useUserRole();
  const { registrations } = useMyRegistrations();
  const passCount = registrations.length;

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!data) return;
    if (page === 1) {
      setAllEvents(data.data);
      isFirstLoad.current = false;
    } else {
      setAllEvents(prev => {
        const ids = new Set(prev.map((e: any) => e.id));
        const newItems = data.data.filter((e: any) => !ids.has(e.id));
        return [...prev, ...newItems];
      });
    }
    const total = data.total ?? 0;
    setHasMore(page * PAGE_SIZE < total);
    setLoadingMore(false);
  }, [data]);

  // Reset when search or city filter changes
  useEffect(() => {
    setPage(1);
    setAllEvents([]);
    setHasMore(true);
    isFirstLoad.current = true;
  }, [searchQuery, cityFilter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(1);
    setAllEvents([]);
    setHasMore(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || isFetching) return;
    setLoadingMore(true);
    setPage(prev => prev + 1);
  }, [hasMore, loadingMore, isFetching]);

  const renderEvent = useCallback(({ item: event }: { item: any }) => (
    <Pressable
      key={event.id}
      onPress={() => navigation.navigate("EventDetail", { id: event.id })}
      className="flex-row gap-3 bg-card rounded-xl overflow-hidden mb-3"
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
  ), [navigation]);

  const ListHeader = useMemo(() => (
    <View>
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
          <Pressable
            onPress={() => navigation.navigate("MyPasses")}
            className="flex-1"
          >
            <View className="relative bg-white rounded-lg p-2.5 flex-row items-center justify-center gap-1.5">
              <Ticket size={16} color="#2563eb" />
              <Text className="text-sm font-semibold text-primary">
                My Passes
              </Text>
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
              <Text className="text-sm font-semibold text-primary">
                Scan QR
              </Text>
            </View>
          </Pressable>

          {isBusiness && (
            <Pressable
              onPress={() => navigation.navigate("EventCreate")}
              className="flex-1"
            >
              <View className="bg-white rounded-lg p-2.5 flex-row items-center justify-center gap-1.5">
                <Plus size={16} color="#2563eb" />
                <Text className="text-sm font-semibold text-primary">
                  Create
                </Text>
              </View>
            </Pressable>
          )}
        </View>
      </View>

      <View className="px-4 pt-4 gap-4">
        <View className="relative">
          <View className="absolute left-3 top-3.5 z-10">
            <Search size={16} color="#9aa2b1" />
          </View>
          <Input
            placeholder="Search events, locations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="pl-10 pr-10 bg-card"
          />
          <Pressable
            onPress={() => { setCityInput(cityFilter || ""); setFilterModalVisible(true); }}
            className="absolute right-2 top-2.5 h-8 w-8 items-center justify-center rounded-full"
          >
            <Filter size={16} color={cityFilter ? "#2563eb" : "#9aa2b1"} />
          </Pressable>
        </View>

        {/* Location filter chip */}
        {cityFilter ? (
          <View className="flex-row items-center gap-1.5">
            <MapPin size={13} color="#2563eb" />
            <Text className="text-sm text-primary font-medium flex-1">
              Events in {cityFilter}
            </Text>
            <Pressable
              onPress={() => setCityFilter(null)}
              className="p-1"
            >
              <X size={13} color="#6a7181" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => { setCityInput(""); setFilterModalVisible(true); }}
            className="flex-row items-center gap-1.5"
          >
            <MapPin size={13} color="#9aa2b1" />
            <Text className="text-sm text-muted-foreground">All locations</Text>
          </Pressable>
        )}

        <Text className="text-lg font-semibold text-foreground">
          {cityFilter ? `Upcoming Events 📅` : `All Upcoming Events 📅`}{data?.total ? ` (${data.total})` : ""}
        </Text>

        {(isLoading && isFirstLoad.current) && (
          <View className="gap-3">
            {[1, 2, 3].map((i) => (
              <View key={i} className="flex-row gap-3 bg-card rounded-xl overflow-hidden mb-3">
                <Skeleton className="w-24 h-28" />
                <View className="py-3 pr-3 gap-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  ), [navigation, passCount, isBusiness, searchQuery, data?.total, isLoading, cityFilter, detectedCity]);

  const ListFooter = useCallback(() => {
    if (!loadingMore && !isFetching) return null;
    return (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#2563eb" />
      </View>
    );
  }, [loadingMore, isFetching]);

  const ListEmpty = useCallback(() => {
    if (isLoading && isFirstLoad.current) return null;
    return (
      <View className="items-center justify-center py-16">
        <Text className="text-5xl mb-3">📭</Text>
        <Text className="text-sm text-muted-foreground">No events found</Text>
      </View>
    );
  }, [isLoading]);

  return (
    <View className="flex-1 bg-background">
      {/* Location Filter Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setFilterModalVisible(false)}
        />
        <View className="bg-background rounded-t-2xl px-5 pt-5 pb-10">
          <View className="flex-row items-center justify-between mb-4">
            <Text className="text-base font-semibold text-foreground">Filter by Location</Text>
            <Pressable onPress={() => setFilterModalVisible(false)}>
              <X size={20} color="#6a7181" />
            </Pressable>
          </View>

          {detectedCity && (
            <Pressable
              onPress={() => { setCityFilter(detectedCity); setFilterModalVisible(false); }}
              className="flex-row items-center gap-2 py-3 border-b border-border"
            >
              <MapPin size={16} color="#2563eb" />
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">Near me</Text>
                <Text className="text-xs text-muted-foreground">{detectedCity}</Text>
              </View>
              {cityFilter === detectedCity && (
                <View className="w-2 h-2 rounded-full bg-primary" />
              )}
            </Pressable>
          )}

          <Pressable
            onPress={() => { setCityFilter(null); setFilterModalVisible(false); }}
            className="flex-row items-center gap-2 py-3 border-b border-border"
          >
            <View className="w-4 h-4 items-center justify-center">
              <Text className="text-sm">🌍</Text>
            </View>
            <Text className="text-sm font-medium text-foreground flex-1">All locations</Text>
            {!cityFilter && (
              <View className="w-2 h-2 rounded-full bg-primary" />
            )}
          </Pressable>

          <View className="mt-4">
            <Text className="text-xs text-muted-foreground mb-2 uppercase font-medium">Search by city</Text>
            <View className="flex-row gap-2">
              <TextInput
                value={cityInput}
                onChangeText={setCityInput}
                placeholder="Enter city name..."
                placeholderTextColor="#9aa2b1"
                className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground"
                style={{ fontSize: 14 }}
                autoCapitalize="words"
              />
              <Pressable
                onPress={() => {
                  if (cityInput.trim()) {
                    setCityFilter(cityInput.trim());
                    setFilterModalVisible(false);
                  }
                }}
                className="bg-primary rounded-lg px-4 items-center justify-center"
              >
                <Text className="text-sm font-semibold text-primary-foreground">Apply</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <FlatList
        data={allEvents}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderEvent}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2463eb"]}
            tintColor="#2463eb"
          />
        }
      />
    </View>
  );
};

export default Events;
