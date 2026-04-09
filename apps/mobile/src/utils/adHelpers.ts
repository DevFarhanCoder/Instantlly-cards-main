import { Ad } from '../store/slices/adSlice';

/**
 * Normalize ad creative URL to absolute HTTPS URL
 * Handles: relative paths, S3 URLs, CloudFront, direct URLs
 */
export function normalizeAdUrl(url?: string | null): string | null {
  if (!url) return null;

  // Already a full URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Relative path - prepend API base URL
  if (url.startsWith('/')) {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
    return `${baseUrl}${url}`;
  }

  // S3/CloudFront or domain without protocol
  if (url.includes('.')) {
    return `https://${url}`;
  }

  return null;
}

/**
 * Get the best available image URL for an ad
 * Priority: creative_url > creative_urls[0] > image_url
 */
export function getAdImageUrl(ad: Ad | null): string | null {
  if (!ad) return null;

  const url =
    ad.creative_url ||
    (ad.creative_urls && ad.creative_urls.length > 0 ? ad.creative_urls[0] : null) ||
    ad.image_url;

  return normalizeAdUrl(url);
}

/**
 * Get bottom ad image URL (for carousel display)
 * Looks for URL containing /bottom, fallback to first creative_url
 */
export function getAdBottomImageUrl(ad: Ad | null): string | null {
  if (!ad) return null;

  // Try to find URL with /bottom in it
  if (ad.creative_urls && ad.creative_urls.length > 0) {
    const bottomUrl = ad.creative_urls.find(url => url && url.includes('/bottom'));
    if (bottomUrl) return normalizeAdUrl(bottomUrl);
    // Fallback to first URL if /bottom not found
    return normalizeAdUrl(ad.creative_urls[0]);
  }

  // Fallback to single creative_url or image_url
  const url = ad.creative_url || ad.image_url;
  return normalizeAdUrl(url);
}

/**
 * Get fullscreen ad image URL (for modal display)
 * Looks for URL containing /fullscreen, fallback to /bottom or first creative_url
 */
export function getAdFullscreenImageUrl(ad: Ad | null): string | null {
  if (!ad) return null;

  // Try to find URL with /fullscreen in it
  if (ad.creative_urls && ad.creative_urls.length > 0) {
    const fullscreenUrl = ad.creative_urls.find(url => url && url.includes('/fullscreen'));
    if (fullscreenUrl) return normalizeAdUrl(fullscreenUrl);

    // Fallback to /bottom if /fullscreen not found
    const bottomUrl = ad.creative_urls.find(url => url && url.includes('/bottom'));
    if (bottomUrl) return normalizeAdUrl(bottomUrl);

    // Fallback to first URL
    return normalizeAdUrl(ad.creative_urls[0]);
  }

  // Fallback to single creative_url or image_url
  const url = ad.creative_url || ad.image_url;
  return normalizeAdUrl(url);
}

/**
 * Check if ad has at least one image
 */
export function hasAdImage(ad: Ad): boolean {
  return !!(
    ad.creative_url ||
    (ad.creative_urls && ad.creative_urls.length > 0) ||
    ad.image_url
  );
}

/**
 * Filter ads to only include those with images
 */
export function filterAdsWithImages(ads: Ad[]): Ad[] {
  console.log(`[adHelpers] Filtering ${ads.length} ads for images...`);
  const filtered = ads.filter(hasAdImage);
  console.log(`[adHelpers] ${filtered.length} ads have images (skipped ${ads.length - filtered.length})`);
  return filtered;
}

/**
 * Create infinite scroll list by duplicating first and last ad
 * This enables seamless looping without users seeing a jump
 */
export function createInfiniteAdList(ads: Ad[]): Ad[] {
  if (ads.length === 0) return [];
  if (ads.length === 1) return [ads[0], ads[0], ads[0]]; // [last, first, next]

  const lastAd = ads[ads.length - 1];
  const firstAd = ads[0];

  // Structure: [lastAd, ...ads, firstAd]
  // When scrolling to end (lastAd), jump to firstAd (index 1) without animation
  // When scrolling to start (firstAd), jump to lastAd (index N-2) without animation
  return [lastAd, ...ads, firstAd];
}

/**
 * Get infinite scroll index from actual index
 * Maps real ad index to position in infinite list
 * Real: [Ad0, Ad1, Ad2]
 * Infinite: [Ad2, Ad0, Ad1, Ad2, Ad0]
 *             0   1   2   3   4
 */
