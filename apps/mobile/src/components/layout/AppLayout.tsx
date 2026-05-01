import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Bell, MessageCircle, QrCode, Send, User } from "lucide-react-native";
import BottomNav from "./BottomNav";
import BannerAdSlot from "../ads/BannerAdSlot";
import { colors as defaultColors, useColors } from "../../theme/colors";
import { useAuth } from "../../hooks/useAuth";
import { useUserRole } from "../../hooks/useUserRole";
import { useNotifications } from "../../hooks/useNotifications";
import { FEATURES } from "../../lib/featureFlags";
import BulkSendModal from "../BulkSendModal";
import { useGetConversationsQuery, useGetGroupsQuery } from "../../store/api/chatApi";

const iconImg = require("../../../assets/icon.png");

const AppLayout = ({
  children,
  headerOnly,
  hideAdBar,
}: {
  children: ReactNode;
  headerOnly?: boolean;
  hideAdBar?: boolean;
}) => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { width } = useWindowDimensions();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { user } = useAuth();
  const { activeRole } = useUserRole();
  const { unreadCount } = useNotifications();
  const { data: conversations = [] } = useGetConversationsQuery(undefined, {
    skip: !user,
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  const { data: groups = [] } = useGetGroupsQuery(undefined, {
    skip: !user,
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });
  const chatUnreadCount = conversations
    .filter((c) => !c.isGroup)
    .reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  const groupUnreadCount = groups.reduce((sum, g) => sum + (g.unreadCount || 0), 0);
  const combinedUnreadCount = (unreadCount || 0) + chatUnreadCount + groupUnreadCount;
  const combinedUnreadLabel = combinedUnreadCount > 99 ? "99+" : String(combinedUnreadCount);
  const chatUnreadLabel = (chatUnreadCount + groupUnreadCount) > 99 ? "99+" : String(chatUnreadCount + groupUnreadCount);
  const enterAnim = useRef(new Animated.Value(0)).current;
  const [showBulkSend, setShowBulkSend] = useState(false);
  const compactHeader = width < 390;
  const isBusinessRole = Boolean(user && activeRole === "business");
  const denseHeader = compactHeader || (isBusinessRole && width < 440);
  const narrowBusinessHeader = isBusinessRole && width < 390;
  const effectiveHideAdBar = Boolean(hideAdBar || route?.params?.hideAdBar);

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
      <View style={[styles.header, compactHeader && styles.headerCompact, denseHeader && styles.headerDense]}>
        <View style={styles.brandCol}>
          <Pressable
            style={styles.brand}
            onPress={() => navigation.navigate("Home")}
          >
            <Image source={iconImg} style={[styles.logo, denseHeader && styles.logoDense]} />
            <Text
              style={[
                styles.brandText,
                compactHeader && styles.brandTextCompact,
                denseHeader && styles.brandTextDense,
                narrowBusinessHeader && styles.brandTextNarrowBusiness,
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
            >
              <Text style={styles.brandDark}>Instant</Text>
              <Text style={styles.brandBlue}>lly</Text>
              <Text style={styles.brandDark}> Cards</Text>
            </Text>
            {isBusinessRole && (
              <View
                style={[
                  styles.roleBadgeBusiness,
                  compactHeader && styles.roleBadgeBusinessCompact,
                  denseHeader && styles.roleBadgeBusinessDense,
                  narrowBusinessHeader && styles.roleBadgeBusinessNarrow,
                  styles.roleBadgeNearBrand,
                ]}
              >
                <View style={styles.roleDotBusiness} />
                <Text style={[styles.roleBadgeTextBusiness, compactHeader && styles.roleBadgeTextBusinessCompact]}>
                  BUSINESS
                </Text>
              </View>
            )}
          </Pressable>
        </View>
        <View
          style={[
            styles.headerActions,
            compactHeader && styles.headerActionsCompact,
            denseHeader && styles.headerActionsDense,
            narrowBusinessHeader && styles.headerActionsNarrowBusiness,
          ]}
        >
          <Pressable
            onPress={() => navigation.navigate("Notifications")}
            style={[
              styles.iconButton,
              compactHeader && styles.iconButtonCompact,
              denseHeader && styles.iconButtonDense,
              narrowBusinessHeader && styles.iconButtonNarrowBusiness,
            ]}
          >
            <Bell size={20} color={colors.foreground} />
            {combinedUnreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {combinedUnreadLabel}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("UnifiedScanner")}
            style={[
              styles.iconButton,
              compactHeader && styles.iconButtonCompact,
              denseHeader && styles.iconButtonDense,
              narrowBusinessHeader && styles.iconButtonNarrowBusiness,
            ]}
          >
            <QrCode size={20} color={colors.foreground} />
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate("Messaging")}
            style={[
              styles.iconButton,
              compactHeader && styles.iconButtonCompact,
              denseHeader && styles.iconButtonDense,
              narrowBusinessHeader && styles.iconButtonNarrowBusiness,
            ]}
          >
            <MessageCircle size={20} color={colors.foreground} />
            {chatUnreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {chatUnreadLabel}
                </Text>
              </View>
            )}
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate(user ? "Profile" : "Auth")}
            style={[
              styles.iconButton,
              compactHeader && styles.iconButtonCompact,
              denseHeader && styles.iconButtonDense,
              narrowBusinessHeader && styles.iconButtonNarrowBusiness,
            ]}
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
          {!effectiveHideAdBar && (
            <View style={styles.adBar}>
              <BannerAdSlot variant="sticky" />
            </View>
          )}

          <BottomNav />

          {/* Floating Bulk Send FAB ΓÇö above banner ad + bottom nav */}
          {FEATURES.BULK_SEND && (
            <Pressable
              onPress={() => setShowBulkSend(true)}
              style={[styles.fab, { bottom: effectiveHideAdBar ? 115 : 175 }]}
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

const makeStyles = (colors: typeof defaultColors) =>
  StyleSheet.create({
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
  headerCompact: {
    paddingHorizontal: 10,
  },
  headerDense: {
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  brandCol: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    gap: 4,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
    minWidth: 0,
  },
  logo: {
    height: 28,
    width: 28,
    borderRadius: 6,
  },
  logoDense: {
    height: 24,
    width: 24,
  },
  brandText: {
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  brandTextCompact: {
    fontSize: 14,
  },
  brandTextDense: {
    fontSize: 14,
  },
  brandTextNarrowBusiness: {
    fontSize: 13,
  },
  brandDark: {
    color: colors.foreground,
  },
  brandBlue: {
    color: "#2bb8e4",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
    marginLeft: 8,
  },
  headerActionsCompact: {
    gap: 4,
    marginLeft: 6,
  },
  headerActionsDense: {
    gap: 4,
    marginLeft: 6,
  },
  headerActionsNarrowBusiness: {
    gap: 3,
    marginLeft: 4,
  },
  iconButton: {
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonCompact: {
    height: 36,
    width: 36,
    borderRadius: 18,
  },
  iconButtonDense: {
    height: 34,
    width: 34,
    borderRadius: 17,
  },
  iconButtonNarrowBusiness: {
    height: 32,
    width: 32,
    borderRadius: 16,
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
  roleBadgeBusiness: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 4,
    marginLeft: 8,
    marginRight: 4,
    borderWidth: 1,
    borderColor: "#2563eb",
    backgroundColor: "transparent",
    flexShrink: 1,
  },
  roleBadgeBusinessCompact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 3,
    marginLeft: 4,
    marginRight: 2,
  },
  roleBadgeBusinessDense: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 3,
    marginLeft: 1,
    marginRight: 1,
  },
  roleBadgeNearBrand: {
    marginLeft: 8,
    marginRight: 0,
    flexShrink: 0,
  },
  roleBadgeBusinessNarrow: {
    paddingHorizontal: 3,
    paddingVertical: 2,
    marginLeft: 5,
  },
  roleDotBusiness: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#2563eb",
  },
  roleBadgeTextBusiness: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#2563eb",
  },
  roleBadgeTextBusinessCompact: {
    fontSize: 7,
    letterSpacing: 0.3,
  },
  });

export default AppLayout;
