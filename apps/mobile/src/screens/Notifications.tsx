import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { PageLoader } from "../components/ui/page-loader";
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  MessageCircle,
  Settings,
  Star,
  Tag,
  Trash2,
} from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../hooks/useAuth";
import { colors } from "../theme/colors";
import { useIconColor } from "../theme/colors";

const typeIcon: Record<string, any> = {
  reminder: Bell,
  offer: Tag,
  booking: CalendarCheck,
  message: MessageCircle,
  review: Star,
};

const notifTypes = [
  { key: "booking", label: "Booking Updates", desc: "Confirmations, cancellations", emoji: "📅" },
  { key: "message", label: "Messages", desc: "New messages from businesses", emoji: "💬" },
  { key: "offer", label: "Offers & Deals", desc: "Vouchers and special offers", emoji: "🎁" },
  { key: "reminder", label: "Reminders", desc: "Appointment reminders", emoji: "⏰" },
  { key: "review", label: "Reviews", desc: "Review responses", emoji: "⭐" },
  { key: "general", label: "General", desc: "Platform updates & news", emoji: "📢" },
];

const PREF_KEY = "notif-prefs";

const Notifications = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, deleteAll, isLoading, refetch: refetchNotifications } =
    useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchNotifications(); } finally { setRefreshing(false); }
  }, [refetchNotifications]);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("notifications");
  const [prefs, setPrefs] = useState<Record<string, boolean>>(
    Object.fromEntries(notifTypes.map((t) => [t.key, true]))
  );

  useEffect(() => {
    const load = async () => {
      const stored = await AsyncStorage.getItem(PREF_KEY);
      if (stored) setPrefs(JSON.parse(stored));
    };
    load();
  }, []);

  const togglePref = async (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    await AsyncStorage.setItem(PREF_KEY, JSON.stringify(updated));
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Bell size={48} color="#c0c4cc" />
        <Text className="text-sm text-muted-foreground mt-3 mb-4">
          Sign in to see your notifications
        </Text>
        <Button onPress={() => navigation.navigate("Auth")} className="rounded-xl">
          Sign In
        </Button>
      </View>
    );
  }

  const filtered =
    filter === "all"
      ? notifications
      : notifications.filter((n) =>
          filter === "unread" ? !n.read : n.type === filter
        );

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => navigation.goBack()}>
            <ArrowLeft size={20} color={iconColor} />
          </Pressable>
          <Text className="text-lg font-bold text-foreground">Notifications</Text>
          {unreadCount > 0 && (
            <View className="rounded-full bg-destructive px-2 py-0.5">
              <Text className="text-[10px] font-bold text-destructive-foreground">
                {unreadCount}
              </Text>
            </View>
          )}
        </View>
        {unreadCount > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs"
            onPress={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
        )}
      </View>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 px-4 pt-3">
        <TabsList className="w-full">
          <TabsTrigger value="notifications" className="flex-1">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex-1 gap-1">
            <Settings size={14} color={colors.foreground} /> Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="flex-1 mt-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-3">
            <View className="flex-row gap-2">
              {["all", "unread", "reminder", "offer", "booking", "message"].map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  className={`rounded-full px-3 py-1.5 ${
                    filter === f ? "bg-primary" : "border border-border"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium capitalize ${
                      filter === f ? "text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {f === "all" ? "All" : f}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <ScrollView contentContainerStyle={{ paddingBottom: 16 }} refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
            }>
          {isLoading ? (
            <PageLoader fullScreen={false} />
          ) : filtered.length === 0 ? (
            <View className="items-center py-16">
              <Bell size={48} color="#c0c4cc" />
              <Text className="text-sm text-muted-foreground mt-2">No notifications</Text>
            </View>
          ) : (
            <View className="gap-2">
              {filtered.map((n) => {
                const Icon = typeIcon[n.type] || Bell;
                return (
                  <Pressable
                    key={n.id}
                    className={`flex-row items-start gap-3 rounded-xl border p-3 ${
                      n.read ? "border-border bg-card" : "border-primary/20 bg-primary/5"
                    }`}
                    onPress={() => !n.read && markRead.mutate(n.id)}
                  >
                    <View className={`h-9 w-9 items-center justify-center rounded-xl ${
                      n.read ? "bg-muted" : "bg-primary/10"
                    }`}>
                      <Text className="text-lg">{n.emoji || "🔔"}</Text>
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className={`text-sm ${n.read ? "text-foreground" : "text-foreground font-semibold"}`} numberOfLines={1}>
                          {n.title}
                        </Text>
                        {!n.read && <View className="h-2 w-2 rounded-full bg-primary" />}
                      </View>
                      {n.description ? (
                        <Text className="text-[11px] text-muted-foreground mt-0.5" numberOfLines={2}>
                          {n.description}
                        </Text>
                      ) : null}
                      <Text className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </Text>
                    </View>
                    <Icon size={14} color={colors.mutedForeground} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {notifications.length > 0 && (
            <Button
              variant="ghost"
              className="w-full mt-4 text-xs text-destructive"
              onPress={() => deleteAll.mutate()}
            >
              <Trash2 size={14} color="#ef4444" /> Clear all notifications
            </Button>
          )}
          </ScrollView>
        </TabsContent>

        <TabsContent value="preferences" className="flex-1 mt-3">
          <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 12 }}>
          <Text className="text-xs text-muted-foreground">
            Choose which notifications you want to receive.
          </Text>
          <View className="rounded-xl border border-border bg-card overflow-hidden">
            {notifTypes.map((type, i) => (
              <View
                key={type.key}
                className={`flex-row items-center gap-3 px-4 py-3.5 ${
                  i < notifTypes.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <Text className="text-xl">{type.emoji}</Text>
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground">{type.label}</Text>
                  <Text className="text-[11px] text-muted-foreground">{type.desc}</Text>
                </View>
                <Switch checked={prefs[type.key] ?? true} onCheckedChange={() => togglePref(type.key)} />
              </View>
            ))}
          </View>
          </ScrollView>
        </TabsContent>
      </Tabs>
    </View>
  );
};

export default Notifications;
