import { useEffect, useState } from "react";
import * as Location from "expo-location";

export interface UserLocation {
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
}

export function useUserLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) return;

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });

      let city: string | null = null;
      let state: string | null = null;
      try {
        const geocode = await Location.reverseGeocodeAsync({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        const place = geocode[0];
        city = place?.city || place?.subregion || place?.district || null;
        state = place?.region || null;
      } catch {
        // geocoding failed — lat/lng still available, city/state stay null
      }

      if (mounted) {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          city,
          state,
        });
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return location;
}

export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
