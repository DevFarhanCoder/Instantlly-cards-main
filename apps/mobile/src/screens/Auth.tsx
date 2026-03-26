import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  Store,
  Users,
} from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "../lib/toast";

type RoleTab = "customer" | "business";

const DEMO_ACCOUNTS: Record<string, { email: string; password: string }> = {
  customer: { email: "customer@demo.com", password: "demo1234" },
  business: { email: "business@demo.com", password: "demo1234" },
  admin: { email: "admin@demo.com", password: "demo1234" },
};

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleTab, setRoleTab] = useState<RoleTab>("customer");
  const { signIn, signUp } = useAuth();
  const navigation = useNavigation<any>();

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        toast.error(error.message);
      } else if (isSignUp) {
        toast.success("Check your email to confirm your account!");
      } else {
        navigation.navigate("MyPasses");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (role: string) => {
    const creds = DEMO_ACCOUNTS[role];
    setLoading(true);
    try {
      const { error } = await signIn(creds.email, creds.password);
      if (error) {
        toast.error(`Demo login failed: ${error.message}`);
      } else {
        if (role === "admin") navigation.navigate("AdminDashboard");
        else if (role === "business") navigation.navigate("BusinessDashboard");
        else navigation.navigate("MyPasses");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-primary">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-4">
        <View className="flex-1 items-center justify-center">
          <Card className="w-full max-w-md border-0 shadow-xl">
            <CardContent className="p-6 space-y-5">
              {!isSignUp && (
                <View className="flex-row rounded-full bg-muted p-1">
                  <Pressable
                    onPress={() => setRoleTab("customer")}
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-full py-2.5 ${
                      roleTab === "customer"
                        ? "bg-accent"
                        : ""
                    }`}
                  >
                    <Users size={16} color={roleTab === "customer" ? "#111827" : "#6a7181"} />
                    <Text className={`text-sm font-semibold ${roleTab === "customer" ? "text-accent-foreground" : "text-muted-foreground"}`}>
                      Customer
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRoleTab("business")}
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-full py-2.5 ${
                      roleTab === "business"
                        ? "bg-accent"
                        : ""
                    }`}
                  >
                    <Store size={16} color={roleTab === "business" ? "#111827" : "#6a7181"} />
                    <Text className={`text-sm font-semibold ${roleTab === "business" ? "text-accent-foreground" : "text-muted-foreground"}`}>
                      Business
                    </Text>
                  </Pressable>
                </View>
              )}

              <View>
                <Text className="text-2xl font-bold text-foreground">
                  {isSignUp ? "Create account" : "Welcome back"}
                </Text>
                <Text className="text-sm text-muted-foreground mt-1">
                  {isSignUp ? "Sign up to get started" : `Sign in as ${roleTab}`}
                </Text>
              </View>

              <View className="space-y-4">
                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-foreground">Email</Text>
                  <View className="relative">
                    <View className="absolute left-3 top-3">
                      <Mail size={16} color="#6a7181" />
                    </View>
                    <Input
                      placeholder="you@example.com"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      className="pl-9"
                    />
                  </View>
                </View>

                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-foreground">Password</Text>
                  <View className="relative">
                    <View className="absolute left-3 top-3">
                      <Lock size={16} color="#6a7181" />
                    </View>
                    <Input
                      secureTextEntry={!showPassword}
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      className="pl-9 pr-10"
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3"
                    >
                      {showPassword ? (
                        <EyeOff size={16} color="#6a7181" />
                      ) : (
                        <Eye size={16} color="#6a7181" />
                      )}
                    </Pressable>
                  </View>
                </View>

                <Button
                  onPress={handleSubmit}
                  className="w-full h-12"
                  disabled={loading}
                >
                  {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
                </Button>
              </View>

              {!isSignUp && (
                <View className="space-y-3">
                  <View className="flex-row items-center gap-3">
                    <View className="h-px flex-1 bg-border" />
                    <Text className="text-xs text-muted-foreground">quick demo</Text>
                    <View className="h-px flex-1 bg-border" />
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleQuickDemo("customer")}
                      disabled={loading}
                      className="flex-1 items-center gap-1.5 rounded-xl border-2 border-primary/20 bg-primary/5 py-3"
                    >
                      <Users size={20} color="#2563eb" />
                      <Text className="text-xs font-semibold text-primary">Customer</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleQuickDemo("business")}
                      disabled={loading}
                      className="flex-1 items-center gap-1.5 rounded-xl border-2 border-primary/20 bg-primary/5 py-3"
                    >
                      <Store size={20} color="#2563eb" />
                      <Text className="text-xs font-semibold text-primary">Business</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleQuickDemo("admin")}
                      disabled={loading}
                      className="flex-1 items-center gap-1.5 rounded-xl border-2 border-destructive/30 bg-destructive/5 py-3"
                    >
                      <Shield size={20} color="#ef4444" />
                      <Text className="text-xs font-semibold text-destructive">Admin</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <Pressable onPress={() => setIsSignUp(!isSignUp)} className="items-center">
                <Text className="text-sm text-primary font-medium">
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </Text>
              </Pressable>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
};

export default Auth;
