import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View, Image } from "react-native";
import { PageLoader } from "../components/ui/page-loader";
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
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { toast } from "../lib/toast";
import {
  useGetDashboardCountsQuery,
  useListAdminUsersQuery,
  useGetAdminAdsQuery,
  useApproveAdCampaignMutation,
  useRejectAdCampaignMutation,
  useGetAdminBusinessesQuery,
  useApproveBusinessCardMutation,
  useRejectBusinessCardMutation,
  useGetAdminEventsQuery,
  useGetAdminVouchersQuery,
  useGetAdminReviewsQuery,
} from "../store/api/adminApi";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "ads", label: "Ads" },
  { key: "users", label: "Users" },
  { key: "businesses", label: "Businesses" },
  { key: "events", label: "Events" },
  { key: "vouchers", label: "Vouchers" },
  { key: "reviews", label: "Reviews" },
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
    return <PageLoader />;
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
  const [tab, setTab] = useState("overview");
  const [globalSearch, setGlobalSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // ─── Dashboard counts ───────────────────────────────────────────────────
  const { data: stats, refetch: refetchStats } = useGetDashboardCountsQuery();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchStats(); } finally { setRefreshing(false); }
  }, [refetchStats]);

  // ─── Users ──────────────────────────────────────────────────────────────
  const { data: usersData } = useListAdminUsersQuery(undefined, { skip: tab !== "users" });
  const users = usersData?.data ?? [];

  // ─── Ad campaigns ──────────────────────────────────────────────────────
  const { data: allAds = [], isLoading: adsLoading, error: adsError } = useGetAdminAdsQuery(undefined, {
    skip: tab !== "ads",
  });

  const [approveAd] = useApproveAdCampaignMutation();
  const [rejectAd] = useRejectAdCampaignMutation();
  const [adsFilter, setAdsFilter] = useState("all");
  const [displayCount, setDisplayCount] = useState(10);
  const ADS_PER_PAGE = 10;

  const filteredAds = useMemo(() => {
    if (adsFilter === "all") return allAds;
    return allAds.filter((a: any) => a.approval_status === adsFilter);
  }, [adsFilter, allAds]);

  const displayedAds = useMemo(() => {
    return filteredAds.slice(0, displayCount);
  }, [filteredAds, displayCount]);

  const hasMore = displayCount < filteredAds.length;

  const loadMore = () => {
    if (hasMore) {
      setDisplayCount(prev => prev + ADS_PER_PAGE);
    }
  };

  const handleAdsFilterChange = (filter: string) => {
    setAdsFilter(filter);
    setDisplayCount(ADS_PER_PAGE);
  };

  const handleApproveAd = async (id: number) => {
    try {
      await approveAd(id).unwrap();
      toast.success("Ad approved");
    } catch {
      toast.error("Failed to approve ad");
    }
  };

  const handleRejectAd = async (id: number) => {
    try {
      await rejectAd(id).unwrap();
      toast.success("Ad rejected");
    } catch {
      toast.error("Failed to reject ad");
    }
  };

  // ─── Listings ───────────────────────────────────────────────────────────
  const { data: businesses = [] } = useGetAdminBusinessesQuery(undefined, { skip: tab !== "businesses" });
  const [approveCard] = useApproveBusinessCardMutation();
  const [rejectCard] = useRejectBusinessCardMutation();
  const [bizFilter, setBizFilter] = useState("all");

  const filteredBusinesses = useMemo(() => {
    let list = businesses;
    if (bizFilter !== "all") {
      list = list.filter((b: any) => b.approval_status === bizFilter);
    }
    if (!globalSearch.trim()) return list;
    const q = globalSearch.toLowerCase();
    return list.filter(
      (b: any) =>
        b.full_name?.toLowerCase().includes(q) ||
        (b.company_name || "").toLowerCase().includes(q)
    );
  }, [globalSearch, businesses, bizFilter]);

  const handleApproveCard = async (id: number) => {
    try {
      await approveCard(id).unwrap();
      toast.success("Business card approved");
    } catch {
      toast.error("Failed to approve card");
    }
  };

  const handleRejectCard = async (id: number) => {
    try {
      await rejectCard(id).unwrap();
      toast.success("Business card rejected");
    } catch {
      toast.error("Failed to reject card");
    }
  };

  const { data: events = [] } = useGetAdminEventsQuery(undefined, { skip: tab !== "events" });
  const { data: vouchers = [] } = useGetAdminVouchersQuery(undefined, { skip: tab !== "vouchers" });
  const { data: reviews = [] } = useGetAdminReviewsQuery(undefined, { skip: tab !== "reviews" });

  // ─── Pending counts for tab badges ──────────────────────────────────────
  const pendingAdsCount = useMemo(() =>
    allAds.filter((a: any) => a.approval_status === "pending").length
  , [allAds]);

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

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-4" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />}>
        {/* ─── Overview ─────────────────────────────────────────────────── */}
        {tab === "overview" && (
          <View className="flex-row flex-wrap gap-2">
            {[
              { label: "Businesses", value: stats?.businessCards ?? 0 },
              { label: "Events", value: stats?.events ?? 0 },
              { label: "Vouchers", value: stats?.vouchers ?? 0 },
              { label: "Bookings", value: stats?.bookings ?? 0 },
              { label: "Ad Campaigns", value: stats?.adCampaigns ?? 0 },
              { label: "Reviews", value: stats?.reviews ?? 0 },
              { label: "Users", value: stats?.users ?? 0 },
            ].map((s) => (
              <View key={s.label} className="w-[48%] rounded-xl border border-border bg-card p-3 items-center">
                <Text className="text-lg font-bold text-foreground">{s.value}</Text>
                <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ─── Ads ──────────────────────────────────────────────────────── */}
        {tab === "ads" && (
          <View className="gap-3">
            <View className="flex-row gap-2 mb-2 flex-wrap">
              {["all", "pending", "approved", "rejected"].map((f) => (
                <Pressable
                  key={f}
                  onPress={() => handleAdsFilterChange(f)}
                  className={`px-3 py-1.5 rounded-lg ${adsFilter === f ? "bg-primary" : "bg-muted"}`}
                >
                  <Text className={`text-[11px] font-semibold capitalize ${adsFilter === f ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>

            {adsLoading ? (
              <Text className="text-sm text-muted-foreground text-center py-8">Loading ads...</Text>
            ) : adsError ? (
              <Text className="text-sm text-red-500 text-center py-8">Failed to load ads. Check backend connection.</Text>
            ) : filteredAds.length === 0 ? (
              <Text className="text-sm text-muted-foreground text-center py-8">No ads found</Text>
            ) : (
              <>
                {displayedAds.map((a: any) => (
                  <Pressable
                    key={a.id}
                    onPress={() => navigation.navigate("AdminAdDetail", { id: a.id })}
                    className="rounded-xl border border-border bg-card p-3 active:bg-muted"
                  >
                    <View className="flex-row items-start justify-between mb-1 gap-2">
                      <View className="flex-row items-center gap-2 flex-1">
                        {a.creative_url ? (
                          <Image source={{ uri: a.creative_url }} style={{ height: 40, width: 40, borderRadius: 8 }} />
                        ) : (
                          <View style={{ height: 40, width: 40, borderRadius: 8 }} className="bg-muted" />
                        )}
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-foreground">{a.title}</Text>
                          <Text className="text-xs text-muted-foreground capitalize">{a.ad_type} · ₹{a.daily_budget}/day · {a.duration_days}d</Text>
                        </View>
                      </View>
                      <View className="gap-1">
                        <Badge
                          className={`text-[8px] ${
                            a.approval_status === "approved"
                              ? "bg-green-500/10 text-green-600"
                              : a.approval_status === "rejected"
                              ? "bg-red-500/10 text-red-600"
                              : "bg-yellow-500/10 text-yellow-600"
                          }`}
                        >
                          {a.approval_status}
                        </Badge>
                        <Badge
                          className={`text-[8px] ${
                            a.status === "active"
                              ? "bg-blue-500/10 text-blue-600"
                              : a.status === "paused"
                              ? "bg-orange-500/10 text-orange-600"
                              : "bg-gray-500/10 text-gray-600"
                          }`}
                        >
                          {a.status === "active" ? "🟢 Active" : a.status === "paused" ? "⏸️ Paused" : "✅ Completed"}
                        </Badge>
                      </View>
                    </View>
                    {a.user ? (
                      <Text className="text-[10px] text-muted-foreground">By {a.user.name} ({a.user.phone})</Text>
                    ) : null}
                    {a.business ? (
                      <Text className="text-[10px] text-muted-foreground">Business: {a.business.company_name}</Text>
                    ) : null}
                    <View className="flex-row items-center gap-3 mt-1.5">
                      <Text className="text-[10px] text-muted-foreground">👁️ {a.impressions ?? 0}</Text>
                      <Text className="text-[10px] text-muted-foreground">🖱️ {a.clicks ?? 0}</Text>
                      <Text className="text-[10px] text-muted-foreground">₹{a.spent ?? 0}</Text>
                    </View>
                    {a.approval_status === "pending" && (
                      <View className="flex-row gap-2 mt-2">
                        <Button size="sm" className="flex-1 rounded-lg" onPress={() => handleApproveAd(a.id)}>
                          <CheckCircle size={14} color="#ffffff" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 rounded-lg text-destructive" onPress={() => handleRejectAd(a.id)}>
                          <XCircle size={14} color="#ef4444" /> Reject
                        </Button>
                      </View>
                    )}
                  </Pressable>
                ))}

                {/* Infinite Scroll Load More */}
                {hasMore && (
                  <View className="py-4 items-center">
                    <Button
                      size="sm"
                      className="rounded-lg px-6"
                      onPress={loadMore}
                    >
                      ↓ Load More ({displayCount}/{filteredAds.length})
                    </Button>
                  </View>
                )}

                {/* All loaded indicator */}
                {!hasMore && displayedAds.length > 0 && (
                  <View className="py-4 items-center">
                    <Text className="text-xs text-muted-foreground">✅ All {filteredAds.length} ads loaded</Text>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ─── Users ────────────────────────────────────────────────────── */}
        {tab === "users" && (
          <View className="gap-3">
            {users.map((u: any) => (
              <View key={u.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">{u.name || "Unnamed"}</Text>
                <Text className="text-xs text-muted-foreground">{u.phone} · {u.email || "no email"}</Text>
                <View className="flex-row gap-1 mt-1">
                  {u.user_roles?.map((r: any) => (
                    <Badge key={r.role} className="text-[9px]">{r.role}</Badge>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ─── Businesses ───────────────────────────────────────────────── */}
        {tab === "businesses" && (
          <View className="gap-3">
            <View className="flex-row gap-2 mb-2">
              {["all", "pending", "approved", "rejected"].map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setBizFilter(f)}
                  className={`px-3 py-1.5 rounded-lg ${bizFilter === f ? "bg-primary" : "bg-muted"}`}
                >
                  <Text className={`text-[11px] font-semibold capitalize ${bizFilter === f ? "text-primary-foreground" : "text-muted-foreground"}`}>
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>

            {filteredBusinesses.length === 0 ? (
              <Text className="text-sm text-muted-foreground text-center py-8">No business cards found</Text>
            ) : null}

            {filteredBusinesses.map((b: any) => (
              <View key={b.id} className="rounded-xl border border-border bg-card p-3">
                <View className="flex-row items-start justify-between mb-1">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground">{b.full_name}</Text>
                    <Text className="text-xs text-muted-foreground">{b.company_name || "No company"}</Text>
                    {b.category ? (
                      <Text className="text-[10px] text-muted-foreground mt-0.5">{b.category}</Text>
                    ) : null}
                  </View>
                  <Badge
                    className={`text-[9px] ${
                      b.approval_status === "approved"
                        ? "bg-green-500/10 text-green-600"
                        : b.approval_status === "rejected"
                        ? "bg-red-500/10 text-red-600"
                        : "bg-yellow-500/10 text-yellow-600"
                    }`}
                  >
                    {b.approval_status || "pending"}
                  </Badge>
                </View>
                {b.user ? (
                  <Text className="text-[10px] text-muted-foreground">By {b.user.name} ({b.user.phone})</Text>
                ) : null}
                <View className="flex-row items-center gap-3 mt-1">
                  <Text className="text-[10px] text-muted-foreground">
                    {b.is_live ? "🟢 Live" : "🔴 Offline"}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">{b.phone}</Text>
                </View>
                {b.approval_status === "pending" && (
                  <View className="flex-row gap-2 mt-2">
                    <Button size="sm" className="flex-1 rounded-lg" onPress={() => handleApproveCard(b.id)}>
                      <CheckCircle size={14} color="#ffffff" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 rounded-lg text-destructive" onPress={() => handleRejectCard(b.id)}>
                      <XCircle size={14} color="#ef4444" /> Reject
                    </Button>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ─── Events ───────────────────────────────────────────────────── */}
        {tab === "events" && (
          <View className="gap-3">
            {events.length === 0 ? (
              <View className="items-center py-10 gap-2">
                <Text className="text-sm text-muted-foreground">No events found</Text>
              </View>
            ) : (
              events.map((e: any) => {
                const isFree = !e.ticket_price || e.ticket_price === 0;
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => navigation.navigate("EventDetail", { id: e.id })}
                  >
                    <View className="rounded-xl border border-border bg-card p-4 gap-2">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-2">
                          <Text className="text-sm font-semibold text-foreground">{e.title}</Text>
                          {e.location && (
                            <Text className="text-xs text-muted-foreground mt-0.5">{e.location}</Text>
                          )}
                        </View>
                        <Badge className={e.status === 'active' ? "bg-success/10 text-success border-none text-[10px]" : "bg-muted text-muted-foreground border-none text-[10px]"}>
                          {e.status}
                        </Badge>
                      </View>
                      <View className="flex-row items-center gap-3 flex-wrap">
                        {e.date && (
                          <Text className="text-[11px] text-muted-foreground">
                            {new Date(e.date).toLocaleDateString()} • {e.time}
                          </Text>
                        )}
                        <Text className="text-[11px] text-muted-foreground">
                          {e._count?.registrations ?? e.attendee_count ?? 0} registered
                          {e.max_attendees ? ` / ${e.max_attendees}` : ''}
                        </Text>
                        {!isFree && (
                          <Text className="text-[11px] font-bold text-accent">₹{e.ticket_price}</Text>
                        )}
                        {isFree && (
                          <Text className="text-[11px] font-bold text-success">FREE</Text>
                        )}
                      </View>
                      <View className="flex-row gap-2 mt-1">
                        <Pressable
                          className="flex-1"
                          onPress={() => navigation.navigate("EventRegistrations", { id: e.id })}
                        >
                          <View className="rounded-lg bg-primary/10 py-2 items-center">
                            <Text className="text-xs font-semibold text-primary">View Registrations</Text>
                          </View>
                        </Pressable>
                        <Pressable
                          className="flex-1"
                          onPress={() => navigation.navigate("EventEdit", { id: e.id })}
                        >
                          <View className="rounded-lg bg-muted py-2 items-center">
                            <Text className="text-xs font-semibold text-foreground">Edit Event</Text>
                          </View>
                        </Pressable>
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        {/* ─── Vouchers ─────────────────────────────────────────────────── */}
        {tab === "vouchers" && (
          <View className="gap-3">
            {vouchers.map((v: any) => (
              <View key={v.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">{v.title}</Text>
                <Text className="text-xs text-muted-foreground">{v.category}</Text>
                <Badge className="text-[9px] mt-2">{v.status}</Badge>
              </View>
            ))}
          </View>
        )}

        {/* ─── Reviews ──────────────────────────────────────────────────── */}
        {tab === "reviews" && (
          <View className="gap-3">
            {reviews.map((r: any) => (
              <View key={r.id} className="rounded-xl border border-border bg-card p-3">
                <Text className="text-sm font-semibold text-foreground">
                  {r.comment?.slice(0, 60) || "No comment"}
                </Text>
                <Text className="text-xs text-muted-foreground mt-1">Rating: {r.rating}</Text>
                {r.user ? (
                  <Text className="text-[10px] text-muted-foreground">By {r.user.name}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default AdminDashboard;
