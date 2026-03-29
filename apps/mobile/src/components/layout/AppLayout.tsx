import { ReactNode, useEffect, useRef } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Bell, MessageCircle, User } from "lucide-react-native";
import BottomNav from "./BottomNav";
import BannerAdSlot from "../ads/BannerAdSlot";
import { colors } from "../../theme/colors";
import { useAuth } from "../../hooks/useAuth";
import { useNotifications } from "../../hooks/useNotifications";

const iconImg = require("../../../assets/icon.png");

const AppLayout = ({ children }: { children: ReactNode }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const enterAnim = useRef(new Animated.Value(0)).current;

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

      <View style={styles.adBar}>
        <BannerAdSlot variant="sticky" />
      </View>

      <BottomNav />
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
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
});

export default AppLayout;
