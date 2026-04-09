# Ad System Functional Testing & Integration Guide

## Overview
All unit tests (55/55) and component tests (30/30) are passing. This document covers functional testing to verify the ad system works correctly with real API data and handles production scenarios.

## Phase 6: Functional Testing

### Functional Test 1: Ad Loading from API

**Objective**: Verify carousel fetches and displays ads from `/api/ads`

1. Open app and navigate to home screen
2. Carousel should load ads from API endpoint
3. Verify Redux state has ads populated:
   - ads: Array with API data
   - filteredAds: Only ads with images
   - infiniteAdsList: [last, ...ads, first]
   - carouselIndex: 1 (first real ad)
4. Verify UI shows:
   - First ad image, title, status badge
   - Ad type badge (banner/interstitial)
   - Pagination counter (1 / N)

**Expected Result**: Carousel renders with real ads from API

---

### Functional Test 2: Auto-Scroll Timer

**Objective**: Verify carousel auto-scrolls every 5 seconds

1. Carousel mounted with ads
2. Wait 5 seconds without interacting
3. Verify carousel moves to next ad (carouselIndex increments)
4. Wait 10 more seconds
5. Verify carousel moved through 2 more ads
6. Interact with carousel (manual scroll)
7. Verify auto-scroll resumes after interaction
8. Unmount carousel
9. Verify auto-scroll timer clears (no memory leak)

**Expected Result**: Carousel auto-advances every 5 seconds, timer clears on unmount

---

### Functional Test 3: Infinite Loop Wrap-Around

**Objective**: Verify carousel seamlessly loops from last ad to first

1. Carousel with 3 ads in internal list: [Ad3, Ad1, Ad2, Ad3, Ad1]
2. User scrolls to index 4 (Ad1 - the duplicate)
3. Redux should jump to index 1 (Ad1 - the real first ad)
4. No visible jump/animation
5. Continue scrolling right shows Ad2
6. Scroll left to index 0 (Ad3 - the duplicate)
7. Redux should jump to index 3 (Ad3 - the real last ad)

**Expected Result**: Seamless infinite scroll without visible jumps

---

### Functional Test 4: Modal Opening Preserves Carousel Position

**Objective**: Verify carousel state retained when opening/closing modal

1. Carousel at index 2 (Ad 2 of 3)
2. Click on carousel ad
3. FullScreenAdModal opens showing that ad
4. Redux state should have:
   - selectedAd: The clicked ad
   - isModalVisible: true
   - carouselIndex: STILL 2 (NOT RESET)
5. Close modal (press X button)
6. Redux state should have:
   - selectedAd: null
   - isModalVisible: false
   - carouselIndex: STILL 2 (preserved)
7. Carousel shows same ad as before

**Expected Result**: Carousel position preserved through modal cycle

---

### Functional Test 5: Image Filtering

**Objective**: Verify ads without images are skipped

1. API returns 5 ads with different image fields
2. Redux setAds filters them:
   - filteredAds: only ads with images
   - infiniteAdsList: [last, ...filtered, first]
3. Verify carousel only shows ads with images
4. Pagination shows correct count

**Expected Result**: Only ads with images displayed

---

### Functional Test 6: Impression Tracking

**Objective**: Verify impressions increment when modal opens

1. Get initial impressions count for Ad1
2. Click to open modal for Ad1
3. FullScreenAdModal dispatches recordImpression
4. Redux state updates incrementally
5. Close and reopen modal
6. Impressions increment again

**Expected Result**: Impressions increment on each modal open

---

## Phase 7: Manual E2E Testing Checklist

### Pre-Test Setup
- [ ] Backend API running and serving ads at `/api/ads`
- [ ] Frontend app running locally
- [ ] Redux DevTools available for debugging
- [ ] Network inspector open to monitor API calls
- [ ] Console open to check for errors

### Visual Verification
- [ ] Carousel displays with full screen width
- [ ] Ad images load and display correctly  
- [ ] Ad titles and descriptions readable
- [ ] Status and type badges visible
- [ ] Pagination counter visible and accurate
- [ ] Modal overlay has dark background with 95% opacity
- [ ] Modal content centered and properly styled
- [ ] Close button (X) visible in top-right

### Interaction Tests
- [ ] Carousel auto-scrolls every 5 seconds
- [ ] Manual swipe left/right works smoothly
- [ ] Clicking ad opens modal with that ad's data
- [ ] Modal displays all content sections correctly
- [ ] Closing modal returns to carousel at same position
- [ ] Auto-scroll resumes after manual scroll
- [ ] CTA button opens correct URL
- [ ] Chat button opens WhatsApp URL
- [ ] Call button opens phone dialer
- [ ] Share button opens share menu

### State Persistence Tests
- [ ] Carousel position preserved after modal close
- [ ] Carousel position preserved after tab switch
- [ ] Carousel position preserved across screen navigation
- [ ] Redux DevTools shows state correctly maintained

### Performance Tests
- [ ] Carousel scrolling smooth (60fps)
- [ ] No stuttering during auto-scroll
- [ ] Modal animations smooth
- [ ] No memory leaks (timers clear properly)
- [ ] No console errors or warnings

---

## Success Criteria for Production

✅ All 85 automated tests passing
✅ All functional test scenarios verified
✅ All E2E checklist items completed  
✅ No console errors or memory leaks
✅ Carousel position survives navigation
✅ Auto-scroll works at 5-second intervals
✅ Infinite scroll seamless without jumps
✅ Modal doesn't reset carousel position
✅ Image filtering removes ads without images
✅ Impression tracking works correctly

---

## Test Results Summary

**Unit Tests**: 55/55 passing ✅
- Redux adSlice: 30 tests
- adHelpers utilities: 25 tests

**Component Tests**: 30/30 passing ✅
- AdCarousel: 15 tests
- FullScreenAdModal: 15 tests

**Total**: 85/85 tests passing ✅

