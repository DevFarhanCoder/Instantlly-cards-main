import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Phone,
  Shield,
  Store,
  User,
  Users,
} from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { toast } from "../lib/toast";
import type { RootStackParamList } from "../navigation/routes";

const iconImg = require("../../assets/Instantlly_Logo-removebg.png");

type RoleTab = "customer" | "business";
type Props = NativeStackScreenProps<RootStackParamList, "Auth">;

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleTab, setRoleTab] = useState<RoleTab>("customer");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const { signIn, signUp } = useAuth();

  // Validation
  const validatePhone = (phone: string): boolean => {
    return /^\d{10}$/.test(phone);
  };

  const validatePassword = (pass: string): boolean => {
    return pass.length >= 6;
  };

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

          {/* Login Card */}
          <Card className="w-full max-w-md border-0 shadow-xl rounded-3xl bg-white">
            <CardContent className="p-6 space-y-4">
              {/* Customer/Business Toggle */}
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => setRoleTab("customer")}
                  style={[
                    styles.roleTab,
                    roleTab === "customer" ? styles.roleTabActive : styles.roleTabInactive
                  ]}
                >
                  <Users size={18} color={roleTab === "customer" ? "#ffffff" : "#1f2937"} />
                  <Text style={[styles.roleTabText, roleTab === "customer" ? styles.roleTabTextActive : styles.roleTabTextInactive]}>
                    Customer
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setRoleTab("business")}
                  style={[
                    styles.roleTab,
                    roleTab === "business" ? styles.roleTabActive : styles.roleTabInactive
                  ]}
                >
                  <Store size={18} color={roleTab === "business" ? "#ffffff" : "#1f2937"} />
                  <Text style={[styles.roleTabText, roleTab === "business" ? styles.roleTabTextActive : styles.roleTabTextInactive]}>
                    Business
                  </Text>
                </Pressable>
              </View>

              {/* Subtitle Text */}
              <View className="items-center mt-1 mb-3">
                <Text className="text-base text-gray-700 font-medium">
                  {isSignUp 
                    ? `Sign up as ${roleTab}` 
                    : `Sign in to your ${roleTab} account`}
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
                    <Pressable
                      onPress={() => setShowCountryPicker(true)}
                      style={styles.countryCodeButton}
                    >
                      <Text style={styles.countryCodeButtonText}>
                        {COUNTRY_CODES.find(c => c.code === countryCode)?.flag} {countryCode}
                      </Text>
                      <ChevronDown size={14} color="#6b7280" />
                    </Pressable>
                  </View>
                  {phoneNumber.length > 0 && !validatePhone(phoneNumber) && (
                    <Text className="text-xs text-red-600 font-semibold">
                      ⚠️ Phone number must be 10 digits
                    </Text>
                  )}
                </View>

                {/* Password Field */}
                <View className="space-y-1.5">
                  <Text className="text-sm font-bold text-gray-900">Password</Text>
                  <View className="relative">
                    <Input
                      secureTextEntry={!showPassword}
                      placeholder="••••••••"
                      value={password}
                      onChangeText={setPassword}
                      className="pl-4 pr-14 h-12 rounded-2xl text-sm border-0 bg-gray-100"
                      placeholderTextColor="#9ca3af"
                    />
                    <Pressable
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeButton}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color="#9ca3af" />
                      ) : (
                        <Eye size={18} color="#9ca3af" />
                      )}
                    </Pressable>
                  </View>
                  {password.length > 0 && !validatePassword(password) && (
                    <Text className="text-xs text-red-600 font-semibold">
                      ⚠️ Password must be at least 6 characters
                    </Text>
                  )}
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

      {/* Country Code Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView style={styles.countryList}>
              {COUNTRY_CODES.map((country, index) => (
                <Pressable
                  key={`${country.code}-${index}`}
                  style={[
                    styles.countryItem,
                    countryCode === country.code && styles.countryItemSelected
                  ]}
                  onPress={() => {
                    setCountryCode(country.code);
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.countryFlag}>{country.flag}</Text>
                  <Text style={styles.countryName}>{country.country}</Text>
                  <Text style={styles.countryCodeInList}>{country.code}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  roleTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
  },
  roleTabActive: {
    backgroundColor: '#22c55e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  roleTabInactive: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  roleTabText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  roleTabTextActive: {
    color: '#ffffff',
  },
  roleTabTextInactive: {
    color: '#1f2937',
  },
  submitButton: {
    width: '100%',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FF6B35',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  demoButton: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingVertical: 10,
  },
  demoButtonText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  demoButtonAdmin: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingVertical: 10,
  },
  demoButtonAdminText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#dc2626',
  },
  toggleButton: {
    alignItems: 'center',
    paddingTop: 12,
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: 'bold',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  countryCodeButton: {
    position: 'absolute',
    left: 8,
    top: 6,
    bottom: 6,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    borderRadius: 10,
  },
  countryCodeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '70%',
    paddingBottom: 20,
    paddingTop: 20,
  },
  countryList: {
    flex: 1,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  countryItemSelected: {
    backgroundColor: '#eff6ff',
  },
  countryFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  countryCodeInList: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
});

export default Auth;
