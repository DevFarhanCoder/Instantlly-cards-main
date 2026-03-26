import { useEffect, useMemo, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Linking } from "react-native";
import {
  ArrowRight,
  CalendarCheck,
  MapPin,
  MessageCircle,
  Phone,
  X,
} from "lucide-react-native";
import { Button } from "../ui/button";
import { colors } from "../../theme/colors";
import {
  recordAdClick,
  useActiveAds,
  useRecordImpression,
} from "../../hooks/useActiveAds";
import { supabase } from "../../integrations/supabase/client";

interface BannerAdSlotProps {
  variant?: "inline" | "sticky";
  adType?: string;
}

const BannerAdSlot = ({ variant = "inline", adType }: BannerAdSlotProps) => {
  const { data: ads = [] } = useActiveAds(adType || "banner");
  const navigation = useNavigation<any>();
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [businessCard, setBusinessCard] = useState<any>(null);

  const activeAds = useMemo(
    () => ads.filter((a) => a.status === "active"),
    [ads]
  );

  useEffect(() => {
    if (expanded || activeAds.length === 0) return;
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % activeAds.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [expanded, activeAds.length]);

  const ad = activeAds[index];

  useRecordImpression(ad?.id);

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

  if (activeAds.length === 0 || dismissed) return null;

  const handleClick = () => {
    if (ad) recordAdClick(ad.id);
    setExpanded(true);
  };

  const handleCta = (action: string) => {
    if (!businessCard && !ad) return;
    setExpanded(false);

    switch (action) {
      case "call":
        Linking.openURL(`tel:${businessCard?.phone || ""}`);
        break;
      case "chat":
        navigation.navigate("Messaging", {
          businessId: businessCard?.id || ad?.business_card_id,
        });
        break;
      case "directions":
        if (businessCard?.maps_link) {
          Linking.openURL(businessCard.maps_link);
        } else if (businessCard?.latitude && businessCard?.longitude) {
          Linking.openURL(
            `https://www.google.com/maps?q=${businessCard.latitude},${businessCard.longitude}`
          );
        }
        break;
      case "book":
        navigation.navigate("BusinessDetail", {
          id: businessCard?.id || ad?.business_card_id,
        });
        break;
      case "learn":
        navigation.navigate("BusinessDetail", {
          id: businessCard?.id || ad?.business_card_id,
        });
        break;
    }
  };

  const hasImage =
    ad?.creative_url || (ad?.creative_urls && ad.creative_urls.length > 0);
  const imageUrl = ad?.creative_url || ad?.creative_urls?.[0];

  return (
    <>
      <Pressable
        onPress={handleClick}
        style={[
          styles.bannerBase,
          variant === "sticky" ? styles.bannerSticky : styles.bannerInline,
        ]}
      >
        <Text style={styles.adLabel}>Ad</Text>
        {hasImage ? (
          <Image source={{ uri: imageUrl! }} style={styles.bannerImage} />
        ) : (
          <View style={styles.bannerFallback}>
            <Text style={styles.bannerEmoji}>📣</Text>
          </View>
        )}
        <View style={styles.bannerBody}>
          <Text
            style={[
              styles.bannerTitle,
              variant === "sticky" && styles.bannerTitleSticky,
            ]}
          >
            {ad?.title || "Sponsored"}
          </Text>
          <Text
            style={[
              styles.bannerDesc,
              variant === "sticky" && styles.bannerDescSticky,
            ]}
            numberOfLines={1}
          >
            {ad?.description || "Check out this business"}
          </Text>
        </View>
        <Button
          size="sm"
          className={
            variant === "sticky"
              ? "bg-background text-foreground"
              : "bg-primary text-primary-foreground"
          }
        >
          {ad?.cta || "Learn More"}
        </Button>
      </Pressable>

      {activeAds.length > 1 && (
        <View style={styles.dotsRow}>
          {activeAds.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}

      <Modal visible={expanded} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Pressable style={styles.modalClose} onPress={() => setExpanded(false)}>
              <X size={20} color="#fff" />
            </Pressable>

            <View style={styles.modalBody}>
              {hasImage ? (
                <Image source={{ uri: imageUrl! }} style={styles.modalImage} />
              ) : (
                <View style={styles.modalFallback}>
                  <Text style={styles.modalEmoji}>📣</Text>
                </View>
              )}
              <Text style={styles.modalLabel}>Sponsored</Text>
              <Text style={styles.modalTitle}>{ad?.title}</Text>
              {ad?.description && (
                <Text style={styles.modalDesc}>{ad.description}</Text>
              )}
            </View>

            <View style={styles.modalActions}>
              {businessCard ? (
                <View style={styles.modalGrid}>
                  <Button size="lg" className="rounded-xl" onPress={() => handleCta("call")}>
                    <Phone size={14} color="#fff" /> Call Now
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-xl"
                    onPress={() => handleCta("chat")}
                  >
                    <MessageCircle size={14} color={colors.foreground} /> Chat
                  </Button>
                  {(businessCard.maps_link || businessCard.latitude) && (
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-xl"
                      onPress={() => handleCta("directions")}
                    >
                      <MapPin size={14} color={colors.foreground} /> Directions
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-xl"
                    onPress={() => handleCta("learn")}
                  >
                    <ArrowRight size={14} color={colors.foreground} /> View Business
                  </Button>
                </View>
              ) : (
                <Button size="lg" className="rounded-xl">
                  {ad?.cta || "Learn More"}
                </Button>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bannerBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
  },
  bannerInline: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    marginHorizontal: 16,
  },
  bannerSticky: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  adLabel: {
    position: "absolute",
    top: 6,
    right: 6,
    fontSize: 9,
    color: colors.mutedForeground,
    backgroundColor: colors.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  bannerImage: {
    height: 56,
    width: 56,
    borderRadius: 10,
  },
  bannerFallback: {
    height: 56,
    width: 56,
    borderRadius: 10,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerEmoji: {
    fontSize: 24,
  },
  bannerBody: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.foreground,
  },
  bannerTitleSticky: {
    color: colors.primaryForeground,
  },
  bannerDesc: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  bannerDescSticky: {
    color: "rgba(255,255,255,0.75)",
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 6,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: colors.primary,
  },
  dotInactive: {
    backgroundColor: "rgba(106,113,129,0.3)",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalContent: {
    flex: 1,
  },
  modalClose: {
    position: "absolute",
    top: 16,
    right: 16,
    height: 40,
    width: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  modalBody: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalImage: {
    width: "100%",
    maxHeight: "50%",
    borderRadius: 20,
    marginBottom: 20,
  },
  modalFallback: {
    width: "100%",
    height: 200,
    borderRadius: 20,
    backgroundColor: "#E0F2FE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  modalEmoji: {
    fontSize: 48,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  modalDesc: {
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: "center",
    marginTop: 8,
  },
  modalActions: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 16,
    backgroundColor: colors.card,
  },
  modalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
});

export default BannerAdSlot;
