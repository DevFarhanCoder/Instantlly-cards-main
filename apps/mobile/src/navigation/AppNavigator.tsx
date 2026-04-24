import { useEffect, useRef } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import * as ExpoNotifications from "expo-notifications";
import { useDeferredGroupJoin } from "../hooks/useDeferredGroupJoin";
import { checkInstallReferrer } from "../utils/deferredGroupJoin";
import { captureInitialReferralIfPresent, captureInstallReferralIfPresent } from "../utils/referral";
import { socketService } from "../services/socketService";
import { useAuth } from "../hooks/useAuth";
import { store } from "../store";
import { businessCardsApi } from "../store/api/businessCardsApi";
import { chatApi } from "../store/api/chatApi";
import { baseApi } from "../store/api/baseApi";

// Show notifications even when app is in the foreground
ExpoNotifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Ref used to navigate from outside the React tree (notification tap handler)
export const navigationRef = createNavigationContainerRef<RootStackParamList>();
import Index from "../screens/Index";
import MyCards from "../screens/MyCards";
import Messaging from "../screens/Messaging";
import MyVouchers from "../screens/MyVouchers";
import Vouchers from "../screens/Vouchers";
import VoucherDetail from "../screens/VoucherDetail";
import PlaceholderScreen from "../screens/PlaceholderScreen";
import Profile from "../screens/Profile";
import EditProfile from "../screens/EditProfile";
import PaymentMethods from "../screens/PaymentMethods";
import PrivacySecurity from "../screens/PrivacySecurity";
import ReferAndEarn from "../screens/ReferAndEarn";
import ReferralHistory from "../screens/ReferralHistory";
import EarningsHistory from "../screens/EarningsHistory";
import PerReferralInfo from "../screens/PerReferralInfo";
import Ads from "../screens/Ads";
import AdCreate from "../screens/AdCreate";
import AdDashboard from "../screens/AdDashboard";
import BusinessDetail from "../screens/BusinessDetail";
import CategoryDetail from "../screens/CategoryDetail";
import SubcategoryDetail from "../screens/SubcategoryDetail";
import NearbyBusinesses from "../screens/NearbyBusinesses";
import BusinessDashboard from "../screens/BusinessDashboard";
import BusinessAnalytics from "../screens/BusinessAnalytics";
import BusinessSelectorScreen from "../screens/BusinessSelectorScreen";
import AdminDashboard from "../screens/AdminDashboard";
import Auth from "../screens/Auth";
import ForgotPasswordPhone from "../screens/ForgotPasswordPhone";
import ForgotPasswordOTP from "../screens/ForgotPasswordOTP";
import ForgotPasswordReset from "../screens/ForgotPasswordReset";
import Dashboard from "../screens/Dashboard";
import Notifications from "../screens/Notifications";
import Support from "../screens/Support";
import Subscription from "../screens/Subscription";
import LoyaltyPoints from "../screens/LoyaltyPoints";
import CreditsScreen from "../screens/Credits";
import TransferCreditsScreen from "../screens/TransferCredits";
import CreditsHistoryScreen from "../screens/referral/CreditsHistory";
import SendCreditsScreen from "../screens/SendCredits";
import Events from "../screens/Events";
import EventDetail from "../screens/EventDetail";
import EventCreate from "../screens/EventCreate";
import EventScanner from "../screens/EventScanner";
import CardCreate from "../screens/CardCreate";
import BusinessPromotionForm from "../screens/BusinessPromotionForm";
import PremiumPlanSelection from "../screens/PremiumPlanSelection";
import FreePlanConfirmation from "../screens/FreePlanConfirmation";
import ChooseListingType from "../screens/ChooseListingType";
import PublicCard from "../screens/PublicCard";
import MyPasses from "../screens/MyPasses";
import MyFavourites from "../screens/MyFavourites";
import TrackBooking from "../screens/TrackBooking";
import BookingDetail from "../screens/BookingDetail";
import EventEdit from "../screens/EventEdit";
import EventRegistrations from "../screens/EventRegistrations";
import PassDetail from "../screens/PassDetail";
import VoucherCreate from "../screens/VoucherCreate";
import AdminAdDetail from "../screens/AdminAdDetail";
import GroupChat from "../screens/GroupChat";
import GroupJoin from "../screens/GroupJoin";
import AppLayout from "../components/layout/AppLayout";
import type { RootStackParamList } from "./routes";

