import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Bell,
  CheckCircle,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../integrations/supabase/client";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { toast } from "../lib/toast";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "approvals", label: "Approvals" },
  { key: "users", label: "Users" },
  { key: "businesses", label: "Businesses" },
  { key: "events", label: "Events" },
  { key: "vouchers", label: "Vouchers" },
  { key: "ads", label: "Ads" },
  { key: "reviews", label: "Reviews" },
  { key: "reports", label: "Reports" },
  { key: "disputes", label: "Disputes" },
  { key: "tickets", label: "Support" },
  { key: "notifications", label: "Notify" },
];

const AdminDashboard = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { isAdmin, isLoading } = useUserRole();

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-sm text-muted-foreground mb-4">
          Sign in to access admin panel
        </Text>
        <Button onPress={() => navigation.navigate("Auth")} className="rounded-xl">
          Sign In
        </Button>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-sm text-muted-foreground">Loading...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View className="flex-1 items-center justify-center px-6 text-center">
        <ShieldCheck size={48} color="#c0c4cc" />
        <Text className="text-lg font-bold text-foreground mt-3">Access Denied</Text>
        <Text className="text-sm text-muted-foreground mt-1">
          You don't have admin privileges.
        </Text>
        <Button variant="outline" className="mt-4 rounded-xl" onPress={() => navigation.navigate("Home")}>
          Go Home
        </Button>
      </View>
    );
  }

  return <AdminPanel />;
};

