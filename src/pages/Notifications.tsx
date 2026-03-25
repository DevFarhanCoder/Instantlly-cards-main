import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, CalendarCheck, Tag, MessageCircle, Star, Trash2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";

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

const Notifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead, deleteAll, isLoading } = useNotifications();
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("notifications");

  // Notification preferences (stored locally for now)
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem("notif-prefs");
      return stored ? JSON.parse(stored) : Object.fromEntries(notifTypes.map((t) => [t.key, true]));
    } catch {
      return Object.fromEntries(notifTypes.map((t) => [t.key, true]));
    }
  });

  const togglePref = (key: string) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    localStorage.setItem("notif-prefs", JSON.stringify(updated));
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Sign in to see your notifications</p>
        <Button onClick={() => navigate("/auth")} className="rounded-xl">Sign In</Button>
      </div>
    );
  }

  const filtered = filter === "all" ? notifications : notifications.filter((n) => (filter === "unread" ? !n.read : n.type === filter));

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Notifications</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">{unreadCount}</span>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button size="sm" variant="ghost" className="text-xs" onClick={() => markAllRead.mutate()}>Mark all read</Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 pt-3">
        <TabsList className="w-full">
          <TabsTrigger value="notifications" className="flex-1">Notifications</TabsTrigger>
          <TabsTrigger value="preferences" className="flex-1 gap-1">
            <Settings className="h-3.5 w-3.5" /> Preferences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="mt-3">
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
            {["all", "unread", "reminder", "offer", "booking", "message"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all capitalize",
                  filter === f ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"
                )}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((n, i) => {
                const Icon = typeIcon[n.type] || Bell;
                return (
                  <motion.div
                    key={n.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={cn(
                      "flex items-start gap-3 rounded-xl border p-3 transition-colors cursor-pointer",
                      n.read ? "border-border bg-card" : "border-primary/20 bg-primary/5"
                    )}
                    onClick={() => !n.read && markRead.mutate(n.id)}
                  >
                    <div className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl shrink-0 text-lg",
                      n.read ? "bg-muted" : "bg-primary/10"
                    )}>
                      {n.emoji || "🔔"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-medium truncate", n.read ? "text-foreground" : "text-foreground font-semibold")}>{n.title}</p>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {notifications.length > 0 && (
            <Button variant="ghost" className="w-full mt-4 text-xs text-destructive" onClick={() => deleteAll.mutate()}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear all notifications
            </Button>
          )}
        </TabsContent>

        <TabsContent value="preferences" className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">Choose which notifications you want to receive.</p>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {notifTypes.map((type, i) => (
              <div
                key={type.key}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < notifTypes.length - 1 ? "border-b border-border" : ""}`}
              >
                <span className="text-xl">{type.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{type.label}</p>
                  <p className="text-[11px] text-muted-foreground">{type.desc}</p>
                </div>
                <Switch
                  checked={prefs[type.key] ?? true}
                  onCheckedChange={() => togglePref(type.key)}
                />
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Notifications;
