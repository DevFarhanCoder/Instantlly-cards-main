import { ReactNode } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { store } from "./store";
import { AuthProvider } from "./hooks/useAuth";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { PushNotificationProvider } from "./contexts/PushNotificationContext";
import { PromotionProvider } from "./contexts/PromotionContext";

// Keep React Query client for existing hooks that haven't migrated to RTK Query yet
const queryClient = new QueryClient();

const ENABLE_SAFE_AREA = true;
const ENABLE_AUTH = true;
const ENABLE_FAVORITES = true;
const ENABLE_PUSH = true;

const AppProviders = ({ children }: { children: ReactNode }) => {
  let tree = children;

  if (ENABLE_PUSH) {
    tree = <PushNotificationProvider>{tree}</PushNotificationProvider>;
  }
  if (ENABLE_FAVORITES) {
    tree = <FavoritesProvider>{tree}</FavoritesProvider>;
  }
  // PromotionProvider depends on auth + RTK Query, so it must be inside AuthProvider
  tree = <PromotionProvider>{tree}</PromotionProvider>;
  if (ENABLE_AUTH) {
    // AuthProvider must be inside ReduxProvider so it can dispatch
    tree = <AuthProvider>{tree}</AuthProvider>;
  }
  // React Query: keeps existing hooks working during migration
  tree = <QueryClientProvider client={queryClient}>{tree}</QueryClientProvider>;
  if (ENABLE_SAFE_AREA) {
    tree = <SafeAreaProvider>{tree}</SafeAreaProvider>;
  }

  // ReduxProvider wraps everything (outermost)
  return <ReduxProvider store={store}>{tree}</ReduxProvider>;
};

export default AppProviders;
