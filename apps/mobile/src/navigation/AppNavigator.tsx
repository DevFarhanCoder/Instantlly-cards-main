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
import NearbyBusinesses from "../screens/NearbyBusinesses";
import BusinessDashboard from "../screens/BusinessDashboard";
import BusinessAnalytics from "../screens/BusinessAnalytics";
import AdminDashboard from "../screens/AdminDashboard";
import Auth from "../screens/Auth";
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
import VoucherCreate from "../screens/VoucherCreate";
import AppLayout from "../components/layout/AppLayout";
import type { RootStackParamList } from "./routes";

const Stack = createNativeStackNavigator<RootStackParamList>();

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

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
        }}
      >
      <Stack.Screen name="Home" component={withLayout(Index)} />
      <Stack.Screen name="MyCards" component={withLayout(MyCards)} />
      <Stack.Screen name="CardCreate" component={withLayout(CardCreate)} />
      <Stack.Screen name="BusinessDetail" component={withLayout(BusinessDetail)} />
      <Stack.Screen name="CategoryDetail" component={withLayout(CategoryDetail)} />
      <Stack.Screen name="Messaging" component={withLayout(Messaging)} />
      <Stack.Screen name="Vouchers" component={withLayout(Vouchers)} />
      <Stack.Screen name="VoucherDetail" component={withLayout(VoucherDetail)} />
      <Stack.Screen name="MyVouchers" component={withLayout(MyVouchers)} />
      <Stack.Screen name="Ads" component={withLayout(Ads)} />
      <Stack.Screen name="AdCreate" component={withLayout(AdCreate)} />
      <Stack.Screen name="AdDashboard" component={withLayout(AdDashboard)} />
      <Stack.Screen name="Events" component={withLayout(Events)} />
      <Stack.Screen name="EventDetail" component={withLayout(EventDetail)} />
      <Stack.Screen name="EventScanner" component={withLayout(EventScanner)} />
      <Stack.Screen name="EventCreate" component={withLayout(EventCreate)} />
      <Stack.Screen name="VoucherCreate" component={withLayout(VoucherCreate)} />
      <Stack.Screen name="PublicCard" component={withLayout(PublicCard)} />
      <Stack.Screen name="MyPasses" component={withLayout(MyPasses)} />
      <Stack.Screen name="Profile" component={withLayout(Profile)} />
      <Stack.Screen name="ChooseListingType" component={withLayout(ChooseListingType)} />
      <Stack.Screen name="Dashboard" component={withLayout(Dashboard)} />
      <Stack.Screen name="BusinessAnalytics" component={withLayout(BusinessAnalytics)} />
      <Stack.Screen name="Subscription" component={withLayout(Subscription)} />
      <Stack.Screen name="Notifications" component={withLayout(Notifications)} />
      <Stack.Screen name="BusinessDashboard" component={withLayout(BusinessDashboard)} />
      <Stack.Screen name="AdminDashboard" component={withLayout(AdminDashboard)} />
      <Stack.Screen name="EditProfile" component={withLayout(EditProfile)} />
      <Stack.Screen name="PaymentMethods" component={withLayout(PaymentMethods)} />
      <Stack.Screen name="PrivacySecurity" component={withLayout(PrivacySecurity)} />
      <Stack.Screen name="ReferAndEarn" component={withLayout(ReferAndEarn)} />
      <Stack.Screen name="MyFavourites" component={withLayout(MyFavourites)} />
      <Stack.Screen name="TrackBooking" component={withLayout(TrackBooking)} />
      <Stack.Screen name="Support" component={withLayout(Support)} />
      <Stack.Screen name="NearbyBusinesses" component={withLayout(NearbyBusinesses)} />
      <Stack.Screen name="LoyaltyPoints" component={withLayout(LoyaltyPoints)} />
      <Stack.Screen name="Auth" component={Auth} />
      <Stack.Screen name="NotFound" component={plainPlaceholder("Not Found")} />
    </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
