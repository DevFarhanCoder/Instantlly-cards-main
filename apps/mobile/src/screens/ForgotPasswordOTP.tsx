import { useState, useEffect } from "react";
import { View, ScrollView, Pressable, Text, StyleSheet, Image, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ArrowLeft } from "lucide-react-native";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "../lib/toast";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp as RNRouteProp } from '@react-navigation/native';
import type { RootStackParamList } from "../navigation/routes";
import Constants from 'expo-constants';
import { useIconColor } from "../theme/colors";

const API_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
const iconImg = require("../../assets/Instantlly_Logo-removebg.png");

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ForgotPasswordOTP">;
type RouteProps = RNRouteProp<RootStackParamList, "ForgotPasswordOTP">;

const ForgotPasswordOTP = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const phone = route.params?.phone || "";
  
  const [otp, setOTP] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      toast.error("OTP is required");
      return;
    }

    if (otp.length !== 6) {
      toast.error("OTP must be 6 digits");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Invalid OTP');
        return;
      }

      toast.success("OTP verified successfully");
      navigation.navigate("ForgotPasswordReset", { phone, otp });
    } catch (error: any) {
      console.error('[FORGOT-PASSWORD] Verify OTP error:', error);
      toast.error(error?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to resend OTP');
        return;
      }

      toast.success("OTP resent successfully");
      setResendCooldown(60); // 60 seconds cooldown
      setOTP("");
    } catch (error: any) {
      console.error('[FORGOT-PASSWORD] Resend OTP error:', error);
      toast.error(error?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const maskedPhone = phone ? `${phone.slice(0, -4)}****` : "";

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
              <ArrowLeft size={24} color={iconColor} />
            </Pressable>
            <Text className="text-2xl font-bold text-gray-900">Verify OTP</Text>
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
                  Enter the 6-digit OTP sent to
                </Text>
                <Text className="text-base text-gray-900 font-bold mt-1">
                  +{maskedPhone}
                </Text>
              </View>

              {/* OTP Input Field */}
              <View className="gap-3">
                <View className="gap-1.5">
                  <Text className="text-sm font-bold text-gray-900">Enter OTP</Text>
                  <Input
                    placeholder="123456"
                    value={otp}
                    onChangeText={(text) => setOTP(text.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={6}
                    className="h-12 rounded-2xl text-lg font-bold border-0 bg-gray-100 tracking-widest pl-4"
                    placeholderTextColor="#9ca3af"
                  />
                </View>

                {/* Verify Button */}
                <Pressable
                  onPress={handleVerifyOTP}
                  disabled={loading}
                  style={[styles.submitButton, { opacity: loading ? 0.6 : 1 }]}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? "Verifying..." : "Verify OTP"}
                  </Text>
                </Pressable>

                {/* Resend OTP */}
                <View className="items-center mt-4">
                  {resendCooldown > 0 ? (
                    <Text className="text-sm text-gray-600">
                      Resend OTP in {resendCooldown}s
                    </Text>
                  ) : (
                    <Pressable onPress={handleResendOTP} disabled={loading}>
                      <Text className="text-sm font-semibold text-blue-600">
                        Didn't receive OTP? Resend
                      </Text>
                    </Pressable>
                  )}
                </View>
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

export default ForgotPasswordOTP;
