import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CarouselAd {
  id: number;
  title: string;
  creative_url?: string;
  image_url?: string;
  cta_url?: string;
  ad_type: string;
  status: string;
  approval_status: string;
  daily_budget?: number;
  duration_days?: number;
  impressions?: number;
  clicks?: number;
  user?: { id: number; name: string; phone: string };
  business?: { id: number; company_name: string; logo_url?: string };
  variants?: any[];
}

interface AdsCarouselState {
  // Carousel display state
  currentAdIndex: number;
  adsList: CarouselAd[];
  selectedAd: CarouselAd | null;

  // Modal state
  showAdModal: boolean;

  // Loading/error states
  isLoading: boolean;
  error: string | null;

  // Auto-scroll state
  isAutoScrolling: boolean;

  // Initialization tracking (survives navigation)
  lastInitializedAdIds: string; // CSV of ad IDs we last initialized
}

const initialState: AdsCarouselState = {
  currentAdIndex: 0,
  adsList: [],
  selectedAd: null,
  showAdModal: false,
  isLoading: false,
  error: null,
  isAutoScrolling: true,
  lastInitializedAdIds: '',
};

const adsCarouselSlice = createSlice({
  name: 'adsCarousel',
  initialState,
  reducers: {
    // Set the list of ads (filters out ads without images)
    setAdsList(state, action: PayloadAction<CarouselAd[]>) {
      console.log('[adsCarousel] Setting ads list:', action.payload.length, 'ads');
      // Filter out ads without creative_url or image_url
      const filteredAds = action.payload.filter(
        ad => ad.creative_url || ad.image_url
      );
      console.log('[adsCarousel] After filtering:', filteredAds.length, 'ads with images');
      state.adsList = filteredAds;
      state.isLoading = false;
    },

    // Update current carousel index
    setCurrentAdIndex(state, action: PayloadAction<number>) {
      const newIndex = action.payload;
      if (newIndex >= 0) {
        state.currentAdIndex = newIndex;
      }
    },

    // Go to next ad (handles wrapping)
    nextAd(state) {
      if (state.adsList.length === 0) return;
      state.currentAdIndex = (state.currentAdIndex + 1) % state.adsList.length;
      console.log(`[adsCarousel] Next → Index: ${state.currentAdIndex}`);
    },

    // Go to previous ad (handles wrapping)
    previousAd(state) {
      if (state.adsList.length === 0) return;
      state.currentAdIndex =
        (state.currentAdIndex - 1 + state.adsList.length) % state.adsList.length;
      console.log(`[adsCarousel] Prev ← Index: ${state.currentAdIndex}`);
    },

    // Select ad for modal display
    selectAd(state, action: PayloadAction<CarouselAd>) {
      console.log('[adsCarousel] Selected ad:', action.payload.id, action.payload.title);
      state.selectedAd = action.payload;
    },

    // Open modal
    openAdModal(state) {
      state.showAdModal = true;
      state.isAutoScrolling = false; // Pause auto-scroll when modal is open
      console.log('[adsCarousel] Modal opened - auto-scroll paused');
    },

    // Close modal
    closeAdModal(state) {
      state.showAdModal = false;
      state.selectedAd = null;
      state.isAutoScrolling = true; // Resume auto-scroll when modal closes
      console.log('[adsCarousel] Modal closed - auto-scroll resumed');
    },

    // Pause auto-scroll
    pauseAutoScroll(state) {
      state.isAutoScrolling = false;
      console.log('[adsCarousel] Auto-scroll paused');
    },

    // Resume auto-scroll
    resumeAutoScroll(state) {
      state.isAutoScrolling = true;
      console.log('[adsCarousel] Auto-scroll resumed');
    },

    // Set loading state
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },

    // Set error message
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      if (action.payload) {
        console.error('[adsCarousel] Error:', action.payload);
      }
    },

    // Reset carousel state
    resetCarousel(state) {
      state.currentAdIndex = 0;
      state.selectedAd = null;
      state.showAdModal = false;
      state.isAutoScrolling = true;
      state.error = null;
      console.log('[adsCarousel] Carousel reset');
    },

    // Mark ads as initialized (for detecting first load vs. return from nav)
    markAdsInitialized(state, action: PayloadAction<string>) {
      state.lastInitializedAdIds = action.payload;
    },
  },
});

export const {
  setAdsList,
  setCurrentAdIndex,
  nextAd,
  previousAd,
  selectAd,
  openAdModal,
  closeAdModal,
  pauseAutoScroll,
  resumeAutoScroll,
  setLoading,
  setError,
  resetCarousel,
  markAdsInitialized,
} = adsCarouselSlice.actions;

export default adsCarouselSlice.reducer;

// Selectors
export const selectCurrentAdIndex = (state: { adsCarousel: AdsCarouselState }) =>
  state.adsCarousel.currentAdIndex;

export const selectAdsList = (state: { adsCarousel: AdsCarouselState }) =>
  state.adsCarousel.adsList;

export const selectCurrentAd = (state: { adsCarousel: AdsCarouselState }) => {
  const { adsList, currentAdIndex } = state.adsCarousel;
  return adsList[currentAdIndex] || null;
};

export const selectSelectedAd = (state: { adsCarousel: AdsCarouselState }) =>
  state.adsCarousel.selectedAd;

export const selectShowAdModal = (state: { adsCarousel: AdsCarouselState }) =>
  state.adsCarousel.showAdModal;

export const selectIsAutoScrolling = (state: { adsCarousel: AdsCarouselState }) =>
  state.adsCarousel.isAutoScrolling;

export const selectAdsLoading = (state: { adsCarousel: AdsCarouselState }) =>
  state.adsCarousel.isLoading;

export const selectAdsError = (state: { adsCarousel: AdsCarouselState }) =>
  state.adsCarousel.error;

export const selectLastInitializedAdIds = (state: { adsCarousel: AdsCarouselState }) =>
  state.adsCarousel.lastInitializedAdIds;
