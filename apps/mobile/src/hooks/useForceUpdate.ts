import { useState, useEffect, useCallback } from 'react';
import Constants from 'expo-constants';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VersionResponse {
  currentVersion: string;
  minVersion: string;
  recommendedVersion: string;
  forceUpdate: boolean;
  updateUrl: string;
  message: string;
}

export interface ForceUpdateState {
  /** Still fetching version info */
  checking: boolean;
  /** A mandatory update is required — block the app */
  mustUpdate: boolean;
  /** A soft update is available — show a dismissible prompt */
  shouldUpdate: boolean;
  /** Play Store URL to open */
  updateUrl: string;
  /** Optional message from backend */
  message: string;
  /** Dismiss the soft-update prompt */
  dismiss: () => void;
  /** Re-check version (e.g. when app comes to foreground) */
  recheck: () => void;
}

// ---------------------------------------------------------------------------
// Semver comparison helpers (no external dependency)
// ---------------------------------------------------------------------------

/** Parse "1.2.3" → [1, 2, 3]. Returns [0,0,0] on bad input. */
function parseSemver(v: string): [number, number, number] {
  const parts = (v || '0.0.0').split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

/** Returns true if `current` < `required` */
function isVersionBelow(current: string, required: string): boolean {
  const [cMaj, cMin, cPat] = parseSemver(current);
  const [rMaj, rMin, rPat] = parseSemver(required);
  if (cMaj !== rMaj) return cMaj < rMaj;
  if (cMin !== rMin) return cMin < rMin;
  return cPat < rPat;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  'http://localhost:8080';

/** Current app version from app.json / app.config.ts */
const APP_VERSION: string =
  Constants.expoConfig?.version ?? (Constants.manifest as any)?.version ?? '0.0.0';

export function useForceUpdate(): ForceUpdateState {
  const [checking, setChecking] = useState(true);
  const [mustUpdate, setMustUpdate] = useState(false);
  const [shouldUpdate, setShouldUpdate] = useState(false);
  const [updateUrl, setUpdateUrl] = useState('');
  const [message, setMessage] = useState('');
  const [dismissed, setDismissed] = useState(false);

  const check = useCallback(async () => {
    try {
      setChecking(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${API_URL}/api/system/version`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // Non-200 → don't block the user
        setChecking(false);
        return;
      }

      const data: VersionResponse = await res.json();

      setUpdateUrl(data.updateUrl || '');
      setMessage(data.message || '');

      // forceUpdate=true → everyone below currentVersion MUST update
      if (data.forceUpdate) {
        if (isVersionBelow(APP_VERSION, data.currentVersion)) {
          setMustUpdate(true);
        }
        // App is already at or above currentVersion → no action needed
        setChecking(false);
        return;
      }

      // Version below minimum → must update
      if (isVersionBelow(APP_VERSION, data.minVersion)) {
        setMustUpdate(true);
        setChecking(false);
        return;
      }

      // Version below recommended → soft nudge
      if (isVersionBelow(APP_VERSION, data.recommendedVersion)) {
        setShouldUpdate(true);
      }

      setChecking(false);
    } catch {
      // Network error / timeout → don't block the user
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    setShouldUpdate(false);
  }, []);

  return {
    checking,
    mustUpdate,
    shouldUpdate: shouldUpdate && !dismissed,
    updateUrl,
    message,
    dismiss,
    recheck: check,
  };
}
