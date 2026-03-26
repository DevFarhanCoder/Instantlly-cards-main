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
  },
  debugText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.foreground,
  },
});
