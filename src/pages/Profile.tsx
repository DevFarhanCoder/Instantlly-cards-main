import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, User, CreditCard, Bell, Shield, HelpCircle, ChevronRight, LayoutDashboard, BarChart3, Crown, Store, ShieldCheck, Send, LifeBuoy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { z } from "zod";

const ProfileCompletion = ({ user, stats }: { user: any; stats: any }) => {
  const navigate = useNavigate();
  const { data: profile } = useQuery({
    queryKey: ["profile", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      return data;
    },
  });

  const steps = [
    { label: "Email verified", done: !!user.email_confirmed_at || !!user.email },
    { label: "Name added", done: !!profile?.full_name },
    { label: "Phone added", done: !!profile?.phone },
    { label: "Avatar uploaded", done: !!profile?.avatar_url },
    { label: "First booking", done: (stats?.bookings ?? 0) > 0 },
  ];

  const completed = steps.filter(s => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  if (pct === 100) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Complete Your Profile</h3>
        <span className="text-xs font-bold text-primary">{pct}%</span>
      </div>
      <Progress value={pct} className="h-2" />
      <div className="space-y-1.5">
        {steps.map((step) => (
          <div key={step.label} className="flex items-center gap-2 text-xs">
            <CheckCircle className={`h-3.5 w-3.5 ${step.done ? "text-primary" : "text-muted-foreground/30"}`} />
            <span className={step.done ? "text-muted-foreground line-through" : "text-foreground"}>{step.label}</span>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" className="w-full rounded-lg text-xs" onClick={() => navigate("/edit-profile")}>
        Complete Profile →
      </Button>
    </motion.div>
  );
};

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(150, "Subject too long"),
  description: z.string().trim().min(10, "Please describe the issue in at least 10 characters").max(2000, "Description too long"),
  priority: z.enum(["low", "medium", "high"]),
});

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isBusiness, isAdmin } = useUserRole();
  const [showTicketForm, setShowTicketForm] = useState(false);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 mx-auto mb-4">
            <User className="h-10 w-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">Welcome to Instantly</h2>
          <p className="text-sm text-muted-foreground mb-6">Sign in to manage your profile and settings</p>
          <Button onClick={() => navigate("/auth")} className="px-8 rounded-xl">Sign In</Button>
        </motion.div>
      </div>
    );
  }

  const initials = user.email?.substring(0, 2).toUpperCase() || "U";

  const { data: profileStats } = useQuery({
    queryKey: ["profile-stats", user.id],
    queryFn: async () => {
      const [cards, vouchers, bookings] = await Promise.all([
        supabase.from("business_cards").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("claimed_vouchers").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("bookings").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      return {
        cards: cards.count ?? 0,
        vouchers: vouchers.count ?? 0,
        bookings: bookings.count ?? 0,
      };
    },
  });

  const menuItems = [
    { icon: LayoutDashboard, label: "My Dashboard", desc: "Activity, saved cards, offers", route: "/dashboard" },
    ...(isBusiness ? [{ icon: Store, label: "Business Dashboard", desc: "Manage bookings, events, vouchers", route: "/business-dashboard" }] : []),
    ...(isAdmin ? [{ icon: ShieldCheck, label: "Admin Panel", desc: "Platform management", route: "/admin" }] : []),
    { icon: BarChart3, label: "Business Analytics", desc: "AI insights & lead tracking", route: "/analytics" },
    { icon: Crown, label: "Subscription Plans", desc: "Manage your plan", route: "/subscription" },
    { icon: User, label: "Edit Profile", desc: "Update your personal info", route: "/edit-profile" },
    { icon: CreditCard, label: "Payment Methods", desc: "Manage cards & wallets", route: "/payment-methods" },
    { icon: Bell, label: "Notifications", desc: "Push & email preferences", route: "/notifications" },
    { icon: Shield, label: "Privacy & Security", desc: "Password & account settings", route: "/privacy-security" },
    { icon: HelpCircle, label: "Help & Support", desc: "FAQs and contact us", action: () => setShowTicketForm(true) },
  ];

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Profile</h1>
      </div>

      <div className="px-4 py-5 space-y-5">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
            {initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">{user.email}</h2>
            <p className="text-xs text-muted-foreground">Member since {new Date(user.created_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</p>
          </div>
        </motion.div>

        {/* Profile Completion */}
        <ProfileCompletion user={user} stats={profileStats} />

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Cards", value: String(profileStats?.cards ?? 0), emoji: "📇" },
            { label: "Vouchers", value: String(profileStats?.vouchers ?? 0), emoji: "🎟️" },
            { label: "Bookings", value: String(profileStats?.bookings ?? 0), emoji: "📅" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-border bg-card p-3 text-center">
              <span className="text-xl">{s.emoji}</span>
              <p className="text-lg font-bold text-foreground mt-1">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={() => {
                if ((item as any).action) (item as any).action();
                else if (item.route) navigate(item.route);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors ${
                i < menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <item.icon className="h-4 w-4 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Support Ticket Section */}
        {showTicketForm && <SupportTicketSection userId={user.id} />}

        <Button
          variant="outline"
          className="w-full gap-2 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={async () => {
            await signOut();
            navigate("/");
          }}
        >
          <LogOut className="h-4 w-4" /> Sign Out
        </Button>

        <p className="text-center text-[10px] text-muted-foreground">Instantly v1.0 • Made with ❤️</p>
      </div>
    </div>
  );
};

const SupportTicketSection = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: myTickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const parsed = ticketSchema.safeParse({ subject, description, priority });
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.errors.forEach(e => { fieldErrors[e.path[0] as string] = e.message; });
        setErrors(fieldErrors);
        throw new Error("Validation failed");
      }
      setErrors({});
      const { error } = await supabase.from("support_tickets").insert({
        user_id: userId,
        subject: parsed.data.subject,
        description: parsed.data.description,
        priority: parsed.data.priority,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tickets"] });
      setSubject("");
      setDescription("");
      setPriority("medium");
      toast.success("Support ticket submitted! We'll get back to you soon. 🎫");
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
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <LifeBuoy className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-bold text-foreground">Help & Support</h2>
      </div>

      {/* New Ticket Form */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h3 className="text-xs font-bold text-foreground">Submit a Support Ticket</h3>
        <div>
          <Input
            placeholder="Subject (e.g. Can't book an appointment)"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="rounded-xl"
            maxLength={150}
          />
          {errors.subject && <p className="text-[10px] text-destructive mt-1">{errors.subject}</p>}
        </div>
        <div>
          <Textarea
            placeholder="Describe your issue in detail…"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="rounded-xl"
            rows={3}
            maxLength={2000}
          />
          {errors.description && <p className="text-[10px] text-destructive mt-1">{errors.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
            <SelectTrigger className="w-32 rounded-xl h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 Low</SelectItem>
              <SelectItem value="medium">🟡 Medium</SelectItem>
              <SelectItem value="high">🔴 High</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" className="rounded-xl gap-1.5 ml-auto" onClick={() => createTicket.mutate()} disabled={createTicket.isPending}>
            <Send className="h-3.5 w-3.5" /> {createTicket.isPending ? "Sending…" : "Submit Ticket"}
          </Button>
        </div>
      </div>

      {/* My Tickets */}
      {myTickets.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-foreground">My Tickets ({myTickets.length})</h3>
          {myTickets.map((t: any) => (
            <div key={t.id} className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.subject}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant={t.priority === "high" ? "destructive" : "secondary"} className="text-[9px] capitalize">{t.priority}</Badge>
                  <Badge variant={(statusColor[t.status] || "secondary") as any} className="text-[9px] capitalize">{t.status?.replace("_", " ")}</Badge>
                </div>
              </div>
              {t.admin_notes && (
                <div className="mt-2 rounded-lg bg-muted/50 p-2">
                  <p className="text-[10px] font-medium text-foreground">Admin Response:</p>
                  <p className="text-[10px] text-muted-foreground">{t.admin_notes}</p>
                </div>
              )}
              <p className="text-[9px] text-muted-foreground mt-1.5">{new Date(t.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Profile;
