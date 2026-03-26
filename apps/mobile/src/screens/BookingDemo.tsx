import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import BookingCalendar from "../components/business/BookingCalendar";
import BookAppointmentModal, {
  BookingPayload,
} from "../components/BookAppointmentModal";
import { colors } from "../theme/colors";

const mockBookings = [
  {
    id: "1",
    customer_name: "Alex Rivera",
    booking_date: new Date().toISOString().split("T")[0],
    booking_time: "10:00 AM",
    status: "confirmed",
    mode: "instant",
  },
  {
    id: "2",
    customer_name: "Priya Shah",
    booking_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    booking_time: "02:00 PM",
    status: "scheduled",
    mode: "scheduled",
  },
  {
    id: "3",
    customer_name: "Jordan Lee",
    booking_date: new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0],
    booking_time: "03:30 PM",
    status: "completed",
    mode: "scheduled",
  },
];

const BookingDemo = () => {
  const [open, setOpen] = useState(false);

  const handleSubmit = async (_payload: BookingPayload) => {
    // Hook your API or Supabase booking call here.
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Booking Overview</Text>
          <Text style={styles.subtitle}>Expo React Native preview</Text>
        </View>

        <Pressable style={styles.cta} onPress={() => setOpen(true)}>
          <Text style={styles.ctaText}>Book an Appointment</Text>
        </Pressable>

        <BookingCalendar bookings={mockBookings} />
      </ScrollView>

      <BookAppointmentModal
        open={open}
        onOpenChange={setOpen}
        businessName="Instantly Services"
        businessLogo="IS"
        businessId="demo"
        isSignedIn
        onSubmit={handleSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  header: {
    gap: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.foreground,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
  },
  cta: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
});

export default BookingDemo;
