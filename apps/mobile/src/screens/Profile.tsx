import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  BarChart3,
  Bell,
  CalendarDays,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Crown,
  Gift,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Monitor,
  Moon,
  Send,
  Shield,
  ShieldCheck,
  Store,
  Sun,
  User,
} from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { useCredits } from "../contexts/CreditsContext";
import { useGetProfileQuery } from "../store/api/usersApi";
import { useGetMyCardsQuery } from "../store/api/businessCardsApi";
import { useGetMyVouchersQuery } from "../store/api/vouchersApi";
import { toast } from "../lib/toast";
import { useIconColor } from "../theme/colors";
import { useTheme, type ThemePreference } from "../contexts/ThemeContext";

const ThemeToggleRow = () => {
  const { preference, setPreference } = useTheme();
  const iconColor = useIconColor();
  const options: { key: ThemePreference; label: string; Icon: any }[] = [
    { key: "light", label: "Light", Icon: Sun },
    { key: "dark", label: "Dark", Icon: Moon },
    { key: "system", label: "System", Icon: Monitor },
  ];
  return (
    <View className="px-4 py-3.5">
      <View className="flex-row items-center gap-3 mb-3">
        <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted">
          <Moon size={16} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground">Appearance</Text>
          <Text className="text-xs text-muted-foreground">Choose light, dark, or follow system</Text>
        </View>
      </View>
      <View className="flex-row rounded-lg bg-muted p-1 gap-1">
        {options.map((opt) => {
          const active = preference === opt.key;
          return (
            <Pressable
              key={opt.key}
              onPress={() => setPreference(opt.key)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2 rounded-md ${active ? "bg-card" : ""}`}
            >
              <opt.Icon size={14} color={active ? "#3b82f6" : iconColor} />
              <Text className={`text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const ProfileCompletion = ({ authUser, profile, stats }: { authUser: any; profile: any; stats: any }) => {
  const navigation = useNavigation<any>();
  const fullName = profile?.profile?.full_name || profile?.name || authUser?.name;
  const phone = profile?.profile?.phone || profile?.phone || authUser?.phone;
  const avatar = profile?.profile?.avatar_url || profile?.profile_picture || authUser?.profile_picture;

  const steps = useMemo(
    () => [
      { label: "Email added", done: !!profile?.email || !!authUser?.email },
      { label: "Name added", done: !!fullName },
      { label: "Phone added", done: !!phone },
      { label: "Avatar uploaded", done: !!avatar },
      { label: "First booking", done: (stats?.bookings ?? 0) > 0 },
    ],
    [authUser, profile, stats, fullName, phone, avatar]
  );

  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  if (pct === 100) return null;

  return (
    <View style={{ borderRadius: 12, borderWidth: 1, borderColor: 'rgba(36,99,235,0.2)', backgroundColor: 'rgba(36,99,235,0.05)', padding: 16, gap: 12 }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-bold text-foreground">Complete Your Profile</Text>
        <Text className="text-xs font-bold text-primary">{pct}%</Text>
      </View>
      <Progress value={pct} className="h-2" />
      <View style={{ gap: 6 }}>
        {steps.map((step) => (
          <View key={step.label} className="flex-row items-center gap-2">
            <CheckCircle size={14} color={step.done ? "#2563eb" : "#c0c4cc"} />
            <Text
              className={`text-xs ${
                step.done ? "text-muted-foreground line-through" : "text-foreground"
              }`}
            >
              {step.label}
            </Text>
          </View>
        ))}
      </View>
      <Button
        size="sm"
        variant="outline"
        className="w-full rounded-lg"
        onPress={() => navigation.navigate("EditProfile")}
      >
        Complete Profile →
      </Button>
    </View>
  );
};

const SupportTicketSection = ({ userId }: { userId: string | number }) => {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: myTickets = [] } = useQuery({
    queryKey: ["my-tickets", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const nextErrors: Record<string, string> = {};
      if (subject.trim().length < 3) nextErrors.subject = "Subject must be at least 3 characters";
      if (subject.trim().length > 150) nextErrors.subject = "Subject too long";
      if (description.trim().length < 10) nextErrors.description = "Please describe the issue in at least 10 characters";
      if (description.trim().length > 2000) nextErrors.description = "Description too long";
      if (Object.keys(nextErrors).length > 0) {
        setErrors(nextErrors);
        throw new Error("Validation failed");
      }
      setErrors({});

      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId,
        subject: subject.trim(),
        description: description.trim(),
        priority,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      setSubject("");
      setDescription("");
      setPriority("medium");
      toast.success("Support ticket submitted! We'll get back to you soon.");
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") toast.error(e.message || "Failed to submit ticket");
    },
  });

  const statusColor: Record<string, string> = {
    open: "default",
    in_progress: "secondary",
    resolved: "outline",
    closed: "outline",
  };

  return (
    <View style={{ gap: 16 }}>
      <View className="flex-row items-center gap-2">
        <LifeBuoy size={18} color="#2563eb" />
        <Text className="text-sm font-bold text-foreground">Help & Support</Text>
      </View>

      <View className="rounded-xl border border-border bg-card p-4" style={{ gap: 12 }}>
        <Text className="text-xs font-bold text-foreground">Submit a Support Ticket</Text>
        <View>
          <Input
            placeholder="Subject (e.g. Can't book an appointment)"
            value={subject}
            onChangeText={setSubject}
            className="rounded-xl"
            maxLength={150}
          />
          {errors.subject && (
            <Text className="text-[10px] text-destructive mt-1">{errors.subject}</Text>
          )}
        </View>
        <View>
          <Textarea
            placeholder="Describe your issue in detail..."
            value={description}
            onChangeText={setDescription}
            className="rounded-xl"
            maxLength={2000}
          />
          {errors.description && (
            <Text className="text-[10px] text-destructive mt-1">{errors.description}</Text>
          )}
        </View>
        <View className="flex-row items-center gap-3">
          <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
            <SelectTrigger className="w-32 rounded-xl h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 Low</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="high">🔴 High</SelectItem>
            </SelectContent>
          </Select>
          <View style={{ flex: 1 }} />
          <Button
            size="sm"
            className="rounded-xl"
            onPress={() => createTicket.mutate()}
            disabled={createTicket.isPending}
          >
            <Send size={14} color="#ffffff" />
            {createTicket.isPending ? "Sending..." : "Submit Ticket"}
          </Button>
        </View>
      </View>

      {myTickets.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text className="text-xs font-bold text-foreground">
            My Tickets ({myTickets.length})
          </Text>
          {myTickets.map((t: any) => (
            <View key={t.id} className="rounded-xl border border-border bg-card p-3">
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                    {t.subject}
                  </Text>
                  <Text className="text-[10px] text-muted-foreground mt-0.5" numberOfLines={2}>
                    {t.description}
                  </Text>
                </View>
                <View className="items-end" style={{ gap: 4 }}>
                  <Badge
                    variant={t.priority === "high" ? "destructive" : "secondary"}
                    className="text-[9px] capitalize"
                  >
                    {t.priority}
                  </Badge>
                  <Badge
                    variant={(statusColor[t.status] || "secondary") as any}
                    className="text-[9px] capitalize"
                  >
                    {String(t.status || "").replace("_", " ")}
                  </Badge>
                </View>
              </View>
              {t.admin_notes && (
                <View className="mt-2 rounded-lg bg-muted p-2">
                  <Text className="text-[10px] font-medium text-foreground">
                    Admin Response:
                  </Text>
                  <Text className="text-[10px] text-muted-foreground">{t.admin_notes}</Text>
                </View>
              )}
              <Text className="text-[9px] text-muted-foreground mt-1.5">
                {new Date(t.created_at).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const Profile = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const { isBusiness, isAdmin } = useUserRole();
  const { credits } = useCredits();
  const [showTicketForm, setShowTicketForm] = useState(false);
  const { data: profileData, refetch: refetchProfile } = useGetProfileQuery(undefined, { skip: !user });
  const { data: myCards = [], refetch: refetchCards } = useGetMyCardsQuery(undefined, { skip: !user });
  const { data: myVouchers = [], refetch: refetchVouchers } = useGetMyVouchersQuery(undefined, { skip: !user });

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchProfile(), refetchCards(), refetchVouchers()]); } finally { setRefreshing(false); }
  }, [refetchProfile, refetchCards, refetchVouchers]);

  const profileStats = {
    cards: myCards.length,
    vouchers: myVouchers.length,
    bookings: 0,
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <View className="h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mb-4">
          <User size={40} color="#2563eb" />
        </View>
        <Text className="text-xl font-bold text-foreground mb-1">Welcome to Instantly</Text>
        <Text className="text-sm text-muted-foreground mb-6">
          Sign in to manage your profile and settings
        </Text>
        <Button onPress={() => navigation.navigate("Auth")} className="px-8 rounded-xl">
          Sign In
        </Button>
      </View>
    );
  }

  const displayName = profileData?.name || profileData?.profile?.full_name || user?.name || user?.phone || "User";
  const displayEmail = profileData?.email || user?.email || "";
  const memberSince = profileData?.created_at || new Date().toISOString();
  const avatarUrl = profileData?.profile?.avatar_url || profileData?.profile_picture || user?.profile_picture || null;
  const initials =
    displayName?.toString().substring(0, 2).toUpperCase() ||
    displayEmail?.toString().substring(0, 2).toUpperCase() ||
    "U";

  const menuItems = [
    { icon: LayoutDashboard, label: "My Dashboard", desc: "Activity, saved cards, offers", route: "Dashboard" },
    ...(isBusiness
      ? [
          {
            icon: Store,
            label: "Business Dashboard",
            desc: "Manage bookings, events, vouchers",
            route: "BusinessDashboard",
          },
          {
            icon: CalendarDays,
            label: "My Events",
            desc: "View, edit & cancel your events",
            route: "MyEvents",
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            icon: ShieldCheck,
            label: "Admin Panel",
            desc: "Platform management",
            route: "AdminDashboard",
          },
        ]
      : []),
    { icon: BarChart3, label: "Business Analytics", desc: "AI insights & lead tracking", route: "BusinessAnalytics" },
    { icon: Crown, label: "Subscription Plans", desc: "Manage your plan", route: "Subscription" },
    { icon: User, label: "Edit Profile", desc: "Update your personal info", route: "EditProfile" },
    { icon: CreditCard, label: "Payment Methods", desc: "Manage cards & wallets", route: "PaymentMethods" },
    { icon: Bell, label: "Notifications", desc: "Push & email preferences", route: "Notifications" },
    { icon: Shield, label: "Privacy & Security", desc: "Password & account settings", route: "PrivacySecurity" },
    { icon: Gift, label: "Refer & Earn", desc: "Invite friends, earn rewards", route: "ReferAndEarn" },
    { icon: CreditCard, label: "My Credits", desc: `Balance: ${credits} credits`, route: "Credits" },
    { icon: HelpCircle, label: "Help & Support", desc: "FAQs and contact us", action: () => setShowTicketForm(true) },
  ];

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Profile</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-5" refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }>
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary overflow-hidden">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={{ height: "100%", width: "100%" }} />
            ) : (
              <Text className="text-xl font-bold text-primary-foreground">{initials}</Text>
            )}
          </View>
          <View>
            <Text className="text-lg font-bold text-foreground">{displayName}</Text>
            <Text className="text-xs text-muted-foreground">
              Member since{" "}
              {new Date(memberSince).toLocaleDateString("en-IN", {
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
        </View>

        <View className="mt-4">
          <ProfileCompletion authUser={user} profile={profileData} stats={profileStats} />
        </View>

        <View className="mt-4 flex-row gap-3">
          {[
            { label: "Cards", value: String(profileStats?.cards ?? 0), emoji: "📇" },
            { label: "Vouchers", value: String(profileStats?.vouchers ?? 0), emoji: "🎟️" },
            { label: "Bookings", value: String(profileStats?.bookings ?? 0), emoji: "📅" },
          ].map((s) => (
            <View key={s.label} className="flex-1 rounded-xl border border-border bg-card p-3 items-center">
              <Text className="text-xl">{s.emoji}</Text>
              <Text className="text-lg font-bold text-foreground mt-1">{s.value}</Text>
              <Text className="text-[10px] text-muted-foreground">{s.label}</Text>
            </View>
          ))}
        </View>

        <View className="mt-5 rounded-xl border border-border bg-card overflow-hidden">
          <ThemeToggleRow />
        </View>

        <View className="mt-5 rounded-xl border border-border bg-card overflow-hidden">
          {menuItems.map((item, i) => (
            <Pressable
              key={item.label}
              onPress={() => {
                if ((item as any).action) (item as any).action();
                else if ((item as any).route) navigation.navigate((item as any).route);
              }}
              className={`flex-row items-center gap-3 px-4 py-3.5 ${
                i < menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <item.icon size={16} color={iconColor} />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-medium text-foreground">{item.label}</Text>
                <Text className="text-[11px] text-muted-foreground">{item.desc}</Text>
              </View>
              <ChevronRight size={16} color="#9aa2b1" />
            </Pressable>
          ))}
        </View>

        {showTicketForm && <View className="mt-5"><SupportTicketSection userId={user.id} /></View>}

        <Button
          variant="outline"
          className="mt-6 w-full gap-2 rounded-xl text-destructive border-destructive/30"
          onPress={async () => {
            await signOut();
            navigation.navigate("Home");
          }}
        >
          <LogOut size={14} color="#ef4444" /> Sign Out
        </Button>

        <Text className="text-center text-[10px] text-muted-foreground mt-4">
          Instantly v1.0 • Made with ❤️
        </Text>
      </ScrollView>
    </View>
  );
};

export default Profile;
