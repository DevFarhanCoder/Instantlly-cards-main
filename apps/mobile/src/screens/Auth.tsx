import { useState } from "react";
import { View, ScrollView, Pressable, Text, Modal, StyleSheet, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Users, Store, Shield, ChevronDown, Eye, EyeOff } from "lucide-react-native";
import { useAuth } from "../hooks/useAuth";
import { useAppDispatch } from "../store";
import { setActiveRole } from "../store/authSlice";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { toast } from "../lib/toast";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/routes";

const iconImg = require("../../assets/Instantlly_Logo-removebg.png");

type RoleTab = "customer" | "business";
type Props = NativeStackScreenProps<RootStackParamList, "Auth">;

const COUNTRY_CODES = [
  { code: "+91", country: "India", flag: "🇮🇳" },
  { code: "+1", country: "United States", flag: "🇺🇸" },
  { code: "+1-CA", country: "Canada", flag: "🇨🇦" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", country: "Australia", flag: "🇦🇺" },
  { code: "+971", country: "UAE", flag: "🇦🇪" },
  { code: "+65", country: "Singapore", flag: "🇸🇬" },
  { code: "+86", country: "China", flag: "🇨🇳" },
  { code: "+81", country: "Japan", flag: "🇯🇵" },
  { code: "+82", country: "South Korea", flag: "🇰🇷" },
  { code: "+49", country: "Germany", flag: "🇩🇪" },
  { code: "+33", country: "France", flag: "🇫🇷" },
  { code: "+39", country: "Italy", flag: "🇮🇹" },
  { code: "+34", country: "Spain", flag: "🇪🇸" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭" },
  { code: "+46", country: "Sweden", flag: "🇸🇪" },
  { code: "+47", country: "Norway", flag: "🇳🇴" },
  { code: "+45", country: "Denmark", flag: "🇩🇰" },
  { code: "+358", country: "Finland", flag: "🇫🇮" },
  { code: "+32", country: "Belgium", flag: "🇧🇪" },
  { code: "+43", country: "Austria", flag: "🇦🇹" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+353", country: "Ireland", flag: "🇮🇪" },
  { code: "+48", country: "Poland", flag: "🇵🇱" },
  { code: "+7", country: "Russia", flag: "🇷🇺" },
  { code: "+90", country: "Turkey", flag: "🇹🇷" },
  { code: "+20", country: "Egypt", flag: "🇪🇬" },
  { code: "+27", country: "South Africa", flag: "🇿🇦" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬" },
  { code: "+254", country: "Kenya", flag: "🇰🇪" },
  { code: "+233", country: "Ghana", flag: "🇬🇭" },
  { code: "+92", country: "Pakistan", flag: "🇵🇰" },
  { code: "+880", country: "Bangladesh", flag: "🇧🇩" },
  { code: "+94", country: "Sri Lanka", flag: "🇱🇰" },
  { code: "+977", country: "Nepal", flag: "🇳🇵" },
  { code: "+95", country: "Myanmar", flag: "🇲🇲" },
  { code: "+66", country: "Thailand", flag: "🇹🇭" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳" },
  { code: "+63", country: "Philippines", flag: "🇵🇭" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾" },
  { code: "+852", country: "Hong Kong", flag: "🇭🇰" },
  { code: "+886", country: "Taiwan", flag: "🇹🇼" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿" },
  { code: "+52", country: "Mexico", flag: "🇲🇽" },
  { code: "+55", country: "Brazil", flag: "🇧🇷" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colombia", flag: "🇨🇴" },
  { code: "+51", country: "Peru", flag: "🇵🇪" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+974", country: "Qatar", flag: "🇶🇦" },
  { code: "+965", country: "Kuwait", flag: "🇰🇼" },
  { code: "+968", country: "Oman", flag: "🇴🇲" },
  { code: "+973", country: "Bahrain", flag: "🇧🇭" },
  { code: "+962", country: "Jordan", flag: "🇯🇴" },
  { code: "+972", country: "Israel", flag: "🇮🇱" },
  { code: "+98", country: "Iran", flag: "🇮🇷" },
  { code: "+964", country: "Iraq", flag: "🇮🇶" },
  { code: "+30", country: "Greece", flag: "🇬🇷" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿" },
  { code: "+36", country: "Hungary", flag: "🇭🇺" },
  { code: "+40", country: "Romania", flag: "🇷🇴" },
];

/** Strip the -XX suffix so "+1-CA" sends as "+1" */
const dialCode = (code: string) => code.replace(/-[A-Z]+$/, '');

const DEMO_ACCOUNTS: Record<string, { phone: string; password: string }> = {
  customer: { phone: "9000000001", password: "demo1234" },
  business: { phone: "9000000002", password: "demo1234" },
  admin: { phone: "9000000003", password: "demo1234" },
};

const Auth = ({ navigation }: Props) => {
  const dispatch = useAppDispatch();
  const [isSignUp, setIsSignUp] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [roleTab, setRoleTab] = useState<RoleTab>("customer");
  const [countryCode, setCountryCode] = useState("+91");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  /** Roles returned by the login response — used to populate the role selection modal. */
  const [loginRoles, setLoginRoles] = useState<string[]>([]);
  const { signIn, signUp } = useAuth();

  const validatePhone = (phone: string): boolean => {
    return /^\d{10}$/.test(phone);
  };

  const validatePassword = (pass: string): boolean => {
    return pass.length >= 6;
  };

  const handleSubmit = async () => {
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    if (!validatePhone(phone)) {
      toast.error("Phone number must be exactly 10 digits");
      return;
    }

    if (!password.trim()) {
      toast.error("Password is required");
      return;
    }

    if (!validatePassword(password)) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (isSignUp) {
      if (!name.trim()) {
        toast.error(roleTab === "customer" ? "Full name is required" : "Business name is required");
        return;
      }

      if (!confirmPassword.trim()) {
        toast.error("Please confirm your password");
        return;
      }

      if (password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    }

    setLoading(true);
    try {
      // Strip all '+' signs (handles country codes like "+91" and any user-pasted formatting)
      const fullPhone = `${dialCode(countryCode)}${phone}`.replace(/\+/g, '');

      if (isSignUp) {
        console.log('[Auth Screen] Calling signUp...');
        const { error } = await signUp(fullPhone, password, name.trim() || undefined, undefined, roleTab);
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
        const { error, user: freshUser } = await signIn(fullPhone, password);
        if (error) {
          console.warn('[Auth Screen] signIn error:', error);
          toast.error(error);
        } else if (freshUser && freshUser.roles.length > 1) {
          // Fresh roles from login response — no stale-closure risk
          console.log(`[Auth Screen] Multi-role detected: [${freshUser.roles.join(', ')}], showing role selection`);
          setLoginRoles(freshUser.roles);
          setShowRoleSelection(true);
        } else {
          console.log('[Auth Screen] Single role login → navigating to MyPasses');
          navigation.navigate("MyPasses");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (type: "customer" | "business" | "admin") => {
    setLoading(true);
    try {
      const demo = DEMO_ACCOUNTS[type];
      if (!demo) return;

      console.log(`[Auth Screen] Quick demo login as ${type}`);
      const { error } = await signIn(demo.phone, demo.password);
      if (error) {
        console.warn('[Auth Screen] quick demo error:', error);
        toast.error(`Demo ${type} not available`);
      } else {
        console.log('[Auth Screen] demo login success → navigating to MyPasses');
        navigation.navigate("MyPasses");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="p-6">
        <View className="flex-1 items-center justify-center py-8">
          {/* Logo Section */}
          <View className="mb-3 items-center">
            <Image source={iconImg} style={{ width: 70, height: 70, marginBottom: 12, backgroundColor: 'transparent' }} resizeMode="contain" />
            <Text className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Instantlly Cards</Text>
            <Text className="text-sm text-gray-600 font-medium tracking-wide">Connect, Share, Grow</Text>
          </View>

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

              {/* Form Fields */}
              <View className="space-y-3">
                {/* Name Field (Sign Up Only) */}
                {isSignUp && (
                  <View className="space-y-1.5">
                    <Text className="text-sm font-bold text-gray-900">
                      {roleTab === 'business' ? 'Business Name' : 'Full Name'}
                    </Text>
                    <View className="relative">
                      <Input
                        placeholder={roleTab === 'business' ? 'Enter your business name' : 'Enter your full name'}
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                        className="pl-4 h-12 rounded-2xl text-sm border-0 bg-gray-100"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                  </View>
                )}

                {/* Phone Number Field */}
                <View className="space-y-1.5">
                  <Text className="text-sm font-bold text-gray-900">Phone Number</Text>
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
                      onPress={() => setShowCountryPicker(true)}
                      style={styles.countryCodeButton}
                    >
                      <Text style={styles.countryCodeButtonText}>
                        {COUNTRY_CODES.find(c => c.code === countryCode)?.flag} {dialCode(countryCode)}
                      </Text>
                      <ChevronDown size={14} color="#6b7280" />
                    </Pressable>
                  </View>
                  {phone.length > 0 && !validatePhone(phone) && (
                    <Text className="text-xs text-red-600 font-semibold">
                      ⚠️ Phone number must be exactly 10 digits
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
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword
                        ? <EyeOff size={18} color="#6b7280" />
                        : <Eye size={18} color="#6b7280" />
                      }
                    </Pressable>
                  </View>
                  {password.length > 0 && !validatePassword(password) && (
                    <Text className="text-xs text-red-600 font-semibold">
                      ⚠️ Password must be at least 6 characters
                    </Text>
                  )}
                </View>

                {/* Confirm Password Field (Sign Up Only) */}
                {isSignUp && (
                  <View className="space-y-1.5">
                    <Text className="text-sm font-bold text-gray-900">Confirm Password</Text>
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
                        accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      >
                        {showConfirmPassword
                          ? <EyeOff size={18} color="#6b7280" />
                          : <Eye size={18} color="#6b7280" />
                        }
                      </Pressable>
                    </View>
                    {confirmPassword.length > 0 && password !== confirmPassword && (
                      <Text className="text-xs text-red-600 font-semibold">
                        ⚠️ Passwords do not match
                      </Text>
                    )}
                  </View>
                )}

                {/* Submit Button */}
                <Pressable
                  onPress={handleSubmit}
                  disabled={loading}
                  style={[styles.submitButton, { opacity: loading ? 0.6 : 1 }]}
                >
                  <Text style={styles.submitButtonText}>
                    {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Sign In"}
                  </Text>
                </Pressable>
              </View>

              {/* Quick Demo Section (Sign In Only) */}
              {!isSignUp && (
                <View className="space-y-2 pt-1">
                  <View className="flex-row items-center gap-2">
                    <View className="h-px flex-1 bg-gray-300" />
                    <Text className="text-xs text-gray-600 font-bold tracking-wider">QUICK DEMO</Text>
                    <View className="h-px flex-1 bg-gray-300" />
                  </View>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleQuickDemo("customer")}
                      disabled={loading}
                      style={styles.demoButton}
                    >
                      <Users size={18} color="#2563eb" />
                      <Text style={styles.demoButtonText}>Customer</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleQuickDemo("business")}
                      disabled={loading}
                      style={styles.demoButton}
                    >
                      <Store size={18} color="#2563eb" />
                      <Text style={styles.demoButtonText}>Business</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleQuickDemo("admin")}
                      disabled={loading}
                      style={styles.demoButtonAdmin}
                    >
                      <Shield size={18} color="#dc2626" />
                      <Text style={styles.demoButtonAdminText}>Admin</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Toggle Sign In/Sign Up Link */}
              <Pressable
                onPress={() => {
                  setIsSignUp(!isSignUp);
                  setName("");
                  setPhone("");
                  setPassword("");
                  setConfirmPassword("");
                }}
                style={styles.toggleButton}
              >
                <Text style={styles.toggleButtonText}>
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </Text>
              </Pressable>
            </CardContent>
          </Card>
        </View>
      </ScrollView>

      {/* Multi-Role Selection Modal */}
      <Modal
        visible={showRoleSelection && loginRoles.length > 1}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRoleSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.roleSelectionModal}>
            <Text style={styles.roleSelectionTitle}>Choose Your Role</Text>
            <Text style={styles.roleSelectionSubtitle}>
              You have access to multiple roles
            </Text>

            <View style={styles.roleSelectionButtonsContainer}>
              {loginRoles.includes('customer') && (
                <Pressable
                  onPress={() => {
                    console.log('[Auth Screen] Selected role: customer → navigating to MyPasses');
                    dispatch(setActiveRole('customer'));
                    setShowRoleSelection(false);
                    navigation.navigate("MyPasses");
                  }}
                  style={styles.roleSelectionButton}
                >
                  <Users size={28} color="#2563eb" />
                  <Text style={styles.roleSelectionButtonText}>Customer</Text>
                  <Text style={styles.roleSelectionButtonDesc}>Browse & purchase</Text>
                </Pressable>
              )}

              {loginRoles.includes('business') && (
                <Pressable
                  onPress={() => {
                    console.log('[Auth Screen] Selected role: business → navigating to MyPasses');
                    dispatch(setActiveRole('business'));
                    setShowRoleSelection(false);
                    navigation.navigate("MyPasses");
                  }}
                  style={styles.roleSelectionButton}
                >
                  <Store size={28} color="#16a34a" />
                  <Text style={styles.roleSelectionButtonText}>Business</Text>
                  <Text style={styles.roleSelectionButtonDesc}>Manage listings</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>

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
                  <Text style={styles.countryCodeInList}>{dialCode(country.code)}</Text>
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
  // eyeButton: {
  //   position: 'absolute',
  //   right: 12,
  //   top: 0,
  //   bottom: 0,
  //   justifyContent: 'center',
  //   paddingHorizontal: 4,
  // },
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
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    bottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    zIndex: 10,
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
  roleSelectionModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  roleSelectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  roleSelectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  roleSelectionButtonsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  roleSelectionButton: {
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  roleSelectionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  roleSelectionButtonDesc: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
});

export default Auth;
