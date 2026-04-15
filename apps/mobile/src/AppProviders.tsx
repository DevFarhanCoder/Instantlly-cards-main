import { ReactNode, useEffect } from "react";
import { Provider as ReduxProvider } from "react-redux";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { store } from "./store";
import { AuthProvider } from "./hooks/useAuth";
import { FavoritesProvider } from "./contexts/FavoritesContext";
import { PushNotificationProvider } from "./contexts/PushNotificationContext";
import { CreditsProvider, useCredits } from "./contexts/CreditsContext";
import { checkAndRefreshCredits } from "./lib/creditsRefresh";

// Keep React Query client for existing hooks that haven't migrated to RTK Query yet
const queryClient = new QueryClient();

const ENABLE_SAFE_AREA = true;
const ENABLE_AUTH = true;
const ENABLE_FAVORITES = true;
const ENABLE_PUSH = true;

// Inner component so it can use useCredits inside CreditsProvider
function CreditsBootstrap({ children }: { children: ReactNode }) {
  const { refreshCredits } = useCredits();
  useEffect(() => { checkAndRefreshCredits(refreshCredits); }, []);
  return <>{children}</>;
}

const AppProviders = ({ children }: { children: ReactNode }) => {
  let tree = children;

  if (ENABLE_PUSH) {
    tree = <PushNotificationProvider>{tree}</PushNotificationProvider>;
  }
  if (ENABLE_FAVORITES) {
    tree = <FavoritesProvider>{tree}</FavoritesProvider>;
  }
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
  return (
    <ReduxProvider store={store}>
      <CreditsProvider>
        <CreditsBootstrap>
          {tree}
        </CreditsBootstrap>
      </CreditsProvider>
    </ReduxProvider>
  );
};

export default AppProviders;
