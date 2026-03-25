import { useNavigate } from "react-router-dom";
import { ArrowLeft, History, Heart, CalendarCheck, RotateCcw, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useBookings } from "@/hooks/useBookings";
import { useAuth } from "@/hooks/useAuth";
import { useDirectoryCards } from "@/hooks/useDirectoryCards";

const Dashboard = () => {
  const navigate = useNavigate();
  const { favorites } = useFavorites();
  const { user } = useAuth();
  const { bookings, isLoading } = useBookings();
  const { data: allCards = [] } = useDirectoryCards();

  const savedCards = allCards.filter((c) => favorites.includes(c.id));

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <CalendarCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Sign in to see your dashboard</p>
        <Button onClick={() => navigate("/auth")} className="rounded-xl">Sign In</Button>
      </div>
    );
  }

  const pendingBookings = bookings.filter((b) => b.status === "confirmed");
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled");

  const statusConfig: Record<string, { icon: any; color: string; bg: string }> = {
    confirmed: { icon: Clock, color: "text-amber-700", bg: "bg-amber-100" },
    completed: { icon: CheckCircle, color: "text-green-700", bg: "bg-green-100" },
    cancelled: { icon: XCircle, color: "text-red-700", bg: "bg-red-100" },
  };

  const BookingCard = ({ b, i }: { b: any; i: number }) => {
    const cfg = statusConfig[b.status] || statusConfig.confirmed;
    const StatusIcon = cfg.icon;
    return (
      <motion.div
        key={b.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04 }}
        className="rounded-xl border border-border bg-card p-3"
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-lg shrink-0">
            {b.mode === "instant" ? "⚡" : "📅"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{b.business_name}</p>
            <p className="text-[10px] text-muted-foreground">
              {b.mode === "instant" ? "Instant Booking" : `${b.booking_date} at ${b.booking_time}`}
            </p>
            {b.notes && <p className="text-[10px] text-muted-foreground mt-0.5 italic line-clamp-1">"{b.notes}"</p>}
          </div>
          <span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
            <StatusIcon className="h-3 w-3" />
            {b.status}
          </span>
        </div>
        {(b.status === "completed" || b.status === "cancelled") && (
          <Button
            size="sm"
            variant="outline"
            className="mt-2 w-full gap-1 rounded-lg text-xs"
            onClick={() => navigate(`/business/${b.business_id}`)}
          >
            <RotateCcw className="h-3 w-3" /> Re-book
          </Button>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">My Dashboard</h1>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Active", value: pendingBookings.length, emoji: "⏳" },
            { label: "Completed", value: completedBookings.length, emoji: "✅" },
            { label: "Saved", value: savedCards.length, emoji: "❤️" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <span className="text-xl">{s.emoji}</span>
              <p className="text-lg font-bold text-foreground mt-1">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Booking History with Tabs */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Booking History</h2>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
              <CalendarCheck className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No bookings yet. Book an appointment from any business card.</p>
            </div>
          ) : (
            <Tabs defaultValue="all">
              <TabsList className="w-full">
                <TabsTrigger value="all" className="flex-1 text-xs">All ({bookings.length})</TabsTrigger>
                <TabsTrigger value="active" className="flex-1 text-xs">Active ({pendingBookings.length})</TabsTrigger>
                <TabsTrigger value="completed" className="flex-1 text-xs">Done ({completedBookings.length})</TabsTrigger>
                <TabsTrigger value="cancelled" className="flex-1 text-xs">Cancelled ({cancelledBookings.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="space-y-2 mt-3">
                {bookings.map((b, i) => <BookingCard key={b.id} b={b} i={i} />)}
              </TabsContent>
              <TabsContent value="active" className="space-y-2 mt-3">
                {pendingBookings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No active bookings</p>
                ) : pendingBookings.map((b, i) => <BookingCard key={b.id} b={b} i={i} />)}
              </TabsContent>
              <TabsContent value="completed" className="space-y-2 mt-3">
                {completedBookings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No completed bookings</p>
                ) : completedBookings.map((b, i) => <BookingCard key={b.id} b={b} i={i} />)}
              </TabsContent>
              <TabsContent value="cancelled" className="space-y-2 mt-3">
                {cancelledBookings.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No cancelled bookings</p>
                ) : cancelledBookings.map((b, i) => <BookingCard key={b.id} b={b} i={i} />)}
              </TabsContent>
            </Tabs>
          )}
        </section>

        {/* Saved Cards */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Heart className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Saved Business Cards</h2>
            <span className="ml-auto text-xs text-muted-foreground">{savedCards.length} saved</span>
          </div>
          {savedCards.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
              <Heart className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No saved cards yet. Tap the heart icon on any business card to save it.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {savedCards.map((c) => (
                <button key={c.id} onClick={() => navigate(`/business/${c.id}`)} className="flex items-center gap-2 rounded-xl border border-border bg-card p-3 text-left hover:shadow-sm transition-shadow">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-lg overflow-hidden shrink-0">
                    {c.logo_url ? <img src={c.logo_url} alt="" className="h-full w-full object-cover" /> : <span>🏢</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{c.full_name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{c.category}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
