import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, LayoutDashboard, Users, Store, Calendar, Tag, Megaphone, Star, Bell, CreditCard, LifeBuoy, FolderOpen, Trash2, Flag, CheckCircle, XCircle, Clock, Send, Plus, Edit2, ToggleLeft, ToggleRight, ChevronRight, AlertTriangle, IndianRupee, TrendingUp, Download, Ban, UserCheck, Scale, Activity, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { exportToCsv } from "@/lib/exportCsv";
import AdminStatCard from "@/components/admin/AdminStatCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import {
  useAdminStats, useAdminBusinessCards, useAdminEvents, useAdminVouchers,
  useAdminAds, useAdminReviews, useAdminSubscriptions, useAdminTickets,
  useAdminCategories, useAdminProfiles, useAdminUserRoles, useAdminRevenueData,
  useUpdateBusinessApproval, useUpdateEventApproval, useUpdateAdApproval,
  useFlagReview, useDeleteReview, useUpdateTicket, useUpsertCategory,
  useDeleteCategory, useBroadcastNotification, useSuspendUser, useToggleBusinessVerification,
  useAdminPendingCounts, useReviewSpamFlags, useResolveSpamFlag, useRunSpamDetection,
} from "@/hooks/useAdminData";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area, CartesianGrid } from "recharts";
import ActivityFeed from "@/components/admin/ActivityFeed";
import ApprovalQueue from "@/components/admin/ApprovalQueue";
import CampaignBuilder from "@/components/admin/CampaignBuilder";
import AlertBanner from "@/components/admin/AlertBanner";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <p className="text-sm text-muted-foreground mb-4">Sign in to access admin panel</p>
        <Button onClick={() => navigate("/auth")} className="rounded-xl">Sign In</Button>
      </div>
    );
  }

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <h2 className="text-lg font-bold text-foreground">Access Denied</h2>
        <p className="text-sm text-muted-foreground mt-1">You don't have admin privileges.</p>
        <Button variant="outline" className="mt-4 rounded-xl" onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return <AdminPanel />;
};

