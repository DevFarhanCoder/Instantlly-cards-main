import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

// ─── Type Definitions ───────────────────────────────────────────────────────

export interface Ad {
  priority: number;
  id: number;
  title: string;
  description?: string;
  ad_type: 'banner' | 'interstitial' | 'both';

  // Creative URLs
  creative_url?: string;
  creative_urls?: string[];
  image_url?: string;

  // CTA
  cta_url?: string;
  cta?: string;
  phone_number?: string;

  // Metadata
  approval_status: 'pending' | 'approved' | 'rejected';
  status: 'active' | 'paused' | 'completed';
  daily_budget?: number;
  impressions?: number;
  clicks?: number;
  spent?: number;

  // User/Business
  user?: { id: number; name: string; phone: string; email?: string };
  business?: { id: number; company_name: string; logo_url?: string };

  // Timestamps
  created_at?: string;
  start_date?: string;
  end_date?: string;
}

export interface AdCarouselState {
  // Ad data
  ads: Ad[];
  filteredAds: Ad[];             // Only ads with images
  carouselIndex: number;          // Current carousel position
  infiniteAdsList: Ad[];          // With duplicates for infinite loop

  // Modal state
  selectedAd: Ad | null;
  isModalVisible: boolean;

  // Loading & errors
  isLoading: boolean;
  error: string | null;

  // State persistence
  lastScrolledIndex: number;
  isInitialized: boolean;
}

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: AdCarouselState = {
  ads: [],
  filteredAds: [],
  carouselIndex: 1,              // Start at 1 (after first duplicate for infinite loop)
  infiniteAdsList: [],
  selectedAd: null,
  isModalVisible: false,
  isLoading: false,
  error: null,
  lastScrolledIndex: 0,
  isInitialized: false,
};

// ─── Slice ──────────────────────────────────────────────────────────────────

const adSlice = createSlice({
  name: 'ads',
  initialState,
  reducers: {
    // ─── Ad Loading ─────────────────────────────────────────────────────
    setAdLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setAdError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    /**
     * Set ads from API and create infinite scroll list
     * Filters out ads without images
     */
    setAds: (state, action: PayloadAction<Ad[]>) => {
      console.log('[adSlice] Setting ads:', action.payload.length, 'total');

      state.ads = action.payload;

      // Filter: only ads with images
      const withImages = action.payload.filter((ad) => {
        const hasImage =
          ad.creative_url ||
          (ad.creative_urls && ad.creative_urls.length > 0) ||
          ad.image_url;
        return !!hasImage;
      });

      console.log(
        '[adSlice] Filtered ads with images:',
        withImages.length,
        `(skipped ${action.payload.length - withImages.length})`
      );

      state.filteredAds = withImages;

      // Create infinite scroll list
      // Strategy: [last, ...ads, first] for seamless loop
      if (withImages.length > 0) {
        const lastAd = withImages[withImages.length - 1];
        const firstAd = withImages[0];
        state.infiniteAdsList = [lastAd, ...withImages, firstAd];
        state.carouselIndex = 1; // Start at first real ad
      } else {
        state.infiniteAdsList = [];
        state.carouselIndex = 0;
      }

      state.isInitialized = true;
      state.error = null;
    },

    // ─── Carousel Navigation ────────────────────────────────────────────
    /**
     * Update carousel position
     * Only sets valid indices within bounds
     */
    setCarouselIndex: (state, action: PayloadAction<number>) => {
      const newIndex = action.payload;
      const listLength = state.infiniteAdsList.length;

      // Validate index is within bounds
      if (newIndex < 0 || newIndex >= listLength) {
        return; // Reject invalid index
      }

      state.carouselIndex = newIndex;
      state.lastScrolledIndex = newIndex;
    },

    /**
     * Auto-scroll to next ad
     */
    nextAd: (state) => {
      if (state.infiniteAdsList.length <= 1) return;

      const nextIndex = state.carouselIndex + 1;
      const listLength = state.infiniteAdsList.length;

      // Wrap around logic
      if (nextIndex >= listLength) {
        state.carouselIndex = 1;
      } else {
        state.carouselIndex = nextIndex;
      }
    },

    /**
     * Skip to next ad with image
     */
    skipToNextAd: (state) => {
      if (state.filteredAds.length <= 1) return;

      const currentAd = state.infiniteAdsList[state.carouselIndex];
      const currentIndex = state.filteredAds.findIndex(
        (a) => a.id === currentAd?.id
      );

      if (currentIndex === -1) {
        state.carouselIndex = 1;
        return;
      }

      const nextIndex = (currentIndex + 1) % state.filteredAds.length;
      // Add 1 because infiniteAdsList has [last, ...ads, first]
      state.carouselIndex = nextIndex + 1;
    },

    // ─── Modal Management ───────────────────────────────────────────────
    /**
     * Open full-screen modal with selected ad
     */
    selectAdForModal: (state, action: PayloadAction<Ad>) => {
      console.log('[adSlice] Modal opened for ad:', action.payload.id);
      state.selectedAd = action.payload;
      state.isModalVisible = true;
    },

    /**
     * Close full-screen modal
     * Preserves carousel position
     */
    closeModal: (state) => {
      console.log('[adSlice] Modal closed, carousel position:', state.carouselIndex);
      state.selectedAd = null;
      state.isModalVisible = false;
    },

    // ─── Analytics ──────────────────────────────────────────────────────
    /**
     * Increment impression count
     */
    recordImpression: (state, action: PayloadAction<number>) => {
      // Find ad in list and increment impressions
      const ad = state.ads.find((a) => a.id === action.payload);
      if (ad) {
        ad.impressions = (ad.impressions || 0) + 1;
      }
    },

    /**
     * Increment click count
     */
    recordClick: (state, action: PayloadAction<number>) => {
      const ad = state.ads.find((a) => a.id === action.payload);
      if (ad) {
        ad.clicks = (ad.clicks || 0) + 1;
      }
    },

    // ─── State Reset ────────────────────────────────────────────────────
    resetAdCarousel: (state) => {
      if (state.filteredAds.length > 0) {
        state.carouselIndex = 1;
        state.selectedAd = null;
        state.isModalVisible = false;
      }
    },

    resetAllAdState: () => initialState,
  },
});

// ─── Actions ────────────────────────────────────────────────────────────────

export const {
  setAdLoading,
  setAdError,
  setAds,
  setCarouselIndex,
  nextAd,
  skipToNextAd,
  selectAdForModal,
  closeModal,
  recordImpression,
  recordClick,
  resetAdCarousel,
  resetAllAdState,
} = adSlice.actions;

// ─── Selectors ──────────────────────────────────────────────────────────────

export const selectAds = (state: any) => state.ads.ads;
export const selectFilteredAds = (state: any) => state.ads.filteredAds;
export const selectInfiniteAdsList = (state: any) => state.ads.infiniteAdsList;
export const selectCarouselIndex = (state: any) => state.ads.carouselIndex;
export const selectCurrentAd = (state: any) => {
  const { infiniteAdsList, carouselIndex } = state.ads;
  if (!infiniteAdsList.length) return null;
  return infiniteAdsList[carouselIndex] || null;
};
export const selectSelectedAd = (state: any) => state.ads.selectedAd;
export const selectIsModalVisible = (state: any) => state.ads.isModalVisible;
export const selectIsAdLoading = (state: any) => state.ads.isLoading;
export const selectAdError = (state: any) => state.ads.error;
export const selectIsAdInitialized = (state: any) => state.ads.isInitialized;
export const selectLastScrolledIndex = (state: any) => state.ads.lastScrolledIndex;

export default adSlice.reducer;
