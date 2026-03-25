import { Home, ShieldCheck, Activity, TrendingUp, LayoutGrid, CreditCard, CalendarDays, Gift, Megaphone, BarChart3, Shield } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import { useAdminPendingCounts } from "@/hooks/useAdminData";

const customerNav = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/my-cards", icon: CreditCard, label: "My Cards" },
  { to: "/events", icon: CalendarDays, label: "Events" },
  { to: "/vouchers", icon: Gift, label: "Vouchers" },
];

const businessNav = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/business-dashboard", icon: BarChart3, label: "Dashboard" },
  { to: "/analytics", icon: Shield, label: "Analytics" },
  { to: "/ads", icon: Megaphone, label: "Ads" },
];

const adminNav = [
  { to: "/admin", icon: Home, label: "Home", badgeKey: null },
  { to: "/admin?tab=approvals", icon: ShieldCheck, label: "Approvals", badgeKey: "totalApprovals" },
  { to: "/admin?tab=activity", icon: Activity, label: "Activity", badgeKey: null },
  { to: "/admin?tab=growth", icon: TrendingUp, label: "Growth", badgeKey: null },
];


const customerMoreItems = [
  { to: "/nearby", label: "Nearby", emoji: "📍" },
  { to: "/profile", label: "Profile", emoji: "👤" },
  { to: "/messaging", label: "Inbox", emoji: "💬" },
  { to: "/my-passes", label: "My Passes", emoji: "🎟️" },
  { to: "/my-vouchers", label: "My Vouchers", emoji: "🎁" },
  { to: "/notifications", label: "Notifications", emoji: "🔔" },
  { to: "/edit-profile", label: "Settings", emoji: "⚙️" },
  { to: "/payment-methods", label: "Payments", emoji: "💳" },
  { to: "/privacy-security", label: "Privacy", emoji: "🔒" },
  { to: "/refer", label: "Refer & Earn", emoji: "🎉" },
  { to: "/favorites", label: "My Favourites", emoji: "❤️" },
  { to: "/track-booking", label: "Track Booking", emoji: "📦" },
  { to: "/support", label: "Support", emoji: "🆘" },
  { to: "/loyalty-points", label: "Loyalty Points", emoji: "⭐" },
];

type MoreSection = {
  title: string;
  items: { to: string; label: string; emoji: string }[];
};

const adminMoreSections: MoreSection[] = [
  {
    title: "Super Admin",
    items: [
      { to: "/admin", label: "Full Access", emoji: "🔑" },
      { to: "/admin?tab=settings", label: "Master Settings", emoji: "👑" },
    ],
  },
  {
    title: "Sub Admin Access",
    items: [
      { to: "/admin?tab=users", label: "Sub Admin", emoji: "👤" },
      { to: "/admin?tab=users", label: "Transfer Access", emoji: "🔄" },
    ],
  },
  {
    title: "Role-Based Access",
    items: [
      { to: "/admin?tab=growth", label: "Marketing", emoji: "📊" },
      { to: "/admin?tab=revenue", label: "Accounts", emoji: "💰" },
      { to: "/admin?tab=approvals", label: "Operations", emoji: "📋" },
      { to: "/admin?tab=users", label: "User Mgmt", emoji: "👥" },
    ],
  },
  {
    title: "Limited Access",
    items: [
      { to: "/admin", label: "View Only", emoji: "👁️" },
      { to: "/admin?tab=approvals", label: "Moderator", emoji: "📝" },
      { to: "/admin?tab=tickets", label: "Support Agent", emoji: "🎧" },
    ],
  },
  {
    title: "Settings",
    items: [
      { to: "/admin?tab=settings", label: "Access Settings", emoji: "⚙️" },
      { to: "/admin?tab=activity", label: "Audit Log", emoji: "📜" },
    ],
  },
];

