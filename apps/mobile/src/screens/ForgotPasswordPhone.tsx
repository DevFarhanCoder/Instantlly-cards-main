import { useState } from "react";
import { View, ScrollView, Pressable, Text, StyleSheet, Image, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowLeft, ChevronDown } from "lucide-react-native";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "../lib/toast";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";
import Constants from 'expo-constants';
import { useIconColor } from "../theme/colors";

const API_URL = process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

const iconImg = require("../../assets/Instantlly_Logo-removebg.png");

type NavigationProp = NativeStackNavigationProp<RootStackParamList, "ForgotPasswordPhone">;

const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+1-CA", country: "Canada", flag: "🇨🇦" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
];

const dialCode = (code: string) => code.replace(/-[A-Z]+$/, '');

const ForgotPasswordPhone = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<NavigationProp>();
  const [phone, setPhone] = useState("");
  const [countryCode, setCountryCode] = useState("+91");
  const [loading, setLoading] = useState(false);

  const validatePhone = (phone: string): boolean => {
    return /^\d{10}$/.test(phone);
  };

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    if (!validatePhone(phone)) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    setLoading(true);
    try {
      const fullPhone = `${dialCode(countryCode)}${phone}`.replace(/\+/g, '');
      
      const response = await fetch(`${API_URL}/api/auth/forgot-password/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to send OTP');
        return;
      }

      toast.success("OTP sent to your phone number");
      navigation.navigate("ForgotPasswordOTP", { phone: fullPhone });
    } catch (error: any) {
      console.error('[FORGOT-PASSWORD] Send OTP error:', error);
      toast.error(error?.message || 'Failed to send OTP');
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
              <ArrowLeft size={24} color={iconColor} />
            </Pressable>
            <Text className="text-2xl font-bold text-gray-900">Forgot Password</Text>
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
                  Enter your registered mobile number to receive an OTP for password reset
                </Text>
              </View>

              {/* Phone Number Field */}
              <View className="gap-3">
                <View className="gap-1.5">
                  <Text className="text-sm font-bold text-gray-900">Mobile Number</Text>
                  <View className="relative">
                    <Input
                      placeholder="1234567890"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      maxLength={10}
                      className="pl-32 pr-4 h-12 rounded-2xl text-sm border-0 bg-gray-100"
                      placeholderTextColor="#9ca3af"
                    />
                    <Pressable
                      style={styles.countryCodeButton}
                    >
                      <Text style={styles.countryCodeButtonText}>
                        {COUNTRY_CODES.find(c => c.code === countryCode)?.flag} {dialCode(countryCode)}
                      </Text>
                    </Pressable>
                  </View>
                  {phone.length > 0 && !validatePhone(phone) && (
                    <Text className="text-xs text-red-600 font-semibold">
                      ⚠️ Phone number must be exactly 10 digits
                    </Text>
                  )}
                </View>

                {/* Send OTP Button */}
                <Pressable
                  onPress={handleSendOTP}
                  disabled={loading}
                  style={[styles.submitButton, { opacity: loading ? 0.6 : 1 }]}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? "Sending..." : "Send OTP"}
                  </Text>
                </Pressable>
              </View>

              {/* Back to Sign In Link */}
              <Pressable
                onPress={() => navigation.navigate("Auth")}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleButtonText}>
                  Remember your password? Sign In
                </Text>
              </Pressable>
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
  countryCodeButton: {
    position: "absolute",
    left: 12,
    top: 0,
    height: 48,
    paddingHorizontal: 10,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
  },
  countryCodeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
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
  toggleButton: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: "center",
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
  },
});

export default ForgotPasswordPhone;
