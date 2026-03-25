import { useState, useMemo } from "react";
import { MapPin, Navigation, Phone, MessageCircle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDirectoryCards } from "@/hooks/useDirectoryCards";
import { useUserLocation, getDistanceKm, formatDistance } from "@/hooks/useUserLocation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const NearbyBusinesses = () => {
  const navigate = useNavigate();
  const userLocation = useUserLocation();
  const { data: cards = [], isLoading } = useDirectoryCards();
  const [maxKm, setMaxKm] = useState(50);

  const sorted = useMemo(() => {
    if (!userLocation) return cards.filter((c) => c.latitude && c.longitude);
    return cards
      .filter((c) => c.latitude && c.longitude)
      .map((c) => ({
        ...c,
        distance: getDistanceKm(userLocation.latitude, userLocation.longitude, c.latitude!, c.longitude!),
      }))
      .filter((c) => c.distance <= maxKm)
      .sort((a, b) => a.distance - b.distance);
  }, [cards, userLocation, maxKm]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-card border-b border-border px-4 py-4">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Nearby Businesses
        </h1>
        {!userLocation && (
          <p className="text-xs text-muted-foreground mt-1">Enable location to see distances</p>
        )}
      </div>

      <div className="px-4 py-3 flex gap-2">
        {[5, 10, 25, 50].map((km) => (
          <Button
            key={km}
            size="sm"
            variant={maxKm === km ? "default" : "outline"}
            onClick={() => setMaxKm(km)}
            className="text-xs"
          >
            {km} km
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-16 px-4">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No businesses found within {maxKm} km</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {sorted.map((card) => (
            <div
              key={card.id}
              onClick={() => navigate(`/business/${card.id}`)}
              className="bg-card border border-border rounded-xl p-4 flex gap-3 cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg shrink-0">
                {card.logo_url ? (
                  <img src={card.logo_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  "🏢"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground truncate">
                  {card.company_name || card.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">{card.category}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  {"distance" in card && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <MapPin className="h-3 w-3" />
                      {formatDistance((card as any).distance)}
                    </Badge>
                  )}
                  <Badge className={`text-[10px] border ${card.service_mode === "home" ? "bg-blue-500/10 text-blue-600 border-blue-200" : card.service_mode === "both" ? "bg-purple-500/10 text-purple-600 border-purple-200" : "bg-amber-500/10 text-amber-600 border-amber-200"}`}>
                    {card.service_mode === "home" ? "🏠 Home Service" : card.service_mode === "both" ? "🔄 Home & Visit" : "🏪 Visit"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`tel:${card.phone}`);
                  }}
                >
                  <Phone className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/messaging");
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NearbyBusinesses;
