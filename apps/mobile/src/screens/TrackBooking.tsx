import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, Calendar, Clock, RefreshCw } from "lucide-react-native";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import { useBookings } from "../hooks/useBookings";
import { cn } from "../lib/utils";
import { useIconColor } from "../theme/colors";

const statusConfig: Record<string, { label: string; color: string; emoji: string }> = {
  confirmed: { label: "Confirmed", color: "text-blue-600 bg-blue-50", emoji: "✅" },
  completed: { label: "Completed", color: "text-green-600 bg-green-50", emoji: "🎉" },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-50", emoji: "❌" },
  pending: { label: "Pending", color: "text-yellow-600 bg-yellow-50", emoji: "⏳" },
};

const TrackBooking = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const { bookings, isLoading, refetch: refetchBookings } = useBookings();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchBookings(); } finally { setRefreshing(false); }
  }, [refetchBookings]);

  const activeBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending"
  );
  const pastBookings = bookings.filter(
    (b) => b.status === "completed" || b.status === "cancelled"
  );

  const renderBooking = (booking: any, i: number) => {
    const status = statusConfig[booking.status] || statusConfig.pending;
    return (
      <Pressable
        key={booking.id}
        onPress={() => navigation.navigate("BookingDetail", { id: booking.id })}
        className="rounded-xl border border-border bg-card p-4 gap-2"
      >        <View className="flex-row items-start justify-between">
          <View className="min-w-0">
            <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
              {booking.business_name}
            </Text>
            <Text className="text-xs text-muted-foreground">
              {booking.mode === "walk_in" ? "Walk-in" : "Scheduled"}
            </Text>
          </View>
          <View className={cn("rounded-full px-2.5 py-0.5", status.color)}>
            <Text className="text-[10px] font-bold">
              {status.emoji} {status.label}
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-3">
          {booking.booking_date && (
            <View className="flex-row items-center gap-1">
              <Calendar size={12} color="#6a7181" />
              <Text className="text-xs text-muted-foreground">
                {format(new Date(booking.booking_date), "MMM dd, yyyy")}
              </Text>
            </View>
          )}
          {booking.booking_time && (
            <View className="flex-row items-center gap-1">
              <Clock size={12} color="#6a7181" />
              <Text className="text-xs text-muted-foreground">{booking.booking_time}</Text>
            </View>
          )}
        </View>

        {booking.notes && (
          <Text className="text-xs text-muted-foreground bg-muted rounded-lg p-2">
            {booking.notes}
          </Text>
        )}

        {(booking.status === "completed" || booking.status === "cancelled") && (
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-xl text-xs mt-1"
            onPress={() => navigation.navigate("BusinessDetail", { id: `card-${booking.business_id}` })}
          >
            <RefreshCw size={12} color={iconColor} /> Re-book
          </Button>
        )}
      </Pressable>
    );
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Track Bookings</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4 gap-5" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />}>
        {isLoading ? (
          <View className="gap-3">
            {[1, 2, 3].map((i) => (
              <View key={i} className="h-24 rounded-xl bg-muted" />
            ))}
          </View>
        ) : bookings.length === 0 ? (
          <View className="items-center justify-center py-16">
            <Text className="text-5xl mb-3">📦</Text>
            <Text className="text-base font-semibold text-foreground">No bookings yet</Text>
            <Text className="text-sm text-muted-foreground mt-1 text-center">
              Your appointment and service bookings will appear here
            </Text>
            <Button className="mt-4 rounded-xl" onPress={() => navigation.navigate("Home")}>
              Browse Services
            </Button>
          </View>
        ) : (
          <>
            {activeBookings.length > 0 && (
              <View>
                <Text className="text-sm font-semibold text-foreground mb-3">
                  Active ({activeBookings.length})
                </Text>
                <View className="gap-3">
                  {activeBookings.map(renderBooking)}
                </View>
              </View>
            )}

            {pastBookings.length > 0 && (
              <View>
                <Text className="text-sm font-semibold text-foreground mb-3">
                  Past ({pastBookings.length})
                </Text>
                <View className="gap-3">
                  {pastBookings.map(renderBooking)}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default TrackBooking;

