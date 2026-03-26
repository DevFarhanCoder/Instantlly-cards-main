import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./hooks/useAuth";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { PushNotificationProvider } from "./contexts/PushNotificationContext";

const queryClient = new QueryClient();

// Toggle one by one to isolate java.lang.String cannot be cast to java.lang.Boolean
const ENABLE_SAFE_AREA = true;
const ENABLE_QUERY = true;
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
  if (ENABLE_AUTH) {
    tree = <AuthProvider>{tree}</AuthProvider>;
  }
  if (ENABLE_QUERY) {
    tree = <QueryClientProvider client={queryClient}>{tree}</QueryClientProvider>;
  }
  if (ENABLE_SAFE_AREA) {
    tree = <SafeAreaProvider>{tree}</SafeAreaProvider>;
  }

  return <>{tree}</>;
};

export default AppProviders;
