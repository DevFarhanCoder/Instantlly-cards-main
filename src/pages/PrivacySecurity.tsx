import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Key, Smartphone, Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const PrivacySecurity = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changing, setChanging] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Privacy settings (persisted in localStorage)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem("privacy-settings");
    return saved ? JSON.parse(saved) : {
      profileVisible: true,
      showPhone: true,
      showEmail: false,
      activityStatus: true,
      readReceipts: true,
      marketingEmails: false,
    };
  });

  const updateSetting = (key: string, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem("privacy-settings", JSON.stringify(newSettings));
    toast.success("Setting updated");
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords don't match"); return; }
    setChanging(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated! 🔒");
      setShowChangePassword(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setChanging(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <Shield className="h-12 w-12 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground mb-4">Sign in to manage security settings</p>
        <Button onClick={() => navigate("/auth")} className="rounded-xl">Sign In</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">Privacy & Security</h1>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
        {/* Account Security */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-2 mb-3">
            <Lock className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Account Security</h2>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Email Address</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <Shield className="h-4 w-4 text-success" />
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors border-b border-border"
            >
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium text-foreground">Change Password</p>
              </div>
              <span className="text-xs text-primary font-medium">Update</span>
            </button>
            <div className="flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-[10px] text-muted-foreground">Extra security for your account</p>
                </div>
              </div>
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Coming Soon</span>
            </div>
          </div>
        </motion.section>

        {/* Privacy Settings */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Privacy Settings</h2>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {[
              { key: "profileVisible", label: "Profile Visible to Others", desc: "Allow others to see your profile" },
              { key: "showPhone", label: "Show Phone Number", desc: "Display phone on business cards" },
              { key: "showEmail", label: "Show Email Address", desc: "Display email on business cards" },
              { key: "activityStatus", label: "Online Activity Status", desc: "Show when you're active" },
              { key: "readReceipts", label: "Read Receipts", desc: "Show when you've read messages" },
            ].map((item, i, arr) => (
              <div key={item.key} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? "border-b border-border" : ""}`}>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={settings[item.key]} onCheckedChange={(v) => updateSetting(item.key, v)} />
              </div>
            ))}
          </div>
        </motion.section>

        {/* Notifications */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-3">
            <Bell className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Communication</h2>
          </div>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3.5">
              <div>
                <p className="text-sm font-medium text-foreground">Marketing Emails</p>
                <p className="text-[10px] text-muted-foreground">Receive promotional content and offers</p>
              </div>
              <Switch checked={settings.marketingEmails} onCheckedChange={(v) => updateSetting("marketingEmails", v)} />
            </div>
          </div>
        </motion.section>

        {/* Danger Zone */}
        <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="flex items-center gap-2 mb-3">
            <Trash2 className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-bold text-destructive">Danger Zone</h2>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-foreground font-medium">Delete Account</p>
            <p className="text-xs text-muted-foreground mt-1">Permanently remove your account and all associated data. This action cannot be undone.</p>
            <Button variant="destructive" size="sm" className="mt-3 rounded-lg" onClick={() => setShowDeleteConfirm(true)}>
              Delete My Account
            </Button>
          </div>
        </motion.section>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Change Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="rounded-xl pr-10"
                />
                <button onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="w-full rounded-xl" onClick={handleChangePassword} disabled={changing}>
              {changing ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader><DialogTitle>Delete Account?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will permanently delete your account, business cards, bookings, and all data. This cannot be undone.</p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1 rounded-xl" onClick={async () => {
              toast.error("Account deletion requires admin assistance. Please submit a support ticket.");
              setShowDeleteConfirm(false);
            }}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PrivacySecurity;