const AdminPanel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "overview";
  const [tab, setTab] = useState(initialTab);
  const [globalSearch, setGlobalSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && urlTab !== tab) {
      setTab(urlTab);
    }
  }, [searchParams]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(s => !s);
      }
      const tabKeys: Record<string, string> = { "1": "overview", "2": "approvals", "3": "activity", "4": "growth" };
      if (tabKeys[e.key] && !e.ctrlKey && !e.metaKey) setTab(tabKeys[e.key]);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const mainTabs = [
    { v: "overview", l: "Overview", i: LayoutDashboard },
    { v: "approvals", l: "Approvals", i: ShieldCheck },
    { v: "activity", l: "Activity", i: Activity },
    { v: "growth", l: "Growth", i: TrendingUp },
  ];

  const managementTabs = [
    { v: "users", l: "Users", i: Users },
    { v: "businesses", l: "Businesses", i: Store },
    { v: "events", l: "Events", i: Calendar },
    { v: "vouchers", l: "Vouchers", i: Tag },
    { v: "ads", l: "Ads", i: Megaphone },
    { v: "reviews", l: "Reviews", i: Star },
    { v: "categories", l: "Categories", i: FolderOpen },
    { v: "revenue", l: "Revenue", i: IndianRupee },
    { v: "notifications", l: "Notify", i: Bell },
    { v: "reports", l: "Reports", i: Flag },
    { v: "disputes", l: "Disputes", i: Scale },
    { v: "tickets", l: "Support", i: LifeBuoy },
  ];

  const allTabs = [...mainTabs, ...managementTabs];

  // Global search results
  const { data: cards = [] } = useAdminBusinessCards();
  const { data: profiles = [] } = useAdminProfiles();
  const { data: events = [] } = useAdminEvents();
  const { data: vouchers = [] } = useAdminVouchers();

  const searchResults = globalSearch.length >= 2 ? [
    ...cards.filter(c => c.full_name.toLowerCase().includes(globalSearch.toLowerCase()) || (c.company_name || "").toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 3).map(c => ({ type: "Business", label: c.full_name, sub: c.company_name || c.category || "", tab: "businesses" })),
    ...profiles.filter(p => (p.full_name || "").toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 3).map(p => ({ type: "User", label: p.full_name || "Unnamed", sub: p.id.slice(0, 8), tab: "users" })),
    ...events.filter(e => e.title.toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 3).map(e => ({ type: "Event", label: e.title, sub: e.venue, tab: "events" })),
    ...vouchers.filter(v => v.title.toLowerCase().includes(globalSearch.toLowerCase())).slice(0, 3).map(v => ({ type: "Voucher", label: v.title, sub: v.category, tab: "vouchers" })),
  ] : [];

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5 text-foreground" /></button>
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold text-foreground flex-1">Admin Panel</h1>
          <button onClick={() => setShowSearch(s => !s)} className="p-1.5 rounded-lg hover:bg-muted">
            <Search className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        {showSearch && (
          <div className="px-4 pb-3 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search businesses, users, events… (Ctrl+K)"
                value={globalSearch}
                onChange={e => setGlobalSearch(e.target.value)}
                className="pl-9 pr-8 rounded-xl"
              />
              {globalSearch && (
                <button onClick={() => setGlobalSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 max-h-64 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button key={i} className="w-full text-left px-4 py-2.5 hover:bg-muted flex items-center gap-3 border-b border-border last:border-0"
                    onClick={() => { setTab(r.tab); setGlobalSearch(""); setShowSearch(false); }}>
                    <Badge variant="secondary" className="text-[9px] shrink-0">{r.type}</Badge>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{r.sub}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {globalSearch.length >= 2 && searchResults.length === 0 && (
              <div className="absolute left-4 right-4 top-full mt-1 bg-card border border-border rounded-xl shadow-lg z-50 p-4 text-center">
                <p className="text-sm text-muted-foreground">No results found</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <div className="overflow-x-auto border-b border-border bg-card">
          <TabsList className="w-max px-4 py-0 h-auto bg-transparent gap-0">
            {allTabs.map(t => (
              <TabsTrigger key={t.v} value={t.v} className="text-[11px] px-3 py-2.5 gap-1.5 data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none">
                <t.i className="h-3.5 w-3.5" /> {t.l}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <div className="px-4 py-4">
          <TabsContent value="overview"><OverviewTab /></TabsContent>
          <TabsContent value="approvals"><ApprovalQueue /></TabsContent>
          <TabsContent value="activity"><ActivityFeed /></TabsContent>
          <TabsContent value="growth"><CampaignBuilder /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="businesses"><BusinessesTab /></TabsContent>
          <TabsContent value="events"><EventsTab /></TabsContent>
          <TabsContent value="vouchers"><VouchersTab /></TabsContent>
          <TabsContent value="ads"><AdsTab /></TabsContent>
          <TabsContent value="reviews"><ReviewsTab /></TabsContent>
          <TabsContent value="categories"><CategoriesTab /></TabsContent>
          <TabsContent value="revenue"><RevenueTab /></TabsContent>
          <TabsContent value="notifications"><NotificationsTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
          <TabsContent value="disputes"><DisputesTab /></TabsContent>
          <TabsContent value="tickets"><TicketsTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

// ==================== OVERVIEW ====================
type DateRange = "today" | "7d" | "30d" | "all";

const getDateFilter = (range: DateRange): string | null => {
  if (range === "all") return null;
  const now = new Date();
  if (range === "today") return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  if (range === "7d") return new Date(now.getTime() - 7 * 86400000).toISOString();
  return new Date(now.getTime() - 30 * 86400000).toISOString();
};

const getPreviousDateFilter = (range: DateRange): { from: string; to: string } | null => {
  if (range === "all") return null;
  const now = new Date();
  if (range === "today") {
    const yesterday = new Date(now.getTime() - 86400000);
    return { from: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).toISOString(), to: new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString() };
  }
  if (range === "7d") return { from: new Date(now.getTime() - 14 * 86400000).toISOString(), to: new Date(now.getTime() - 7 * 86400000).toISOString() };
  return { from: new Date(now.getTime() - 60 * 86400000).toISOString(), to: new Date(now.getTime() - 30 * 86400000).toISOString() };
};

const OverviewTab = () => {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const { data: stats, isLoading } = useAdminStats();
  const { data: pendingCounts } = useAdminPendingCounts();

  // For trend comparison we use the filtered stats from useAdminStatsFiltered
  const dateFilter = getDateFilter(dateRange);
  const prevFilter = getPreviousDateFilter(dateRange);

  const { data: filteredStats } = useQuery({
    queryKey: ["admin-stats-filtered", dateRange],
    queryFn: async () => {
      if (!dateFilter) return null;
      const [cards, events, vouchers, bookings, ads, reviews, subs, tickets] = await Promise.all([
        supabase.from("business_cards").select("id", { count: "exact", head: true }).gte("created_at", dateFilter),
        supabase.from("events").select("id", { count: "exact", head: true }).gte("created_at", dateFilter),
        supabase.from("vouchers").select("id", { count: "exact", head: true }).gte("created_at", dateFilter),
        supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", dateFilter),
        supabase.from("ad_campaigns").select("id", { count: "exact", head: true }).gte("created_at", dateFilter),
        supabase.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", dateFilter),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).gte("created_at", dateFilter),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).gte("created_at", dateFilter),
      ]);
      return { businesses: cards.count ?? 0, events: events.count ?? 0, vouchers: vouchers.count ?? 0, bookings: bookings.count ?? 0, ads: ads.count ?? 0, reviews: reviews.count ?? 0, subscriptions: subs.count ?? 0, tickets: tickets.count ?? 0 };
    },
    enabled: dateRange !== "all",
  });

  const { data: prevStats } = useQuery({
    queryKey: ["admin-stats-prev", dateRange],
    queryFn: async () => {
      if (!prevFilter) return null;
      const [cards, events, vouchers, bookings, ads, reviews, subs, tickets] = await Promise.all([
        supabase.from("business_cards").select("id", { count: "exact", head: true }).gte("created_at", prevFilter.from).lt("created_at", prevFilter.to),
        supabase.from("events").select("id", { count: "exact", head: true }).gte("created_at", prevFilter.from).lt("created_at", prevFilter.to),
        supabase.from("vouchers").select("id", { count: "exact", head: true }).gte("created_at", prevFilter.from).lt("created_at", prevFilter.to),
        supabase.from("bookings").select("id", { count: "exact", head: true }).gte("created_at", prevFilter.from).lt("created_at", prevFilter.to),
        supabase.from("ad_campaigns").select("id", { count: "exact", head: true }).gte("created_at", prevFilter.from).lt("created_at", prevFilter.to),
        supabase.from("reviews").select("id", { count: "exact", head: true }).gte("created_at", prevFilter.from).lt("created_at", prevFilter.to),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }).gte("created_at", prevFilter.from).lt("created_at", prevFilter.to),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).gte("created_at", prevFilter.from).lt("created_at", prevFilter.to),
      ]);
      return { businesses: cards.count ?? 0, events: events.count ?? 0, vouchers: vouchers.count ?? 0, bookings: bookings.count ?? 0, ads: ads.count ?? 0, reviews: reviews.count ?? 0, subscriptions: subs.count ?? 0, tickets: tickets.count ?? 0 };
    },
    enabled: dateRange !== "all" && !!prevFilter,
  });

  const currentStats = dateRange === "all" ? stats : filteredStats;
  const keys = ["businesses", "events", "vouchers", "bookings", "ads", "reviews", "subscriptions", "tickets"] as const;
  const emojiMap: Record<string, string> = { businesses: "🏢", events: "🎉", vouchers: "🎟️", bookings: "📅", ads: "📣", reviews: "⭐", subscriptions: "💎", tickets: "🎫" };
  const labelMap: Record<string, string> = { businesses: "Businesses", events: "Events", vouchers: "Vouchers", bookings: "Bookings", ads: "Ad Campaigns", reviews: "Reviews", subscriptions: "Subscribers", tickets: "Tickets" };

  const pendingActions = pendingCounts ? [
    { label: "Pending Cards", count: pendingCounts.pendingCards, emoji: "✅", tab: "businesses" },
    { label: "Pending Events", count: pendingCounts.pendingEvents, emoji: "📅", tab: "events" },
    { label: "Pending Ads", count: pendingCounts.pendingAds, emoji: "📣", tab: "ads" },
    { label: "Open Reports", count: pendingCounts.openReports, emoji: "🚩", tab: "reports" },
    { label: "Open Disputes", count: pendingCounts.openDisputes, emoji: "⚖️", tab: "disputes" },
    { label: "Open Tickets", count: pendingCounts.openTickets, emoji: "🎫", tab: "tickets" },
    { label: "Flagged Reviews", count: pendingCounts.flaggedReviews, emoji: "⭐", tab: "reviews" },
  ].filter(a => a.count > 0) : [];

  type QuickAction = {
    to: string;
    label: string;
    emoji: string;
    highlight: boolean;
    countKey?: "pendingCards" | "pendingEvents" | "pendingAds" | "pendingVouchers" | "openReports" | "openDisputes" | "openTickets" | "flaggedReviews";
  };

  const quickActions: QuickAction[] = [
    { to: "/admin?tab=businesses", label: "Approve Cards", emoji: "✅", highlight: true, countKey: "pendingCards" },
    { to: "/admin?tab=reports", label: "Reports", emoji: "🚩", highlight: true, countKey: "openReports" },
    { to: "/admin?tab=disputes", label: "Disputes", emoji: "⚖️", highlight: true, countKey: "openDisputes" },
    { to: "/admin?tab=tickets", label: "Tickets", emoji: "🎫", highlight: false, countKey: "openTickets" },
    { to: "/admin?tab=ads", label: "Ad Review", emoji: "📣", highlight: false, countKey: "pendingAds" },
    { to: "/admin?tab=reviews", label: "Reviews", emoji: "⭐", highlight: false, countKey: "flaggedReviews" },
    { to: "/admin?tab=users", label: "Users", emoji: "👥", highlight: false },
    { to: "/admin?tab=events", label: "Events", emoji: "📅", highlight: false, countKey: "pendingEvents" },
  ];

  const reportItems = [
    { to: "/admin?tab=revenue", label: "Revenue", emoji: "💰" },
    { to: "/ads/dashboard", label: "Ad Reports", emoji: "📣" },
    { to: "/analytics", label: "Analytics", emoji: "📊" },
    { to: "/business-dashboard", label: "Biz Dashboard", emoji: "📈" },
  ];

  const platformItems = [
    { to: "/admin?tab=categories", label: "Categories", emoji: "📁" },
    { to: "/admin?tab=users", label: "Users", emoji: "👥" },
    { to: "/admin?tab=notifications", label: "Broadcast", emoji: "📢" },
    { to: "/edit-profile", label: "Settings", emoji: "⚙️" },
  ];

  const accountItems = [
    { to: "/profile", label: "Profile", emoji: "👤" },
    { to: "/messaging", label: "Inbox", emoji: "💬" },
    { to: "/notifications", label: "Notifications", emoji: "🔔" },
    { to: "/support", label: "Support", emoji: "🆘" },
  ];

  const dateRangeOptions: { label: string; value: DateRange }[] = [
    { label: "Today", value: "today" },
    { label: "7 Days", value: "7d" },
    { label: "30 Days", value: "30d" },
    { label: "All Time", value: "all" },
  ];

  return (
    <div className="space-y-5">
      <AlertBanner />

      {/* Platform Overview Stats with Date Range */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-foreground">Platform Overview</h2>
          <div className="flex gap-1">
            {dateRangeOptions.map(opt => (
              <Button key={opt.value} size="sm" variant={dateRange === opt.value ? "default" : "outline"} className="text-[10px] h-6 px-2 rounded-lg"
                onClick={() => setDateRange(opt.value)}>
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {keys.map((key, i) => (
            <AdminStatCard
              key={key}
              label={labelMap[key]}
              value={(currentStats as any)?.[key] ?? 0}
              previousValue={prevStats ? (prevStats as any)[key] : undefined}
              emoji={emojiMap[key]}
              isLoading={isLoading && dateRange === "all"}
              index={i}
            />
          ))}
        </div>
      </div>

      {/* Pending Actions */}
      {pendingActions.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-foreground mb-2">⚡ Pending Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {pendingActions.map((a) => (
              <button
                key={a.label}
                onClick={() => navigate(`/admin?tab=${a.tab}`)}
                className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-center hover:bg-destructive/10 transition-colors"
              >
                <span className="text-lg">{a.emoji}</span>
                <p className="text-xl font-bold text-destructive mt-1">{a.count}</p>
                <p className="text-[10px] text-muted-foreground">{a.label}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <p className="mb-2 text-xs font-semibold text-primary uppercase tracking-wider">Quick Actions</p>
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((item) => {
            const count = item.countKey && pendingCounts ? (pendingCounts as any)[item.countKey] : 0;
            return (
              <button
                key={item.to + item.label}
                onClick={() => navigate(item.to)}
                className={`relative flex flex-col items-center gap-1.5 rounded-xl p-3 transition-colors ${
                  item.highlight
                    ? "bg-primary/10 ring-1 ring-primary/20 hover:bg-primary/15"
                    : "bg-muted/50 hover:bg-muted"
                }`}
              >
                <span className="text-2xl">{item.emoji}</span>
                {count > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
                <span className={`text-[11px] font-medium leading-tight text-center ${
                  item.highlight ? "text-primary" : "text-foreground"
                }`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reports & Stats */}
      <div>
        <p className="mb-2 text-xs font-semibold text-primary uppercase tracking-wider">Reports & Stats</p>
        <div className="grid grid-cols-4 gap-3">
          {reportItems.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-[11px] font-medium text-foreground leading-tight text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Platform Management */}
      <div>
        <p className="mb-2 text-xs font-semibold text-primary uppercase tracking-wider">Platform Management</p>
        <div className="grid grid-cols-4 gap-3">
          {platformItems.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-[11px] font-medium text-foreground leading-tight text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Account */}
      <div>
        <p className="mb-2 text-xs font-semibold text-primary uppercase tracking-wider">Account</p>
        <div className="grid grid-cols-4 gap-3">
          {accountItems.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-[11px] font-medium text-foreground leading-tight text-center">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== USERS ====================
const UsersTab = () => {
  const { data: profiles = [] } = useAdminProfiles();
  const { data: roles = [] } = useAdminUserRoles();
  const suspendUser = useSuspendUser();
  const [search, setSearch] = useState("");

  const getUserRoles = (uid: string) => roles.filter(r => r.user_id === uid).map(r => r.role);

  const filtered = profiles.filter(p =>
    !search || (p.full_name || "").toLowerCase().includes(search.toLowerCase()) || p.id.includes(search)
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">User Management ({profiles.length})</h2>
        <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1 rounded-lg" onClick={() => exportToCsv("users", profiles.map(p => ({ name: p.full_name, id: p.id, phone: p.phone, created: p.created_at, suspended: (p as any).is_suspended })))}>
          <Download className="h-3 w-3" /> Export
        </Button>
      </div>
      <Input placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)} className="rounded-xl" />
      <div className="space-y-2">
        {filtered.map(p => {
          const isSuspended = (p as any).is_suspended;
          return (
            <div key={p.id} className={`flex items-center gap-3 rounded-xl border bg-card p-3 ${isSuspended ? "border-destructive/30 opacity-70" : "border-border"}`}>
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm">
                {p.avatar_url ? <img src={p.avatar_url} className="h-full w-full rounded-full object-cover" /> : "👤"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.full_name || "Unnamed"}</p>
                <div className="flex gap-1 mt-0.5">
                  {getUserRoles(p.id).map(r => (
                    <Badge key={r} variant={r === "admin" ? "default" : "secondary"} className="text-[9px] px-1.5 py-0">{r}</Badge>
                  ))}
                  {isSuspended && <Badge variant="destructive" className="text-[9px] px-1.5 py-0">Suspended</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
                {isSuspended ? (
                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 rounded-lg" onClick={() => suspendUser.mutate({ id: p.id, suspended: false })}>
                    <UserCheck className="h-3 w-3" /> Activate
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" className="h-7 text-[10px] gap-1 rounded-lg text-destructive" onClick={() => suspendUser.mutate({ id: p.id, suspended: true })}>
                    <Ban className="h-3 w-3" /> Suspend
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No users found</p>}
      </div>
    </div>
  );
};

// ==================== BUSINESSES ====================
const BusinessesTab = () => {
  const navigate = useNavigate();
  const { data: cards = [] } = useAdminBusinessCards();
  const updateApproval = useUpdateBusinessApproval();
  const toggleVerification = useToggleBusinessVerification();
  const [filter, setFilter] = useState<string>("all");

  const filtered = cards.filter(c => {
    if (filter === "all") return true;
    if (filter === "verified") return (c as any).is_verified;
    if (filter === "unverified") return !(c as any).is_verified;
    return (c as any).approval_status === filter;
  });

  const verifiedCount = cards.filter(c => (c as any).is_verified).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Business Moderation ({cards.length})</h2>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] gap-1">
            <ShieldCheck className="h-3 w-3" /> {verifiedCount} Verified
          </Badge>
          <Button size="sm" variant="outline" className="text-[10px] h-7 gap-1 rounded-lg" onClick={() => exportToCsv("businesses", cards.map(c => ({ name: c.full_name, company: c.company_name, category: c.category, phone: c.phone, status: (c as any).approval_status, verified: (c as any).is_verified, created: c.created_at })))}>
            <Download className="h-3 w-3" /> Export
          </Button>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap">
        {["all", "approved", "pending", "rejected", "verified", "unverified"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="text-[11px] rounded-xl capitalize" onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(card => {
          const isVerified = (card as any).is_verified;
          return (
            <div key={card.id} className={`rounded-xl border bg-card p-3 ${isVerified ? "border-primary/30" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center overflow-hidden">
                  {card.logo_url ? <img src={card.logo_url} className="h-full w-full object-cover" /> : <span>🏢</span>}
                </div>
                <div className="flex-1 min-w-0" onClick={() => navigate(`/business/${card.id}`)} role="button">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium text-foreground truncate">{card.full_name}</p>
                    {isVerified && <ShieldCheck className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{card.company_name ?? "Personal"} • {card.category ?? "Uncategorized"}</p>
                </div>
                <ApprovalBadge status={(card as any).approval_status} />
              </div>
              <div className="flex gap-2 mt-2 justify-end flex-wrap">
                <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1" onClick={() => updateApproval.mutate({ id: card.id, status: "approved" })}>
                  <CheckCircle className="h-3 w-3 text-green-600" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1" onClick={() => updateApproval.mutate({ id: card.id, status: "rejected" })}>
                  <XCircle className="h-3 w-3 text-destructive" /> Reject
                </Button>
                {isVerified ? (
                  <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1 text-destructive border-destructive/30"
                    onClick={() => toggleVerification.mutate({ id: card.id, verified: false })}>
                    <ShieldCheck className="h-3 w-3" /> Remove Badge
                  </Button>
                ) : (
                  <Button size="sm" className="text-[10px] h-7 rounded-lg gap-1 bg-primary"
                    onClick={() => toggleVerification.mutate({ id: card.id, verified: true })}>
                    <ShieldCheck className="h-3 w-3" /> Verify
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ==================== EVENTS ====================
const EventsTab = () => {
  const { data: events = [] } = useAdminEvents();
  const updateApproval = useUpdateEventApproval();
  const [filter, setFilter] = useState("all");
  const filtered = events.filter(e => filter === "all" || (e as any).approval_status === filter);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-foreground">Event Moderation ({events.length})</h2>
      <div className="flex gap-2 flex-wrap">
        {["all", "approved", "pending", "rejected"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="text-[11px] rounded-xl capitalize" onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(ev => (
          <div key={ev.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{ev.title}</p>
                <p className="text-[10px] text-muted-foreground">{ev.venue} • {ev.date}</p>
              </div>
              <ApprovalBadge status={(ev as any).approval_status} />
            </div>
            <div className="flex gap-2 mt-2 justify-end">
              <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1" onClick={() => updateApproval.mutate({ id: ev.id, status: "approved" })}>
                <CheckCircle className="h-3 w-3 text-green-600" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1" onClick={() => updateApproval.mutate({ id: ev.id, status: "rejected" })}>
                <XCircle className="h-3 w-3 text-destructive" /> Reject
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No events</p>}
      </div>
    </div>
  );
};

// ==================== VOUCHERS ====================
const VouchersTab = () => {
  const { data: vouchers = [] } = useAdminVouchers();
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-foreground">Voucher Oversight ({vouchers.length})</h2>
      <div className="space-y-2">
        {vouchers.map(v => (
          <div key={v.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{v.title}</p>
              <p className="text-[10px] text-muted-foreground">₹{v.discounted_price} (was ₹{v.original_price}) • {v.category}</p>
            </div>
            <Badge variant={v.status === "active" ? "default" : "secondary"} className="text-[9px]">{v.status}</Badge>
          </div>
        ))}
        {vouchers.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No vouchers</p>}
      </div>
    </div>
  );
};

// ==================== ADS ====================
const AdsTab = () => {
  const { data: ads = [] } = useAdminAds();
  const updateApproval = useUpdateAdApproval();
  const [filter, setFilter] = useState("all");
  const filtered = ads.filter(a => filter === "all" || (a as any).approval_status === filter);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-foreground">Ad Campaign Review ({ads.length})</h2>
      <div className="flex gap-2 flex-wrap">
        {["all", "approved", "pending", "rejected"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="text-[11px] rounded-xl capitalize" onClick={() => setFilter(f)}>
            {f}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(ad => (
          <div key={ad.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{ad.title}</p>
                <p className="text-[10px] text-muted-foreground">Budget: ₹{ad.daily_budget}/day × {ad.duration_days}d • {ad.ad_type}</p>
              </div>
              <ApprovalBadge status={(ad as any).approval_status} />
            </div>
            <div className="flex gap-2 mt-2 justify-end">
              <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1" onClick={() => updateApproval.mutate({ id: ad.id, status: "approved" })}>
                <CheckCircle className="h-3 w-3 text-green-600" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1" onClick={() => updateApproval.mutate({ id: ad.id, status: "rejected" })}>
                <XCircle className="h-3 w-3 text-destructive" /> Reject
              </Button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No campaigns</p>}
      </div>
    </div>
  );
};

// ==================== REVIEWS ====================
const ReviewsTab = () => {
  const { data: reviews = [] } = useAdminReviews();
  const { data: spamFlags = [] } = useReviewSpamFlags();
  const flagReview = useFlagReview();
  const deleteReview = useDeleteReview();
  const resolveFlag = useResolveSpamFlag();
  const runSpamScan = useRunSpamDetection();
  const [reviewSubTab, setReviewSubTab] = useState("all");

  const flaggedReviews = reviews.filter((r: any) => r.is_flagged);
  const spamFlagMap = new Map(spamFlags.map((f: any) => [f.entity_id, f]));

  const displayReviews = reviewSubTab === "flagged" ? flaggedReviews : reviewSubTab === "spam" ? [] : reviews;

  const ReviewCard = ({ r }: { r: any }) => {
    const spamFlag = spamFlagMap.get(r.id);
    return (
      <div className={`rounded-xl border bg-card p-3 ${r.is_flagged ? "border-destructive/40" : spamFlag ? "border-amber-400/40" : "border-border"}`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1">
              {Array.from({ length: r.rating }).map((_: any, i: number) => <span key={i} className="text-amber-500 text-xs">★</span>)}
            </div>
            <p className="text-sm text-foreground mt-1">{r.comment || "No comment"}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(r.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {r.is_flagged && <Badge variant="destructive" className="text-[9px]">Flagged</Badge>}
            {spamFlag && <Badge className="text-[9px] bg-amber-500 text-white">Spam Detected</Badge>}
          </div>
        </div>
        {spamFlag && (
          <div className="mt-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-800 dark:text-amber-200">
            <p className="font-medium">🤖 {spamFlag.reason}</p>
            <Badge className={`mt-1 text-[9px] ${spamFlag.severity === "high" ? "bg-destructive" : "bg-amber-500"} text-white`}>
              {spamFlag.severity} severity
            </Badge>
          </div>
        )}
        <div className="flex gap-2 mt-2 justify-end flex-wrap">
          {spamFlag && (
            <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1 text-green-600"
              onClick={() => resolveFlag.mutate(spamFlag.id)}>
              <CheckCircle className="h-3 w-3" /> Dismiss Flag
            </Button>
          )}
          <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1"
            onClick={() => flagReview.mutate({ id: r.id, flagged: !r.is_flagged })}>
            <Flag className="h-3 w-3" /> {r.is_flagged ? "Unflag" : "Flag"}
          </Button>
          <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1 text-destructive"
            onClick={() => { if (confirm("Delete this review?")) deleteReview.mutate(r.id); }}>
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Review Moderation ({reviews.length})</h2>
        <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1"
          onClick={() => runSpamScan.mutate()} disabled={runSpamScan.isPending}>
          <Activity className="h-3 w-3" /> {runSpamScan.isPending ? "Scanning..." : "Run Spam Scan"}
        </Button>
      </div>

      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { key: "all", label: `All (${reviews.length})` },
          { key: "flagged", label: `Flagged (${flaggedReviews.length})` },
          { key: "spam", label: `Spam (${spamFlags.length})` },
        ].map(t => (
          <button key={t.key}
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${reviewSubTab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setReviewSubTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {reviewSubTab === "spam" ? (
        <div className="space-y-2">
          {spamFlags.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No spam detected</p>
          ) : spamFlags.map((flag: any) => {
            const review = reviews.find((r: any) => r.id === flag.entity_id);
            return (
              <div key={flag.id} className="rounded-xl border border-amber-400/40 bg-card p-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={`text-[9px] ${flag.severity === "high" ? "bg-destructive" : "bg-amber-500"} text-white`}>
                    {flag.severity} severity
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{new Date(flag.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-foreground mb-1">🤖 {flag.reason}</p>
                {review && (
                  <div className="rounded-lg bg-muted/50 p-2 mt-2">
                    <div className="flex gap-0.5">{Array.from({ length: review.rating }).map((_: any, i: number) => <span key={i} className="text-amber-500 text-xs">★</span>)}</div>
                    <p className="text-xs text-foreground mt-1">{review.comment || "No comment"}</p>
                  </div>
                )}
                <div className="flex gap-2 mt-2 justify-end">
                  <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1 text-green-600"
                    onClick={() => resolveFlag.mutate(flag.id)}>
                    <CheckCircle className="h-3 w-3" /> Dismiss
                  </Button>
                  {review && (
                    <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1 text-destructive"
                      onClick={() => { if (confirm("Delete this review?")) deleteReview.mutate(review.id); }}>
                      <Trash2 className="h-3 w-3" /> Delete Review
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {displayReviews.map((r: any) => <ReviewCard key={r.id} r={r} />)}
          {displayReviews.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No reviews</p>}
        </div>
      )}
    </div>
  );
};

// ==================== CATEGORIES ====================
const CategoriesTab = () => {
  const { data: categories = [] } = useAdminCategories();
  const upsert = useUpsertCategory();
  const deleteCat = useDeleteCategory();
  const [newCat, setNewCat] = useState({ name: "", emoji: "📁", sort_order: 0, is_active: true });
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Category Management ({categories.length})</h2>
        <Button size="sm" className="text-[11px] rounded-xl gap-1" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-3 w-3" /> Add
        </Button>
      </div>
      {showAdd && (
        <div className="rounded-xl border border-primary/30 bg-card p-3 space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Emoji" value={newCat.emoji} onChange={e => setNewCat({ ...newCat, emoji: e.target.value })} className="w-16 rounded-xl" />
            <Input placeholder="Category name" value={newCat.name} onChange={e => setNewCat({ ...newCat, name: e.target.value })} className="rounded-xl flex-1" />
            <Input type="number" placeholder="#" value={newCat.sort_order} onChange={e => setNewCat({ ...newCat, sort_order: +e.target.value })} className="w-16 rounded-xl" />
          </div>
          <Button size="sm" className="text-[11px] rounded-xl" onClick={() => {
            upsert.mutate(newCat);
            setNewCat({ name: "", emoji: "📁", sort_order: 0, is_active: true });
            setShowAdd(false);
          }}>Save Category</Button>
        </div>
      )}
      <div className="space-y-1.5">
        {categories.map(cat => (
          <div key={cat.id} className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-2">
            <span className="text-lg">{cat.emoji}</span>
            <span className="text-sm font-medium text-foreground flex-1">{cat.name}</span>
            <span className="text-[10px] text-muted-foreground">#{cat.sort_order}</span>
            <Badge variant={cat.is_active ? "default" : "secondary"} className="text-[9px]">{cat.is_active ? "Active" : "Hidden"}</Badge>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => upsert.mutate({ ...cat, is_active: !cat.is_active })}>
              {cat.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => { if (confirm("Delete?")) deleteCat.mutate(cat.id); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== NOTIFICATIONS BROADCASTING ====================
const NotificationsTab = () => {
  const { data: profiles = [] } = useAdminProfiles();
  const broadcast = useBroadcastNotification();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("📢");

  const handleSend = () => {
    if (!title.trim()) return;
    const userIds = profiles.map(p => p.id);
    broadcast.mutate({ userIds, title, description: desc, emoji });
    setTitle("");
    setDesc("");
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-foreground">Broadcast Notification</h2>
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex gap-2">
          <Input placeholder="Emoji" value={emoji} onChange={e => setEmoji(e.target.value)} className="w-16 rounded-xl" />
          <Input placeholder="Notification title" value={title} onChange={e => setTitle(e.target.value)} className="rounded-xl flex-1" />
        </div>
        <Textarea placeholder="Description (optional)" value={desc} onChange={e => setDesc(e.target.value)} className="rounded-xl" rows={2} />
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-muted-foreground">Will send to {profiles.length} users</p>
          <Button size="sm" className="rounded-xl gap-1" onClick={handleSend} disabled={broadcast.isPending || !title.trim()}>
            <Send className="h-3.5 w-3.5" /> {broadcast.isPending ? "Sending…" : "Broadcast"}
          </Button>
        </div>
      </div>
    </div>
  );
};

// ==================== SUPPORT TICKETS ====================
const TicketsTab = () => {
  const { data: tickets = [] } = useAdminTickets();
  const updateTicket = useUpdateTicket();
  const [filter, setFilter] = useState("all");
  const filtered = tickets.filter(t => filter === "all" || (t as any).status === filter);

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-foreground">Support Tickets ({tickets.length})</h2>
      <div className="flex gap-2 flex-wrap">
        {["all", "open", "in_progress", "resolved", "closed"].map(f => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className="text-[11px] rounded-xl capitalize" onClick={() => setFilter(f)}>
            {f.replace("_", " ")}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {filtered.map(t => (
          <div key={(t as any).id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{(t as any).subject}</p>
                <p className="text-[10px] text-muted-foreground">{(t as any).description?.slice(0, 80)}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={(t as any).priority === "high" ? "destructive" : "secondary"} className="text-[9px] capitalize">{(t as any).priority}</Badge>
                <Badge variant={(t as any).status === "open" ? "default" : "secondary"} className="text-[9px] capitalize">{(t as any).status}</Badge>
              </div>
            </div>
            <div className="flex gap-2 mt-2 justify-end">
              {(t as any).status === "open" && (
                <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1"
                  onClick={() => updateTicket.mutate({ id: (t as any).id, status: "in_progress" })}>
                  <Clock className="h-3 w-3" /> In Progress
                </Button>
              )}
              {["open", "in_progress"].includes((t as any).status) && (
                <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1"
                  onClick={() => updateTicket.mutate({ id: (t as any).id, status: "resolved" })}>
                  <CheckCircle className="h-3 w-3 text-green-600" /> Resolve
                </Button>
              )}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No tickets</p>}
      </div>
    </div>
  );
};

// ==================== REVENUE ====================
const CHART_COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2, 160 60% 45%))", "hsl(var(--chart-3, 30 80% 55%))", "hsl(var(--chart-4, 280 60% 55%))", "hsl(var(--chart-5, 200 70% 50%))"];

const RevenueTab = () => {
  const { data, isLoading } = useAdminRevenueData();
  const [months, setMonths] = useState(6);

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Month", "Ads", "Subscriptions", "Vouchers", "Events", "Total"],
      ...data.monthlyBreakdown.map((m: any) => [m.month, m.ads, m.subscriptions, m.vouchers, m.events, m.total]),
    ];
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  if (!data) return <p className="text-sm text-muted-foreground text-center py-8">No data available</p>;

  const summaryCards = [
    { label: "Total Revenue", value: `₹${data.totalRevenue.toLocaleString("en-IN")}`, emoji: "💰", sub: "All sources combined" },
    { label: "Ad Revenue", value: `₹${data.totalAdSpent.toLocaleString("en-IN")}`, emoji: "📣", sub: `₹${data.totalAdBudget.toLocaleString("en-IN")} budgeted` },
    { label: "Subscription MRR", value: `₹${data.monthlySubRevenue.toLocaleString("en-IN")}`, emoji: "💎", sub: `${data.activeSubs} active / ${data.totalSubs} total` },
    { label: "Voucher Commission", value: `₹${data.voucherRevenue.toLocaleString("en-IN")}`, emoji: "🎟️", sub: `${data.totalClaimed} claimed (10% cut)` },
    { label: "Event Commission", value: `₹${data.eventRevenue.toLocaleString("en-IN")}`, emoji: "🎪", sub: `${data.totalRegistrations} registrations (5% cut)` },
    { label: "Total Bookings", value: data.totalBookings.toLocaleString(), emoji: "📅", sub: "Across all businesses" },
  ];

  const planData = Object.entries(data.subsByPlan).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  const adTypeData = Object.entries(data.adByType).map(([name, value]) => ({ name, value: Math.round(value) }));
  const voucherCatData = Object.entries(data.voucherByCat).map(([name, value]) => ({ name, value: Math.round(value as number) }));

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Revenue Dashboard
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[3, 6, 12].map(m => (
                <Button key={m} size="sm" variant={months === m ? "default" : "outline"} className="text-[10px] h-7 rounded-lg px-2" onClick={() => setMonths(m)}>
                  {m}mo
                </Button>
              ))}
            </div>
            <Button size="sm" variant="outline" className="gap-1 h-7 rounded-lg text-[10px]" onClick={exportCSV}>
              <Download className="h-3 w-3" /> CSV
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {summaryCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{s.emoji}</span>
                <span className="text-[10px] text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">{s.sub}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Monthly Revenue Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.monthlyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
              <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
              <Area type="monotone" dataKey="ads" stackId="1" fill={CHART_COLORS[0]} stroke={CHART_COLORS[0]} fillOpacity={0.6} name="Ads" />
              <Area type="monotone" dataKey="subscriptions" stackId="1" fill={CHART_COLORS[1]} stroke={CHART_COLORS[1]} fillOpacity={0.6} name="Subscriptions" />
              <Area type="monotone" dataKey="vouchers" stackId="1" fill={CHART_COLORS[2]} stroke={CHART_COLORS[2]} fillOpacity={0.6} name="Vouchers" />
              <Area type="monotone" dataKey="events" stackId="1" fill={CHART_COLORS[3]} stroke={CHART_COLORS[3]} fillOpacity={0.6} name="Events" />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Subscribers by Plan</h3>
          {planData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {planData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No subscriptions yet</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Ad Spend by Type</h3>
          {adTypeData.length > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={adTypeData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                  <Bar dataKey="value" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} name="₹ Spent" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-sm text-muted-foreground text-center py-8">No ad campaigns yet</p>}
        </div>
      </div>

      {voucherCatData.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">Voucher Commission by Category</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={voucherCatData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <RechartsTooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="value" fill={CHART_COLORS[2]} radius={[0, 6, 6, 0]} name="₹ Commission" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">🏆 Top Vouchers by Claims</h3>
          <div className="space-y-2">
            {data.topVouchers.map((v, i) => (
              <div key={v.id} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{v.title}</p>
                  <p className="text-[9px] text-muted-foreground">₹{v.discounted_price} • {v.category}</p>
                </div>
                <Badge variant="secondary" className="text-[9px]">{v.claims} claims</Badge>
              </div>
            ))}
            {data.topVouchers.length === 0 && <p className="text-[11px] text-muted-foreground">No voucher claims yet</p>}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold text-foreground mb-3">🏆 Top Events by Registrations</h3>
          <div className="space-y-2">
            {data.topEvents.map((e, i) => (
              <div key={e.id} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground w-4">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{e.title}</p>
                  <p className="text-[9px] text-muted-foreground">{e.is_free ? "Free" : `₹${e.price}`}</p>
                </div>
                <Badge variant="secondary" className="text-[9px]">{e.registrations} regs</Badge>
              </div>
            ))}
            {data.topEvents.length === 0 && <p className="text-[11px] text-muted-foreground">No event registrations yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== SHARED ====================
const ApprovalBadge = ({ status }: { status: string }) => {
  const variants: Record<string, { variant: "default" | "secondary" | "destructive"; icon: any }> = {
    approved: { variant: "default", icon: CheckCircle },
    pending: { variant: "secondary", icon: Clock },
    rejected: { variant: "destructive", icon: XCircle },
  };
  const v = variants[status] || variants.pending;
  return (
    <Badge variant={v.variant} className="text-[9px] gap-0.5 capitalize">
      <v.icon className="h-2.5 w-2.5" /> {status}
    </Badge>
  );
};

// ==================== REPORTS ====================
const ReportsTab = () => {
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase
        .from("business_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  if (isLoading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Business Reports ({reports.length})</h2>
      {reports.length === 0 ? <p className="text-sm text-muted-foreground">No reports</p> : reports.map((r: any) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{r.reason}</span>
            <Badge variant={r.status === "resolved" ? "secondary" : "default"} className="text-[10px]">{r.status}</Badge>
          </div>
          {r.details && <p className="text-xs text-muted-foreground">{r.details}</p>}
          <p className="text-[10px] text-muted-foreground">Business: {r.business_id?.slice(0, 8)} • {new Date(r.created_at).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
};

// ==================== DISPUTES ====================
const DisputesTab = () => {
  const queryClient = useQueryClient();
  const { data: disputes = [], isLoading } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await (await import("@/integrations/supabase/client")).supabase
        .from("disputes").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolution, setResolution] = useState("");

  if (isLoading) return <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold text-foreground">Disputes ({disputes.length})</h2>
      {disputes.length === 0 ? <p className="text-sm text-muted-foreground">No disputes</p> : disputes.map((d: any) => (
        <div key={d.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground capitalize">{d.dispute_type} Dispute</span>
            <Badge variant={d.status === "resolved" ? "secondary" : d.status === "open" ? "default" : "outline"} className="text-[10px]">{d.status}</Badge>
          </div>
          <p className="text-xs text-foreground">{d.description}</p>
          {d.resolution && <p className="text-xs text-muted-foreground italic">Resolution: {d.resolution}</p>}
          <p className="text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
          {d.status === "open" && (
            resolvingId === d.id ? (
              <div className="space-y-2">
                <Textarea placeholder="Resolution details..." value={resolution} onChange={(e) => setResolution(e.target.value)} className="rounded-lg text-xs" rows={2} />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 text-xs rounded-lg" disabled={!resolution.trim()} onClick={async () => {
                    const { supabase } = await import("@/integrations/supabase/client");
                    await supabase.from("disputes").update({ resolution, status: "resolved", updated_at: new Date().toISOString() }).eq("id", d.id);
                    queryClient.invalidateQueries({ queryKey: ["admin-disputes"] });
                    setResolvingId(null); setResolution("");
                  }}>Resolve</Button>
                  <Button size="sm" variant="outline" className="text-xs rounded-lg" onClick={() => { setResolvingId(null); setResolution(""); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="text-xs rounded-lg" onClick={() => setResolvingId(d.id)}>Resolve</Button>
            )
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminDashboard;
