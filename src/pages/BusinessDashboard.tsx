import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Calendar, Tag, Users, CheckCircle, XCircle, Clock, ChevronRight,
  Star, MessageCircle, Download, Image, DollarSign, Send, QrCode,
  Edit, Trash2, Eye, BarChart3, MoreVertical, Reply
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PhotoGalleryManager from "@/components/business/PhotoGalleryManager";
import ReviewModeration from "@/components/business/ReviewModeration";
import ServicePricingManager from "@/components/business/ServicePricingManager";
import BusinessHoursEditor from "@/components/business/BusinessHoursEditor";
import LocationManager from "@/components/business/LocationManager";
import LeadsManager from "@/components/business/LeadsManager";
import StaffManager from "@/components/business/StaffManager";
import BookingCalendar from "@/components/business/BookingCalendar";
import PushCampaigns from "@/components/business/PushCampaigns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCards } from "@/hooks/useBusinessCards";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

const BusinessDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cards } = useBusinessCards();
  const queryClient = useQueryClient();
  const [qrCard, setQrCard] = useState<any>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const cardIds = cards.map((c) => c.id);
  const primaryCard = cards[0];

  // Incoming bookings
  const { data: incomingBookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["business-bookings", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("business_id", cardIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && cardIds.length > 0,
  });

  // Events
  const { data: myEvents = [] } = useQuery({
    queryKey: ["business-events", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Event registrations
  const eventIds = myEvents.map((e) => e.id);
  const { data: eventRegistrations = [] } = useQuery({
    queryKey: ["business-event-registrations", eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*")
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: eventIds.length > 0,
  });

  // Vouchers
  const { data: myVouchers = [] } = useQuery({
    queryKey: ["business-vouchers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Voucher claims
  const voucherIds = myVouchers.map((v) => v.id);
  const { data: voucherClaims = [] } = useQuery({
    queryKey: ["business-voucher-claims", voucherIds],
    queryFn: async () => {
      if (voucherIds.length === 0) return [];
      const { data, error } = await supabase
        .from("claimed_vouchers")
        .select("*")
        .in("voucher_id", voucherIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: voucherIds.length > 0,
  });

  // Reviews for business cards
  const { data: reviews = [] } = useQuery({
    queryKey: ["business-reviews", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .in("business_id", cardIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: cardIds.length > 0,
  });

  // Messages (conversations)
  const { data: conversations = [] } = useQuery({
    queryKey: ["business-conversations", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .in("business_id", cardIds)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && cardIds.length > 0,
  });

  // Analytics summary
  const { data: analyticsData = [] } = useQuery({
    queryKey: ["business-analytics-summary", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("card_analytics")
        .select("*")
        .in("business_card_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && cardIds.length > 0,
  });

  const updateBookingStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-bookings"] });
      toast.success("Booking updated!");
    },
  });

  const updateVoucherStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("vouchers").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-vouchers"] });
      toast.success("Voucher updated!");
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-events"] });
      toast.success("Event deleted!");
    },
  });

  const replyToReview = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      const { error } = await supabase.from("reviews").update({ business_reply: reply, business_reply_at: new Date().toISOString() } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-reviews"] });
      setReplyingTo(null);
      setReplyText("");
      toast.success("Reply posted!");
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-sm text-muted-foreground mb-4">Sign in to access your business dashboard</p>
        <Button onClick={() => navigate("/auth")} className="rounded-xl">Sign In</Button>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="min-h-screen pb-20">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
          <h1 className="text-lg font-bold text-foreground">Business Dashboard</h1>
        </div>
        <div className="flex flex-col items-center justify-center px-6 pt-24 text-center">
          <span className="text-4xl mb-4">🏪</span>
          <h2 className="text-lg font-bold text-foreground">No business card yet</h2>
          <p className="text-sm text-muted-foreground mt-1">Create a business card to access your dashboard</p>
          <Button className="mt-6 rounded-xl" onClick={() => navigate("/my-cards/create")}>Create Business Card</Button>
        </div>
      </div>
    );
  }

  const pendingBookings = incomingBookings.filter((b) => b.status === "confirmed");
  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const totalViews = analyticsData.filter((a) => a.event_type === "view").length;
  const totalCalls = analyticsData.filter((a) => a.event_type === "phone_click").length;
  const totalDirections = analyticsData.filter((a) => a.event_type === "direction_click").length;

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
        <h1 className="text-lg font-bold text-foreground">Business Dashboard</h1>
        <Button size="sm" variant="outline" className="ml-auto gap-1 rounded-lg text-xs" onClick={() => navigate("/analytics")}>
          <BarChart3 className="h-3.5 w-3.5" /> Analytics
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2 px-4 py-4">
        {[
          { label: "Views", value: totalViews, emoji: "👁️" },
          { label: "Calls", value: totalCalls, emoji: "📞" },
          { label: "Bookings", value: incomingBookings.length, emoji: "📅" },
          { label: "Rating", value: avgRating, emoji: "⭐" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-2.5 text-center">
            <span className="text-lg">{s.emoji}</span>
            <p className="text-base font-bold text-foreground">{s.value}</p>
            <p className="text-[9px] text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="bookings" className="px-4">
        <TabsList className="w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="bookings" className="flex-1 text-xs">
            Bookings {pendingBookings.length > 0 && <span className="ml-1 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{pendingBookings.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex-1 text-xs">Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="events" className="flex-1 text-xs">Events</TabsTrigger>
          <TabsTrigger value="vouchers" className="flex-1 text-xs">Vouchers</TabsTrigger>
          <TabsTrigger value="messages" className="flex-1 text-xs">Messages</TabsTrigger>
          <TabsTrigger value="leads" className="flex-1 text-xs">Leads</TabsTrigger>
          <TabsTrigger value="calendar" className="flex-1 text-xs">Calendar</TabsTrigger>
          <TabsTrigger value="staff" className="flex-1 text-xs">Team</TabsTrigger>
          <TabsTrigger value="campaigns" className="flex-1 text-xs">Campaigns</TabsTrigger>
          <TabsTrigger value="tools" className="flex-1 text-xs">Tools</TabsTrigger>
        </TabsList>

        {/* Bookings Tab */}
        <TabsContent value="bookings" className="space-y-3 mt-3">
          {bookingsLoading ? (
            <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
          ) : incomingBookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No bookings yet</p>
            </div>
          ) : (
            incomingBookings.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{b.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{b.customer_phone}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {b.mode === "instant" ? "⚡ Instant" : `📅 ${b.booking_date} at ${b.booking_time}`}
                    </p>
                    {b.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{b.notes}"</p>}
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    b.status === "confirmed" ? "bg-amber-100 text-amber-700" :
                    b.status === "completed" ? "bg-green-100 text-green-700" :
                    b.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
                  }`}>
                    {b.status}
                  </span>
                </div>
                {b.status === "confirmed" && (
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" className="flex-1 gap-1 rounded-lg text-xs" onClick={() => updateBookingStatus.mutate({ id: b.id, status: "completed" })}>
                      <CheckCircle className="h-3.5 w-3.5" /> Complete
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-1 rounded-lg text-xs text-destructive" onClick={() => updateBookingStatus.mutate({ id: b.id, status: "cancelled" })}>
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </Button>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-3 mt-3">
          <ReviewModeration cardIds={cardIds} />
        </TabsContent>

        {/* Events Tab with Registrations */}
        <TabsContent value="events" className="space-y-3 mt-3">
          <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={() => navigate("/events/create")}>
            <Calendar className="h-4 w-4" /> Create New Event
          </Button>
          {myEvents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">No events created yet</p>
            </div>
          ) : (
            myEvents.map((e, i) => {
              const regs = eventRegistrations.filter((r) => r.event_id === e.id);
              return (
                <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="cursor-pointer" onClick={() => navigate(`/events/${e.id}`)}>
                      <p className="text-sm font-bold text-foreground">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.venue} • {e.date}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1"><MoreVertical className="h-4 w-4 text-muted-foreground" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="gap-2" onClick={() => navigate(`/events/${e.id}`)}><Eye className="h-3.5 w-3.5" /> View</DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 text-destructive" onClick={() => deleteEvent.mutate(e.id)}><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      <Users className="h-3 w-3 inline mr-0.5" /> {regs.length} registrations
                    </span>
                    {e.max_attendees && (
                      <span className="text-[10px] text-muted-foreground">/ {e.max_attendees} max</span>
                    )}
                  </div>
                  {regs.length > 0 && (
                    <div className="space-y-1 mt-1">
                      {regs.slice(0, 3).map((r) => (
                        <div key={r.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{r.full_name}</span>
                          <span>•</span>
                          <span>{r.email}</span>
                          {r.is_verified && <CheckCircle className="h-3 w-3 text-green-500" />}
                        </div>
                      ))}
                      {regs.length > 3 && <p className="text-[10px] text-primary cursor-pointer">+{regs.length - 3} more</p>}
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </TabsContent>

        {/* Vouchers Tab with Claims */}
        <TabsContent value="vouchers" className="space-y-3 mt-3">
          <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={() => navigate("/vouchers/create")}>
            <Tag className="h-4 w-4" /> Create New Voucher
          </Button>
          {myVouchers.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <p className="text-sm text-muted-foreground">No vouchers created yet</p>
            </div>
          ) : (
            myVouchers.map((v, i) => {
              const claims = voucherClaims.filter((c) => c.voucher_id === v.id);
              return (
                <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border bg-card p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-bold text-foreground">{v.title}</p>
                      <p className="text-xs text-muted-foreground">₹{v.discounted_price} <span className="line-through">₹{v.original_price}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        v.status === "active" ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                      }`}>{v.status}</span>
                      {v.status === "active" ? (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-destructive" onClick={() => updateVoucherStatus.mutate({ id: v.id, status: "inactive" })}>
                          Deactivate
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-primary" onClick={() => updateVoucherStatus.mutate({ id: v.id, status: "active" })}>
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>🎫 {claims.length} claimed</span>
                    {v.max_claims && <span>/ {v.max_claims} max</span>}
                    {claims.filter((c) => c.status === "redeemed").length > 0 && (
                      <span className="text-green-600">✓ {claims.filter((c) => c.status === "redeemed").length} redeemed</span>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="space-y-3 mt-3">
          <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={() => navigate("/messaging")}>
            <MessageCircle className="h-4 w-4" /> Open Messaging
          </Button>
          {conversations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
              <MessageCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No customer messages yet</p>
            </div>
          ) : (
            conversations.slice(0, 10).map((c, i) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer"
                onClick={() => navigate("/messaging")}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg">
                  {c.business_avatar || "📇"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.business_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(c.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Leads Tab */}
        <TabsContent value="leads" className="space-y-3 mt-3">
          {primaryCard && <LeadsManager businessCardId={primaryCard.id} />}
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="mt-3">
          <BookingCalendar bookings={incomingBookings} />
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff" className="mt-3">
          {primaryCard && <StaffManager businessCardId={primaryCard.id} />}
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-3">
          {primaryCard && <PushCampaigns businessCardId={primaryCard.id} />}
        </TabsContent>

        {/* Tools Tab - QR, Gallery, Hours, Pricing */}
        <TabsContent value="tools" className="space-y-3 mt-3">
          {/* QR Code Download */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <QrCode className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">QR Code for Print</h3>
            </div>
            {primaryCard && (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeSVG value={`${window.location.origin}/card/${primaryCard.id}`} size={160} />
                </div>
                <p className="text-xs text-muted-foreground text-center">Scan to view your business card</p>
                <Button size="sm" className="gap-1 rounded-lg text-xs" onClick={() => {
                  const svg = document.querySelector(".qr-download-target svg");
                  if (!svg) {
                    toast.info("Right-click the QR code to save as image");
                    return;
                  }
                  toast.success("QR code ready for download!");
                }}>
                  <Download className="h-3.5 w-3.5" /> Download QR
                </Button>
              </div>
            )}
          </div>

          {/* Photo Gallery */}
          {primaryCard && <PhotoGalleryManager businessCardId={primaryCard.id} />}

          {/* Service Pricing */}
          {primaryCard && <ServicePricingManager businessCardId={primaryCard.id} />}

          {/* Business Hours */}
          {primaryCard && <BusinessHoursEditor businessCardId={primaryCard.id} />}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="gap-2 rounded-xl justify-start text-xs h-auto py-3" onClick={() => navigate(`/my-cards/edit/${primaryCard?.id}`)}>
              <Edit className="h-4 w-4" />
              <div className="text-left">
                <p className="font-semibold">Edit Card</p>
                <p className="text-[10px] text-muted-foreground">Update details</p>
              </div>
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl justify-start text-xs h-auto py-3" onClick={() => navigate("/promote")}>
              <Send className="h-4 w-4" />
              <div className="text-left">
                <p className="font-semibold">Promote</p>
                <p className="text-[10px] text-muted-foreground">Ads & visibility</p>
              </div>
            </Button>
          </div>

          {/* Multi-Location Manager */}
          {primaryCard && (
            <div className="mt-4">
              <LocationManager businessCardId={primaryCard.id} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BusinessDashboard;