const Stack = createNativeStackNavigator<RootStackParamList>();

// ─── Helpers ─────────────────────────────────────────────────────────────────
// withLayout wraps a screen in AppLayout (header + bottom nav).
// All wrapped components are defined at module level so their reference is
// stable across re-renders. If they were defined inside AppNavigator's JSX,
// React Navigation would see a new component identity on every parent render
// and unmount + remount the active screen — causing the "loads twice" bug.

const withLayout = (Screen: any) => (props: any) => (
  <AppLayout>
    <Screen {...props} />
  </AppLayout>
);

const placeholder = (title: string) => (props: any) => (
  <AppLayout>
    <PlaceholderScreen
      title={title}
      subtitle={
        props?.route?.params?.tab ? `Tab: ${props.route.params.tab}` : undefined
      }
    />
  </AppLayout>
);

const plainPlaceholder = (title: string) => (props: any) => (
  <PlaceholderScreen
    title={title}
    subtitle={
      props?.route?.params?.tab ? `Tab: ${props.route.params.tab}` : undefined
    }
  />
);

// ─── Stable screen components (module-level) ─────────────────────────────────
const HomeScreen           = withLayout(Index);
const MyCardsScreen        = withLayout(MyCards);
const CardCreateScreen     = withLayout(CardCreate);
const BusinessPromotionFormScreen = withLayout(BusinessPromotionForm);
const PremiumPlanSelectionScreen = withLayout(PremiumPlanSelection);
const FreePlanConfirmationScreen = withLayout(FreePlanConfirmation);
const BusinessDetailScreen = withLayout(BusinessDetail);
const CategoryDetailScreen = withLayout(CategoryDetail);
const SubcategoryDetailScreen = withLayout(SubcategoryDetail);
const MessagingScreen      = withLayout(Messaging);
const VouchersScreen       = withLayout(Vouchers);
const VoucherDetailScreen  = withLayout(VoucherDetail);
const MyVouchersScreen     = withLayout(MyVouchers);
const AdsScreen            = withLayout(Ads);
const AdCreateScreen       = withLayout(AdCreate);
const AdDashboardScreen    = withLayout(AdDashboard);
const EventsScreen         = withLayout(Events);
const EventDetailScreen    = withLayout(EventDetail);
const EventScannerScreen   = withLayout(EventScanner);
const EventCreateScreen    = withLayout(EventCreate);
const VoucherCreateScreen  = withLayout(VoucherCreate);
const PublicCardScreen     = withLayout(PublicCard);
const MyPassesScreen       = withLayout(MyPasses);
const ProfileScreen        = withLayout(Profile);
const ChooseListingScreen  = withLayout(ChooseListingType);
const DashboardScreen      = withLayout(Dashboard);
const BusinessAnalyticsScreen = withLayout(BusinessAnalytics);
const SubscriptionScreen   = withLayout(Subscription);
const NotificationsScreen  = withLayout(Notifications);
const BusinessDashboardScreen = withLayout(BusinessDashboard);
const BusinessSelectorWrapped = withLayout(BusinessSelectorScreen);
const AdminDashboardScreen = withLayout(AdminDashboard);
const EditProfileScreen    = withLayout(EditProfile);
const PaymentMethodsScreen = withLayout(PaymentMethods);
const PrivacySecurityScreen = withLayout(PrivacySecurity);
const ReferAndEarnScreen   = withLayout(ReferAndEarn);
const ReferralHistoryScreen = withLayout(ReferralHistory);
const EarningsHistoryScreen = withLayout(EarningsHistory);
const PerReferralInfoScreen = withLayout(PerReferralInfo);
const MyFavouritesScreen   = withLayout(MyFavourites);
const TrackBookingScreen   = withLayout(TrackBooking);
const BookingDetailScreen  = withLayout(BookingDetail);
const EventEditScreen      = withLayout(EventEdit);
const EventRegistrationsScreen = withLayout(EventRegistrations);
const PassDetailScreen = withLayout(PassDetail);
const SupportScreen        = withLayout(Support);
const NearbyBusinessesScreen = withLayout(NearbyBusinesses);
const LoyaltyPointsScreen  = withLayout(LoyaltyPoints);
const CreditsScreenWrapped = withLayout(CreditsScreen);
const TransferCreditsWrapped = withLayout(TransferCreditsScreen);
const CreditsHistoryWrapped = withLayout(CreditsHistoryScreen);
const SendCreditsWrapped = withLayout(SendCreditsScreen);
const AdminAdDetailScreen  = (props: any) => <AdminAdDetail {...props} />;
const GroupChatScreen      = (props: any) => <AppLayout headerOnly><GroupChat {...props} /></AppLayout>;
const NotFoundScreen       = plainPlaceholder("Not Found");

