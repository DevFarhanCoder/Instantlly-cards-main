import { useMemo, useState } from "react";
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation, useNavigationState } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Activity,
  BarChart3,
  CalendarDays,
  CreditCard,
  Gift,
  Home,
  LayoutGrid,
  Megaphone,
  Shield,
  ShieldCheck,
  TrendingUp,
} from "lucide-react-native";
import { colors as defaultColors, useColors } from "../../theme/colors";
import { useUserRole } from "../../hooks/useUserRole";
import { useAdminPendingCounts } from "../../hooks/useAdminData";
import { useAppDispatch } from "../../store";
import { setActiveRole } from "../../store/authSlice";
import * as SecureStore from "expo-secure-store";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const customerNav = [
  { route: "Home", icon: Home, label: "Home" },
  { route: "MyCards", icon: CreditCard, label: "My Cards" },
  { route: "Events", icon: CalendarDays, label: "Events" },
  { route: "Vouchers", icon: Gift, label: "Vouchers" },
];

const businessNav = [
  { route: "Home", icon: Home, label: "Home" },
  { route: "BusinessDashboard", icon: BarChart3, label: "Dashboard" },
  { route: "BusinessAnalytics", icon: TrendingUp, label: "Analytics" },
  { route: "Ads", icon: Megaphone, label: "Ads" },
];

const adminNav = [
  { route: "AdminDashboard", icon: Home, label: "Home", badgeKey: null },
  { route: "AdminDashboard", icon: ShieldCheck, label: "Approvals", badgeKey: "totalApprovals", params: { tab: "approvals" } },
  { route: "AdminDashboard", icon: Activity, label: "Activity", badgeKey: null, params: { tab: "activity" } },
  { route: "AdminDashboard", icon: TrendingUp, label: "Growth", badgeKey: null, params: { tab: "growth" } },
];

const customerMoreItems: { route: string; label: string; emoji: string; params?: any }[] = [
  { route: "NearbyBusinesses", label: "Nearby", emoji: "📍" },
  { route: "ChooseListingType", label: "Promote Business", emoji: "🚀" },
  { route: "Profile", label: "Profile", emoji: "👤" },
  { route: "Messaging", label: "Inbox", emoji: "💬" },
  { route: "MyPasses", label: "My Passes", emoji: "🎟️" },
  { route: "MyVouchers", label: "My Vouchers", emoji: "🎁" },
  { route: "Notifications", label: "Notifications", emoji: "🔔" },
  { route: "EditProfile", label: "Settings", emoji: "⚙️" },
  { route: "PaymentMethods", label: "Payments", emoji: "💳" },
  { route: "PrivacySecurity", label: "Privacy", emoji: "🔒" },
  { route: "ReferAndEarn", label: "Refer & Earn", emoji: "🎉" },
  { route: "MyFavourites", label: "My Favourites", emoji: "❤️" },
  { route: "TrackBooking", label: "Track Booking", emoji: "📦" },
  { route: "Support", label: "Support", emoji: "🆘" },
  { route: "LoyaltyPoints", label: "Loyalty Points", emoji: "⭐" },
];

type MoreSection = {
  title: string;
  items: { route: string; label: string; emoji: string; params?: any }[];
};

