# Ad System Implementation Plan

## Overview
Implement a dual-format ad system with bottom carousel and full-screen modal overlays, featuring:
- Redux state management
- Auto-scrolling carousel (5-second intervals)
- Full-screen modal overlays matching InstantllyCards UI
- Skip ads without images
- State retention during interactions
- Complete test coverage (unit, functional, UI)

---

## Architecture

### 1. Redux Store Structure
```
store/
├── slices/
│   └── adSlice.ts
│       ├── State:
│       │   - ads: Ad[]                    // All fetched ads
│       │   - filteredAds: Ad[]            // Ads with images (filtered)
│       │   - carouselIndex: number        // Current carousel position
│       │   - selectedAd: Ad | null        // Ad opened in modal
│       │   - isModalVisible: boolean      // Full-screen modal visibility
│       │   - isLoading: boolean           // Loading state
│       │   - error: string | null         // Error state
│       │   - lastScrolledIndex: number    // For state persistence
│       │
│       ├── Actions:
│       │   - setAds(ads[])
│       │   - setCarouselIndex(index)
│       │   - selectAdForModal(ad)
│       │   - closeModal()
│       │   - setLoading(boolean)
│       │   - setError(error)
│       │   - skipToNextAd()
│       │
│       └── Selectors:
│           - selectAds
│           - selectFilteredAds
│           - selectCurrentAd
│           - selectIsModalVisible
│           - selectCarouselIndex
├── api/
│   └── adsApi.ts (RTK Query)
│       ├── getAds()
│       ├── getAdById(id)
│       └── tracks
└── index.ts
```

### 2. Component Hierarchy
```
App
├── HomeScreen (or any screen using ads)
│   └── AdCarousel (new component)
│       ├── Redux: useSelector(selectFilteredAds, selectCarouselIndex)
│       ├── Redux: useDispatch(setCarouselIndex, selectAdForModal)
│       ├── ScrollView (horizontal, pagingEnabled)
│       │   └── AdCard (loop through filteredAds)
│       │       └── Image + "Tap for full view" text
│       ├── Auto-scroll timer (useEffect)
│       └── Manual scroll handler (onScrollEnd)
│
└── FullScreenAdModal (new component)
    ├── Redux: useSelector(selectSelectedAd, selectIsModalVisible)
    ├── Redux: useDispatch(closeModal, incrementImpression)
    ├── Modal (animationType="fade", backgroundColor="#000")
    │   ├── Large Image Preview (full width, resizeMode="contain")
    │   ├── Close Button (top-right, white icon)
    │   ├── Ad Info (title, description)
    │   └── CTA Button Row
    │       ├── Chat Button (blue #3B82F6)
    │       └── Call Button (green #10B981)
    └── Error fallback (if no image, close modal)
```

### 3. Data Models
```typescript
interface Ad {
  id: number;
  title: string;
  description?: string;
  ad_type: 'bottom' | 'fullscreen' | 'both';  // Format availability

  // Creative URLs (from migration)
  creative_url?: string;      // Primary image (preferred)
  creative_urls?: string[];   // Alternative URLs
  image_url?: string;         // Fallback

  // CTA Information
  cta_url?: string;           // To open on button click
  cta?: string;               // Button text
  phone_number?: string;      // Call button

  // Metadata
  approval_status: 'pending' | 'approved' | 'rejected';
  status: 'active' | 'paused' | 'completed';
  daily_budget?: number;
  impressions?: number;
  clicks?: number;

  // User/Business Info
  user?: { id: number; name: string; phone: string };
  business?: { id: number; company_name: string; logo_url?: string };

  // Timestamps
  created_at?: string;
  start_date?: string;
  end_date?: string;
}

interface AdCarouselState {
  ads: Ad[];
  filteredAds: Ad[];                // Only ads with images
  carouselIndex: number;            // Current position [0, N-1]
  selectedAd: Ad | null;            // For modal display
  isModalVisible: boolean;          // Full-screen overlay state
  isLoading: boolean;
  error: string | null;
  lastScrolledIndex: number;        // For state persistence after interactions
}
```

---

## Implementation Steps

### Phase 1: Redux Setup
- [ ] Create `src/store/slices/adSlice.ts` with state + actions
- [ ] Create `src/store/api/adsApi.ts` with RTK Query
- [ ] Wire up in store/index.ts

### Phase 2: Components
- [ ] Create `src/components/ads/FullScreenAdModal.tsx`
  - Modal with fade animation
  - Full-screen image display
  - Close button (top-right)
  - Title + description
  - Chat & Call buttons
  - Error handling

- [ ] Create `src/components/ads/AdCarousel.tsx`
  - Horizontal ScrollView with pagingEnabled
  - Auto-scroll timer (5 seconds)
  - Infinite loop logic (duplicate first/last ads)
  - Manual scroll handler
  - Redux state persistence
  - Skip ads without images

