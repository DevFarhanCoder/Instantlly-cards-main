/**
 * Frontend URL Normalization Helper
 *
 * Ensures all creative URLs are absolute URLs that can be loaded by Image component
 * Handles:
 * - Full URLs (already valid)
 * - Relative paths (convert to absolute)
 * - Missing URLs (fallback to null)
 */

const API_BASE_URL = 'https://api.instantllycards.com';

/**
 * Normalize a single URL to absolute format
 * @param url - URL or path to normalize
 * @returns Absolute URL or null
 */
export const normalizeImageUrl = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== 'string') return null;

  // Already absolute
  if (/^(https?:|\/\/)/.test(url)) {
    return url;
  }

  // Relative path
  if (url.startsWith('/')) {
    return `${API_BASE_URL}${url}`;
  }

  // Just a path without leading slash
  return `${API_BASE_URL}/${url}`;
};

/**
 * Get the best available image URL from ad object
 * Priority: creative_url > creative_urls[0] > null
 */
export const getAdImageUrl = (
  ad: {
    creative_url?: string | null;
    creative_urls?: string[];
    image_url?: string | null;
  } | null
): string | null => {
  if (!ad) return null;

  // Try creative_url first (new system)
  if (ad.creative_url) {
    return normalizeImageUrl(ad.creative_url);
  }

  // Try first variant URL
  if (ad.creative_urls && ad.creative_urls.length > 0) {
    return normalizeImageUrl(ad.creative_urls[0]);
  }

  // Fallback to image_url (unified response format)
  if (ad.image_url) {
    return normalizeImageUrl(ad.image_url);
  }

  return null;
};

/**
 * Normalize multiple creative URLs (for carousel or gallery)
 */
export const normalizeAdCreativeUrls = (
  urls: (string | null | undefined)[] | undefined
): string[] => {
  if (!Array.isArray(urls)) return [];

  return urls
    .map((url) => normalizeImageUrl(url))
    .filter((url): url is string => url !== null);
};

/**
 * Prepare ad for display in BannerAdSlot component
 * Ensures all URLs are normalized and absolute
 */
export const prepareAdForDisplay = (ad: any) => {
  if (!ad) return ad;

  return {
    ...ad,
    creative_url: normalizeImageUrl(ad.creative_url),
    creative_urls: normalizeAdCreativeUrls(ad.creative_urls),
    image_url: normalizeImageUrl(ad.image_url),
    cta_url: normalizeImageUrl(ad.cta_url),
  };
};

/**
 * Prepare array of ads for display
 */
export const prepareAdsForDisplay = (ads: any[]): any[] => {
  if (!Array.isArray(ads)) return ads;
  return ads.map(prepareAdForDisplay);
};