// ─── Deep link config ────────────────────────────────────────────────────────
const linking = {
  prefixes: ['instantllycards://'],
  config: {
    screens: {
      // instantllycards://join?code=XXXX
      GroupJoin: { path: 'join' },
      // instantllycards://signup?utm_campaign=ABC123XY → Auth screen, referral code as route param
      Auth: 'signup',
    },
  },
};

// ─── Navigator ────────────────────────────────────────────────────────────────
const AppNavigator = () => {
  const { user } = useAuth();

  // On first launch after Play Store install, read the referrer and save any
  // pending group join code to AsyncStorage.
  useEffect(() => {
    checkInstallReferrer();
    captureInitialReferralIfPresent();
    captureInstallReferralIfPresent();
  }, []);

  // After the user logs in / signs up, process any deferred join code.
  useDeferredGroupJoin();

  // Connect socket when logged in; disconnect on logout.
  // Also ensure notification permission is granted so group message notifications work.
  useEffect(() => {
    if (!user) {
      socketService.disconnect();
      return;
    }
    socketService.connect().catch(() => { /* silent — polling is the fallback */ });

    // Request notification permission if not already granted
    ExpoNotifications.getPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        ExpoNotifications.requestPermissionsAsync();
      }
    });

    return () => { socketService.disconnect(); };
  }, [user?.id]);

  // Listen for group message notifications and fire a local notification
  // when the user is NOT currently viewing that group's chat screen.
  useEffect(() => {
    const handler = async (data: {
      groupId: number;
      groupName: string;
      senderName: string;
      content: string;
      messageType: string;
    }) => {
      // Don't notify if the user is already in this group's chat
      const currentRoute = navigationRef.getCurrentRoute();
      if (
        currentRoute?.name === 'GroupChat' &&
        (currentRoute.params as any)?.groupId === data.groupId
      ) return;

      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;

      const isCard = data.messageType === 'card' || (() => {
        try { const p = JSON.parse(data.content); return !!p?.full_name; } catch { return false; }
      })();
      const body = isCard
        ? `${data.senderName} shared a business card`
        : data.content.length > 60 ? `${data.content.slice(0, 60)}…` : data.content;

      await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: `${data.groupName}`,
          body: `${data.senderName}: ${body}`,
          data: { screen: 'GroupChat', groupId: data.groupId, groupName: data.groupName },
        },
        trigger: null,
      });

      // Refresh the groups list so the last-message preview updates
      store.dispatch(chatApi.util.invalidateTags(['Group', 'Notification']));
    };

    socketService.on('group:notification', handler);
    return () => { socketService.off('group:notification', handler); };
  }, []);

  // Show in-app banner when a 1:1 DM arrives while the app is foregrounded but NOT in that chat.
  useEffect(() => {
    const handler = async (data: {
      chatId: number;
      message: { senderName?: string; sender?: { name?: string }; content: string; messageType?: string };
    }) => {
      // Don't notify if the user is already viewing this chat
      const currentRoute = navigationRef.getCurrentRoute();
      if (
        currentRoute?.name === 'Messaging' &&
        (currentRoute.params as any)?.chatId === data.chatId
      ) return;

      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;

      const msg = data.message;
      const senderName = msg.senderName ?? msg.sender?.name ?? 'New Message';
      const isCard = msg.messageType === 'card' || (() => {
        try { const p = JSON.parse(msg.content); return !!p?.full_name; } catch { return false; }
      })();
      const body = isCard
        ? 'Shared a business card'
        : msg.content.length > 60 ? `${msg.content.slice(0, 60)}…` : msg.content;

      await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: senderName,
          body,
          data: { screen: 'Chat', chatId: data.chatId },
        },
        trigger: null,
      });

      // Refresh conversation list + notification bell
      store.dispatch(chatApi.util.invalidateTags(['Chat', 'Notification']));
    };

    socketService.on('chat:notification', handler);
    return () => { socketService.off('chat:notification', handler); };
  }, []);

  // When a new member joins a group, show a local notification and refresh groups list.
  useEffect(() => {
    const handler = async (data: any) => {
      store.dispatch(chatApi.util.invalidateTags(['Group']));

      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;

      const title = data.isJoiner
        ? `Welcome to ${data.groupName}! 🎉`
        : `${data.groupName}`;
      const joinedText = data.joinedViaLink
        ? `${data.joinerName} joined via invite link.`
        : `${data.joinerName} joined the group.`;
      const body = data.isJoiner
        ? `You've joined "${data.groupName}". Say hello to the group!`
        : joinedText;

      await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { screen: 'GroupChat', groupId: data.groupId, groupName: data.groupName },
        },
        trigger: null,
      });
    };

    socketService.on('group:member_joined', handler);
    return () => { socketService.off('group:member_joined', handler); };
  }, []);

  // When a returning member opens the join link again, show "Welcome back" notification.
  useEffect(() => {
    const handler = async (data: any) => {
      store.dispatch(chatApi.util.invalidateTags(['Group']));

      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;

      await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: `Welcome back! 👋`,
          body: `You're already part of "${data.groupName}". Tap to open the chat.`,
          data: { screen: 'GroupChat', groupId: data.groupId, groupName: data.groupName },
        },
        trigger: null,
      });
    };

    socketService.on('group:welcome_back', handler);
    return () => { socketService.off('group:welcome_back', handler); };
  }, []);

  // ─── Welcome / Welcome back notifications on signup/login ────────────
  useEffect(() => {
    const onWelcome = async (data: any) => {
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: data.title, body: data.body, data: {} },
        trigger: null,
      });
    };
    const onWelcomeBack = async (data: any) => {
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: data.title, body: data.body, data: {} },
        trigger: null,
      });
    };
    socketService.on('welcome', onWelcome);
    socketService.on('welcome_back', onWelcomeBack);
    return () => { socketService.off('welcome', onWelcome); socketService.off('welcome_back', onWelcomeBack); };
  }, []);

  // When a card is shared TO this user, instantly refresh the Sent/Received list.
  useEffect(() => {
    const handler = async (data: any) => {
      store.dispatch(businessCardsApi.util.invalidateTags(['SharedCard']));

      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;

      await ExpoNotifications.scheduleNotificationAsync({
        content: {
          title: 'New Business Card',
          body: `${data.sender_name ?? 'Someone'} shared their card with you`,
          data: { screen: 'Messaging', tab: 'Received' },
        },
        trigger: null,
      });
    };
    socketService.on('card:shared', handler);
    return () => { socketService.off('card:shared', handler); };
  }, []);

  // ─── Booking notifications ───────────────────────────────────────────
  useEffect(() => {
    const onCreated = async (data: any) => {
      store.dispatch(baseApi.util.invalidateTags(['Booking']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: 'New Booking', body: `${data.customerName ?? 'A customer'} booked ${data.businessName ?? 'your service'}`, data: { screen: 'Bookings' } },
        trigger: null,
      });
    };
    const onUpdated = async (data: any) => {
      store.dispatch(baseApi.util.invalidateTags(['Booking']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: 'Booking Updated', body: `Your booking has been ${data.status}`, data: { screen: 'Bookings' } },
        trigger: null,
      });
    };
    socketService.on('booking:created', onCreated);
    socketService.on('booking:updated', onUpdated);
    return () => { socketService.off('booking:created', onCreated); socketService.off('booking:updated', onUpdated); };
  }, []);

  // ─── Review notifications ────────────────────────────────────────────
  useEffect(() => {
    const handler = async (data: any) => {
      store.dispatch(baseApi.util.invalidateTags(['Review', 'BusinessCard']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: 'New Review', body: `${data.reviewerName ?? 'Someone'} left a ${data.rating}-star review`, data: { screen: 'Reviews' } },
        trigger: null,
      });
    };
    socketService.on('review:created', handler);
    return () => { socketService.off('review:created', handler); };
  }, []);

  // ─── Voucher notifications ───────────────────────────────────────────
  useEffect(() => {
    const onClaimed = async (data: any) => {
      store.dispatch(baseApi.util.invalidateTags(['Voucher']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: 'Voucher Claimed', body: `${data.claimerName ?? 'Someone'} claimed "${data.voucherTitle}"`, data: { screen: 'Vouchers' } },
        trigger: null,
      });
    };
    const onTransferred = async (data: any) => {
      store.dispatch(baseApi.util.invalidateTags(['Voucher']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: 'Voucher Received', body: `${data.senderName ?? 'Someone'} transferred "${data.voucherTitle}" to you`, data: { screen: 'Vouchers' } },
        trigger: null,
      });
    };
    socketService.on('voucher:claimed', onClaimed);
    socketService.on('voucher:transferred', onTransferred);
    return () => { socketService.off('voucher:claimed', onClaimed); socketService.off('voucher:transferred', onTransferred); };
  }, []);

  // ─── Event notifications ─────────────────────────────────────────────
  useEffect(() => {
    const handler = async (data: any) => {
      store.dispatch(baseApi.util.invalidateTags(['Event']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: 'New Event Registration', body: `${data.attendeeName ?? 'Someone'} registered for "${data.eventTitle}"`, data: { screen: 'Events' } },
        trigger: null,
      });
    };
    socketService.on('event:registered', handler);
    return () => { socketService.off('event:registered', handler); };
  }, []);

  // ─── Admin approval/rejection notifications ──────────────────────────
  useEffect(() => {
    const makeHandler = (tag: string, title: string, bodyFn: (d: any) => string) => async (data: any) => {
      store.dispatch(baseApi.util.invalidateTags([tag as any]));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title, body: bodyFn(data), data: {} },
        trigger: null,
      });
    };

    const handlers = [
      { event: 'promotion:approved', handler: makeHandler('Promotion', 'Promotion Approved', (d) => `Your promotion "${d.title}" is now live!`) },
      { event: 'promotion:rejected', handler: makeHandler('Promotion', 'Promotion Rejected', (d) => `Your promotion "${d.title}" was rejected${d.reason ? ': ' + d.reason : ''}`) },
      { event: 'ad:approved', handler: makeHandler('Ad', 'Ad Campaign Approved', (d) => `Your ad "${d.title}" is now live!`) },
      { event: 'ad:rejected', handler: makeHandler('Ad', 'Ad Campaign Rejected', (d) => `Your ad "${d.title}" was not approved`) },
      { event: 'card:approved', handler: makeHandler('BusinessCard', 'Card Approved', (d) => `Your card "${d.cardName}" has been approved!`) },
      { event: 'card:rejected', handler: makeHandler('BusinessCard', 'Card Rejected', (d) => `Your card "${d.cardName}" was not approved`) },
    ];

    handlers.forEach(({ event, handler }) => socketService.on(event, handler));
    return () => { handlers.forEach(({ event, handler }) => socketService.off(event, handler)); };
  }, []);

  // ─── Group: member added/removed/sharing notifications ───────────────
  useEffect(() => {
    const onAdded = async (data: any) => {
      store.dispatch(chatApi.util.invalidateTags(['Group']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: 'Added to Group', body: `${data.addedBy ?? 'Admin'} added you to "${data.groupName}"`, data: { screen: 'GroupChat', groupId: data.groupId, groupName: data.groupName } },
        trigger: null,
      });
    };
    const onMembersAdded = async (data: any) => {
      store.dispatch(chatApi.util.invalidateTags(['Group']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: data.groupName, body: `${data.addedNames} joined the group`, data: { screen: 'GroupChat', groupId: data.groupId, groupName: data.groupName } },
        trigger: null,
      });
    };
    const onRemoved = async (data: any) => {
      store.dispatch(chatApi.util.invalidateTags(['Group']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: 'Removed from Group', body: `You were removed from "${data.groupName}"`, data: { screen: 'Messaging' } },
        trigger: null,
      });
    };
    const onMemberLeft = async (data: any) => {
      store.dispatch(chatApi.util.invalidateTags(['Group']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      const body = data.isSelfLeave ? `${data.memberName} left the group` : `${data.memberName} was removed`;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: data.groupName, body, data: { screen: 'GroupChat', groupId: data.groupId, groupName: data.groupName } },
        trigger: null,
      });
    };
    const onSharingStarted = async (data: any) => {
      store.dispatch(chatApi.util.invalidateTags(['Group']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: data.groupName ?? 'Group', body: 'Card sharing session started!', data: { screen: 'GroupChat', groupId: data.groupId, groupName: data.groupName } },
        trigger: null,
      });
    };
    const onSharingStopped = (data: any) => {
      store.dispatch(chatApi.util.invalidateTags(['Group']));
    };
    const onChatNotification = async (data: any) => {
      store.dispatch(baseApi.util.invalidateTags(['Chat', 'ChatMessages']));
      const { status } = await ExpoNotifications.getPermissionsAsync();
      if (status !== 'granted') return;
      const msg = data.message;
      await ExpoNotifications.scheduleNotificationAsync({
        content: { title: msg?.sender?.name ?? 'New Message', body: msg?.content?.length > 60 ? msg.content.slice(0, 60) + '...' : msg?.content ?? '', data: { screen: 'Chat', chatId: data.chatId } },
        trigger: null,
      });
    };

    socketService.on('group:added', onAdded);
    socketService.on('group:members_added', onMembersAdded);
    socketService.on('group:removed', onRemoved);
    socketService.on('group:member_left', onMemberLeft);
    socketService.on('group:sharing_started', onSharingStarted);
    socketService.on('group:sharing_stopped', onSharingStopped);
    socketService.on('chat:notification', onChatNotification);
    return () => {
      socketService.off('group:added', onAdded);
      socketService.off('group:members_added', onMembersAdded);
      socketService.off('group:removed', onRemoved);
      socketService.off('group:member_left', onMemberLeft);
      socketService.off('group:sharing_started', onSharingStarted);
      socketService.off('group:sharing_stopped', onSharingStopped);
      socketService.off('chat:notification', onChatNotification);
    };
  }, []);

  // Handle notification taps: navigate to GroupChat when user taps a group invite notification.
  const notifListenerRef = useRef<ExpoNotifications.Subscription | null>(null);
  useEffect(() => {
    notifListenerRef.current = ExpoNotifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      if (!navigationRef.isReady()) return;

      if (data?.screen === 'GroupChat' && data?.groupId) {
        navigationRef.navigate('GroupChat', {
          groupId: data.groupId,
          groupName: data.groupName ?? 'Group Chat',
        });
      } else if (data?.screen === 'Chat' || data?.screen === 'Messaging') {
        // DM push notification tapped — open the Inbox (Messaging screen).
        // The user can then tap the specific conversation.
        navigationRef.navigate('Messaging');
      }
    });
    return () => { notifListenerRef.current?.remove(); };
  }, []);

  return (
    <NavigationContainer ref={navigationRef} linking={linking}>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          animation: 'default', // Default animation for most screens
        }}
      >
        {/* Bottom Tab Screens - No animation for instant switching */}
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ animation: 'none' }}
        />
        <Stack.Screen 
          name="MyCards" 
          component={MyCardsScreen} 
          options={{ animation: 'none' }}
        />
        <Stack.Screen 
          name="Events" 
          component={EventsScreen} 
          options={{ animation: 'none' }}
        />
        <Stack.Screen 
          name="Vouchers" 
          component={VouchersScreen} 
          options={{ animation: 'none' }}
        />
        <Stack.Screen 
          name="Ads" 
          component={AdsScreen} 
          options={{ animation: 'none' }}
        />
        <Stack.Screen 
          name="BusinessDashboard" 
          component={BusinessDashboardScreen} 
          options={{ animation: 'none' }}
        />
        <Stack.Screen 
          name="BusinessSelectorScreen" 
          component={BusinessSelectorWrapped}
        />
        <Stack.Screen 
          name="BusinessAnalytics" 
          component={BusinessAnalyticsScreen} 
          options={{ animation: 'none' }}
        />
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen} 
          options={{ animation: 'none' }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ animation: 'none' }}
        />
        <Stack.Screen name="AdminAdDetail" component={AdminAdDetailScreen} />

        {/* Other screens with default slide animation */}
        <Stack.Screen name="CardCreate" component={CardCreateScreen} />
        <Stack.Screen name="BusinessPromotionForm" component={BusinessPromotionFormScreen} />
        <Stack.Screen name="PremiumPlanSelection" component={PremiumPlanSelectionScreen} />
        <Stack.Screen name="FreePlanConfirmation" component={FreePlanConfirmationScreen} />
        <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
        <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
        <Stack.Screen name="SubcategoryDetail" component={SubcategoryDetailScreen} />
        <Stack.Screen name="Messaging" component={MessagingScreen} />
        <Stack.Screen name="GroupChat" component={GroupChatScreen} />
        <Stack.Screen name="VoucherDetail" component={VoucherDetailScreen} />
        <Stack.Screen name="MyVouchers" component={MyVouchersScreen} />
        <Stack.Screen name="AdCreate" component={AdCreateScreen} />
        <Stack.Screen name="AdDashboard" component={AdDashboardScreen} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
        <Stack.Screen name="EventScanner" component={EventScannerScreen} />
        <Stack.Screen name="EventCreate" component={EventCreateScreen} />
        <Stack.Screen name="VoucherCreate" component={VoucherCreateScreen} />
        <Stack.Screen name="PublicCard" component={PublicCardScreen} />
        <Stack.Screen name="MyPasses" component={MyPassesScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="ChooseListingType" component={ChooseListingScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
        <Stack.Screen name="PrivacySecurity" component={PrivacySecurityScreen} />
        <Stack.Screen name="ReferAndEarn" component={ReferAndEarnScreen} />
        <Stack.Screen name="ReferralHistory" component={ReferralHistoryScreen} />
        <Stack.Screen name="EarningsHistory" component={EarningsHistoryScreen} />
        <Stack.Screen name="PerReferralInfo" component={PerReferralInfoScreen} />
        <Stack.Screen name="MyFavourites" component={MyFavouritesScreen} />
        <Stack.Screen name="TrackBooking" component={TrackBookingScreen} />
        <Stack.Screen name="BookingDetail" component={BookingDetailScreen} />
        <Stack.Screen name="EventEdit" component={EventEditScreen} />
        <Stack.Screen name="EventRegistrations" component={EventRegistrationsScreen} />
        <Stack.Screen name="PassDetail" component={PassDetailScreen} />
        <Stack.Screen name="Support" component={SupportScreen} />
        <Stack.Screen name="NearbyBusinesses" component={NearbyBusinessesScreen} />
        <Stack.Screen name="LoyaltyPoints" component={LoyaltyPointsScreen} />
        <Stack.Screen name="Credits" component={CreditsScreenWrapped} />
        <Stack.Screen name="TransferCredits" component={TransferCreditsWrapped} />
        <Stack.Screen name="CreditsHistory" component={CreditsHistoryWrapped} />
        <Stack.Screen name="SendCredits" component={SendCreditsWrapped} />
        <Stack.Screen name="Auth" component={Auth} />
        <Stack.Screen name="ForgotPasswordPhone" component={ForgotPasswordPhone} />
        <Stack.Screen name="ForgotPasswordOTP" component={ForgotPasswordOTP} />
        <Stack.Screen name="ForgotPasswordReset" component={ForgotPasswordReset} />
        <Stack.Screen name="GroupJoin" component={GroupJoin} />
        <Stack.Screen name="NotFound" component={NotFoundScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
