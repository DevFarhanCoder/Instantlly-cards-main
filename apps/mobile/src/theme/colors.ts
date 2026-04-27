import { useColorScheme } from "nativewind";

export const lightColors = {
  background: "#f7f7f7",
  foreground: "#1d212b",
  card: "#ffffff",
  cardForeground: "#1d212b",
  popover: "#ffffff",
  popoverForeground: "#1d212b",
  primary: "#2463eb",
  primaryForeground: "#ffffff",
  secondary: "#f2f2f2",
  secondaryForeground: "#1d212b",
  muted: "#f3f4f6",
  mutedForeground: "#6a7181",
  accent: "#a8e619",
  accentForeground: "#1a1a1a",
  destructive: "#ef4343",
  destructiveForeground: "#ffffff",
  success: "#28af60",
  successForeground: "#ffffff",
  warning: "#f59f0a",
  warningForeground: "#ffffff",
  border: "#e5e7eb",
  input: "#e5e7eb",
  ring: "#2463eb",
  sidebar: {
    background: "#fafafa",
    foreground: "#3f3f46",
    primary: "#18181b",
    primaryForeground: "#fafafa",
    accent: "#f4f4f5",
    accentForeground: "#18181b",
    border: "#e5e7eb",
    ring: "#2463eb",
  },
};

export const darkColors: typeof lightColors = {
  background: "#0d1117",
  foreground: "#e8eaed",
  card: "#161b22",
  cardForeground: "#e8eaed",
  popover: "#161b22",
  popoverForeground: "#e8eaed",
  primary: "#5891f7",
  primaryForeground: "#ffffff",
  secondary: "#21262d",
  secondaryForeground: "#e8eaed",
  muted: "#1e232a",
  mutedForeground: "#9fa8b4",
  accent: "#a8e619",
  accentForeground: "#0d1117",
  destructive: "#f87171",
  destructiveForeground: "#ffffff",
  success: "#34d399",
  successForeground: "#0d1117",
  warning: "#fbbf24",
  warningForeground: "#0d1117",
  border: "#30363d",
  input: "#30363d",
  ring: "#5891f7",
  sidebar: {
    background: "#11161c",
    foreground: "#d1d5db",
    primary: "#e8eaed",
    primaryForeground: "#0d1117",
    accent: "#1e232a",
    accentForeground: "#e8eaed",
    border: "#30363d",
    ring: "#5891f7",
  },
};

/** Default export keeps backward compatibility (light palette).
 *  Existing screens that import { colors } continue to work. For
 *  theme-aware values inside components, prefer useColors(). */
export const colors = lightColors;

/**
 * Theme-aware colors hook.
 * Returns the active palette based on NativeWind's color scheme.
 * Use this anywhere you need inline color values (e.g. icon `color` prop).
 */
export function useColors(): typeof lightColors {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? darkColors : lightColors;
}

/**
 * Convenience hook returning the foreground hex value for the active theme.
 * Use for inline icon colors: `<ArrowLeft color={useIconColor()} />`.
 */
export function useIconColor(): string {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? darkColors.foreground : lightColors.foreground;
}

/**
 * Returns muted/subtle foreground hex (e.g. for chevrons, hints).
 */
export function useMutedIconColor(): string {
  const { colorScheme } = useColorScheme();
  return colorScheme === "dark" ? darkColors.mutedForeground : lightColors.mutedForeground;
}
