import { useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";

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

  const bookedDates = useMemo(() => {
    return Object.keys(bookingsByDate).map((d) => new Date(d + "T00:00:00"));
  }, [bookingsByDate]);

  const today = new Date().toISOString().split("T")[0];
  const todayBookings = bookingsByDate[today] || [];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-3 flex justify-center">
        <Calendar
          mode="multiple"
          selected={bookedDates}
          className="rounded-xl"
        />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-sm font-bold text-foreground mb-3">
          Today's Appointments ({todayBookings.length})
        </h4>
        {todayBookings.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No appointments today</p>
        ) : (
          <div className="space-y-2">
            {todayBookings
              .sort((a, b) => (a.booking_time || "").localeCompare(b.booking_time || ""))
              .map((b) => (
                <div key={b.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{b.customer_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {b.booking_time || "No time set"} • {b.mode === "instant" ? "⚡ Instant" : "📅 Scheduled"}
                    </p>
                  </div>
                  <Badge variant={b.status === "confirmed" ? "default" : b.status === "completed" ? "secondary" : "destructive"} className="text-[10px]">
                    {b.status}
                  </Badge>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Upcoming summary */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h4 className="text-sm font-bold text-foreground mb-2">Upcoming This Week</h4>
        {(() => {
          const now = new Date();
          const weekEnd = new Date(now);
          weekEnd.setDate(weekEnd.getDate() + 7);
          const upcoming = bookings.filter((b) => {
            if (!b.booking_date) return false;
            const d = new Date(b.booking_date);
            return d >= now && d <= weekEnd && b.status !== "cancelled";
          }).sort((a, b) => (a.booking_date || "").localeCompare(b.booking_date || ""));

          if (upcoming.length === 0) return <p className="text-xs text-muted-foreground">No upcoming appointments</p>;
          return (
            <div className="space-y-1.5">
              {upcoming.slice(0, 5).map((b) => (
                <div key={b.id} className="flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">{b.booking_date}</span>
                  <span className="text-muted-foreground">{b.booking_time}</span>
                  <span className="text-muted-foreground">—</span>
                  <span className="text-foreground">{b.customer_name}</span>
                </div>
              ))}
              {upcoming.length > 5 && <p className="text-[10px] text-primary">+{upcoming.length - 5} more</p>}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default BookingCalendar;
