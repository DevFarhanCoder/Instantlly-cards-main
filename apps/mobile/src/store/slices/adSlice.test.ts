import { configureStore } from '@reduxjs/toolkit';
import adReducer, {
  setAds,
  setCarouselIndex,
  nextAd,
  skipToNextAd,
  selectAdForModal,
  closeModal,
  recordImpression,
  recordClick,
  resetAdCarousel,
  selectAds,
  selectFilteredAds,
  selectCarouselIndex,
  selectCurrentAd,
  selectSelectedAd,
  selectIsModalVisible,
  Ad,
  AdCarouselState,
} from './adSlice';

// Mock ads for testing
const mockAds: Ad[] = [
  {
    id: 1,
    title: 'Ad 1',
    creative_url: 'https://example.com/ad1.jpg',
    ad_type: 'banner',
    approval_status: 'approved',
    status: 'active',
  },
  {
    id: 2,
    title: 'Ad 2',
    creative_url: 'https://example.com/ad2.jpg',
    ad_type: 'banner',
    approval_status: 'approved',
    status: 'active',
  },
  {
    id: 3,
    title: 'Ad 3 (no image)',
    ad_type: 'banner',
    approval_status: 'approved',
    status: 'active',
  },
  {
    id: 4,
    title: 'Ad 4',
    image_url: 'https://example.com/ad4.jpg',
    ad_type: 'banner',
    approval_status: 'approved',
    status: 'active',
  },
];

describe('adSlice - Reducers', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: { ads: adReducer },
    });
  });

  describe('setAds', () => {
    test('should set ads and filter out those without images', () => {
      store.dispatch(setAds(mockAds));
      const state = store.getState().ads;

      // Should have 3 ads (Id 3 has no image)
      expect(state.filteredAds.length).toBe(3);
      expect(state.filteredAds.some((a) => a.id === 3)).toBe(false);

      // All a 4 should be in main list
      expect(state.ads.length).toBe(4);
    });

    test('should create infinite list with duplicates', () => {
      store.dispatch(setAds(mockAds));
      const state = store.getState().ads;

      // Infinite list should be: [last, ...filtered, first]
      // So: [Ad4, Ad1, Ad2, Ad4, Ad1]
      expect(state.infiniteAdsList.length).toBe(5); // 3 filtered + 2 duplicates

      // First should be last ad
      expect(state.infiniteAdsList[0].id).toBe(4);

      // Last should be first ad
      expect(state.infiniteAdsList[4].id).toBe(1);
    });

    test('should set isInitialized to true', () => {
      expect(store.getState().ads.isInitialized).toBe(false);
      store.dispatch(setAds(mockAds));
      expect(store.getState().ads.isInitialized).toBe(true);
    });

    test('should clear error on successful set', () => {
      const state = store.getState().ads;
      expect(state.error).toBe(null);
    });
  });

  describe('setCarouselIndex', () => {
    beforeEach(() => {
      store.dispatch(setAds(mockAds));
    });

    test('should update carousel index', () => {
      store.dispatch(setCarouselIndex(2));
      expect(store.getState().ads.carouselIndex).toBe(2);
    });

    test('should update lastScrolledIndex', () => {
      store.dispatch(setCarouselIndex(3));
      expect(store.getState().ads.lastScrolledIndex).toBe(3);
    });

    test('should not set invalid index', () => {
      const initialIndex = store.getState().ads.carouselIndex;
      store.dispatch(setCarouselIndex(-1));
      expect(store.getState().ads.carouselIndex).toBe(initialIndex);
    });
  });

  describe('nextAd', () => {
    beforeEach(() => {
      store.dispatch(setAds(mockAds));
    });

    test('should increment carousel index', () => {
      const initialIndex = store.getState().ads.carouselIndex;
      store.dispatch(nextAd());
      expect(store.getState().ads.carouselIndex).toBe(initialIndex + 1);
    });

    test('should wrap around at end', () => {
      const state = store.getState().ads;
      const maxIndex = state.infiniteAdsList.length;

      // Set to last index
      store.dispatch(setCarouselIndex(maxIndex - 1));
      store.dispatch(nextAd());

      // Should wrap to 1 (after first duplicate)
      expect(store.getState().ads.carouselIndex).toBe(1);
    });
  });

  describe('selectAdForModal', () => {
    beforeEach(() => {
      store.dispatch(setAds(mockAds));
    });

    test('should set selectedAd and open modal', () => {
      store.dispatch(selectAdForModal(mockAds[0]));
      const state = store.getState().ads;

      expect(state.selectedAd).toEqual(mockAds[0]);
      expect(state.isModalVisible).toBe(true);
    });
  });

  describe('closeModal', () => {
    beforeEach(() => {
      store.dispatch(setAds(mockAds));
      store.dispatch(selectAdForModal(mockAds[0]));
    });

    test('should close modal and clear selectedAd', () => {
      store.dispatch(closeModal());
      const state = store.getState().ads;

      expect(state.selectedAd).toBe(null);
      expect(state.isModalVisible).toBe(false);
    });

    test('should preserve carousel position', () => {
      store.dispatch(setCarouselIndex(2));
      store.dispatch(closeModal());

      expect(store.getState().ads.carouselIndex).toBe(2);
    });
  });

  describe('recordImpression', () => {
    beforeEach(() => {
      store.dispatch(setAds(mockAds));
    });

    test('should increment impressions for ad', () => {
      const initialImpressions = mockAds[0].impressions || 0;
      store.dispatch(recordImpression(1));

      const ad = store.getState().ads.ads.find((a) => a.id === 1);
      expect(ad?.impressions).toBe(initialImpressions + 1);
    });
  });

  describe('recordClick', () => {
    beforeEach(() => {
      store.dispatch(setAds(mockAds));
    });

    test('should increment clicks for ad', () => {
      const initialClicks = mockAds[0].clicks || 0;
      store.dispatch(recordClick(1));

      const ad = store.getState().ads.ads.find((a) => a.id === 1);
      expect(ad?.clicks).toBe(initialClicks + 1);
    });
  });

  describe('resetAdCarousel', () => {
    beforeEach(() => {
      store.dispatch(setAds(mockAds));
      store.dispatch(setCarouselIndex(2));
      store.dispatch(selectAdForModal(mockAds[0]));
    });

    test('should reset carousel state', () => {
      store.dispatch(resetAdCarousel());
      const state = store.getState().ads;

      expect(state.carouselIndex).toBe(1);
      expect(state.selectedAd).toBe(null);
      expect(state.isModalVisible).toBe(false);
    });
  });
});