const adminMoreSections: MoreSection[] = [
  {
    title: "Super Admin",
    items: [
      { route: "AdminDashboard", label: "Full Access", emoji: "🔑" },
      { route: "AdminDashboard", label: "Master Settings", emoji: "🧩", params: { tab: "settings" } },
    ],
  },
  {
    title: "Sub Admin Access",
    items: [
      { route: "AdminDashboard", label: "Sub Admin", emoji: "👤", params: { tab: "users" } },
      { route: "AdminDashboard", label: "Transfer Access", emoji: "🔁", params: { tab: "users" } },
    ],
  },
  {
    title: "Role-Based Access",
    items: [
      { route: "AdminDashboard", label: "Marketing", emoji: "📊", params: { tab: "growth" } },
      { route: "AdminDashboard", label: "Accounts", emoji: "💰", params: { tab: "revenue" } },
      { route: "AdminDashboard", label: "Operations", emoji: "📋", params: { tab: "approvals" } },
      { route: "AdminDashboard", label: "User Mgmt", emoji: "👥", params: { tab: "users" } },
    ],
  },
  {
    title: "Limited Access",
    items: [
      { route: "AdminDashboard", label: "View Only", emoji: "👁️" },
      { route: "AdminDashboard", label: "Moderator", emoji: "📝", params: { tab: "approvals" } },
      { route: "AdminDashboard", label: "Support Agent", emoji: "🎧", params: { tab: "tickets" } },
    ],
  },
  {
    title: "Settings",
    items: [
      { route: "AdminDashboard", label: "Access Settings", emoji: "⚙️", params: { tab: "settings" } },
      { route: "AdminDashboard", label: "Audit Log", emoji: "📜", params: { tab: "activity" } },
    ],
  },
];

const businessMoreSections: MoreSection[] = [
  {
    title: "Content",
    items: [
      { route: "MyCards", label: "My Cards", emoji: "💳" },
      { route: "MyEvents", label: "My Events", emoji: "🎟️" },
      { route: "Events", label: "Events", emoji: "📅" },
      { route: "Vouchers", label: "Vouchers", emoji: "🎫" },
      { route: "AdDashboard", label: "Ad Reports", emoji: "📣" },
    ],
  },
  {
    title: "Growth & Marketing",
    items: [
      { route: "Subscription", label: "Subscription", emoji: "🧾" },
      { route: "ChooseListingType", label: "Promote", emoji: "🚀" },
      { route: "ReferAndEarn", label: "Refer & Earn", emoji: "🎉" },
    ],
  },
  {
    title: "Account",
    items: [
      { route: "Profile", label: "Profile", emoji: "👤" },
      { route: "Messaging", label: "Inbox", emoji: "💬" },
      { route: "Notifications", label: "Notifications", emoji: "🔔" },
      { route: "EditProfile", label: "Settings", emoji: "⚙️" },
      { route: "Support", label: "Support", emoji: "🆘" },
    ],
  },
];

