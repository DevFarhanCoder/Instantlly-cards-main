import { useState } from "react";
import { View, ScrollView, Pressable, Text, StyleSheet, Image, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft, Eye, EyeOff } from "lucide-react-native";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "../lib/toast";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp as RNRouteProp } from '@react-navigation/native';
import type { RootStackParamList } from "../navigation/routes";
import Constants from 'expo-constants';

const API_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
const iconImg = require("../../assets/Instantlly_Logo-removebg.png");

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ForgotPasswordReset">;
type RouteProps = RNRouteProp<RootStackParamList, "ForgotPasswordReset">;

const ForgotPasswordReset = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const phone = route.params?.phone || "";
  const otp = route.params?.otp || "";
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const validatePassword = (pass: string): boolean => {
    return pass.length >= 6;
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) {
      toast.error("New password is required");
      return;
    }

    if (!validatePassword(newPassword)) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!confirmPassword.trim()) {
      toast.error("Please confirm your password");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to reset password');
        return;
      }

      toast.success("Password reset successfully! Please sign in.");
      // Navigate to Auth screen
      navigation.navigate("Auth");
    } catch (error: any) {
      console.error('[FORGOT-PASSWORD] Reset password error:', error);
      toast.error(error?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-5 pt-12 pb-6">
          {/* Header */}
          <View className="flex-row items-center mb-6">
            <Pressable onPress={() => navigation.goBack()} className="mr-3">
              <ArrowLeft size={24} color="#111827" />
            </Pressable>
            <Text className="text-2xl font-bold text-gray-900">Reset Password</Text>
          </View>

          {/* Logo */}
          <View className="items-center mb-8">
            <Image source={iconImg} style={styles.logo} resizeMode="contain" />
          </View>

          {/* Card */}
          <Card className="bg-white rounded-3xl border-0 shadow-sm mb-4">
            <CardContent className="p-6">
              {/* Instructions */}
              <View className="items-center mb-6">
                <Text className="text-base text-gray-700 text-center">
                  Create a new password for your account
                </Text>
              </View>

              {/* Form Fields */}
              <View className="gap-3">
                {/* New Password Field */}
                <View className="gap-1.5">
                  <Text className="text-sm font-bold text-gray-900">New Password</Text>
                  <View className="relative">
                    <Input
                      secureTextEntry={!showNewPassword}
                      placeholder="••••••••"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      className="pl-4 pr-14 h-12 rounded-2xl text-sm border-0 bg-gray-100"
                      placeholderTextColor="#9ca3af"
                    />
                    <Pressable
                      onPress={() => setShowNewPassword(!showNewPassword)}
                      style={styles.eyeButton}
                      accessibilityLabel={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword
                        ? <EyeOff size={18} color="#6b7280" />
                        : <Eye size={18} color="#6b7280" />
                      }
                    </Pressable>
                  </View>
                  {newPassword.length > 0 && !validatePassword(newPassword) && (
                    <Text className="text-xs text-red-600 font-semibold">
                      ⚠️ Password must be at least 6 characters
                    </Text>
                  )}
                </View>

                {/* Confirm Password Field */}
                <View className="gap-1.5">
                  <Text className="text-sm font-bold text-gray-900">Confirm New Password</Text>
                  <View className="relative">
                    <Input
                      secureTextEntry={!showConfirmPassword}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      className="pl-4 pr-14 h-12 rounded-2xl text-sm border-0 bg-gray-100"
                      placeholderTextColor="#9ca3af"
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeButton}
                      accessibilityLabel={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword
                        ? <EyeOff size={18} color="#6b7280" />
                        : <Eye size={18} color="#6b7280" />
                      }
                    </Pressable>
                  </View>
                  {confirmPassword.length > 0 && newPassword !== confirmPassword && (
                    <Text className="text-xs text-red-600 font-semibold">
                      ⚠️ Passwords do not match
                    </Text>
                  )}
                </View>

                {/* Reset Password Button */}
                <Pressable
                  onPress={handleResetPassword}
                  disabled={loading}
                  style={[styles.submitButton, { opacity: loading ? 0.6 : 1 }]}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? "Resetting..." : "Reset Password"}
                  </Text>
                </Pressable>
              </View>
            </CardContent>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  logo: {
    width: 120,
    height: 120,
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    top: 0,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  submitButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ForgotPasswordReset;
