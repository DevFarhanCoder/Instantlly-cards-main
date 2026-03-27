import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import type { Database } from "./types";

const extra = Constants.expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};

export const SUPABASE_URL =
  extra.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_PUBLISHABLE_KEY =
  extra.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "";

export const SUPABASE_CONFIG_OK = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

if (!SUPABASE_CONFIG_OK) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in EAS secrets or app.config.ts extra.",
  );
}

const FALLBACK_URL = "https://example.supabase.co";
const FALLBACK_KEY = "public-anon-key";

export const supabase = createClient<Database>(
  SUPABASE_URL || FALLBACK_URL,
  SUPABASE_PUBLISHABLE_KEY || FALLBACK_KEY,
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);