const BottomNav = () => {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const currentRoute = useNavigationState(
    (state) => state.routes[state.index]
  ) as any;
  const { isBusiness, isAdmin, roles, activeRole, hasBusinessRole } = useUserRole();
  const dispatch = useAppDispatch();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: pendingCounts } = useAdminPendingCounts();
  const insets = useSafeAreaInsets();

  const canSwitchRole = roles.length > 1 && !isAdmin;

  const handleRoleSwitch = async (role: string) => {
    dispatch(setActiveRole(role));
    await SecureStore.setItemAsync('activeRole', role);
    setMoreOpen(false);
    navigation.navigate(role === 'business' ? 'BusinessDashboard' : 'Home');
  };

  const totalPending = useMemo(() => {
    if (!isAdmin || !pendingCounts) return 0;
    return Object.values(pendingCounts).reduce((sum, v) => sum + v, 0);
  }, [isAdmin, pendingCounts]);

  const totalApprovals = useMemo(() => {
    if (!isAdmin || !pendingCounts) return 0;
    return (
      (pendingCounts.pendingCards || 0) +
      (pendingCounts.pendingEvents || 0) +
      (pendingCounts.pendingAds || 0) +
      (pendingCounts.pendingVouchers || 0)
    );
  }, [isAdmin, pendingCounts]);

  if (isAdmin) {
    return (
      <>
        <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 6) }]}>
          <View style={styles.navRow}>
            {adminNav.map((item) => {
              const Icon = item.icon;
              const badgeCount =
                item.badgeKey === "totalApprovals" ? totalApprovals : 0;
              const isActive =
                currentRoute?.name === item.route &&
                (item.params?.tab
                  ? currentRoute?.params?.tab === item.params.tab
                  : !currentRoute?.params?.tab);
              return (
                <Pressable
                  key={item.label}
                  onPress={() =>
                    navigation.navigate(item.route, item.params ?? undefined)
                  }
                  style={styles.navItem}
                >
                  <View style={styles.iconWrap}>
                    <Icon
                      size={20}
                      color={isActive ? colors.primary : colors.mutedForeground}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {badgeCount > 0 && (
                      <View style={styles.badgeDot}>
                        <Text style={styles.badgeDotText}>
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.navLabel,
                      isActive && styles.navLabelActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => setMoreOpen(true)}
              style={styles.navItem}
            >
              <View style={styles.iconWrap}>
                <LayoutGrid
                  size={20}
                  color={colors.mutedForeground}
                  strokeWidth={2}
                />
                {totalPending > 0 && <View style={styles.pendingDot} />}
              </View>
              <Text style={styles.navLabel}>More</Text>
            </Pressable>
          </View>
        </View>

        <Modal
          transparent
          animationType="slide"
          visible={moreOpen}
          onRequestClose={() => setMoreOpen(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setMoreOpen(false)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Admin Access</Text>
            <ScrollView contentContainerStyle={styles.sheetContent}>
              {adminMoreSections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.grid3}>
                    {section.items.map((item) => (
                      <Pressable
                        key={item.label + item.route}
                        onPress={() => {
                          setMoreOpen(false);
                          navigation.navigate(item.route, item.params ?? undefined);
                        }}
                        style={[styles.gridItem, styles.gridItem3]}
                      >
                        <Text style={styles.gridEmoji}>{item.emoji}</Text>
                        <Text style={styles.gridLabel}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </Modal>
      </>
    );
  }

  const navItems = isBusiness ? businessNav : customerNav;

  return (
    <>
      <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 6) }]}>
        <View style={styles.navRow}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute?.name === item.route;
            return (
              <Pressable
                key={item.label}
                onPress={() => navigation.navigate(item.route)}
                style={styles.navItem}
              >
                <Icon
                  size={20}
                  color={isActive ? colors.primary : colors.mutedForeground}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <Text
                  style={[
                    styles.navLabel,
                    isActive && styles.navLabelActive,
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setMoreOpen(true)} style={styles.navItem}>
            <LayoutGrid
              size={20}
              color={colors.mutedForeground}
              strokeWidth={2}
            />
            <Text style={styles.navLabel}>More</Text>
          </Pressable>
        </View>
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={moreOpen}
        onRequestClose={() => setMoreOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setMoreOpen(false)} />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {isBusiness ? "Business Tools" : "More Options"}
          </Text>
          <ScrollView contentContainerStyle={styles.sheetContent}>
            {canSwitchRole && (
              <View style={styles.roleSwitchRow}>
                <Pressable
                  onPress={() => handleRoleSwitch('customer')}
                  style={[styles.roleSwitchBtn, !isBusiness && styles.roleSwitchBtnActive]}
                >
                  <Text style={[styles.roleSwitchText, !isBusiness && styles.roleSwitchTextActive]}>
                    👤 Customer
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleRoleSwitch('business')}
                  style={[styles.roleSwitchBtn, isBusiness && styles.roleSwitchBtnActive]}
                >
                  <Text style={[styles.roleSwitchText, isBusiness && styles.roleSwitchTextActive]}>
                    💼 Business
                  </Text>
                </Pressable>
              </View>
            )}
            {isBusiness ? (
              businessMoreSections.map((section) => (
                <View key={section.title} style={styles.section}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <View style={styles.grid4}>
                    {section.items.map((item) => (
                      <Pressable
                        key={item.label + item.route}
                        onPress={() => {
                          setMoreOpen(false);
                          navigation.navigate(item.route, item.params ?? undefined);
                        }}
                        style={[styles.gridItem, styles.gridItem4]}
                      >
                        <Text style={styles.gridEmoji}>{item.emoji}</Text>
                        <Text style={styles.gridLabel}>{item.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.grid4}>
                {customerMoreItems.map((item) => (
                  <Pressable
                    key={item.label + item.route}
                    onPress={() => {
                      setMoreOpen(false);
                      navigation.navigate(item.route, item.params ?? undefined);
                    }}
                    style={[styles.gridItem, styles.gridItem4]}
                  >
                    <Text style={styles.gridEmoji}>{item.emoji}</Text>
                    <Text style={styles.gridLabel}>{item.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const makeStyles = (colors: typeof defaultColors) => StyleSheet.create({
  nav: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: Platform.OS === "ios" ? 8 : 6,
    paddingHorizontal: SCREEN_WIDTH > 400 ? 12 : 8,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    gap: SCREEN_WIDTH > 400 ? 4 : 3,
    paddingVertical: SCREEN_WIDTH > 400 ? 6 : 4,
    paddingHorizontal: SCREEN_WIDTH > 400 ? 10 : 6,
    minWidth: SCREEN_WIDTH > 400 ? 60 : 50,
  },
  navLabel: {
    fontSize: SCREEN_WIDTH > 400 ? 11 : 10,
    fontWeight: "600",
    color: colors.mutedForeground,
    textAlign: "center",
  },
  navLabelActive: {
    color: colors.primary,
  },
  iconWrap: {
    position: "relative",
  },
  badgeDot: {
    position: "absolute",
    right: -8,
    top: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeDotText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.destructiveForeground,
  },
  pendingDot: {
    position: "absolute",
    right: -6,
    top: -6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.destructive,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: "85%",
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sheetHandle: {
    width: 40,
    height: 5,
    borderRadius: 999,
    alignSelf: "center",
    backgroundColor: colors.muted,
    marginBottom: 8,
  },
  sheetTitle: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    marginBottom: 12,
  },
  sheetContent: {
    paddingBottom: 24,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  grid3: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SCREEN_WIDTH > 400 ? 12 : 8,
    justifyContent: "flex-start",
  },
  grid4: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SCREEN_WIDTH > 400 ? 12 : 8,
    justifyContent: "flex-start",
  },
  gridItem: {
    backgroundColor: colors.muted,
    borderRadius: 12,
    paddingVertical: SCREEN_WIDTH > 400 ? 14 : 12,
    paddingHorizontal: SCREEN_WIDTH > 400 ? 12 : 8,
    alignItems: "center",
    minHeight: SCREEN_WIDTH > 400 ? 80 : 75,
    justifyContent: "center",
  },
  gridItem3: {
    width: SCREEN_WIDTH > 400 
      ? Math.floor((SCREEN_WIDTH - 56) / 3) 
      : Math.floor((SCREEN_WIDTH - 48) / 3),
  },
  gridItem4: {
    width: SCREEN_WIDTH > 400 
      ? Math.floor((SCREEN_WIDTH - 68) / 4) 
      : Math.floor((SCREEN_WIDTH - 56) / 4),
  },
  gridEmoji: {
    fontSize: SCREEN_WIDTH > 400 ? 24 : 20,
    marginBottom: 6,
  },
  gridLabel: {
    fontSize: SCREEN_WIDTH > 400 ? 11 : 10,
    fontWeight: "600",
    color: colors.foreground,
    textAlign: "center",
  },
  roleSwitchRow: {
    flexDirection: "row",
    borderRadius: 12,
    backgroundColor: colors.muted,
    padding: 4,
    marginBottom: 16,
  },
  roleSwitchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  roleSwitchBtnActive: {
    backgroundColor: colors.primary,
  },
  roleSwitchText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.mutedForeground,
  },
  roleSwitchTextActive: {
    color: "#ffffff",
  },
});

export default BottomNav;
