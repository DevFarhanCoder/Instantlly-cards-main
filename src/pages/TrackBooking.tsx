import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useBookings } from "@/hooks/useBookings";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; emoji: string }> = {
  confirmed: { label: "Confirmed", color: "text-blue-600 bg-blue-50", emoji: "✅" },
  completed: { label: "Completed", color: "text-green-600 bg-green-50", emoji: "🎉" },
  cancelled: { label: "Cancelled", color: "text-red-600 bg-red-50", emoji: "❌" },
  pending: { label: "Pending", color: "text-yellow-600 bg-yellow-50", emoji: "⏳" },
};

const TrackBooking = () => {
  const navigate = useNavigate();
  const { bookings, isLoading } = useBookings();

  const activeBookings = bookings.filter((b) => b.status === "confirmed" || b.status === "pending");
  const pastBookings = bookings.filter((b) => b.status === "completed" || b.status === "cancelled");

  const renderBooking = (booking: typeof bookings[0], i: number) => {
    const status = statusConfig[booking.status] || statusConfig.pending;
    return (
      <motion.div
        key={booking.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className="rounded-xl border border-border bg-card p-4 space-y-2"
      >
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{booking.business_name}</p>
            <p className="text-xs text-muted-foreground">{booking.mode === "walk_in" ? "Walk-in" : "Scheduled"}</p>
          </div>
          <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold", status.color)}>
            {status.emoji} {status.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {booking.booking_date && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {format(new Date(booking.booking_date), "MMM dd, yyyy")}
            </span>
          )}
          {booking.booking_time && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {booking.booking_time}
            </span>
          )}
        </div>

        {booking.notes && (
          <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2">{booking.notes}</p>
        )}

        {(booking.status === "completed" || booking.status === "cancelled") && (
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-xl text-xs mt-1"
            onClick={() => navigate(`/business/${booking.business_id}`)}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Re-book
          </Button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Track Bookings</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-3">📦</span>
            <h3 className="text-base font-semibold text-foreground">No bookings yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your appointment and service bookings will appear here
            </p>
            <Button className="mt-4 rounded-xl" onClick={() => navigate("/")}>
              Browse Services
            </Button>
          </div>
        ) : (
          <>
            {activeBookings.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Active ({activeBookings.length})
                </h3>
                <div className="space-y-3">{activeBookings.map(renderBooking)}</div>
              </div>
            )}

            {pastBookings.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Past ({pastBookings.length})
                </h3>
                <div className="space-y-3">{pastBookings.map(renderBooking)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TrackBooking;
