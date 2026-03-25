import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, Users, Eye, MousePointer, Target, BarChart3, Zap, Phone, MapPin, Share2, Globe, Star, CalendarCheck, MessageSquare, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, Tooltip, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { useAuth } from "@/hooks/useAuth";
import { useBusinessCards } from "@/hooks/useBusinessCards";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--warning))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

const BusinessAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cards } = useBusinessCards();
  const cardIds = cards.map((c) => c.id);

  const { data: analytics = [], isLoading } = useQuery({
    queryKey: ["card-analytics-full", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("card_analytics")
        .select("*")
        .in("business_card_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user && cardIds.length > 0,
  });

  // Bookings data
  const { data: bookings = [] } = useQuery({
    queryKey: ["analytics-bookings", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .in("business_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user && cardIds.length > 0,
  });

  // Reviews data
  const { data: reviews = [] } = useQuery({
    queryKey: ["analytics-reviews", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .in("business_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!user && cardIds.length > 0,
  });

  // Leads data
  const { data: leads = [] } = useQuery({
    queryKey: ["analytics-leads", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("business_leads" as any)
        .select("*")
        .in("business_card_id", cardIds)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user && cardIds.length > 0,
  });

  // Aggregate stats
  const views = analytics.filter((a) => a.event_type === "view").length;
  const phonClicks = analytics.filter((a) => a.event_type === "phone_click").length;
  const directionClicks = analytics.filter((a) => a.event_type === "direction_click").length;
  const messageClicks = analytics.filter((a) => a.event_type === "message_click").length;
  const websiteClicks = analytics.filter((a) => a.event_type === "website_click").length;
  const uniqueVisitors = new Set(analytics.filter((a) => a.visitor_id).map((a) => a.visitor_id)).size;

  const avgRating = reviews.length > 0 ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const newLeads = leads.filter((l: any) => l.status === "new").length;

  // Weekly comparison helper
  const getWeekData = (data: any[], dateField: string, weeksAgo: number) => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (7 * (weeksAgo + 1)));
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() - (7 * weeksAgo));
    return data.filter((d) => {
      const date = new Date(d[dateField]);
      return date >= weekStart && date < weekEnd;
    }).length;
  };

  const thisWeekViews = getWeekData(analytics.filter(a => a.event_type === "view"), "created_at", 0);
  const lastWeekViews = getWeekData(analytics.filter(a => a.event_type === "view"), "created_at", 1);
  const viewsChange = lastWeekViews > 0 ? Math.round(((thisWeekViews - lastWeekViews) / lastWeekViews) * 100) : 0;

  const thisWeekBookings = getWeekData(bookings, "created_at", 0);
  const lastWeekBookings = getWeekData(bookings, "created_at", 1);
  const bookingsChange = lastWeekBookings > 0 ? Math.round(((thisWeekBookings - lastWeekBookings) / lastWeekBookings) * 100) : 0;

  const thisWeekLeads = getWeekData(leads, "created_at", 0);

  // Event type breakdown for pie chart
  const pieData = [
    { name: "Views", value: views || 1 },
    { name: "Calls", value: phonClicks || 0 },
    { name: "Directions", value: directionClicks || 0 },
    { name: "Messages", value: messageClicks || 0 },
    { name: "Website", value: websiteClicks || 0 },
  ].filter((d) => d.value > 0);

  // Daily trend (last 14 days)
  const dailyData = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const dayStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
    const viewCount = analytics.filter((a) => {
      const d = new Date(a.created_at);
      return d >= dayStart && d <= dayEnd && a.event_type === "view";
    }).length;
    const bookingCount = bookings.filter((b) => {
      const d = new Date(b.created_at);
      return d >= dayStart && d <= dayEnd;
    }).length;
    const leadCount = leads.filter((l: any) => {
      const d = new Date(l.created_at);
      return d >= dayStart && d <= dayEnd;
    }).length;
    return { day: dayStr, views: viewCount, bookings: bookingCount, leads: leadCount };
  });

  // Hourly data
  const hourlyData = Array.from({ length: 12 }, (_, i) => {
    const hour = i + 8;
    const label = hour <= 12 ? `${hour}AM` : `${hour - 12}PM`;
    const count = analytics.filter((a) => new Date(a.created_at).getHours() === hour).length;
    return { hour: label, views: count };
  });

  if (!user || cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground mb-4">{!user ? "Sign in to view analytics" : "Create a business card first"}</p>
        <Button onClick={() => navigate(user ? "/my-cards/create" : "/auth")} className="rounded-xl">
          {user ? "Create Card" : "Sign In"}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Business Insights</h1>
        <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          <Zap className="inline h-3 w-3 mr-0.5" />Live
        </span>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Weekly Summary Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">This Week's Summary</h3>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Views", value: thisWeekViews, change: viewsChange, emoji: "👁️" },
              { label: "Bookings", value: thisWeekBookings, change: bookingsChange, emoji: "📅" },
              { label: "Leads", value: thisWeekLeads, change: 0, emoji: "🎯" },
              { label: "Rating", value: avgRating, change: 0, emoji: "⭐" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-card border border-border p-2.5 text-center">
                <span className="text-lg">{s.emoji}</span>
                <p className="text-base font-bold text-foreground">{isLoading ? "..." : s.value}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
                {s.change !== 0 && (
                  <p className={`text-[9px] font-semibold ${s.change > 0 ? "text-green-600" : "text-red-500"}`}>
                    {s.change > 0 ? "↑" : "↓"} {Math.abs(s.change)}%
                  </p>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        <Tabs defaultValue="overview" className="">
          <TabsList className="w-full">
            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
            <TabsTrigger value="engagement" className="flex-1 text-xs">Engagement</TabsTrigger>
            <TabsTrigger value="performance" className="flex-1 text-xs">Performance</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4 mt-3">
            {/* Overview Cards */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Eye, label: "Total Views", value: views },
                { icon: Phone, label: "Phone Clicks", value: phonClicks },
                { icon: MapPin, label: "Directions", value: directionClicks },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-xl border border-border bg-card p-3">
                  <s.icon className="h-4 w-4 text-primary mb-1" />
                  <p className="text-xl font-bold text-foreground">{isLoading ? "..." : s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: MousePointer, label: "Messages", value: messageClicks },
                { icon: Globe, label: "Website", value: websiteClicks },
                { icon: Users, label: "Unique Leads", value: uniqueVisitors },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 3) * 0.05 }} className="rounded-xl border border-border bg-card p-3">
                  <s.icon className="h-4 w-4 text-primary mb-1" />
                  <p className="text-xl font-bold text-foreground">{isLoading ? "..." : s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {/* 14-Day Trend */}
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">14-Day Trend</h3>
              </div>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="views" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="bookings" stackId="2" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="leads" stackId="3" stroke="hsl(var(--warning, 45 93% 47%))" fill="hsl(var(--warning, 45 93% 47%))" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-primary" />Views</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full bg-accent" />Bookings</span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-full" style={{ background: "hsl(45 93% 47%)" }} />Leads</span>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="engagement" className="space-y-4 mt-3">
            {/* Activity Breakdown */}
            {pieData.length > 1 && (
              <section className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-bold text-foreground mb-3">Activity Breakdown</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 justify-center">
                  {pieData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] text-muted-foreground">{d.name} ({d.value})</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Hourly Heatmap */}
            <section className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Peak Activity Hours</h3>
              </div>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="views" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-3">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: CalendarCheck, label: "Total Bookings", value: bookings.length, sub: `${completedBookings} completed` },
                { icon: Star, label: "Avg Rating", value: avgRating, sub: `${reviews.length} reviews` },
                { icon: Target, label: "Total Leads", value: leads.length, sub: `${newLeads} new` },
                { icon: Users, label: "Unique Visitors", value: uniqueVisitors, sub: "from analytics" },
              ].map((s, i) => (
                <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="rounded-xl border border-border bg-card p-3">
                  <s.icon className="h-4 w-4 text-primary mb-1" />
                  <p className="text-xl font-bold text-foreground">{isLoading ? "..." : s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  <p className="text-[9px] text-muted-foreground/70">{s.sub}</p>
                </motion.div>
              ))}
            </div>

            {/* Conversion Funnel */}
            <section className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-sm font-bold text-foreground">Conversion Funnel</h3>
              {[
                { label: "Profile Views", value: views, pct: 100 },
                { label: "Contact Actions", value: phonClicks + messageClicks + directionClicks, pct: views > 0 ? Math.round(((phonClicks + messageClicks + directionClicks) / views) * 100) : 0 },
                { label: "Lead Inquiries", value: leads.length, pct: views > 0 ? Math.round((leads.length / views) * 100) : 0 },
                { label: "Bookings Made", value: bookings.length, pct: views > 0 ? Math.round((bookings.length / views) * 100) : 0 },
              ].map((step, i) => (
                <div key={step.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-foreground">{step.label}</span>
                    <span className="text-muted-foreground">{step.value} ({step.pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${step.pct}%` }}
                      transition={{ delay: i * 0.1, duration: 0.5 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                </div>
              ))}
            </section>

            {/* Recent Leads */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Recent Leads</h3>
              </div>
              {leads.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
                  <p className="text-xs text-muted-foreground">No leads yet. Share your card to start getting inquiries.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {leads.slice(0, 5).map((lead: any, i: number) => (
                    <motion.div key={lead.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm">🎯</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{lead.full_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(lead.created_at).toLocaleString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        lead.status === "new" ? "bg-blue-100 text-blue-700" :
                        lead.status === "converted" ? "bg-green-100 text-green-700" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {lead.status}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default BusinessAnalytics;