const AdminPanel = () => {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [globalSearch, setGlobalSearch] = useState("");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastDesc, setBroadcastDesc] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [cards, events, vouchers, bookings, ads, reviews, subs, tickets] = await Promise.all([
        supabase.from("business_cards").select("id", { count: "exact", head: true }),
        supabase.from("events").select("id", { count: "exact", head: true }),
        supabase.from("vouchers").select("id", { count: "exact", head: true }),
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("ad_campaigns").select("id", { count: "exact", head: true }),
        supabase.from("reviews").select("id", { count: "exact", head: true }),
        supabase.from("subscriptions").select("id", { count: "exact", head: true }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }),
      ]);
      return {
        businesses: cards.count ?? 0,
        events: events.count ?? 0,
        vouchers: vouchers.count ?? 0,
        bookings: bookings.count ?? 0,
        ads: ads.count ?? 0,
        reviews: reviews.count ?? 0,
        subscriptions: subs.count ?? 0,
        tickets: tickets.count ?? 0,
      };
    },
  });

  const { data: pendingCards = [] } = useQuery({
    queryKey: ["admin-pending-cards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "approvals",
  });

  const { data: pendingEvents = [] } = useQuery({
    queryKey: ["admin-pending-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "approvals",
  });

  const { data: pendingAds = [] } = useQuery({
    queryKey: ["admin-pending-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .eq("approval_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "approvals",
  });

  const { data: reports = [] } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "reports",
  });

  const { data: disputes = [] } = useQuery({
    queryKey: ["admin-disputes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "disputes",
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["admin-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "tickets",
  });

  const { data: businesses = [] } = useQuery({
    queryKey: ["admin-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "businesses",
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "users",
  });

  const { data: events = [] } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "events",
  });

  const { data: vouchers = [] } = useQuery({
    queryKey: ["admin-vouchers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "vouchers",
  });

  const { data: ads = [] } = useQuery({
    queryKey: ["admin-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ad_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "ads",
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: tab === "reviews",
  });

  const filteredBusinesses = useMemo(() => {
    if (!globalSearch.trim()) return businesses;
    const q = globalSearch.toLowerCase();
    return businesses.filter(
      (b: any) =>
        b.full_name?.toLowerCase().includes(q) ||
        (b.company_name || "").toLowerCase().includes(q)
    );
  }, [globalSearch, businesses]);

  const updateApproval = async (table: string, id: string, approval_status: string) => {
    const { error } = await supabase.from(table as any).update({ approval_status }).eq("id", id);
    if (error) {
      toast.error("Update failed");
      return;
    }
    toast.success("Updated");
    queryClient.invalidateQueries();
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-3 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <ShieldCheck size={20} color="#2563eb" />
        <Text className="text-lg font-bold text-foreground flex-1">Admin Panel</Text>
        <Search size={18} color="#6a7181" />
      </View>

      <View className="px-4 pb-2">
        <Input
          placeholder="Search businesses..."
          value={globalSearch}
          onChangeText={setGlobalSearch}
          className="rounded-xl"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="border-b border-border bg-card">
        <View className="flex-row px-4 py-2 gap-2">
          {TABS.map((t) => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              className={`px-3 py-2 rounded-lg ${tab === t.key ? "bg-primary" : "bg-muted"}`}
            >
              <Text className={`text-[11px] font-semibold ${tab === t.key ? "text-primary-foreground" : "text-muted-foreground"}`}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-4">
        {tab === "overview" && (
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: "Businesses", value: stats?.businesses ?? 0, emoji: "🏢" },
              { label: "Events", value: stats?.events ?? 0, emoji: "🎉" },
              { label: "Vouchers", value: stats?.vouchers ?? 0, emoji: "🎟️" },
              { label: "Bookings", value: stats?.bookings ?? 0, emoji: "📅" },
              { label: "Ads", value: stats?.ads ?? 0, emoji: "📣" },
              { label: "Reviews", value: stats?.reviews ?? 0, emoji: "⭐" },
              { label: "Subs", value: stats?.subscriptions ?? 0, emoji: "💎" },
              { label: "Tickets", value: stats?.tickets ?? 0, emoji: "🎫" },
            ].map((s) => (
              <View key={s.label} className="w-[48%] rounded-xl border border-border bg-card p-3 items-center">
                <Text className="text-lg">{s.emoji}</Text>
                <Text className="text-lg font-bold text-foreground">{s.value}</Text>
                <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === "approvals" && (
          <View className="space-y-4">
            <Text className="text-sm font-bold text-foreground">Pending Cards</Text>
            {pendingCards.map((c: any) => (
              <View key={c.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">{c.full_name}</Text>
                <Text className="text-xs text-muted-foreground">{c.company_name}</Text>
                <View className="flex-row gap-2 mt-2">
                  <Button size="sm" className="flex-1 rounded-lg" onPress={() => updateApproval("business_cards", c.id, "approved")}>
                    <CheckCircle size={14} color="#ffffff" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 rounded-lg text-destructive" onPress={() => updateApproval("business_cards", c.id, "rejected")}>
                    <XCircle size={14} color="#ef4444" /> Reject
                  </Button>
                </View>
              </View>
            ))}

            <Text className="text-sm font-bold text-foreground mt-4">Pending Events</Text>
            {pendingEvents.map((e: any) => (
              <View key={e.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">{e.title}</Text>
                <Text className="text-xs text-muted-foreground">{e.venue}</Text>
                <View className="flex-row gap-2 mt-2">
                  <Button size="sm" className="flex-1 rounded-lg" onPress={() => updateApproval("events", e.id, "approved")}>
                    <CheckCircle size={14} color="#ffffff" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 rounded-lg text-destructive" onPress={() => updateApproval("events", e.id, "rejected")}>
                    <XCircle size={14} color="#ef4444" /> Reject
                  </Button>
                </View>
              </View>
            ))}

            <Text className="text-sm font-bold text-foreground mt-4">Pending Ads</Text>
            {pendingAds.map((a: any) => (
              <View key={a.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">{a.title}</Text>
                <Text className="text-xs text-muted-foreground capitalize">{a.ad_type}</Text>
                <View className="flex-row gap-2 mt-2">
                  <Button size="sm" className="flex-1 rounded-lg" onPress={() => updateApproval("ad_campaigns", a.id, "approved")}>
                    <CheckCircle size={14} color="#ffffff" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1 rounded-lg text-destructive" onPress={() => updateApproval("ad_campaigns", a.id, "rejected")}>
                    <XCircle size={14} color="#ef4444" /> Reject
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}

        {tab === "users" && (
          <View className="space-y-3">
            {users.map((u: any) => (
              <View key={u.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">{u.full_name || "Unnamed"}</Text>
                <Text className="text-xs text-muted-foreground">{u.id}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === "businesses" && (
          <View className="space-y-3">
            {filteredBusinesses.map((b: any) => (
              <View key={b.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">{b.full_name}</Text>
                <Text className="text-xs text-muted-foreground">{b.company_name}</Text>
                <Badge className="text-[9px] mt-2">{b.approval_status || "pending"}</Badge>
              </View>
            ))}
          </View>
        )}

        {tab === "events" && (
          <View className="space-y-3">
            {events.map((e: any) => (
              <View key={e.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">{e.title}</Text>
                <Text className="text-xs text-muted-foreground">{e.venue}</Text>
                <Badge className="text-[9px] mt-2">{e.approval_status || "pending"}</Badge>
              </View>
            ))}
          </View>
        )}

        {tab === "vouchers" && (
          <View className="space-y-3">
            {vouchers.map((v: any) => (
              <View key={v.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">{v.title}</Text>
                <Text className="text-xs text-muted-foreground">{v.category}</Text>
                <Badge className="text-[9px] mt-2">{v.status}</Badge>
              </View>
            ))}
          </View>
        )}

        {tab === "ads" && (
          <View className="space-y-3">
            {ads.map((a: any) => (
              <View key={a.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">{a.title}</Text>
                <Text className="text-xs text-muted-foreground capitalize">{a.ad_type}</Text>
                <Badge className="text-[9px] mt-2">{a.approval_status}</Badge>
              </View>
            ))}
          </View>
        )}

        {tab === "reviews" && (
          <View className="space-y-3">
            {reviews.map((r: any) => (
              <View key={r.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">
                  {r.comment?.slice(0, 60) || "No comment"}
                </Text>
                <Text className="text-xs text-muted-foreground mt-1">Rating: {r.rating}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === "reports" && (
          <View className="space-y-3">
            {reports.map((r: any) => (
              <View key={r.id} className="rounded-xl border border-border bg-card p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-foreground">{r.reason}</Text>
                  <Badge variant={r.status === "resolved" ? "secondary" : "default"} className="text-[9px]">
                    {r.status}
                  </Badge>
                </View>
                {r.details ? (
                  <Text className="text-xs text-muted-foreground mt-1">{r.details}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {tab === "disputes" && (
          <View className="space-y-3">
            {disputes.map((d: any) => (
              <View key={d.id} className="rounded-xl border border-border bg-card p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-foreground">{d.dispute_type} dispute</Text>
                  <Badge className="text-[9px]">{d.status}</Badge>
                </View>
                <Text className="text-xs text-foreground mt-1">{d.description}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === "tickets" && (
          <View className="space-y-3">
            {tickets.map((t: any) => (
              <View key={t.id} className="rounded-xl border border-border bg-card p-3">
                <View className="flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-foreground">{t.subject}</Text>
                  <Badge className="text-[9px] capitalize">{t.status}</Badge>
                </View>
                <Text className="text-xs text-muted-foreground mt-1">{t.description?.slice(0, 80)}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === "notifications" && (
          <View className="space-y-3">
            <View className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Text className="text-sm font-bold text-foreground">Broadcast Notification</Text>
              <Input placeholder="Notification title" value={broadcastTitle} onChangeText={setBroadcastTitle} className="rounded-xl" />
              <Textarea
                placeholder="Description (optional)"
                value={broadcastDesc}
                onChangeText={setBroadcastDesc}
                className="rounded-xl"
              />
              <Button
                size="sm"
                className="rounded-xl gap-1"
                onPress={async () => {
                  if (!broadcastTitle.trim()) return;
                  const { error } = await supabase.from("notifications").insert({
                    title: broadcastTitle,
                    description: broadcastDesc || null,
                    type: "broadcast",
                  } as any);
                  if (error) {
                    toast.error("Failed to broadcast");
                    return;
                  }
                  toast.success("Broadcast sent");
                  setBroadcastTitle("");
                  setBroadcastDesc("");
                  queryClient.invalidateQueries({ queryKey: ["notifications"] });
                }}
              >
                <Bell size={14} color="#ffffff" /> Broadcast
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default AdminDashboard;

