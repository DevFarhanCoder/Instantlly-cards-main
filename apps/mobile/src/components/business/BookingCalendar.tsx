import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Calendar, DateData } from "react-native-calendars";

interface Booking {
  id: string;
  customer_name: string;
  booking_date: string | null;
  booking_time: string | null;
  status: string;
  mode: string;
}

interface Props {
  bookings: Booking[];
}

const COLORS = {
  background: "#F6F7FB",
  card: "#FFFFFF",
  border: "#E5E7EB",
  text: "#111827",
  muted: "#6B7280",
  primary: "#2563EB",
  danger: "#DC2626",
  success: "#16A34A",
  warning: "#D97706",
};

const statusColor = (status: string) => {
  if (status === "confirmed") return COLORS.primary;
  if (status === "completed") return COLORS.success;
  if (status === "cancelled") return COLORS.danger;
  return COLORS.warning;
};

const BookingCalendar = ({ bookings }: Props) => {
  const bookingsByDate = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    bookings.forEach((b) => {
      if (b.booking_date) {
        const key = b.booking_date;
        if (!map[key]) map[key] = [];
        map[key].push(b);
      }
    });
    return map;
  }, [bookings]);

  const markedDates = useMemo(() => {
    const marks: Record<string, { marked: boolean; dotColor: string }> = {};
    Object.keys(bookingsByDate).forEach((date) => {
      marks[date] = { marked: true, dotColor: COLORS.primary };
    });
    return marks;
  }, [bookingsByDate]);

  const today = new Date().toISOString().split("T")[0];
  const todayBookings = bookingsByDate[today] || [];

  const handleDayPress = (_day: DateData) => {
    // Reserved for future drill-down behavior.
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Calendar
          markedDates={markedDates}
          onDayPress={handleDayPress}
          theme={{
            calendarBackground: COLORS.card,
            textSectionTitleColor: COLORS.muted,
            dayTextColor: COLORS.text,
            monthTextColor: COLORS.text,
            arrowColor: COLORS.primary,
            selectedDayBackgroundColor: COLORS.primary,
            todayTextColor: COLORS.primary,
            dotColor: COLORS.primary,
          }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Today's Appointments ({todayBookings.length})
        </Text>
        {todayBookings.length === 0 ? (
          <Text style={styles.emptyText}>No appointments today</Text>
        ) : (
          <View style={styles.list}>
            {todayBookings
              .sort((a, b) =>
                (a.booking_time || "").localeCompare(b.booking_time || "")
              )
              .map((b) => (
                <View key={b.id} style={styles.row}>
                  <View style={styles.rowBody}>
                    <Text style={styles.rowName}>{b.customer_name}</Text>
                    <Text style={styles.rowMeta}>
                      {b.booking_time || "No time set"} ·{" "}
                      {b.mode === "instant" ? "Instant" : "Scheduled"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { borderColor: statusColor(b.status) },
                    ]}
                  >
                    <Text
                      style={[styles.badgeText, { color: statusColor(b.status) }]}
                    >
                      {b.status}
                    </Text>
                  </View>
                </View>
              ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upcoming This Week</Text>
        {(() => {
          const now = new Date();
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const upcoming = bookings
            .filter((b) => {
              if (!b.booking_date) return false;
              const d = new Date(b.booking_date);
              return d >= now && d <= weekEnd && b.status !== "cancelled";
            })
            .sort((a, b) =>
              (a.booking_date || "").localeCompare(b.booking_date || "")
            );

          if (upcoming.length === 0) {
            return <Text style={styles.emptyText}>No upcoming appointments</Text>;
          }

          return (
            <View style={styles.list}>
              {upcoming.slice(0, 5).map((b) => (
                <View key={b.id} style={styles.upcomingRow}>
                  <Text style={styles.upcomingDate}>{b.booking_date}</Text>
                  <Text style={styles.upcomingMeta}>{b.booking_time}</Text>
                  <Text style={styles.upcomingMeta}>-</Text>
                  <Text style={styles.upcomingName}>{b.customer_name}</Text>
                </View>
              ))}
              {upcoming.length > 5 && (
                <Text style={styles.moreText}>
                  +{upcoming.length - 5} more
                </Text>
              )}
            </View>
          );
        })()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    paddingVertical: 12,
  },
  list: {
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "#F9FAFB",
  },
  rowBody: {
    flex: 1,
    paddingRight: 8,
  },
  rowName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  rowMeta: {
    fontSize: 11,
    color: COLORS.muted,
    marginTop: 2,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  upcomingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  upcomingDate: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  },
  upcomingMeta: {
    fontSize: 12,
    color: COLORS.muted,
  },
  upcomingName: {
    fontSize: 12,
    color: COLORS.text,
  },
  moreText: {
    fontSize: 10,
    color: COLORS.primary,
    marginTop: 4,
  },
});

export default BookingCalendar;
