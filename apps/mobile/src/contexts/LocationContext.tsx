/**
 * LocationContext — global location state.
 *
 * Sources of truth (in priority order):
 *   1. Manual city picked by the user (persisted to AsyncStorage)
 *   2. GPS reverse-geocoded city
 *
 * Consumers use `useAppLocation()` to read `city`, `state`, `lat`, `lng`.
 * They call `setManualCity(city, state)` to let the user pin a city,
 * or `resetToGPS()` to go back to automatic detection.
 */
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";

const STORAGE_KEY = "@ic_location_pref";

export interface AppLocationState {
  /** Resolved city name (GPS or manual). Null while loading. */
  city: string | null;
  /** Resolved state/region. */
  state: string | null;
  /** GPS latitude (always from device GPS, even when city is manually overridden). */
  lat: number | null;
  /** GPS longitude. */
  lng: number | null;
  /** True if the user has manually selected a city. */
  isManual: boolean;
  /** True while first GPS resolution is in progress. */
  isLoading: boolean;
  /** True if the user denied location permission. */
  permissionDenied: boolean;
}

interface LocationContextValue extends AppLocationState {
  /** Pin a city manually — persisted across app restarts. */
  setManualCity: (city: string, state?: string) => Promise<void>;
  /** Revert to automatic GPS-based city. */
  resetToGPS: () => Promise<void>;
  /** Re-request location permission (e.g. after user goes to Settings). */
  retryPermission: () => Promise<void>;
}

const LocationContext = createContext<LocationContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function LocationProvider({ children }: { children: ReactNode }) {
  const [city, setCity] = useState<string | null>(null);
  const [state, setState] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isManual, setIsManual] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const mountedRef = useRef(true);

  // Resolve GPS position + reverse geocode
  const resolveGPS = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) {
        if (mountedRef.current) {
          setPermissionDenied(true);
          setIsLoading(false);
        }
        return;
      }
      if (mountedRef.current) setPermissionDenied(false);

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      if (!mountedRef.current) return;

      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);

      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const place = geocode[0];
        if (mountedRef.current) {
          // Fallback chain for rural/village areas:
          // city (metro/town) → name (village/locality) → district (tehsil) → subregion → region (state)
          const resolvedCity =
            place?.city ||
            place?.name ||
            place?.district ||
            place?.subregion ||
            place?.region ||
            null;
          setCity(resolvedCity);
          setState(place?.region || null);
        }
      } catch {
        // GPS coords still saved, city stays null
      }
    } catch {
      // Location unavailable
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    (async () => {
      // 1. Load persisted preference
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const pref: { city: string; state?: string } = JSON.parse(raw);
          if (mountedRef.current && pref.city) {
            setCity(pref.city);
            setState(pref.state ?? null);
            setIsManual(true);
            setIsLoading(false);
            // Still grab GPS coords in the background (for distance calculations)
            resolveGPS().then(() => {
              // After GPS, restore manual city (GPS may have overwritten it)
              if (mountedRef.current) {
                setCity(pref.city);
                setState(pref.state ?? null);
                setIsManual(true);
              }
            });
            return;
          }
        }
      } catch {
        // AsyncStorage failure — continue to GPS
      }

      // 2. No persisted preference — resolve from GPS
      await resolveGPS();
    })();

    return () => {
      mountedRef.current = false;
    };
  }, [resolveGPS]);

  const setManualCity = useCallback(
    async (newCity: string, newState?: string) => {
      setCity(newCity);
      setState(newState ?? null);
      setIsManual(true);
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ city: newCity, state: newState })
        );
      } catch {
        // best effort
      }
    },
    []
  );

  const resetToGPS = useCallback(async () => {
    setIsManual(false);
    setCity(null);
    setState(null);
    setIsLoading(true);
    setPermissionDenied(false);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // best effort
    }
    await resolveGPS();
  }, [resolveGPS]);

  const retryPermission = useCallback(async () => {
    setIsLoading(true);
    setPermissionDenied(false);
    await resolveGPS();
  }, [resolveGPS]);

  return (
    <LocationContext.Provider
      value={{
        city,
        state,
        lat,
        lng,
        isManual,
        isLoading,
        permissionDenied,
        setManualCity,
        resetToGPS,
        retryPermission,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) {
    throw new Error("useAppLocation must be used inside <LocationProvider>");
  }
  return ctx;
}
