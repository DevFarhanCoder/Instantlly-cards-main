import appJson from "./app.json";

const expoConfig = appJson.expo ?? {};

export default {
  ...expoConfig,
  extra: {
    ...(expoConfig.extra ?? {}),
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
};
