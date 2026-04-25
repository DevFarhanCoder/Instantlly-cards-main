import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  type Variants,
} from "framer-motion";
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  CalendarCheck,
  ArrowRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  useActiveAds,
  useRecordImpression,
  recordAdClick,
  type ActiveAd,
} from "@/hooks/useActiveAds";
import { supabase } from "@/integrations/supabase/client";

interface BannerAdSlotProps {
  variant?: "inline" | "sticky";
  adType?: string;
}

const BannerAdSlot = ({ variant = "inline", adType }: BannerAdSlotProps) => {
  const { data: ads = [] } = useActiveAds(adType || "banner");
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [cooldownActive, setCooldownActive] = useState(false);
  const [businessCard, setBusinessCard] = useState<any>(null);
  const dragX = useMotionValue(0);
  const opacity = useTransform(dragX, [-150, 0, 150], [0, 1, 0]);

  const activeAds = useMemo(
    () => ads.filter((a) => a.status === "active"),
    [ads],
  );

  useEffect(() => {
    if (expanded || activeAds.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % activeAds.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [expanded, activeAds.length]);

  const ad = activeAds[index];

  // Record impression
  useRecordImpression(ad?.id);

  // Fetch linked business card when expanded
  useEffect(() => {
    if (!expanded || !ad?.business_card_id) {
      setBusinessCard(null);
      return;
    }
    supabase
      .from("business_cards")
      .select("*")
      .eq("id", ad.business_card_id)
      .single()
      .then(({ data }) => setBusinessCard(data));
  }, [expanded, ad?.business_card_id]);

  // Cooldown after dismiss
  useEffect(() => {
    if (!dismissed) return;
    setCooldownActive(true);
    const timer = setTimeout(() => {
      setDismissed(false);
      setCooldownActive(false);
    }, 60000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  if (activeAds.length === 0 || dismissed) return null;

  const handleClick = () => {
    if (ad) recordAdClick(ad.id);
    setExpanded(true);
  };

  const handleDragEnd = (_: any, info: { offset: { x: number } }) => {
    if (Math.abs(info.offset.x) > 100) {
      setDismissed(true);
    }
  };

  const handleCta = (action: string) => {
    if (!businessCard && !ad) return;
    setExpanded(false);

    switch (action) {
      case "call":
        window.open(`tel:${businessCard?.phone || ""}`);
        break;
      case "chat":
        navigate(
          `/messaging?businessId=${businessCard?.id || ad?.business_card_id}`,
        );
        break;
      case "directions":
        if (businessCard?.maps_link) {
          window.open(businessCard.maps_link);
        } else if (businessCard?.latitude && businessCard?.longitude) {
          window.open(
            `https://www.google.com/maps?q=${businessCard.latitude},${businessCard.longitude}`,
          );
        }
        break;
      case "book":
        navigate(`/business/${businessCard?.id || ad?.business_card_id}`);
        break;
      case "learn":
        navigate(`/business/${businessCard?.id || ad?.business_card_id}`);
        break;
    }
  };

  const hasImage =
    ad?.creative_url || (ad?.creative_urls && ad.creative_urls.length > 0);
  const imageUrl = ad?.creative_url || ad?.creative_urls?.[0];
  // Use second creative_url (index 1) as the fullscreen image if provided, otherwise fall back to banner image
  const fullscreenImageUrl =
    ad?.creative_urls && ad.creative_urls.length > 1
      ? ad.creative_urls[1]
      : imageUrl;

  const banner = (
    <div
      className={
        variant === "sticky"
          ? "fixed bottom-[57px] left-0 right-0 z-40 px-0"
          : ""
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={ad?.id || index}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
          drag={variant === "sticky" ? "x" : false}
          dragConstraints={{ left: 0, right: 0 }}
          style={variant === "sticky" ? { x: dragX, opacity } : {}}
          onDragEnd={variant === "sticky" ? handleDragEnd : undefined}
          onClick={handleClick}
          className={`flex items-center gap-3 cursor-pointer relative ${
            variant === "sticky"
              ? "bg-gradient-to-r from-primary to-primary/80 px-4 py-3"
              : "rounded-xl border border-border bg-card p-3 overflow-hidden"
          }`}
        >
          {/* Ad label */}
          <span className="absolute top-1 right-1 text-[9px] font-medium text-muted-foreground/60 bg-background/50 px-1.5 py-0.5 rounded">
            Ad
          </span>

          {hasImage ? (
            <img
              src={imageUrl!}
              alt={ad?.title || "Ad"}
              className="h-14 w-14 rounded-lg object-cover shrink-0"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
              <span className="text-2xl">📣</span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p
              className={`font-bold text-sm ${variant === "sticky" ? "text-primary-foreground" : "text-foreground"}`}
            >
              {ad?.title || "Sponsored"}
            </p>
            <p
              className={`text-xs line-clamp-1 ${variant === "sticky" ? "text-primary-foreground/70" : "text-muted-foreground"}`}
            >
              {ad?.description || "Check out this business"}
            </p>
          </div>

          <Button
            size="sm"
            className={`rounded-lg text-xs shrink-0 ${
              variant === "sticky"
                ? "bg-background text-foreground hover:bg-background/90"
                : ""
            }`}
            onClick={(e) => {
              e.stopPropagation();
              handleClick();
            }}
          >
            {ad?.cta || "Learn More"}
          </Button>
        </motion.div>
      </AnimatePresence>

      {activeAds.length > 1 && (
        <div
          className={`flex justify-center gap-1 mt-1.5 ${variant === "sticky" ? "bg-primary/80 pb-1.5" : ""}`}
        >
          {activeAds.map((_, i) => (
            <div
              key={i}
              className={`h-1 w-1 rounded-full transition-colors ${
                i === index
                  ? variant === "sticky"
                    ? "bg-primary-foreground"
                    : "bg-primary"
                  : variant === "sticky"
                    ? "bg-primary-foreground/30"
                    : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      {banner}

      {/* Fullscreen Ad Modal */}
      <AnimatePresence>
        {expanded && ad && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col bg-background"
          >
            <button
              onClick={() => setExpanded(false)}
              className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Ad Content */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 text-center overflow-hidden">
              {hasImage ? (
                <img
                  src={fullscreenImageUrl!}
                  alt={ad.title}
                  className="w-full max-h-[50vh] rounded-2xl object-cover mb-6"
                  onError={(e) => {
                    const el = e.target as HTMLImageElement;
                    el.style.display = "none";
                    el.nextElementSibling?.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div
                className={`w-full h-48 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6${hasImage ? " hidden" : ""}`}
              >
                <span className="text-7xl">📣</span>
              </div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Sponsored
              </p>
              <h2 className="text-2xl font-black text-foreground leading-tight mb-2">
                {ad.title}
              </h2>
              {ad.description && (
                <p className="text-sm text-muted-foreground max-w-xs">
                  {ad.description}
                </p>
              )}
            </div>

            {/* Deep-Link CTA Buttons */}
            <div className="flex flex-col gap-2 p-4 border-t border-border bg-card">
              {businessCard ? (
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="lg"
                    className="gap-2 rounded-xl"
                    onClick={() => handleCta("call")}
                  >
                    <Phone className="h-4 w-4" /> Call Now
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 rounded-xl"
                    onClick={() => handleCta("chat")}
                  >
                    <MessageCircle className="h-4 w-4" /> Chat
                  </Button>
                  {(businessCard.maps_link || businessCard.latitude) && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="gap-2 rounded-xl"
                      onClick={() => handleCta("directions")}
                    >
                      <MapPin className="h-4 w-4" /> Directions
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 rounded-xl"
                    onClick={() => handleCta("learn")}
                  >
                    <ArrowRight className="h-4 w-4" /> View Business
                  </Button>
                </div>
              ) : (
                <Button
                  size="lg"
                  className="w-full gap-2 rounded-xl"
                  onClick={() => setExpanded(false)}
                >
                  {ad.cta || "Learn More"}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default BannerAdSlot;
