import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Bell,
  Eye,
  EyeOff,
  Key,
  Lock,
  Shield,
  Smartphone,
  Trash2,
} from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useAuth } from "../hooks/useAuth";
import { useChangePasswordMutation, useDeleteAccountMutation } from "../store/api/usersApi";
import { toast } from "../lib/toast";

const SETTINGS_KEY = "privacy-settings";

const PrivacySecurity = () => {
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [settings, setSettings] = useState({
    profileVisible: true,
    showPhone: true,
    showEmail: false,
    activityStatus: true,
    readReceipts: true,
    marketingEmails: false,
  });

  const [changePasswordMutation, { isLoading: changing }] = useChangePasswordMutation();
  const [deleteAccountMutation, { isLoading: deleting }] = useDeleteAccountMutation();

  useEffect(() => {
    const load = async () => {
      const saved = await AsyncStorage.getItem(SETTINGS_KEY);
      if (saved) setSettings(JSON.parse(saved));
    };
    load();
  }, []);

  const updateSetting = async (key: string, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    toast.success("Setting updated");
  };

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Enter your current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    try {
      await changePasswordMutation({ currentPassword, newPassword }).unwrap();
      toast.success("Password updated! Please sign in again.");
      setShowChangePassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // All refresh tokens were revoked server-side; force re-login
      await signOut();
      navigation.navigate("Auth");
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to update password");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await deleteAccountMutation().unwrap();
      setShowDeleteConfirm(false);
      toast.success("Account deleted.");
      await signOut();
      navigation.navigate("Home");
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to delete account");
      setShowDeleteConfirm(false);
    }
  };

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Shield size={48} color="#c0c4cc" />
        <Text className="text-sm text-muted-foreground mt-3 mb-4">
          Sign in to manage security settings
        </Text>
        <Button onPress={() => navigation.navigate("Auth")} className="rounded-xl">
          Sign In
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center gap-3">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Privacy & Security</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-5">
        <View className="space-y-5">
          <View>
            <View className="flex-row items-center gap-2 mb-3">
              <Lock size={16} color="#2563eb" />
              <Text className="text-sm font-bold text-foreground">Account Security</Text>
            </View>
            <View className="rounded-xl border border-border bg-card overflow-hidden">
              <View className="flex-row items-center justify-between px-4 py-3.5 border-b border-border">
                <View>
                  <Text className="text-sm font-medium text-foreground">Email Address</Text>
                  <Text className="text-xs text-muted-foreground">{user.email || "Not set"}</Text>
                </View>
                <Shield size={16} color="#16a34a" />
              </View>
              <Pressable
                onPress={() => setShowChangePassword(true)}
                className="flex-row items-center justify-between px-4 py-3.5 border-b border-border"
              >
                <View className="flex-row items-center gap-2">
                  <Key size={16} color="#6a7181" />
                  <Text className="text-sm font-medium text-foreground">Change Password</Text>
                </View>
                <Text className="text-xs text-primary font-medium">Update</Text>
              </Pressable>
              <View className="flex-row items-center justify-between px-4 py-3.5">
                <View className="flex-row items-center gap-2">
                  <Smartphone size={16} color="#6a7181" />
                  <View>
                    <Text className="text-sm font-medium text-foreground">
                      Two-Factor Authentication
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      Extra security for your account
                    </Text>
                  </View>
                </View>
                <Text className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  Coming Soon
                </Text>
              </View>
            </View>
          </View>

          <View>
            <View className="flex-row items-center gap-2 mb-3">
              <Eye size={16} color="#2563eb" />
              <Text className="text-sm font-bold text-foreground">Privacy Settings</Text>
            </View>
            <View className="rounded-xl border border-border bg-card overflow-hidden">
              {[
                { key: "profileVisible", label: "Profile Visible to Others", desc: "Allow others to see your profile" },
                { key: "showPhone", label: "Show Phone Number", desc: "Display phone on business cards" },
                { key: "showEmail", label: "Show Email Address", desc: "Display email on business cards" },
                { key: "activityStatus", label: "Online Activity Status", desc: "Show when you're active" },
                { key: "readReceipts", label: "Read Receipts", desc: "Show when you've read messages" },
              ].map((item, i, arr) => (
                <View
                  key={item.key}
                  className={`flex-row items-center justify-between px-4 py-3.5 ${
                    i < arr.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <View>
                    <Text className="text-sm font-medium text-foreground">{item.label}</Text>
                    <Text className="text-[10px] text-muted-foreground">{item.desc}</Text>
                  </View>
                  <Switch
                    checked={(settings as any)[item.key]}
                    onCheckedChange={(v) => updateSetting(item.key, v)}
                  />
                </View>
              ))}
            </View>
          </View>

          <View>
            <View className="flex-row items-center gap-2 mb-3">
              <Bell size={16} color="#2563eb" />
              <Text className="text-sm font-bold text-foreground">Communication</Text>
            </View>
            <View className="rounded-xl border border-border bg-card overflow-hidden">
              <View className="flex-row items-center justify-between px-4 py-3.5">
                <View>
                  <Text className="text-sm font-medium text-foreground">Marketing Emails</Text>
                  <Text className="text-[10px] text-muted-foreground">
                    Receive promotional content and offers
                  </Text>
                </View>
                <Switch
                  checked={settings.marketingEmails}
                  onCheckedChange={(v) => updateSetting("marketingEmails", v)}
                />
              </View>
            </View>
          </View>

          <View>
            <View className="flex-row items-center gap-2 mb-3">
              <Trash2 size={16} color="#ef4444" />
              <Text className="text-sm font-bold text-destructive">Danger Zone</Text>
            </View>
            <View className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <Text className="text-sm font-medium text-foreground">Delete Account</Text>
              <Text className="text-xs text-muted-foreground mt-1">
                Permanently remove your account and all associated data. This action cannot be undone.
              </Text>
              <Button
                variant="destructive"
                size="sm"
                className="mt-3 rounded-lg"
                onPress={() => setShowDeleteConfirm(true)}
              >
                Delete My Account
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Change Password Dialog */}
      <Dialog open={showChangePassword} onOpenChange={setShowChangePassword}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
          </DialogHeader>
          <View className="space-y-4">
            <View className="space-y-2">
              <Label>Current Password</Label>
              <View className="relative">
                <Input
                  secureTextEntry={!showCurrentPassword}
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  className="rounded-xl pr-10"
                />
                <Pressable
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3"
                >
                  {showCurrentPassword ? (
                    <EyeOff size={16} color="#6a7181" />
                  ) : (
                    <Eye size={16} color="#6a7181" />
                  )}
                </Pressable>
              </View>
            </View>
            <View className="space-y-2">
              <Label>New Password</Label>
              <View className="relative">
                <Input
                  secureTextEntry={!showNewPassword}
                  placeholder="Enter new password (min 6 chars)"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  className="rounded-xl pr-10"
                />
                <Pressable
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3"
                >
                  {showNewPassword ? (
                    <EyeOff size={16} color="#6a7181" />
                  ) : (
                    <Eye size={16} color="#6a7181" />
                  )}
                </Pressable>
              </View>
            </View>
            <View className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input
                secureTextEntry
                placeholder="Confirm new password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                className="rounded-xl"
              />
            </View>
          </View>
          <DialogFooter>
            <Button
              className="w-full rounded-xl"
              onPress={handleChangePassword}
              disabled={changing}
            >
              {changing ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Account?</DialogTitle>
          </DialogHeader>
          <Text className="text-sm text-muted-foreground">
            This will permanently delete your account, business cards, bookings, and all data.
            This cannot be undone.
          </Text>
          <View className="flex-row gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onPress={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 rounded-xl"
              onPress={handleDeleteAccount}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default PrivacySecurity;
