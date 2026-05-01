import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
// Use the same eventCategories as EventCreate
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
import { Input } from "../components/ui/input";
import { Skeleton } from "../components/ui/skeleton";
import { useUserRole } from "../hooks/useUserRole";
import { useMyRegistrations } from "../hooks/useEvents";
import { useUserLocation } from "../hooks/useUserLocation";
import { useListEventsQuery, AppEvent } from "../store/api/eventsApi";

type TabType = "all" | "nearby";

const PAGE_SIZE = 20;

const EventCard = ({
  event,
  onPress,
}: {
  event: AppEvent;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    className="flex-row gap-3 bg-card rounded-xl overflow-hidden mb-3"
  >
    <View className="w-24 h-28 bg-primary/10 items-center justify-center">
      <Text className="text-4xl">{"\uD83C\uDF89"}</Text>
    </View>
    <View className="py-3 pr-4 flex-1">
      <View className="flex-row items-center gap-1.5 mb-1">
        {!event.ticket_price || event.ticket_price === 0 ? (
          <Badge className="bg-success/10 text-success border-none text-[10px]">
            FREE
          </Badge>
        ) : (
          <Badge className="bg-accent/10 text-accent border-none text-[10px]">
            {"\u20B9"}{event.ticket_price}
          </Badge>
        )}
        {event.city && (
          <Badge className="bg-muted text-muted-foreground border-none text-[10px]">
            {event.city}
          </Badge>
        )}
      </View>
      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
        {event.title}
      </Text>
      <View className="flex-row items-center gap-1.5 mt-1">
        <Calendar size={12} color="#6a7181" />
        <Text className="text-[11px] text-muted-foreground">
          {new Date(event.date).toLocaleDateString()} {"\u2022"} {event.time}
        </Text>
      </View>
      {(event.venue || event.location) && (
        <View className="flex-row items-center gap-1.5 mt-0.5">
          <MapPin size={12} color="#6a7181" />
          <Text className="text-[11px] text-muted-foreground" numberOfLines={1}>
            {event.venue || event.location}
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
);

const Events = () => {
    // Category filter state
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const eventCategories = [
      "Awards",
      "Conference",
      "Networking",
      "Workshop",
      "Seminar",
      "Exhibition",
      "Concert",
      "Sports",
      "Festival",
      "Other",
    ];
  const navigation = useNavigation<any>();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [chipsOpen, setChipsOpen] = useState(false);
  const searchInputRef = useRef<TextInput | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [priceType, setPriceType] = useState<"all" | "free" | "paid">("all");
  const { isBusiness } = useUserRole();
  const { registrations } = useMyRegistrations();
  const passCount = registrations.length;
  const userLocation = useUserLocation();

  // Grow limit to paginate; reset when search or tab changes
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [refreshing, setRefreshing] = useState(false);

  // city from GPS — only used for "nearby" tab
  const nearbyCity = userLocation?.city ?? null;
  const cityFilter =
    activeTab === "nearby" && nearbyCity ? nearbyCity : undefined;

  // Close venue chips on Android hardware back
  useEffect(() => {
    if (!chipsOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      setChipsOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [chipsOpen]);

  const { data, isLoading, isFetching, refetch } = useListEventsQuery(
    {
      page: 1,
      limit,
      search: searchQuery || undefined,
      city: cityFilter,
      category: activeCategory || undefined,
      date: selectedDate ? selectedDate.toISOString().split("T")[0] : undefined,
      priceType: priceType === "all" ? undefined : priceType,
    },
    { refetchOnMountOrArgChange: true }
  );

  // Reset limit when search, tab, category, date, or price type changes
  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [searchQuery, activeTab, activeCategory, selectedDate, priceType]);

  // When switching to nearby and city just resolved, reset limit so we refetch
  useEffect(() => {
    if (activeTab === "nearby" && nearbyCity) {
      setLimit(PAGE_SIZE);
    }
  }, [nearbyCity, activeTab]);

  const events: AppEvent[] = data?.data ?? [];
  const hasMore = events.length >= limit && events.length > 0;

  // Unique venue suggestions from currently loaded events.
  const venueSuggestions = (() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const e of events) {
      const v = (e.venue || e.location || "").trim();
      if (v && !seen.has(v.toLowerCase())) {
        seen.add(v.toLowerCase());
        out.push(v);
      }
    }
    const q = searchQuery.trim().toLowerCase();
    return q ? out.filter((v) => v.toLowerCase().includes(q)) : out;
  })();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setLimit(PAGE_SIZE);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadMore = useCallback(() => {
    if (!isFetching && !isLoading && hasMore) {
      setLimit((prev) => prev + PAGE_SIZE);
    }
  }, [isFetching, isLoading, hasMore]);

  const renderItem = useCallback(
    ({ item }: { item: AppEvent }) => (
      <EventCard
        event={item}
        onPress={() => navigation.navigate("EventDetail", { id: item.id })}
      />
    ),
    [navigation]
  );

  const keyExtractor = useCallback(
    (item: AppEvent) => String(item.id),
    []
  );

  // Category filter bar
  const CategoryBar = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginBottom: 12, marginTop: 2 }}
      contentContainerStyle={{ paddingHorizontal: 2, gap: 6, alignItems: "center" }}
    >
      <Pressable
        onPress={() => setActiveCategory(null)}
        style={{
          paddingHorizontal: 14,
          paddingVertical: 7,
          borderRadius: 999,
          backgroundColor: !activeCategory ? "#2563eb" : "#f1f5f9",
          borderWidth: 1.5,
          borderColor: !activeCategory ? "#2563eb" : "#e2e8f0",
          marginRight: 2,
        }}
      >
        <Text style={{ color: !activeCategory ? "#fff" : "#2563eb", fontWeight: "600", fontSize: 13 }}>All</Text>
      </Pressable>
      {eventCategories.map((cat) => (
        <Pressable
          key={cat}
          onPress={() => setActiveCategory(cat)}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: 999,
            backgroundColor: activeCategory === cat ? "#2563eb" : "#f1f5f9",
            borderWidth: 1.5,
            borderColor: activeCategory === cat ? "#2563eb" : "#e2e8f0",
            marginRight: 2,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Text style={{ color: activeCategory === cat ? "#fff" : "#2563eb", fontWeight: "600", fontSize: 13 }}>{cat}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  const ListHeader = (
    <View>
      {/* Tabs */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: "#f3f4f6",
          borderRadius: 12,
          padding: 4,
          marginBottom: 16,
        }}
      >
        <Pressable
          onPress={() => setActiveTab("all")}
          style={{
            flex: 1,
            borderRadius: 8,
            paddingVertical: 8,
            alignItems: "center",
            backgroundColor: activeTab === "all" ? "#ffffff" : "transparent",
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: activeTab === "all" ? "#0f172a" : "#6a7181",
            }}
          >
            All Events
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTab("nearby")}
          style={{
            flex: 1,
            borderRadius: 8,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            backgroundColor: activeTab === "nearby" ? "#ffffff" : "transparent",
          }}
        >
          <MapPin size={13} color={activeTab === "nearby" ? "#2563eb" : "#9aa2b1"} />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "500",
              color: activeTab === "nearby" ? "#2563eb" : "#6a7181",
            }}
          >
            Near Me
          </Text>
        </Pressable>
      </View>

      {/* Category filter bar */}
      {CategoryBar}

      {/* Date & Price Type Filter */}
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 16, alignItems: "center" }}>
        {/* Date Picker */}
        {/* Calendar modal */}
        <Modal
          visible={showDatePicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", alignItems: "center" }}
            onPress={() => setShowDatePicker(false)}
          >
            <Pressable
              style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, width: 320 }}
              onPress={(e) => e.stopPropagation()}
            >
              {/* Month navigation */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <Pressable
                  onPress={() => setCalendarMonth((m) => {
                    const d = new Date(m.year, m.month - 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })}
                  style={{ padding: 8 }}
                >
                  <Text style={{ fontSize: 18, color: "#2563eb", fontWeight: "700" }}>‹</Text>
                </Pressable>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#0f172a" }}>
                  {new Date(calendarMonth.year, calendarMonth.month).toLocaleString("default", { month: "long", year: "numeric" })}
                </Text>
                <Pressable
                  onPress={() => setCalendarMonth((m) => {
                    const d = new Date(m.year, m.month + 1);
                    return { year: d.getFullYear(), month: d.getMonth() };
                  })}
                  style={{ padding: 8 }}
                >
                  <Text style={{ fontSize: 18, color: "#2563eb", fontWeight: "700" }}>›</Text>
                </Pressable>
              </View>

              {/* Day-of-week headers */}
              <View style={{ flexDirection: "row", marginBottom: 6 }}>
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <View key={d} style={{ flex: 1, alignItems: "center" }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#94a3b8" }}>{d}</Text>
                  </View>
                ))}
              </View>

              {/* Calendar grid */}
              {(() => {
                const year = calendarMonth.year;
                const month = calendarMonth.month;
                const firstDay = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const cells: (number | null)[] = [
                  ...Array(firstDay).fill(null),
                  ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
                ];
                // Pad end to complete last row
                while (cells.length % 7 !== 0) cells.push(null);
                const rows: (number | null)[][] = [];
                for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
                return rows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: "row", marginBottom: 4 }}>
                    {row.map((day, di) => {
                      const isSelected =
                        day !== null &&
                        selectedDate !== null &&
                        selectedDate.getFullYear() === year &&
                        selectedDate.getMonth() === month &&
                        selectedDate.getDate() === day;
                      return (
                        <Pressable
                          key={di}
                          onPress={() => {
                            if (!day) return;
                            setSelectedDate(new Date(year, month, day));
                            setShowDatePicker(false);
                          }}
                          style={{
                            flex: 1,
                            alignItems: "center",
                            paddingVertical: 7,
                            borderRadius: 8,
                            backgroundColor: isSelected ? "#2563eb" : "transparent",
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: isSelected ? "700" : "400",
                              color: day ? (isSelected ? "#fff" : "#0f172a") : "transparent",
                            }}
                          >
                            {day ?? "·"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ));
              })()}

              {/* Clear & Cancel */}
              <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                <Pressable
                  onPress={() => { setSelectedDate(null); setShowDatePicker(false); }}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5, borderColor: "#e2e8f0", alignItems: "center" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#64748b" }}>Clear</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowDatePicker(false)}
                  style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>Done</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Date picker trigger button */}
        <Pressable
          onPress={() => {
            if (selectedDate) {
              setCalendarMonth({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() });
            } else {
              const d = new Date();
              setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() });
            }
            setShowDatePicker(true);
          }}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1.5,
            borderColor: selectedDate ? "#2563eb" : "#e2e8f0",
            backgroundColor: selectedDate ? "#2563eb15" : "#f1f5f9",
          }}
        >
          <Calendar size={16} color={selectedDate ? "#2563eb" : "#6a7181"} />
          <Text
            style={{
              fontSize: 13,
              fontWeight: "500",
              color: selectedDate ? "#2563eb" : "#6a7181",
              flex: 1,
            }}
          >
            {selectedDate ? selectedDate.toLocaleDateString() : "Pick Date"}
          </Text>
          {selectedDate && (
            <Pressable onPress={(e) => { e.stopPropagation(); setSelectedDate(null); }}>
              <X size={14} color="#2563eb" />
            </Pressable>
          )}
        </Pressable>

        {/* Price Type Filter */}
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pressable
            onPress={() => setPriceType(priceType === "free" ? "all" : "free")}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: priceType === "free" ? "#2563eb" : "#e2e8f0",
              backgroundColor: priceType === "free" ? "#2563eb" : "#f1f5f9",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: priceType === "free" ? "#fff" : "#6a7181",
              }}
            >
              Free
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setPriceType(priceType === "paid" ? "all" : "paid")}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 8,
              borderWidth: 1.5,
              borderColor: priceType === "paid" ? "#2563eb" : "#e2e8f0",
              backgroundColor: priceType === "paid" ? "#2563eb" : "#f1f5f9",
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: priceType === "paid" ? "#fff" : "#6a7181",
              }}
            >
              Paid
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Location status for Near Me tab */}
      {activeTab === "nearby" && !nearbyCity && (
        <View className="flex-row items-center gap-2 bg-accent/10 rounded-lg px-3 py-2 mb-3">
          <ActivityIndicator size="small" color="#2563eb" />
          <Text className="text-sm text-muted-foreground">Detecting your location...</Text>
        </View>
      )}
      {activeTab === "nearby" && nearbyCity && (
        <View className="flex-row items-center gap-2 mb-3">
          <MapPin size={14} color="#2563eb" />
          <Text className="text-sm text-primary font-medium">Events in {nearbyCity}</Text>
        </View>
      )}

      <Text className="text-lg font-semibold text-foreground mb-3">
        {activeTab === "nearby" && nearbyCity
          ? `Events in ${nearbyCity}`
          : "All Upcoming Events"}
      </Text>

      {isLoading && (
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
  );

  const ListFooter = isFetching && !isLoading ? (
    <View className="py-4 items-center">
      <ActivityIndicator color="#2563eb" />
    </View>
  ) : null;

  const ListEmpty = !isLoading ? (
    <View className="items-center justify-center py-16 px-6">
      <Text className="text-5xl mb-3">
        {activeTab === "nearby" && !nearbyCity ? "\uD83D\uDCCD" : "\uD83D\uDD0D"}
      </Text>
      <Text className="text-sm text-muted-foreground text-center">
        {activeTab === "nearby" && !nearbyCity
          ? "Waiting for location..."
          : activeTab === "nearby" && nearbyCity
          ? `No events found in ${nearbyCity}`
          : searchQuery
          ? `No events match "${searchQuery}"`
          : "No events found"}
      </Text>
      {activeTab === "nearby" && nearbyCity ? (
        <Pressable
          onPress={() => setActiveTab("all")}
          className="mt-4 px-4 py-2 rounded-lg bg-primary/10"
          accessibilityLabel="Show all events"
        >
          <Text className="text-sm font-semibold text-primary">
            Show all events
          </Text>
        </Pressable>
      ) : null}
      {searchQuery ? (
        <Pressable
          onPress={() => setSearchQuery("")}
          className="mt-4 px-4 py-2 rounded-lg bg-primary/10"
          accessibilityLabel="Clear search"
        >
          <Text className="text-sm font-semibold text-primary">
            Clear search
          </Text>
        </Pressable>
      ) : null}
    </View>
  ) : null;

  return (
    <View className="flex-1 bg-background">
      <View className="bg-primary px-4 py-3">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2">
            <Text className="text-lg">{"\uD83C\uDF89"}</Text>
            <Text className="text-lg font-bold text-primary-foreground">
              Events Market
            </Text>
          </View>
          {typeof data?.total === "number" && (
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.18)",
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
              }}
            >
              <Text style={{ color: "#ffffff", fontSize: 12, fontWeight: "600" }}>
                {data.total} {data.total === 1 ? "event" : "events"}
              </Text>
            </View>
          )}
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

          {isBusiness && (
            <Pressable
              onPress={() => navigation.navigate("EventScanner")}
              className="flex-1"
            >
              <View className="bg-white rounded-lg p-2.5 flex-row items-center justify-center gap-1.5">
                <Text className="text-base">{"\uD83D\uDCF7"}</Text>
                <Text className="text-sm font-semibold text-primary">
                  Scan QR
                </Text>
              </View>
            </Pressable>
          )}

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

      {/* Sticky search bar (lives above the FlatList so its dropdown can overlay rows) */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, backgroundColor: "transparent", zIndex: 100, elevation: 100 }}>
        <View style={{ position: "relative" }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#ffffff",
              borderRadius: 999,
              paddingHorizontal: 14,
              height: 44,
              borderWidth: 1,
              borderColor: searchFocused ? "#2563eb" : "#e5e7eb",
              shadowColor: "#000",
              shadowOpacity: searchFocused ? 0.06 : 0,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: searchFocused ? 2 : 0,
            }}
          >
            <Pressable
              onPress={() => {
                searchInputRef.current?.focus();
              }}
              hitSlop={8}
            >
              <Search size={16} color={searchFocused ? "#2563eb" : "#9aa2b1"} />
            </Pressable>
            <Input
              ref={searchInputRef}
              placeholder="Search events or venues..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              style={{
                flex: 1,
                marginLeft: 8,
                borderWidth: 0,
                backgroundColor: "transparent",
                height: 42,
                paddingHorizontal: 0,
                fontSize: 14,
              }}
            />
            {searchQuery.length > 0 ? (
              <Pressable
                onPress={() => setSearchQuery("")}
                hitSlop={8}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: "#e5e7eb",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={12} color="#6a7181" />
              </Pressable>
            ) : (
              <Pressable
                onPress={() => setChipsOpen((v) => !v)}
                hitSlop={8}
              >
                <Filter size={16} color={chipsOpen ? "#2563eb" : "#9aa2b1"} />
              </Pressable>
            )}
          </View>

          {/* Venue chips — appear when search bar is focused */}
          {chipsOpen && venueSuggestions.length > 0 && (
            <View
              style={{
                position: "absolute",
                top: 52,
                left: 0,
                right: 0,
                maxHeight: 360,
                backgroundColor: "#ffffff",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e2e8f0",
                paddingVertical: 12,
                paddingHorizontal: 12,
                elevation: 14,
                shadowColor: "#0f172a",
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.12,
                shadowRadius: 18,
                zIndex: 200,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingHorizontal: 4,
                  marginBottom: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: "#64748b",
                    fontWeight: "700",
                    letterSpacing: 0.6,
                  }}
                >
                  {searchQuery ? "MATCHING VENUES" : "POPULAR VENUES"}
                </Text>
                <View
                  style={{
                    backgroundColor: "#e0e7ff",
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                    borderRadius: 10,
                  }}
                >
                  <Text style={{ fontSize: 11, color: "#4338ca", fontWeight: "600" }}>
                    {venueSuggestions.length}
                  </Text>
                </View>
              </View>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginHorizontal: -4,
                    marginVertical: -4,
                  }}
                >
                {venueSuggestions.map((venue) => {
                  const selected =
                    searchQuery.trim().toLowerCase() === venue.toLowerCase();
                  return (
                    <View
                      key={venue}
                      style={{
                        margin: 4,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: selected ? "#2563eb" : "#94a3b8",
                        backgroundColor: selected ? "#eff6ff" : "#ffffff",
                        overflow: "hidden",
                      }}
                    >
                      <Pressable
                        onPress={() => {
                          if (selected) {
                            setSearchQuery("");
                          } else {
                            setSearchQuery(venue);
                            setChipsOpen(false);
                            Keyboard.dismiss();
                          }
                        }}
                        android_ripple={{ color: "#e2e8f0" }}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11.5,
                            fontWeight: "500",
                            color: selected ? "#2563eb" : "#334155",
                          }}
                          numberOfLines={1}
                        >
                          {venue}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
              </ScrollView>
            </View>
          )}
        </View>
      </View>

      <FlatList
        data={events}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={ListEmpty}
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={["#2463eb"]}
            tintColor="#2463eb"
          />
        }
      />

      {/* Tap-outside backdrop — closes the venue chips */}
      {chipsOpen && (
        <Pressable
          onPress={() => {
            setChipsOpen(false);
          }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 50,
            elevation: 50,
            backgroundColor: "transparent",
          }}
        />
      )}
    </View>
  );
};

export default Events;