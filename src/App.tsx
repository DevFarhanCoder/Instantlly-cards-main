import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { PushNotificationProvider } from "@/contexts/PushNotificationContext";
import AppLayout from "@/components/layout/AppLayout";
import Index from "./pages/Index";
import MyCards from "./pages/MyCards";
import CardCreate from "./pages/CardCreate";
import BusinessDetail from "./pages/BusinessDetail";
import CategoryDetail from "./pages/CategoryDetail";
import Messaging from "./pages/Messaging";
import Vouchers from "./pages/Vouchers";
import VoucherDetail from "./pages/VoucherDetail";
import MyVouchers from "./pages/MyVouchers";
import Ads from "./pages/Ads";
import AdCreate from "./pages/AdCreate";
import AdDashboard from "./pages/AdDashboard";
import Events from "./pages/Events";
import EventDetail from "./pages/EventDetail";
import EventScanner from "./pages/EventScanner";
import EventCreate from "./pages/EventCreate";
import VoucherCreate from "./pages/VoucherCreate";
import Auth from "./pages/Auth";
import MyPasses from "./pages/MyPasses";
import Profile from "./pages/Profile";
import ChooseListingType from "./pages/ChooseListingType";
import Dashboard from "./pages/Dashboard";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import Subscription from "./pages/Subscription";
import Notifications from "./pages/Notifications";
import PublicCard from "./pages/PublicCard";
import BusinessDashboardPage from "./pages/BusinessDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import EditProfile from "./pages/EditProfile";
import PaymentMethods from "./pages/PaymentMethods";
import PrivacySecurity from "./pages/PrivacySecurity";
import ReferAndEarn from "./pages/ReferAndEarn";
import MyFavourites from "./pages/MyFavourites";
import TrackBooking from "./pages/TrackBooking";
import Support from "./pages/Support";
import NearbyBusinesses from "./pages/NearbyBusinesses";
import LoyaltyPoints from "./pages/LoyaltyPoints";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <FavoritesProvider>
        <PushNotificationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Index />} />
                <Route path="/my-cards" element={<MyCards />} />
                <Route path="/my-cards/create" element={<CardCreate />} />
                <Route path="/my-cards/edit/:cardId" element={<CardCreate />} />
                <Route path="/business/:id" element={<BusinessDetail />} />
                <Route path="/category/:id" element={<CategoryDetail />} />
                <Route path="/messaging" element={<Messaging />} />
                <Route path="/vouchers" element={<Vouchers />} />
                <Route path="/vouchers/:id" element={<VoucherDetail />} />
                <Route path="/my-vouchers" element={<MyVouchers />} />
                <Route path="/ads" element={<Ads />} />
                <Route path="/ads/create" element={<AdCreate />} />
                <Route path="/ads/dashboard" element={<AdDashboard />} />
                <Route path="/events" element={<Events />} />
                <Route path="/events/:id" element={<EventDetail />} />
                <Route path="/events/create" element={<EventCreate />} />
                <Route path="/events/scanner" element={<EventScanner />} />
                <Route path="/vouchers/create" element={<VoucherCreate />} />
                <Route path="/card/:id" element={<PublicCard />} />
                <Route path="/my-passes" element={<MyPasses />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/promote" element={<ChooseListingType />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/analytics" element={<BusinessAnalytics />} />
                <Route path="/subscription" element={<Subscription />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/business-dashboard" element={<BusinessDashboardPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/edit-profile" element={<EditProfile />} />
                <Route path="/payment-methods" element={<PaymentMethods />} />
                <Route path="/privacy-security" element={<PrivacySecurity />} />
                <Route path="/refer" element={<ReferAndEarn />} />
                <Route path="/favorites" element={<MyFavourites />} />
                <Route path="/track-booking" element={<TrackBooking />} />
                <Route path="/support" element={<Support />} />
                <Route path="/nearby" element={<NearbyBusinesses />} />
                <Route path="/loyalty-points" element={<LoyaltyPoints />} />
              </Route>
              <Route path="/auth" element={<Auth />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </PushNotificationProvider>
      </FavoritesProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
