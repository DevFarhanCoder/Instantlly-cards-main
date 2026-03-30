import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Calendar, Clock, MapPin, Phone, User, FileText, CheckCircle, XCircle } from "lucide-react-native";
import { format } from "date-fns";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useGetBookingQuery, useUpdateBookingStatusMutation } from "../store/api/bookingsApi";
import { useAuth } from "../hooks/useAuth";
import { toast } from "../lib/toast";

const statusConfig: Record<string, { label: string; bgClass: string; textClass: string }> = {
  pending: { label: "Pending", bgClass: "bg-yellow-100", textClass: "text-yellow-700" },
  confirmed: { label: "Confirmed", bgClass: "bg-blue-100", textClass: "text-blue-700" },
  completed: { label: "Completed", bgClass: "bg-green-100", textClass: "text-green-700" },
  cancelled: { label: "Cancelled", bgClass: "bg-red-100", textClass: "text-red-700" },
};

const BookingDetail = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id;
  const numericId = typeof id === "string" ? parseInt(id, 10) : id;
  const { data: booking, isLoading } = useGetBookingQuery(numericId, { skip: !numericId });
  const [updateStatus, { isLoading: isUpdating }] = useUpdateBookingStatusMutation();
  const { user } = useAuth();

  const handleUpdateStatus = async (status: string) => {
    if (!booking) return;
    try {
      await updateStatus({ id: booking.id, status }).unwrap();
      toast.success(`Booking ${status}!`);
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-5xl mb-3">📦</Text>
        <Text className="text-sm text-muted-foreground">Booking not found</Text>
        <Button className="mt-4" onPress={() => navigation.goBack()}>
          Go Back
        </Button>
      </View>
    );
  }

  const status = statusConfig[booking.status] || statusConfig.pending;
  const isBusinessOwner = booking.business && (booking.business as any).user_id === (user as any)?.userId;

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Booking Details</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 24 }} className="px-4 py-4 gap-4">
        <Card>
          <CardContent className="p-5 gap-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-lg font-bold text-foreground">{booking.business_name}</Text>
              <View className={`px-3 py-1 rounded-full ${status.bgClass}`}>
                <Text className={`text-xs font-bold ${status.textClass}`}>{status.label}</Text>
              </View>
            </View>

            <View className="gap-3 rounded-xl bg-muted p-4">
              <View className="flex-row items-center gap-3">
                <User size={16} color="#2563eb" />
                <View>
                  <Text className="text-xs text-muted-foreground">Customer</Text>
                  <Text className="text-sm font-medium text-foreground">{booking.customer_name}</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3">
                <Phone size={16} color="#2563eb" />
                <View>
                  <Text className="text-xs text-muted-foreground">Phone</Text>
                  <Text className="text-sm font-medium text-foreground">{booking.customer_phone}</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-3">
                <MapPin size={16} color="#2563eb" />
                <View>
                  <Text className="text-xs text-muted-foreground">Mode</Text>
                  <Text className="text-sm font-medium text-foreground">
                    {booking.mode === "visit" ? "Visit" : booking.mode === "call" ? "Phone Call" : booking.mode === "video" ? "Video Call" : booking.mode}
                  </Text>
                </View>
              </View>

              {booking.booking_date && (
                <View className="flex-row items-center gap-3">
                  <Calendar size={16} color="#2563eb" />
                  <View>
                    <Text className="text-xs text-muted-foreground">Date</Text>
                    <Text className="text-sm font-medium text-foreground">
                      {format(new Date(booking.booking_date), "PPP")}
                    </Text>
                  </View>
                </View>
              )}

              {booking.booking_time && (
                <View className="flex-row items-center gap-3">
                  <Clock size={16} color="#2563eb" />
                  <View>
                    <Text className="text-xs text-muted-foreground">Time</Text>
                    <Text className="text-sm font-medium text-foreground">{booking.booking_time}</Text>
                  </View>
                </View>
              )}

              {booking.notes && (
                <View className="flex-row items-center gap-3">
                  <FileText size={16} color="#2563eb" />
                  <View className="flex-1">
                    <Text className="text-xs text-muted-foreground">Notes</Text>
                    <Text className="text-sm text-foreground">{booking.notes}</Text>
                  </View>
                </View>
              )}
            </View>

            <View className="flex-row items-center gap-2">
              <Text className="text-xs text-muted-foreground">
                Booked on {format(new Date(booking.created_at), "PPP 'at' p")}
              </Text>
            </View>
          </CardContent>
        </Card>

        {booking.status === "pending" && (
          <View className="gap-3">
            <Button
              className="w-full rounded-xl"
              onPress={() => handleUpdateStatus("confirmed")}
              disabled={isUpdating}
            >
              <CheckCircle size={16} color="#ffffff" /> Confirm Booking
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onPress={() => handleUpdateStatus("cancelled")}
              disabled={isUpdating}
            >
              <XCircle size={16} color="#ef4444" /> Cancel Booking
            </Button>
          </View>
        )}

        {booking.status === "confirmed" && (
          <View className="gap-3">
            <Button
              className="w-full rounded-xl"
              onPress={() => handleUpdateStatus("completed")}
              disabled={isUpdating}
            >
              <CheckCircle size={16} color="#ffffff" /> Mark Completed
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onPress={() => handleUpdateStatus("cancelled")}
              disabled={isUpdating}
            >
              <XCircle size={16} color="#ef4444" /> Cancel Booking
            </Button>
          </View>
        )}

        {(booking.status === "completed" || booking.status === "cancelled") && (
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onPress={() => navigation.navigate("BusinessDetail", { id: String(booking.business_id) })}
          >
            Re-book with {booking.business_name}
          </Button>
        )}
      </ScrollView>
    </View>
  );
};

export default BookingDetail;
