import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, MapPin, Phone, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MyFavourites = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { favorites, toggleFavorite } = useFavorites();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["favorite-cards", favorites],
    queryFn: async () => {
      if (favorites.length === 0) return [];
      const { data, error } = await supabase
        .from("business_cards")
        .select("*")
        .in("id", favorites);
      if (error) throw error;
      return data;
    },
    enabled: favorites.length > 0,
  });

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-4">
        <button onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">My Favourites</h1>
        <span className="ml-auto text-xs text-muted-foreground">{favorites.length} saved</span>
      </div>

      <div className="px-4 py-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-5xl mb-3">❤️</span>
            <h3 className="text-base font-semibold text-foreground">No favourites yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tap the heart icon on any business card to save it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 cursor-pointer"
                  onClick={() => navigate(`/business/${card.id}`)}
                >
                  {card.logo_url ? (
                    <img src={card.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                  ) : (
                    <span className="text-xl">🏢</span>
                  )}
                </div>
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(`/business/${card.id}`)}
                >
                  <p className="text-sm font-semibold text-foreground truncate">
                    {card.company_name || card.full_name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {card.category && <span>{card.category}</span>}
                    {card.location && (
                      <>
                        <span>•</span>
                        <MapPin className="h-3 w-3" />
                        <span className="truncate">{card.location}</span>
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleFavorite(card.id)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-muted transition-colors"
                >
                  <Heart className="h-5 w-5 fill-red-500 text-red-500" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyFavourites;