describe('adSlice - Selectors', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: { ads: adReducer },
    });
    store.dispatch(setAds(mockAds));
  });

  test('selectAds returns all ads', () => {
    const ads = selectAds(store.getState());
    expect(ads.length).toBe(4);
  });

  test('selectFilteredAds returns only ads with images', () => {
    const filtered = selectFilteredAds(store.getState());
    expect(filtered.length).toBe(3);
    expect(filtered.some((a) => a.id === 3)).toBe(false);
  });

  test('selectCarouselIndex returns current index', () => {
    store.dispatch(setCarouselIndex(2));
    const index = selectCarouselIndex(store.getState());
    expect(index).toBe(2);
  });

  test('selectCurrentAd returns ad at carousel index', () => {
    store.dispatch(setCarouselIndex(1)); // First real ad
    const current = selectCurrentAd(store.getState());
    expect(current?.id).toBe(1);
  });

  test('selectSelectedAd returns modal ad', () => {
    store.dispatch(selectAdForModal(mockAds[0]));
    const selected = selectSelectedAd(store.getState());
    expect(selected?.id).toBe(1);
  });

  test('selectIsModalVisible returns modal visibility', () => {
    expect(selectIsModalVisible(store.getState())).toBe(false);

    store.dispatch(selectAdForModal(mockAds[0]));
    expect(selectIsModalVisible(store.getState())).toBe(true);

    store.dispatch(closeModal());
    expect(selectIsModalVisible(store.getState())).toBe(false);
  });
});

describe('adSlice - State Persistence', () => {
  let store: ReturnType<typeof configureStore>;

  test('should preserve carousel position after navigation', () => {
    store = configureStore({
      reducer: { ads: adReducer },
    });

    // Load ads and navigate to position 2
    store.dispatch(setAds(mockAds));
    store.dispatch(setCarouselIndex(2));
    const savedIndex = selectCarouselIndex(store.getState());

    // Simulate navigation away and back
    const savedState = store.getState().ads;

    // Create new store with saved state
    store = configureStore({
      reducer: { ads: adReducer },
      preloadedState: { ads: savedState },
    });

    // Should restore to position 2
    expect(selectCarouselIndex(store.getState())).toBe(savedIndex);
  });

  test('should not restart carousel on modal open/close', () => {
    store = configureStore({
      reducer: { ads: adReducer },
    });

    store.dispatch(setAds(mockAds));
    store.dispatch(setCarouselIndex(2));

    // Open and close modal
    store.dispatch(selectAdForModal(mockAds[0]));
    store.dispatch(closeModal());

    // Should still be at position 2
    expect(selectCarouselIndex(store.getState())).toBe(2);
  });
});
