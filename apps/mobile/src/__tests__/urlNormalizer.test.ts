import {
  normalizeImageUrl,
  getAdImageUrl,
  getAdBottomImageUrl,
  getAdFullscreenImageUrl,
  normalizeAdCreativeUrls,
} from '../utils/urlNormalizer';

describe('urlNormalizer - Image URL Normalization', () => {
  const API_BASE_URL = 'https://api.instantllycards.com';

  describe('normalizeImageUrl', () => {
    it('should return null for empty or invalid input', () => {
      expect(normalizeImageUrl(null)).toBeNull();
      expect(normalizeImageUrl(undefined)).toBeNull();
    });

    it('should return absolute HTTPS URLs unchanged', () => {
      const url = 'https://api.example.com/image.jpg';
      expect(normalizeImageUrl(url)).toBe(url);
    });

    it('should convert protocol-relative URLs', () => {
      const url = '//cdn.example.com/image.jpg';
      expect(normalizeImageUrl(url)).toBe(url);
    });

    it('should prepend base URL to paths starting with /', () => {
      const url = '/api/ads/image/123/bottom';
      const expected = `${API_BASE_URL}${url}`;
      expect(normalizeImageUrl(url)).toBe(expected);
    });

    it('should prepend base URL to relative paths', () => {
      const url = 'api/ads/image/123/bottom';
      const expected = `${API_BASE_URL}/${url}`;
      expect(normalizeImageUrl(url)).toBe(expected);
    });
  });

  describe('getAdImageUrl', () => {
    it('should return null for null ad', () => {
      expect(getAdImageUrl(null)).toBeNull();
    });

    it('should prioritize creative_url', () => {
      const ad = {
        creative_url: 'https://example.com/creative.jpg',
        creative_urls: ['https://example.com/other.jpg'],
        image_url: 'https://example.com/image.jpg',
      };
      expect(getAdImageUrl(ad)).toBe('https://example.com/creative.jpg');
    });

    it('should fallback to first creative_urls item', () => {
      const ad = {
        creative_url: null,
        creative_urls: ['https://example.com/creative1.jpg', 'https://example.com/creative2.jpg'],
        image_url: 'https://example.com/image.jpg',
      };
      expect(getAdImageUrl(ad)).toBe('https://example.com/creative1.jpg');
    });

    it('should fallback to image_url', () => {
      const ad = {
        creative_url: null,
        creative_urls: [],
        image_url: 'https://example.com/image.jpg',
      };
      expect(getAdImageUrl(ad)).toBe('https://example.com/image.jpg');
    });

    it('should return null when no images available', () => {
      const ad = {
        creative_url: null,
        creative_urls: [],
        image_url: null,
      };
      expect(getAdImageUrl(ad)).toBeNull();
    });
  });

  describe('getAdBottomImageUrl', () => {
    it('should find URL containing /bottom in creative_urls', () => {
      const ad = {
        creative_url: null,
        creative_urls: [
          'https://api.example.com/image/123/bottom',
          'https://api.example.com/image/123/fullscreen',
        ],
        image_url: null,
      };
      expect(getAdBottomImageUrl(ad)).toBe('https://api.example.com/image/123/bottom');
    });

    it('should fallback to first URL if /bottom not found', () => {
      const ad = {
        creative_url: null,
        creative_urls: ['https://api.example.com/image/123/other'],
        image_url: null,
      };
      expect(getAdBottomImageUrl(ad)).toBe('https://api.example.com/image/123/other');
    });

    it('should use creative_url as fallback', () => {
      const ad = {
        creative_url: 'https://api.example.com/image/123/bottom',
        creative_urls: [],
        image_url: null,
      };
      expect(getAdBottomImageUrl(ad)).toBe('https://api.example.com/image/123/bottom');
    });

    it('should return null when no images available', () => {
      const ad = {
        creative_url: null,
        creative_urls: [],
        image_url: null,
      };
      expect(getAdBottomImageUrl(ad)).toBeNull();
    });
  });

  describe('getAdFullscreenImageUrl', () => {
    it('should find explicit /fullscreen URL in creative_urls', () => {
      const ad = {
        creative_url: null,
        creative_urls: [
          'https://api.example.com/image/123/bottom',
          'https://api.example.com/image/123/fullscreen',
        ],
        image_url: null,
      };
      expect(getAdFullscreenImageUrl(ad)).toBe('https://api.example.com/image/123/fullscreen');
    });

    it('should convert /bottom to /fullscreen dynamically', () => {
      const ad = {
        creative_url: null,
        creative_urls: ['https://api.example.com/image/123/bottom'],
        image_url: null,
      };
      const result = getAdFullscreenImageUrl(ad);
      expect(result).toBe('https://api.example.com/image/123/fullscreen');
    });

    it('should use creative_url for bottom conversion', () => {
      const ad = {
        creative_url: 'https://api.example.com/image/123/bottom',
        creative_urls: [],
        image_url: null,
      };
      const result = getAdFullscreenImageUrl(ad);
      expect(result).toBe('https://api.example.com/image/123/fullscreen');
    });

    it('should return null when no images available', () => {
      const ad = {
        creative_url: null,
        creative_urls: [],
        image_url: null,
      };
      expect(getAdFullscreenImageUrl(ad)).toBeNull();
    });
  });

  describe('normalizeAdCreativeUrls', () => {
    it('should normalize array of URLs', () => {
      const urls = ['/api/image/1', '/api/image/2', 'https://example.com/3.jpg'];
      const result = normalizeAdCreativeUrls(urls);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(`${API_BASE_URL}/api/image/1`);
      expect(result[1]).toBe(`${API_BASE_URL}/api/image/2`);
      expect(result[2]).toBe('https://example.com/3.jpg');
    });

    it('should filter out null and undefined values', () => {
      const urls = ['/api/image/1', null, undefined, '/api/image/2'];
      const result = normalizeAdCreativeUrls(urls);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(`${API_BASE_URL}/api/image/1`);
      expect(result[1]).toBe(`${API_BASE_URL}/api/image/2`);
    });

    it('should return empty array for invalid input', () => {
      expect(normalizeAdCreativeUrls(undefined)).toEqual([]);
      expect(normalizeAdCreativeUrls(null as any)).toEqual([]);
      expect(normalizeAdCreativeUrls([])).toEqual([]);
    });
  });

  describe('URL Conversion Edge Cases', () => {
    it('should handle empty creative_urls array', () => {
      const ad = {
        creative_url: null,
        creative_urls: [],
        image_url: null,
      };

      expect(getAdBottomImageUrl(ad)).toBeNull();
      expect(getAdFullscreenImageUrl(ad)).toBeNull();
    });

    it('should handle relative URLs properly', () => {
      const ad = {
        creative_url: '/api/ads/image/123/bottom',
        creative_urls: [],
        image_url: null,
      };

      const result = getAdFullscreenImageUrl(ad);
      expect(result).toBe(`${API_BASE_URL}/api/ads/image/123/fullscreen`);
    });

    it('should preserve full URLs without modification', () => {
      const url = 'https://cdn.example.com/images/ad-123-bottom.jpg';
      expect(normalizeImageUrl(url)).toBe(url);
    });
  });
});
