import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { X } from "lucide-react-native";
import {
  useActiveAds,
  useRecordImpression,
  useRecordClick,
} from "../../hooks/useActiveAds";
import { getAdImageUrl, prepareAdsForDisplay } from "../../utils/urlNormalizer";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_HEIGHT = 100;
const IMAGE_TIME = 5000; // 5s per ad

/* ── Demo ads (UI preview when no API ads) ── */
const DEMO_ADS = [
  {
    id: -1,
    title: "Boost Your Business",
    description: "Reach thousands of customers with Instantlly Ads",
    creative_url: null,
    creative_urls: [] as string[],
    cta: "Get Started",
    status: "active",
    business_card_id: null,
    ad_type: "banner",
    phone: "",
  },
  {
    id: -2,
    title: "Premium Listings",
    description: "Stand out from the crowd \u2014 list your business today",
    creative_url: null,
    creative_urls: [] as string[],
    cta: "List Now",
    status: "active",
    business_card_id: null,
    ad_type: "banner",
    phone: "",
  },
  {
    id: -3,
    title: "Special Offers Near You",
    description: "Discover deals from local businesses around you",
    creative_url: null,
    creative_urls: [] as string[],
    cta: "Explore",
    status: "active",
    business_card_id: null,
    ad_type: "banner",
    phone: "",
  },
] as any[];

interface BannerAdSlotProps {
  variant?: "inline" | "sticky";
  adType?: string;
}

