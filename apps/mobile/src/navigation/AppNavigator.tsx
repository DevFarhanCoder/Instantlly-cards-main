import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
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
import Ads from "../screens/Ads";
import AdCreate from "../screens/AdCreate";
import AdDashboard from "../screens/AdDashboard";
import BusinessDetail from "../screens/BusinessDetail";
import CategoryDetail from "../screens/CategoryDetail";
import SubcategoryDetail from "../screens/SubcategoryDetail";
import NearbyBusinesses from "../screens/NearbyBusinesses";
import BusinessDashboard from "../screens/BusinessDashboard";
import BusinessAnalytics from "../screens/BusinessAnalytics";
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
import Events from "../screens/Events";
import EventDetail from "../screens/EventDetail";
import EventCreate from "../screens/EventCreate";
import EventScanner from "../screens/EventScanner";
import CardCreate from "../screens/CardCreate";
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
const AdminDashboardScreen = withLayout(AdminDashboard);
const EditProfileScreen    = withLayout(EditProfile);
const PaymentMethodsScreen = withLayout(PaymentMethods);
const PrivacySecurityScreen = withLayout(PrivacySecurity);
const ReferAndEarnScreen   = withLayout(ReferAndEarn);
const MyFavouritesScreen   = withLayout(MyFavourites);
const TrackBookingScreen   = withLayout(TrackBooking);
const BookingDetailScreen  = withLayout(BookingDetail);
const EventEditScreen      = withLayout(EventEdit);
const EventRegistrationsScreen = withLayout(EventRegistrations);
const PassDetailScreen = withLayout(PassDetail);
const SupportScreen        = withLayout(Support);
const NearbyBusinessesScreen = withLayout(NearbyBusinesses);
const LoyaltyPointsScreen  = withLayout(LoyaltyPoints);
const NotFoundScreen       = plainPlaceholder("Not Found");

// ─── Navigator ────────────────────────────────────────────────────────────────
const AppNavigator = () => {
  return (
    <NavigationContainer>
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
        
        {/* Other screens with default slide animation */}
        <Stack.Screen name="CardCreate"        component={CardCreateScreen} />
        <Stack.Screen name="BusinessDetail"    component={BusinessDetailScreen} />
        <Stack.Screen name="CategoryDetail"    component={CategoryDetailScreen} />
        <Stack.Screen name="SubcategoryDetail" component={SubcategoryDetailScreen} />
        <Stack.Screen name="Messaging"         component={MessagingScreen} />
        <Stack.Screen name="VoucherDetail"     component={VoucherDetailScreen} />
        <Stack.Screen name="MyVouchers"        component={MyVouchersScreen} />
        <Stack.Screen name="AdCreate"          component={AdCreateScreen} />
        <Stack.Screen name="AdDashboard"       component={AdDashboardScreen} />
        <Stack.Screen name="EventDetail"       component={EventDetailScreen} />
        <Stack.Screen name="EventScanner"      component={EventScannerScreen} />
        <Stack.Screen name="EventCreate"       component={EventCreateScreen} />
        <Stack.Screen name="VoucherCreate"     component={VoucherCreateScreen} />
        <Stack.Screen name="PublicCard"        component={PublicCardScreen} />
        <Stack.Screen name="MyPasses"          component={MyPassesScreen} />
        <Stack.Screen name="Profile"           component={ProfileScreen} />
        <Stack.Screen name="ChooseListingType" component={ChooseListingScreen} />
        <Stack.Screen name="Subscription"      component={SubscriptionScreen} />
        <Stack.Screen name="Notifications"     component={NotificationsScreen} />
        <Stack.Screen name="EditProfile"       component={EditProfileScreen} />
        <Stack.Screen name="PaymentMethods"    component={PaymentMethodsScreen} />
        <Stack.Screen name="PrivacySecurity"   component={PrivacySecurityScreen} />
        <Stack.Screen name="ReferAndEarn"      component={ReferAndEarnScreen} />
        <Stack.Screen name="MyFavourites"      component={MyFavouritesScreen} />
        <Stack.Screen name="TrackBooking"      component={TrackBookingScreen} />
        <Stack.Screen name="BookingDetail"     component={BookingDetailScreen} />
        <Stack.Screen name="EventEdit"         component={EventEditScreen} />
        <Stack.Screen name="EventRegistrations" component={EventRegistrationsScreen} />
        <Stack.Screen name="PassDetail"        component={PassDetailScreen} />
        <Stack.Screen name="Support"           component={SupportScreen} />
        <Stack.Screen name="NearbyBusinesses"  component={NearbyBusinessesScreen} />
        <Stack.Screen name="LoyaltyPoints"     component={LoyaltyPointsScreen} />
        <Stack.Screen name="Auth"              component={Auth} />
        <Stack.Screen name="ForgotPasswordPhone" component={ForgotPasswordPhone} />
        <Stack.Screen name="ForgotPasswordOTP" component={ForgotPasswordOTP} />
        <Stack.Screen name="ForgotPasswordReset" component={ForgotPasswordReset} />
        <Stack.Screen name="NotFound"          component={NotFoundScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
