import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load favorites from DB when user logs in
  useEffect(() => {
    if (!user) {
      // Fall back to localStorage for non-authenticated users
      try {
        setFavorites(JSON.parse(localStorage.getItem("favorites") || "[]"));
      } catch { setFavorites([]); }
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

  const toggleFavorite = useCallback(async (id: string) => {
    if (!user) {
      // localStorage fallback for non-authenticated
      setFavorites((prev) => {
        const next = prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id];
        localStorage.setItem("favorites", JSON.stringify(next));
        return next;
      });
      return;
    }

    const isFav = favorites.includes(id);
    // Optimistic update
    setFavorites((prev) => isFav ? prev.filter((f) => f !== id) : [...prev, id]);

    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("business_id", id);
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, business_id: id });
    }
  }, [user, favorites]);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, loading }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
