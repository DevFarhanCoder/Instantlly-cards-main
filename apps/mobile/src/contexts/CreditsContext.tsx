import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  'http://localhost:8080';

interface CreditsContextType {
  credits: number;
  creditsExpiryDate: string | null;
  daysRemaining: number | null;
  expired: boolean;
  loading: boolean;
  refreshCredits: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType>({
  credits: 0,
  creditsExpiryDate: null,
  daysRemaining: null,
  expired: false,
  loading: true,
  refreshCredits: () => Promise.resolve(),
});

export function CreditsProvider({ children }: { children: ReactNode }) {
  const [credits, setCredits] = useState(0);
  const [creditsExpiryDate, setCreditsExpiryDate] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBalance = async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken');
      if (!token) { setLoading(false); return; }

      const res = await fetch(`${API_URL}/api/credits/balance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setLoading(false); return; }

      const data = await res.json();
      setCredits(data.credits ?? 0);
      setCreditsExpiryDate(data.creditsExpiryDate ?? null);
      setDaysRemaining(data.daysRemaining ?? null);
      setExpired(data.expired ?? false);
    } catch {
      // silent — keep previous value
    } finally {
      setLoading(false);
    }
  };

  const refreshCredits = () => fetchBalance();

  useEffect(() => {
    fetchBalance();
    intervalRef.current = setInterval(fetchBalance, 3000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <CreditsContext.Provider value={{ credits, creditsExpiryDate, daysRemaining, expired, loading, refreshCredits }}>
      {children}
    </CreditsContext.Provider>
  );
}

export const useCredits = () => useContext(CreditsContext);