export function getRealIndexFromInfinite(infiniteIndex: number, listSize: number): number {
  if (listSize <= 1) return 0;

  // Subtract 1 because infinite list has [last, ...real, first]
  const realIndex = infiniteIndex - 1;

  // Handle wrapping
  if (realIndex < 0) return listSize - 1;
  if (realIndex >= listSize) return 0;

  return realIndex;
}

/**
 * Get infinite scroll index from real index
 */
export function getInfiniteIndexFromReal(realIndex: number, listSize: number): number {
  if (listSize === 0) return 0;
  // Add 1 because infinite list starts with [last, ...]
  return realIndex + 1;
}

/**
 * Check if need to wrap around at end
 */
export function shouldWrapAtEnd(currentIndex: number, infiniteListSize: number): boolean {
  return currentIndex === infiniteListSize - 1;
}

/**
 * Check if need to wrap around at start
 */
export function shouldWrapAtStart(currentIndex: number): boolean {
  return currentIndex === 0;
}

/**
 * Normalize all creative URLs in an ad
 */
export function normalizeAdCreativeUrls(ad: Ad): Ad {
  return {
    ...ad,
    creative_url: normalizeAdUrl(ad.creative_url) || undefined,
    creative_urls: ad.creative_urls?.map(normalizeAdUrl).filter((url): url is string => !!url),
    image_url: normalizeAdUrl(ad.image_url) || undefined,
  };
}

/**
 * Prepare ad for display (normalize all URLs)
 */
export function prepareAdForDisplay(ad: Ad): Ad {
  return normalizeAdCreativeUrls(ad);
}

/**
 * Prepare multiple ads for display
 */
export function prepareAdsForDisplay(ads: Ad[]): Ad[] {
  return ads.map(prepareAdForDisplay);
}

/**
 * Get ad click-through rate
 */
export function getAdCTR(ad: Ad): number {
  if (!ad.impressions || ad.impressions === 0) return 0;
  return ((ad.clicks || 0) / ad.impressions) * 100;
}

/**
 * Format ad metrics for display
 */
export function formatAdMetrics(ad: Ad) {
  return {
    impressions: ad.impressions ?? 0,
    clicks: ad.clicks ?? 0,
    ctr: getAdCTR(ad).toFixed(2) + '%',
    spent: ad.spent ?? 0,
  };
}

/**
 * Get ad status color (for UI badges)
 */
export function getAdStatusColor(
  status: string
): { bg: string; text: string } {
  switch (status) {
    case 'active':
      return { bg: 'bg-green-500/10', text: 'text-green-600' };
    case 'paused':
      return { bg: 'bg-orange-500/10', text: 'text-orange-600' };
    case 'completed':
      return { bg: 'bg-gray-500/10', text: 'text-gray-600' };
    default:
      return { bg: 'bg-gray-500/10', text: 'text-gray-600' };
  }
}

/**
 * Get approval status color (for UI badges)
 */
export function getApprovalStatusColor(
  status: string
): { bg: string; text: string } {
  switch (status) {
    case 'approved':
      return { bg: 'bg-green-500/10', text: 'text-green-600' };
    case 'rejected':
      return { bg: 'bg-red-500/10', text: 'text-red-600' };
    case 'pending':
      return { bg: 'bg-yellow-500/10', text: 'text-yellow-600' };
    default:
      return { bg: 'bg-gray-500/10', text: 'text-gray-600' };
  }
}

/**
 * Check if ad is still valid (active and not expired)
 */
export function isAdValid(ad: Ad): boolean {
  // Check approval
  if (ad.approval_status !== 'approved') return false;

  // Check status
  if (ad.status === 'completed' || ad.status === 'paused') return false;

  // Check dates if available
  if (ad.end_date) {
    const endDate = new Date(ad.end_date);
    if (endDate < new Date()) return false;
  }

  return true;
}

/**
 * Sort ads by criteria
 */
export function sortAdsByPriority(ads: Ad[]): Ad[] {
  return [...ads].sort((a, b) => {
    // Priority 1: Active ads with images
    const aPriority = a.priority ?? 0;
    const bPriority = b.priority ?? 0;

    if (aPriority !== bPriority) {
      return bPriority - aPriority;
    }

    // Priority 2: Newer ads first
    const aCreated = new Date(a.created_at || 0).getTime();
    const bCreated = new Date(b.created_at || 0).getTime();

    return bCreated - aCreated;
  });
}