- [ ] Create `src/utils/adHelpers.ts`
  - `normalizeAdUrl()` - Convert relative/S3 URLs to absolute
  - `filterAdsWithImages()` - Remove ads without images
  - `getAdImageUrl()` - Get best available image URL
  - `createInfiniteAdList()` - Duplicate strategy for loop

### Phase 3: URL Normalization
- [ ] Implement URL normalization (same as backend + frontend)
- [ ] Handle paths: `/api/ads/image/{id}/bottom`
- [ ] Handle S3: `https://d1rjsfuv5lw0hw.cloudfront.net/...`
- [ ] Handle direct HTTPS: `https://example.com/image.jpg`

### Phase 4: State Persistence
- [ ] Don't reset carousel on button/tab click
- [ ] Save `lastScrolledIndex` in Redux
- [ ] Restore position on component remount
- [ ] Test by navigating away and back

### Phase 5: Testing
- [ ] Unit tests: Components, reducers, helpers
- [ ] Functional tests: Ad loading, carousel auto-scroll, modal open/close
- [ ] UI tests: Image display, button functionality, state retention
- [ ] E2E: Full user flow (view carousel > click ad > see modal > close > carousel still at same position)

---

## Key Implementation Details

### Auto-Scroll Logic (Infinite Loop)
```typescript
// Original list: [A, B, C, D]
// Infinite list: [D, A, B, C, D, A]
//                 ^           ^
//              prev wrap   next wrap

// When user scrolls to last real ad (D at index 4):
// 1. Auto-scroll to (A at index 1) without animation
// 2. Continue auto-scroll from there

// Result: Seamless infinite carousel
```

### Image Filtering Strategy
```typescript
// Before: [Ad1(no img), Ad2(img), Ad3(no img), Ad4(img)]
// After:  [Ad2, Ad4]
// Skip ads without images in carousel display
```

### URL Path Resolution
```
Input: "/api/ads/image/123/bottom"
Output: "https://api.instantllycards.com/api/ads/image/123/bottom"

Input: "d1rjsfuv5lw0hw.cloudfront.net/ad-creatives/123.jpg"
Output: "https://d1rjsfuv5lw0hw.cloudfront.net/ad-creatives/123.jpg"

Input: "https://example.com/image.jpg"
Output: "https://example.com/image.jpg"
```

### State Persistence Flow
```
1. User on AdCarousel at index 3
2. User clicks a button (outside carousel)
3. Component unmounts
4. Redux state preserved (carouselIndex still 3, selectedAd still in state)
5. User navigates back
6. AdCarousel re-mounts
7. useEffect: Restore to savedIndex from Redux
8. Carousel at index 3 ✅
```

---

## Testing Strategy

### Unit Tests
- `adSlice.test.ts` - Actions, reducers, selectors
- `adHelpers.test.ts` - URL normalization, filtering
- `FullScreenAdModal.test.tsx` - Component rendering, button clicks
- `AdCarousel.test.tsx` - Carousel rendering, scroll logic

### Functional Tests
- Ad API fetching and caching
- Carousel auto-scroll timer
- Infinite loop wrap-around
- Modal open/close functionality
- Impression tracking

### UI Tests
- Images load correctly
- Buttons are clickable
- Modal appears/disappears
- Close button works
- State retention on navigation

### E2E Tests (Manual + Automated)
1. App loads → Carousel displays ads
2. Wait 5 seconds → Carousel auto-scrolls
3. Click ad → Full-screen modal opens
4. Close modal → Back to carousel at same position
5. Navigate to different tab
6. Navigate back → Carousel at same position ✅

---

## Files to Create/Modify

### New Files to Create
```
src/
├── store/
│   ├── slices/
│   │   └── adSlice.ts (NEW)
│   └── api/
│       └── adsApi.ts (NEW)
├── components/
│   └── ads/
│       ├── FullScreenAdModal.tsx (NEW)
│       └── AdCarousel.tsx (NEW)
├── utils/
│   └── adHelpers.ts (NEW)
└── __tests__/
    ├── adSlice.test.ts (NEW)
    ├── adHelpers.test.ts (NEW)
    ├── FullScreenAdModal.test.tsx (NEW)
    └── AdCarousel.test.tsx (NEW)
```

### Files to Modify
```
src/
├── store/index.ts (add adSlice)
├── screens/HomeScreen.tsx (add AdCarousel)
└── components/ui/ (may need new dialog/modal component)
```

---

## Success Criteria
- [ ] Redux store properly manages ad state
- [ ] Carousel auto-scrolls every 5 seconds
- [ ] Clicking ad opens full-screen modal (matching InstantllyCards UI)
- [ ] Closing modal returns to carousel at same position
- [ ] Navigating away and back preserves carousel position
- [ ] Ads without images are skipped
- [ ] All tests passing (unit, functional, UI)
- [ ] No console errors or warnings
- [ ] Performance: Smooth carousel scrolling without lag
