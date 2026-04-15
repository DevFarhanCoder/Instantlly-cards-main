import { ReactNode, useEffect, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Bell, MessageCircle, Send, User } from "lucide-react-native";
import BottomNav from "./BottomNav";
import BannerAdSlot from "../ads/BannerAdSlot";
import { colors } from "../../theme/colors";
import { useAuth } from "../../hooks/useAuth";
import { useUserRole } from "../../hooks/useUserRole";
import { useNotifications } from "../../hooks/useNotifications";
import { FEATURES } from "../../lib/featureFlags";
import BulkSendModal from "../BulkSendModal";

const iconImg = require("../../../assets/icon.png");

const AppLayout = ({ children, headerOnly }: { children: ReactNode; headerOnly?: boolean }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { activeRole } = useUserRole();
  const { unreadCount } = useNotifications();
  const enterAnim = useRef(new Animated.Value(0)).current;
  const [showBulkSend, setShowBulkSend] = useState(false);

  useEffect(() => {
    enterAnim.setValue(0);
    Animated.timing(enterAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [enterAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.brandCol}>
          <Pressable
            style={styles.brand}
            onPress={() => navigation.navigate("Home")}
          >
            <Image source={iconImg} style={styles.logo} />
            <Text style={styles.brandText}>
              <Text style={styles.brandDark}>Instant</Text>
              <Text style={styles.brandBlue}>lly</Text>
              <Text style={styles.brandDark}> Cards</Text>
            </Text>
          </Pressable>
          {user && activeRole && (
            <View style={[styles.roleBadge, activeRole === 'business' ? styles.roleBadgeBusiness : styles.roleBadgeCustomer]}>
              <View style={[styles.roleDot, activeRole === 'business' ? styles.roleDotBusiness : styles.roleDotCustomer]} />
              <Text style={[styles.roleBadgeText, activeRole === 'business' ? styles.roleBadgeTextBusiness : styles.roleBadgeTextCustomer]}>
                {activeRole === 'business' ? 'Business' : 'Customer'}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => navigation.navigate("Notifications")}
            style={styles.iconButton}
          >
            <Bell size={20} color={colors.foreground} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Messaging")}
            style={styles.iconButton}
          >
            <MessageCircle size={20} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate(user ? "Profile" : "Auth")}
            style={styles.iconButton}
          >
            {user?.email ? (
              <Text style={styles.avatarText}>
                {user.email.substring(0, 2).toUpperCase()}
              </Text>
            ) : (
              <User size={20} color={colors.foreground} />
            )}
          </Pressable>
        </View>
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: enterAnim,
            transform: [
              {
                translateY: enterAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, 0],
                }),
              },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>

      {!headerOnly && (
        <>
          <View style={styles.adBar}>
            <BannerAdSlot variant="sticky" />
          </View>

          <BottomNav />

          {/* Floating Bulk Send FAB — above banner ad + bottom nav */}
          {FEATURES.BULK_SEND && (
            <Pressable
              onPress={() => setShowBulkSend(true)}
              style={[styles.fab, { bottom: 175 }]}
            >
              <Send size={20} color="#fff" />
              <Text style={styles.fabLabel}>Bulk Send</Text>
            </Pressable>
          )}

          {FEATURES.BULK_SEND && (
            <BulkSendModal open={showBulkSend} onClose={() => setShowBulkSend(false)} />
          )}
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandCol: {
    flexDirection: "column",
    gap: 4,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logo: {
    height: 28,
    width: 28,
    borderRadius: 6,
  },
  brandText: {
    fontSize: 16,
    fontWeight: "700",
  },
  brandDark: {
    color: "#1a2b4a",
  },
  brandBlue: {
    color: "#2bb8e4",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    position: "absolute",
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    zIndex: 100,
  },
  fabLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.primary,
  },
  badge: {
    position: "absolute",
    right: -2,
    top: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.destructive,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.destructiveForeground,
  },
  content: {
    flex: 1,
    paddingBottom: 0,
  },
  adBar: {
    // Full-bleed: no padding so ad images span edge-to-edge
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginLeft: 34,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 5,
    borderWidth: 1,
  },
  roleBadgeBusiness: {
    backgroundColor: "rgba(43, 184, 228, 0.12)",
    borderColor: "rgba(43, 184, 228, 0.35)",
  },
  roleBadgeCustomer: {
    backgroundColor: "rgba(107, 114, 128, 0.10)",
    borderColor: "rgba(107, 114, 128, 0.25)",
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleDotBusiness: {
    backgroundColor: "#2bb8e4",
  },
  roleDotCustomer: {
    backgroundColor: "#6b7280",
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  roleBadgeTextBusiness: {
    color: "#1a8fb5",
  },
  roleBadgeTextCustomer: {
    color: "#4b5563",
  },
});

export default AppLayout;
