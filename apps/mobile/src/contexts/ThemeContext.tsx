import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { View, useColorScheme as useRNColorScheme } from "react-native";
import { colorScheme as nwColorScheme, vars } from "nativewind";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  theme: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
  toggle: () => void;
};

const STORAGE_KEY = "@instantlly/theme-preference";

const ThemeContext = createContext<ThemeContextValue | null>(null);

// Theme tokens — keep in sync with tailwind.config.js color references and src/theme/colors.ts
const themeVars = {
  light: vars({
    "--color-background": "247 247 247",
    "--color-foreground": "29 33 43",
    "--color-card": "255 255 255",
    "--color-card-foreground": "29 33 43",
    "--color-popover": "255 255 255",
    "--color-popover-foreground": "29 33 43",
    "--color-primary": "36 99 235",
    "--color-primary-foreground": "255 255 255",
    "--color-secondary": "242 242 242",
    "--color-secondary-foreground": "29 33 43",
    "--color-muted": "243 244 246",
    "--color-muted-foreground": "106 113 129",
    "--color-accent": "168 230 25",
    "--color-accent-foreground": "26 26 26",
    "--color-destructive": "239 67 67",
    "--color-destructive-foreground": "255 255 255",
    "--color-success": "40 175 96",
    "--color-success-foreground": "255 255 255",
    "--color-warning": "245 159 10",
    "--color-warning-foreground": "255 255 255",
    "--color-border": "229 231 235",
    "--color-input": "229 231 235",
    "--color-ring": "36 99 235",
    "--color-sidebar": "250 250 250",
    "--color-sidebar-foreground": "63 63 70",
    "--color-sidebar-primary": "24 24 27",
    "--color-sidebar-primary-foreground": "250 250 250",
    "--color-sidebar-accent": "244 244 245",
    "--color-sidebar-accent-foreground": "24 24 27",
    "--color-sidebar-border": "229 231 235",
    "--color-sidebar-ring": "36 99 235",
  }),
  dark: vars({
    "--color-background": "13 17 23",
    "--color-foreground": "232 234 237",
    "--color-card": "22 27 34",
    "--color-card-foreground": "232 234 237",
    "--color-popover": "22 27 34",
    "--color-popover-foreground": "232 234 237",
    "--color-primary": "88 145 247",
    "--color-primary-foreground": "255 255 255",
    "--color-secondary": "33 38 45",
    "--color-secondary-foreground": "232 234 237",
    "--color-muted": "30 35 42",
    "--color-muted-foreground": "159 168 180",
    "--color-accent": "168 230 25",
    "--color-accent-foreground": "13 17 23",
    "--color-destructive": "248 113 113",
    "--color-destructive-foreground": "255 255 255",
    "--color-success": "52 211 153",
    "--color-success-foreground": "13 17 23",
    "--color-warning": "251 191 36",
    "--color-warning-foreground": "13 17 23",
    "--color-border": "48 54 61",
    "--color-input": "48 54 61",
    "--color-ring": "88 145 247",
    "--color-sidebar": "17 22 28",
    "--color-sidebar-foreground": "209 213 219",
    "--color-sidebar-primary": "232 234 237",
    "--color-sidebar-primary-foreground": "13 17 23",
    "--color-sidebar-accent": "30 35 42",
    "--color-sidebar-accent-foreground": "232 234 237",
    "--color-sidebar-border": "48 54 61",
    "--color-sidebar-ring": "88 145 247",
  }),
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as ThemePreference | null;
        if (saved === "light" || saved === "dark" || saved === "system") {
          setPreferenceState(saved);
        }
      } catch {
        /* ignore */
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    if (preference === "system") {
      return systemScheme === "dark" ? "dark" : "light";
    }
    return preference;
  }, [preference, systemScheme]);

  // Sync NativeWind's colorScheme so `dark:` variant classes work
  useEffect(() => {
    nwColorScheme.set(resolvedTheme);
  }, [resolvedTheme]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    setPreference(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, theme: resolvedTheme, setPreference, toggle }),
    [preference, resolvedTheme, setPreference, toggle]
  );

  if (!hydrated) return null;

  // Apply theme CSS variables on a wrapping View so all descendant
  // NativeWind classes (bg-card, text-foreground, etc.) resolve correctly.
  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, themeVars[resolvedTheme]]}>{children}</View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      preference: "light",
      theme: "light",
      setPreference: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}
