import { Outlet, useNavigate } from "react-router-dom";
import { MessageCircle, User, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import BottomNav from "./BottomNav";
import iconImg from "@/assets/icon.png";

const AppLayout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount: notifCount } = useNotifications();

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-background">
      <div className="sticky top-0 z-50 flex items-center justify-between bg-card px-4 py-3 shadow-sm">
        <div className="cursor-pointer flex items-center gap-1.5" onClick={() => navigate("/")}>
          <img src={iconImg} alt="Instantlly" className="h-7 w-7" />
          <h1 className="text-lg font-bold tracking-tight leading-none">
            <span className="text-[#1a2b4a]">Instant</span>
            <span className="text-[#2bb8e4]">lly</span>
            <span className="text-[#1a2b4a]"> Cards</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/notifications")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          >
            <Bell className="h-5 w-5 text-foreground" />
            {notifCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                {notifCount}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate("/messaging")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          >
            <MessageCircle className="h-5 w-5 text-foreground" />
          </button>
          <button
            onClick={() => navigate(user ? "/profile" : "/auth")}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          >
            {user ? (
              <span className="text-xs font-bold text-primary">
                {user.email?.substring(0, 2).toUpperCase()}
              </span>
            ) : (
              <User className="h-5 w-5 text-foreground" />
            )}
          </button>
        </div>
      </div>
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
