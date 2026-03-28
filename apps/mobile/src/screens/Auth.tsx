import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  Eye,
  EyeOff,
  Lock,
  Phone,
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

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleTab, setRoleTab] = useState<RoleTab>("customer");
  const { signIn, signUp } = useAuth();
  const navigation = useNavigation<any>();

  const handleSubmit = async () => {
    if (!phone.trim() || !password.trim()) {
      console.log('[Auth Screen] Validation failed — empty phone or password');
      toast.error("Phone and password are required");
      return;
    }
    console.log(`[Auth Screen] Submit — mode: ${isSignUp ? 'signup' : 'login'}, phone: ${phone.trim()}`);
    setLoading(true);
    try {
      if (isSignUp) {
        console.log('[Auth Screen] Calling signUp...');
        const { error } = await signUp(phone.trim(), password, name.trim() || undefined);
        if (error) {
          console.warn('[Auth Screen] signUp error:', error);
          toast.error(error);
        } else {
          console.log('[Auth Screen] signUp success → navigating to MyPasses');
          toast.success("Account created! Welcome to Instantlly.");
          navigation.navigate("MyPasses");
        }
      } else {
        console.log('[Auth Screen] Calling signIn...');
        const { error } = await signIn(phone.trim(), password);
        if (error) {
          console.warn('[Auth Screen] signIn error:', error);
          toast.error(error);
        } else {
          console.log('[Auth Screen] signIn success → navigating to MyPasses');
          navigation.navigate("MyPasses");
        }
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
                      roleTab === "customer" ? "bg-accent" : ""
                    }`}
                  >
                    <Users size={16} color={roleTab === "customer" ? "#111827" : "#6a7181"} />
                    <Text
                      className={`text-sm font-semibold ${
                        roleTab === "customer" ? "text-accent-foreground" : "text-muted-foreground"
                      }`}
                    >
                      Customer
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setRoleTab("business")}
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-full py-2.5 ${
                      roleTab === "business" ? "bg-accent" : ""
                    }`}
                  >
                    <Store size={16} color={roleTab === "business" ? "#111827" : "#6a7181"} />
                    <Text
                      className={`text-sm font-semibold ${
                        roleTab === "business" ? "text-accent-foreground" : "text-muted-foreground"
                      }`}
                    >
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
                {isSignUp && (
                  <View className="space-y-1.5">
                    <Text className="text-sm font-semibold text-foreground">Name</Text>
                    <Input
                      placeholder="Your name"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                )}

                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-foreground">Phone</Text>
                  <View className="relative">
                    <View className="absolute left-3 top-3">
                      <Phone size={16} color="#6a7181" />
                    </View>
                    <Input
                      placeholder="+91 9876543210"
                      value={phone}
                      onChangeText={setPhone}
                      autoCapitalize="none"
                      keyboardType="phone-pad"
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

                <Button onPress={handleSubmit} className="w-full h-12" disabled={loading}>
                  {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
                </Button>
              </View>

              <Pressable onPress={() => setIsSignUp(!isSignUp)} className="items-center">
                <Text className="text-sm text-primary font-medium">
                  {isSignUp
                    ? "Already have an account? Sign in"
                    : "Don't have an account? Sign up"}
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
