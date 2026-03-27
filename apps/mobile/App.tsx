import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFonts } from "expo-font";
import "./src/global.css";
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import AppNavigator from "./src/navigation/AppNavigator";
import { colors } from "./src/theme/colors";
import AppProviders from "./src/AppProviders";
import { SUPABASE_CONFIG_OK } from "./src/integrations/supabase/client";

const DEBUG_MINIMAL = false;
const DEBUG_PROVIDERS_ONLY = false;

export default function App() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!SUPABASE_CONFIG_OK) {
    return (
      <View style={styles.loading}>
        <Text style={styles.debugText}>Missing Supabase config</Text>
        <Text style={styles.debugSubText}>
          Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in EAS secrets.
        </Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (DEBUG_MINIMAL) {
    return (
      <View style={styles.loading}>
        <Text style={styles.debugText}>Debug Minimal Screen</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (DEBUG_PROVIDERS_ONLY) {
    return (
      <AppProviders>
        <View style={styles.loading}>
          <Text style={styles.debugText}>Providers Only</Text>
          <StatusBar style="auto" />
        </View>
      </AppProviders>
    );
  }

  return (
    <>
      <AppProviders>
        <AppNavigator />
      </AppProviders>
      <StatusBar style="auto" />
    </>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
  },
  debugText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
    textAlign: "center",
  },
  debugSubText: {
    marginTop: 8,
    fontSize: 13,
    color: colors.mutedForeground,
    textAlign: "center",
  },
});