const businessMoreSections: MoreSection[] = [
  {
    title: "Content",
    items: [
      { to: "/my-cards", label: "My Cards", emoji: "💳" },
      { to: "/events", label: "Events", emoji: "📅" },
      { to: "/vouchers", label: "Vouchers", emoji: "🎫" },
      { to: "/ads/dashboard", label: "Ad Reports", emoji: "📣" },
    ],
  },
  {
    title: "Growth & Marketing",
    items: [
      { to: "/subscription", label: "Subscription", emoji: "👑" },
      { to: "/promote", label: "Promote", emoji: "🚀" },
      { to: "/refer", label: "Refer & Earn", emoji: "🎉" },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/profile", label: "Profile", emoji: "👤" },
      { to: "/messaging", label: "Inbox", emoji: "💬" },
      { to: "/notifications", label: "Notifications", emoji: "🔔" },
      { to: "/edit-profile", label: "Settings", emoji: "⚙️" },
      { to: "/support", label: "Support", emoji: "🆘" },
    ],
  },
];

const BottomNav = () => {
  const { isBusiness, isAdmin } = useUserRole();
  const [moreOpen, setMoreOpen] = useState(false);
  const navigate = useNavigate();
  const { data: pendingCounts } = useAdminPendingCounts();

  const totalPending = isAdmin && pendingCounts
    ? Object.values(pendingCounts).reduce((sum, v) => sum + v, 0)
    : 0;

  const totalApprovals = isAdmin && pendingCounts
    ? (pendingCounts.pendingCards || 0) + (pendingCounts.pendingEvents || 0) + (pendingCounts.pendingAds || 0) + (pendingCounts.pendingVouchers || 0)
    : 0;

  if (isAdmin) {
    return (
      <>
        <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
          <div className="mx-auto flex max-w-lg items-center justify-around py-1">
            {adminNav.map((item) => {
              const badgeCount = item.badgeKey === "totalApprovals" ? totalApprovals : 0;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/admin"}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="relative">
                        <item.icon
                          className={cn("h-5 w-5", isActive && "fill-primary/20")}
                          strokeWidth={isActive ? 2.5 : 2}
                        />
                        {badgeCount > 0 && (
                          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
                            {badgeCount > 99 ? "99+" : badgeCount}
                          </span>
                        )}
                      </div>
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
            <button
              onClick={() => setMoreOpen(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <div className="relative">
                <LayoutGrid className="h-5 w-5" strokeWidth={2} />
                {totalPending > 0 && (
                  <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-destructive" />
                )}
              </div>
              <span>More</span>
            </button>
          </div>
        </nav>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-2 max-h-[85vh] overflow-y-auto">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
            <SheetHeader className="mb-4">
              <SheetTitle className="text-center text-base">Admin Access</SheetTitle>
            </SheetHeader>

            {adminMoreSections.map((section) => (
              <div key={section.title} className="mb-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section.title}</p>
                <div className="grid grid-cols-3 gap-3">
                  {section.items.map((item) => (
                    <button
                      key={item.to + item.label}
                      onClick={() => { setMoreOpen(false); navigate(item.to); }}
                      className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-[11px] font-medium text-foreground leading-tight text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Customer / Business nav
  const navItems = isBusiness ? businessNav : customerNav;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card">
        <div className="mx-auto flex max-w-lg items-center justify-around py-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn("h-5 w-5", isActive && "fill-primary/20")}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LayoutGrid className="h-5 w-5" strokeWidth={2} />
            <span>More</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-2">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted" />
          <SheetHeader className="mb-4">
            <SheetTitle className="text-center text-base">
              {isBusiness ? "Business Tools" : "More Options"}
            </SheetTitle>
          </SheetHeader>

          {isBusiness ? (
            businessMoreSections.map((section) => (
              <div key={section.title} className="mb-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section.title}</p>
                <div className="grid grid-cols-4 gap-3">
                  {section.items.map((item) => (
                    <button
                      key={item.to}
                      onClick={() => { setMoreOpen(false); navigate(item.to); }}
                      className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
                    >
                      <span className="text-2xl">{item.emoji}</span>
                      <span className="text-[11px] font-medium text-foreground leading-tight text-center">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-4 gap-4">
              {customerMoreItems.map((item) => (
                <button
                  key={item.to}
                  onClick={() => { setMoreOpen(false); navigate(item.to); }}
                  className="flex flex-col items-center gap-1.5 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
                >
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-[11px] font-medium text-foreground leading-tight text-center">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default BottomNav;
