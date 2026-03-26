import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../integrations/supabase/client";
import { useAuth } from "../hooks/useAuth";

interface FavoritesContextType {
  favorites: string[];
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  loading: boolean;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
  loading: false,
});

const FAVORITES_KEY = "favorites";

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadLocal = async () => {
      try {
        const stored = await AsyncStorage.getItem(FAVORITES_KEY);
        setFavorites(stored ? JSON.parse(stored) : []);
      } catch {
        setFavorites([]);
      }
    };

    if (!user) {
      loadLocal();
      return;
    }

    setLoading(true);
    supabase
      .from("favorites")
      .select("business_id")
      .then(({ data, error }) => {
        if (!error && data) {
          setFavorites(data.map((f) => f.business_id));
        }
        setLoading(false);
      });
  }, [user]);

  const toggleFavorite = useCallback(
    async (id: string) => {
      if (!user) {
        setFavorites((prev) => {
          const next = prev.includes(id)
            ? prev.filter((f) => f !== id)
            : [...prev, id];
          AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(next)).catch(() => {});
          return next;
        });
        return;
      }

      const isFav = favorites.includes(id);
      setFavorites((prev) =>
        isFav ? prev.filter((f) => f !== id) : [...prev, id]
      );

      if (isFav) {
        await supabase.from("favorites").delete().eq("user_id", user.id).eq("business_id", id);
      } else {
        await supabase.from("favorites").insert({ user_id: user.id, business_id: id });
      }
    },
    [user, favorites]
  );

  const isFavorite = useCallback(
    (id: string) => favorites.includes(id),
    [favorites]
  );

  return (
    <FavoritesContext.Provider
      value={{ favorites, toggleFavorite, isFavorite, loading }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
