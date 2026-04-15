import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const STORAGE_KEY = 'last_app_version';

export async function checkAndRefreshCredits(refreshFn: () => void): Promise<void> {
  try {
    const currentVersion = Constants.expoConfig?.version ?? '1.0.0';
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored !== currentVersion) {
      refreshFn();
      await AsyncStorage.setItem(STORAGE_KEY, currentVersion);
    }
  } catch {
    // non-critical — ignore
  }
}
