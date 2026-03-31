import { useCallback, useMemo } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle,
  Clock,
  Heart,
  History,
  RotateCcw,
  XCircle,
} from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useFavorites } from "../contexts/FavoritesContext";
import { useBookings } from "../hooks/useBookings";
import { useAuth } from "../hooks/useAuth";
import { useDirectoryCards } from "../hooks/useDirectoryCards";
import { colors } from "../theme/colors";

const STATUS_CONFIG: Record<
  string,
  { icon: any; textClass: string; bgClass: string; iconColor: string }
> = {
  confirmed: { icon: Clock, textClass: "text-amber-700", bgClass: "bg-amber-100", iconColor: "#b45309" },
  completed: { icon: CheckCircle, textClass: "text-green-700", bgClass: "bg-green-100", iconColor: "#15803d" },
  cancelled: { icon: XCircle, textClass: "text-red-700", bgClass: "bg-red-100", iconColor: "#b91c1c" },
};

const BookingCard = ({ b, onRebook }: { b: any; onRebook: (id: string) => void }) => {
  const cfg = STATUS_CONFIG[b.status] || STATUS_CONFIG.confirmed;
  const StatusIcon = cfg.icon;
  return (
    <View className="rounded-xl border border-border bg-card p-3">
      <View className="flex-row items-start gap-3">
        <View className="h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Text className="text-lg">{b.mode === "instant" ? "⚡" : "📅"}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {b.business_name}
          </Text>
          <Text className="text-[10px] text-muted-foreground">
            {b.mode === "instant" ? "Instant Booking" : `${b.booking_date} at ${b.booking_time}`}
          </Text>
          {b.notes ? (
            <Text className="text-[10px] text-muted-foreground mt-0.5" numberOfLines={1}>
              "{b.notes}"
            </Text>
          ) : null}
        </View>
        <View className={`flex-row items-center gap-1 px-2 py-0.5 rounded-full ${cfg.bgClass}`}>
          <StatusIcon size={12} color={cfg.iconColor} />
          <Text className={`text-[10px] font-semibold ${cfg.textClass}`}>{b.status}</Text>
        </View>
      </View>
      {(b.status === "completed" || b.status === "cancelled") && (
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full gap-1 rounded-lg text-xs"
          onPress={() => onRebook(`card-${b.business_id}`)}
        >
          <RotateCcw size={12} color={colors.foreground} /> Re-book
        </Button>
      )}
    </View>
  );
};

const Dashboard = () => {
  const navigation = useNavigation<any>();
  const { favorites } = useFavorites();
  const { user } = useAuth();
  const { bookings, isLoading } = useBookings();
  const { data: allCards = [] } = useDirectoryCards();

  const savedCards = useMemo(
    () => allCards.filter((c) => favorites.includes(c.id)),
    [allCards, favorites]
  );

  const handleRebook = useCallback(
    (id: string) => navigation.navigate("BusinessDetail", { id }),
    [navigation]
  );

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <CalendarCheck size={48} color="#c0c4cc" />
        <Text className="text-sm text-muted-foreground mt-3 mb-4">
          Sign in to see your dashboard
        </Text>
        <Button onPress={() => navigation.navigate("Auth")} className="rounded-xl">
          Sign In
        </Button>
      </View>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === "confirmed");
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">My Dashboard</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4 gap-5">
        <View className="flex-row gap-3">
          {[
            { label: "Active", value: pendingBookings.length, emoji: "⏳" },
            { label: "Completed", value: completedBookings.length, emoji: "✅" },
            { label: "Saved", value: savedCards.length, emoji: "❤️" },
          ].map((s) => (
            <View key={s.label} className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
              <Text className="text-xl">{s.emoji}</Text>
              <Text className="text-lg font-bold text-foreground mt-1">{s.value}</Text>
              <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
            </View>
          ))}
        </View>

        <View>
          <View className="flex-row items-center gap-2 mb-3">
            <History size={16} color={colors.primary} />
            <Text className="text-sm font-bold text-foreground">Booking History</Text>
          </View>

          {isLoading ? (
            <View className="gap-2">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </View>
          ) : bookings.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border bg-muted/30 p-6 items-center">
              <CalendarCheck size={32} color="#c0c4cc" />
              <Text className="text-xs text-muted-foreground mt-2 text-center">
                No bookings yet. Book an appointment from any business card.
              </Text>
            </View>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1 text-xs">
                  All ({bookings.length})
                </TabsTrigger>
                <TabsTrigger value="active" className="flex-1 text-xs">
                  Active ({pendingBookings.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="flex-1 text-xs">
                  Done ({completedBookings.length})
                </TabsTrigger>
                <TabsTrigger value="cancelled" className="flex-1 text-xs">
                  Cancelled ({cancelledBookings.length})
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="gap-2 mt-3">
                {bookings.map((b) => (
                  <BookingCard key={b.id} b={b} onRebook={handleRebook} />
                ))}
              </TabsContent>
              <TabsContent value="active" className="gap-2 mt-3">
                {pendingBookings.length === 0 ? (
                  <Text className="text-xs text-muted-foreground text-center py-4">
                    No active bookings
                  </Text>
                ) : (
                  pendingBookings.map((b) => <BookingCard key={b.id} b={b} onRebook={handleRebook} />)
                )}
              </TabsContent>
              <TabsContent value="completed" className="gap-2 mt-3">
                {completedBookings.length === 0 ? (
                  <Text className="text-xs text-muted-foreground text-center py-4">
                    No completed bookings
                  </Text>
                ) : (
                  completedBookings.map((b) => <BookingCard key={b.id} b={b} onRebook={handleRebook} />)
                )}
              </TabsContent>
              <TabsContent value="cancelled" className="gap-2 mt-3">
                {cancelledBookings.length === 0 ? (
                  <Text className="text-xs text-muted-foreground text-center py-4">
                    No cancelled bookings
                  </Text>
                ) : (
                  cancelledBookings.map((b) => <BookingCard key={b.id} b={b} onRebook={handleRebook} />)
                )}
              </TabsContent>
            </Tabs>
          )}
        </View>

        <View>
          <View className="flex-row items-center gap-2 mb-3">
            <Heart size={16} color={colors.primary} />
            <Text className="text-sm font-bold text-foreground">Saved Business Cards</Text>
            <Text className="ml-auto text-xs text-muted-foreground">
              {savedCards.length} saved
            </Text>
          </View>
          {savedCards.length === 0 ? (
            <View className="rounded-xl border border-dashed border-border bg-muted/30 p-6 items-center">
              <Heart size={32} color="#c0c4cc" />
              <Text className="text-xs text-muted-foreground mt-2 text-center">
                No saved cards yet. Tap the heart icon on any business card to save it.
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {savedCards.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => navigation.navigate("BusinessDetail", { id: c.id })}
                  className="w-[48%] flex-row items-center gap-2 rounded-xl border border-border bg-card p-3"
                >
                  <View className="h-9 w-9 items-center justify-center rounded-lg bg-primary/10 overflow-hidden">
                    {c.logo_url ? (
                      <Image source={{ uri: c.logo_url }} style={{ height: "100%", width: "100%" }} />
                    ) : (
                      <Text>🏢</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
                      {c.full_name}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
                      {c.category}
                    </Text>
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

export default Dashboard;