const BannerAdSlot = ({ variant = "inline", adType }: BannerAdSlotProps) => {
  const { data: rawAds = [], isLoading } = useActiveAds(adType || "banner");
  const navigation = useNavigation<any>();
  const scrollRef = useRef<ScrollView>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordClick = useRecordClick();

  const [activeIndex, setActiveIndex] = useState(1);
  const [initialized, setInitialized] = useState(false);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

  // Use API ads if available, otherwise demo
  const ads = useMemo(() => {
    console.log('[BannerAdSlot] 📥 Raw ads received:', rawAds.length);
    if (rawAds.length > 0) {
      console.log('[BannerAdSlot] 📋 First 3 ads:', rawAds.slice(0, 3).map(a => ({
        id: a.id,
        title: a.title,
        status: a.status,
        creative_url: a.creative_url?.substring(0, 60),
        approval_status: a.approval_status
      })));
    }

    const active = rawAds.filter((a) => a.status === "active");
    console.log('[BannerAdSlot] ✅ Active ads filtered:', active.length);

    // Prepare ads with normalized URLs
    const prepared = active.length > 0 ? prepareAdsForDisplay(active) : DEMO_ADS;
    console.log('[BannerAdSlot] 🎯 Using', prepared.length, 'ads for display');

    if (prepared.length > 0 && prepared !== DEMO_ADS) {
      console.log('[BannerAdSlot] 🌐 Prepared URLs:', prepared.slice(0, 2).map(a => ({
        id: a.id,
        image_url: getAdImageUrl(a)?.substring(0, 80)
      })));
    }

    return prepared;
  }, [rawAds]);

  const isDemo = ads === DEMO_ADS;

  // Stable key to detect real data changes
  const adsDataKey = useMemo(
    () => (ads.length === 0 ? "empty" : ads.map((a) => a.id).join("-")),
    [ads],
  );

  // Infinite scroll array: [lastAd, ...ads, firstAd]
  const infiniteAds = useMemo(() => {
    if (ads.length === 0) return [];
    if (ads.length === 1) return ads;
    return [ads[ads.length - 1], ...ads, ads[0]];
  }, [adsDataKey]);

  const hasInfinite = infiniteAds.length > ads.length;

  // Track impression for current visible ad
  const visibleAd = hasInfinite
    ? infiniteAds[activeIndex]
    : ads[activeIndex] || ads[0];
  useRecordImpression(visibleAd?.id > 0 ? visibleAd.id : undefined);

  /* ── Initialize carousel ── */
  useEffect(() => {
    console.log('[BannerAdSlot] 🚀 Initialize carousel - ads:', ads.length, 'loading:', isLoading);
    if (ads.length === 0 || isLoading) {
      console.log('[BannerAdSlot] ⏭️  Skipping init - no ads or loading');
      return;
    }
    setActiveIndex(1);
    setInitialized(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setTimeout(() => {
      if (hasInfinite) {
        console.log('[BannerAdSlot] 📍 Scrolling to position 1 (infinite scroll)');
        scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
      }
      setInitialized(true);
      console.log('[BannerAdSlot] ✅ Carousel initialized');
    }, 100);
  }, [adsDataKey, isLoading]);

  /* ── Auto-scroll (recursive setTimeout, never restarts mid-sequence) ── */
  useEffect(() => {
    console.log('[BannerAdSlot] ⏱️  Auto-scroll effect - initialized:', initialized, 'ads:', infiniteAds.length);
    if (!initialized || infiniteAds.length <= 1) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const startAutoScroll = () => {
      timerRef.current = setTimeout(() => {
        console.log('[BannerAdSlot] 🔄 Auto-scroll tick - current index:', activeIndex);
        setActiveIndex((current) => {
          const next = current + 1;
          scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });

          // Boundary: reached duplicate first slide → jump back
          if (hasInfinite && next === infiniteAds.length - 1) {
            console.log('[BannerAdSlot] 🔁 Looping carousel - jumping back to start');
            setTimeout(() => {
              scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
            }, 300);
            return 1;
          }
          return next;
        });
        startAutoScroll();
      }, IMAGE_TIME);
    };

    startAutoScroll();
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [initialized]);

  /* ── Handle manual scroll ── */
  const handleScrollEnd = useCallback(
    (e: any) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / SCREEN_WIDTH);
      if (idx === activeIndex) return;
      setActiveIndex(idx);

      if (hasInfinite) {
        if (idx === 0) {
          setTimeout(() => {
            scrollRef.current?.scrollTo({
              x: (infiniteAds.length - 2) * SCREEN_WIDTH,
              animated: false,
            });
            setActiveIndex(infiniteAds.length - 2);
          }, 50);
        } else if (idx === infiniteAds.length - 1) {
          setTimeout(() => {
            scrollRef.current?.scrollTo({ x: SCREEN_WIDTH, animated: false });
            setActiveIndex(1);
          }, 50);
        }
      }
    },
    [activeIndex, hasInfinite, infiniteAds.length],
  );

  /* ── Image URL helper ── */
  const getImageUrl = (ad: any) => getAdImageUrl(ad);

  /* ── Bottom media render (full-width image, exactly like FooterCarousel) ── */
  const renderBottomMedia = (ad: any) => {
    const url = getImageUrl(ad);
    if (!url) {
      return (
        <View style={[styles.media, styles.noImageBg]}>
          <Text style={styles.noImageEmoji}>📣</Text>
          <Text style={styles.noImageTitle}>{ad?.title || "Sponsored"}</Text>
          <Text style={styles.noImageDesc}>
            {ad?.description || "Check out this business"}
          </Text>
        </View>
      );
    }
    return <Image source={{ uri: url }} style={styles.media} resizeMode="cover" />;
  };

  /* ── Fullscreen media render ── */
  const renderFullscreenMedia = (ad: any) => {
    const url = getImageUrl(ad);
    if (!url) {
      return (
        <View style={[styles.fullMedia, styles.noImageBg]}>
          <Text style={{ fontSize: 64, marginBottom: 16 }}>📣</Text>
          <Text style={styles.fullNoImageTitle}>{ad?.title || "Sponsored"}</Text>
          <Text style={styles.fullNoImageDesc}>
            {ad?.description || "Check out this business"}
          </Text>
        </View>
      );
    }
    return (
      <Image source={{ uri: url }} style={styles.fullMedia} resizeMode="contain" />
    );
  };

  /* ── Chat handler ── */
  const handleChat = (ad: any) => {
    if (!ad) return;
    setShowModal(false);
    if (ad.business_card_id) {
      navigation.navigate("Messaging", { businessId: ad.business_card_id });
    }
  };

  /* ── Call handler ── */
  const handleCall = (ad: any) => {
    if (!ad) return;
    setShowModal(false);
    // If business card has phone, use it; otherwise navigate to business
    if (ad.phone) {
      Linking.openURL(`tel:${ad.phone}`);
    } else if (ad.business_card_id) {
      navigation.navigate("BusinessDetail", {
        id: `card-${ad.business_card_id}`,
      });
    }
  };

  if (ads.length === 0 && !isLoading) {
    console.log('[BannerAdSlot] ❌ No ads to display and not loading - returning null');
    return null;
  }

  console.log('[BannerAdSlot] 🎨 Render - ads:', ads.length, 'isLoading:', isLoading, 'isDemo:', isDemo);

  return (
    <View style={styles.container}>
      {/* Loading state */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#10B981" />
          <Text style={styles.loadingText}>Loading ads...</Text>
        </View>
      )}

      {/* Empty state */}
      {!isLoading && ads.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No ads available</Text>
        </View>
      )}

      {/* Bottom banner carousel — full-width images */}
      {!isLoading && ads.length > 0 && (
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          removeClippedSubviews={false}
          onMomentumScrollEnd={handleScrollEnd}
          scrollEventThrottle={16}
        >
          {(hasInfinite ? infiniteAds : ads).map((ad, index) => (
            <View key={`${ad.id}-${index}`} style={styles.slide}>
              {renderBottomMedia(ad)}

              {/* Tap layer */}
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={() => {
                  if (ad.id > 0) recordClick(ad.id);
                  setSelectedAd(ad);
                  setShowModal(true);
                }}
              />
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── FULLSCREEN MODAL ── */}
      <Modal visible={showModal} animationType="fade">
        <View style={styles.modal}>
          {selectedAd && renderFullscreenMedia(selectedAd)}

          {/* Close button */}
          <Pressable style={styles.close} onPress={() => setShowModal(false)}>
            <X size={28} color="#fff" />
          </Pressable>

          {/* Horizontal button row — Chat + Call Now */}
          <View style={styles.buttonRow}>
            <Pressable
              style={[styles.ctaButton, { backgroundColor: "#3B82F6" }]}
              onPress={() => handleChat(selectedAd)}
            >
              <Text style={styles.ctaText}>Chat</Text>
            </Pressable>

            <Pressable
              style={[styles.ctaButton, { backgroundColor: "#10B981" }]}
              onPress={() => handleCall(selectedAd)}
            >
              <Text style={styles.ctaText}>Call Now</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default BannerAdSlot;

/* ── STYLES (matching FooterCarousel exactly) ── */
const styles = StyleSheet.create({
  /* Bottom bar */
  container: {
    height: BOTTOM_HEIGHT,
    backgroundColor: "#000",
  },
  slide: {
    width: SCREEN_WIDTH,
    height: BOTTOM_HEIGHT,
  },
  media: {
    width: "100%",
    height: "100%",
  },

  /* No-image fallback for bottom */
  noImageBg: {
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  noImageEmoji: { fontSize: 28 },
  noImageTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  noImageDesc: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 2,
  },

  /* Loading / empty */
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#9CA3AF",
    marginTop: 8,
    fontSize: 12,
  },
  emptyText: {
    color: "#9CA3AF",
    fontSize: 12,
  },

  /* Fullscreen modal */
  modal: {
    flex: 1,
    backgroundColor: "#000",
  },
  fullMedia: {
    width: "100%",
    height: "100%",
  },
  fullNoImageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  fullNoImageDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  close: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  buttonRow: {
    position: "absolute",
    bottom: 40,
    flexDirection: "row",
    alignSelf: "center",
    gap: 15,
  },
  ctaButton: {
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 30,
    minWidth: 120,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  ctaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
