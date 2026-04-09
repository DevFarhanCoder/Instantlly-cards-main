import {
  normalizeAdUrl,
  getAdImageUrl,
  hasAdImage,
  filterAdsWithImages,
  createInfiniteAdList,
  getAdCTR,
  formatAdMetrics,
  isAdValid,
  sortAdsByPriority,
  Ad,
} from '../utils/adHelpers';

describe('adHelpers - URL Normalization', () => {
  describe('normalizeAdUrl', () => {
    test('should return null for empty/null input', () => {
      expect(normalizeAdUrl(null)).toBeNull();
      expect(normalizeAdUrl(undefined)).toBeNull();
      expect(normalizeAdUrl('')).toBeNull();
    });

    test('should preserve full HTTPS URLs', () => {
      const url = 'https://example.com/image.jpg';
      expect(normalizeAdUrl(url)).toBe(url);
    });

    test('should preserve full HTTP URLs', () => {
      const url = 'http://example.com/image.jpg';
      expect(normalizeAdUrl(url)).toBe(url);
    });

    test('should add https:// to domain-only URLs', () => {
      const url = 'd1rjsfuv5lw0hw.cloudfront.net/ad.jpg';
      const result = normalizeAdUrl(url);
      expect(result).toBe(`https://${url}`);
    });

    test('should prepend API base URL to relative paths', () => {
      const url = '/api/ads/image/123/bottom';
      const result = normalizeAdUrl(url);
      expect(result).toContain('/api/ads/image/123/bottom');
      expect(result).toMatch(/^https?:\/\//);
    });
  });

  describe('getAdImageUrl', () => {
    test('should return null for null ad', () => {
      expect(getAdImageUrl(null)).toBeNull();
    });

    test('should prefer creative_url', () => {
      const ad: Ad = {
        id: 1,
        creative_url: 'https://example.com/1.jpg',
        image_url: 'https://example.com/fallback.jpg',
        ad_type: 'banner',
        approval_status: 'approved',
        status: 'active',
      };

      const result = getAdImageUrl(ad);
      expect(result).toContain('1.jpg');
    });

    test('should fallback to creative_urls[0]', () => {
      const ad: Ad = {
        id: 1,
        creative_urls: ['https://example.com/2.jpg', 'https://example.com/3.jpg'],
        ad_type: 'banner',
        approval_status: 'approved',
        status: 'active',
      };

      const result = getAdImageUrl(ad);
      expect(result).toContain('2.jpg');
    });

    test('should fallback to image_url', () => {
      const ad: Ad = {
        id: 1,
        image_url: 'https://example.com/fallback.jpg',
        ad_type: 'banner',
        approval_status: 'approved',
        status: 'active',
      };

      const result = getAdImageUrl(ad);
      expect(result).toContain('fallback.jpg');
    });

    test('should return null if no images', () => {
      const ad: Ad = {
        id: 1,
        ad_type: 'banner',
        approval_status: 'approved',
        status: 'active',
      };

      expect(getAdImageUrl(ad)).toBeNull();
    });
  });
});

describe('adHelpers - Filtering', () => {
  const mockAds: Ad[] = [
    {
      id: 1,
      title: 'Ad with image',
      creative_url: 'https://example.com/1.jpg',
      ad_type: 'banner',
      approval_status: 'approved',
      status: 'active',
    },
    {
      id: 2,
      title: 'Ad without image',
      ad_type: 'banner',
      approval_status: 'approved',
      status: 'active',
    },
    {
      id: 3,
      title: 'Ad with fallback image',
      image_url: 'https://example.com/3.jpg',
      ad_type: 'banner',
      approval_status: 'approved',
      status: 'active',
    },
  ];

  describe('hasAdImage', () => {
    test('should return true for ads with creative_url', () => {
      expect(hasAdImage(mockAds[0])).toBe(true);
    });

    test('should return true for ads with image_url', () => {
      expect(hasAdImage(mockAds[2])).toBe(true);
    });

    test('should return false for ads without images', () => {
      expect(hasAdImage(mockAds[1])).toBe(false);
    });
  });

  describe('filterAdsWithImages', () => {
    test('should filter out ads without images', () => {
      const result = filterAdsWithImages(mockAds);
      expect(result.length).toBe(2);
      expect(result.every((a) => getAdImageUrl(a))).toBe(true);
    });

    test('should preserve ad order', () => {
      const result = filterAdsWithImages(mockAds);
      expect(result[0].id).toBe(1);
      expect(result[1].id).toBe(3);
    });

    test('should handle empty array', () => {
      expect(filterAdsWithImages([])).toEqual([]);
    });
  });
});

describe('adHelpers - Infinite Scroll', () => {
  const ads: Ad[] = [
    {
      id: 1,
      creative_url: 'https://example.com/1.jpg',
      ad_type: 'banner',
      approval_status: 'approved',
      status: 'active',
    },
    {
      id: 2,
      creative_url: 'https://example.com/2.jpg',
      ad_type: 'banner',
      approval_status: 'approved',
      status: 'active',
    },
    {
      id: 3,
      creative_url: 'https://example.com/3.jpg',
      ad_type: 'banner',
      approval_status: 'approved',
      status: 'active',
    },
  ];

  describe('createInfiniteAdList', () => {
    test('should create infinite list with duplicates', () => {
      const result = createInfiniteAdList(ads);

      // Should be [last, ...ads, first]
      expect(result.length).toBe(5);
      expect(result[0].id).toBe(3); // last
      expect(result[1].id).toBe(1); // first real
      expect(result[2].id).toBe(2);
      expect(result[3].id).toBe(3);
      expect(result[4].id).toBe(1); // first duplicate
    });

    test('should handle single ad', () => {
      const result = createInfiniteAdList(ads.slice(0, 1));
      expect(result.length).toBe(3);
      expect(result.every((a) => a.id === 1)).toBe(true);
    });

    test('should handle empty array', () => {
      expect(createInfiniteAdList([])).toEqual([]);
    });
  });
});

describe('adHelpers - Metrics', () => {
  const ad: Ad = {
    id: 1,
    title: 'Test Ad',
    creative_url: 'https://example.com/1.jpg',
    impressions: 1000,
    clicks: 50,
    spent: 100,
    ad_type: 'banner',
    approval_status: 'approved',
    status: 'active',
  };

  describe('getAdCTR', () => {
    test('should calculate CTR correctly', () => {
      const ctr = getAdCTR(ad);
      expect(ctr).toBe(5); // 50/1000 * 100 = 5%
    });

    test('should return 0 for no impressions', () => {
      const adNoImp: Ad = {
        ...ad,
        impressions: 0,
      };
      expect(getAdCTR(adNoImp)).toBe(0);
    });

    test('should handle missing metrics', () => {
      const adNoMetrics: Ad = {
        id: 1,
        creative_url: 'https://example.com/1.jpg',
        ad_type: 'banner',
        approval_status: 'approved',
        status: 'active',
      };
      expect(getAdCTR(adNoMetrics)).toBe(0);
    });
  });

  describe('formatAdMetrics', () => {
    test('should format metrics correctly', () => {
      const result = formatAdMetrics(ad);
      expect(result.impressions).toBe(1000);
      expect(result.clicks).toBe(50);
      expect(result.ctr).toBe('5.00%');
      expect(result.spent).toBe(100);
    });

    test('should handle missing metrics', () => {
      const adNoMetrics: Ad = {
        id: 1,
        creative_url: 'https://example.com/1.jpg',
        ad_type: 'banner',
        approval_status: 'approved',
        status: 'active',
      };
      const result = formatAdMetrics(adNoMetrics);
      expect(result.impressions).toBe(0);
      expect(result.clicks).toBe(0);
    });
  });
});

describe('adHelpers - Validation', () => {
  describe('isAdValid', () => {
    test('should be valid if approved and active', () => {
      const ad: Ad = {
        id: 1,
        creative_url: 'https://example.com/1.jpg',
        approval_status: 'approved',
        status: 'active',
        ad_type: 'banner',
      };
      expect(isAdValid(ad)).toBe(true);
    });

    test('should be invalid if not approved', () => {
      const ad: Ad = {
        id: 1,
        creative_url: 'https://example.com/1.jpg',
        approval_status: 'pending',
        status: 'active',
        ad_type: 'banner',
      };
      expect(isAdValid(ad)).toBe(false);
    });

    test('should be invalid if not active', () => {
      const ad: Ad = {
        id: 1,
        creative_url: 'https://example.com/1.jpg',
        approval_status: 'approved',
        status: 'paused',
        ad_type: 'banner',
      };
      expect(isAdValid(ad)).toBe(false);
    });

    test('should be invalid if end date passed', () => {
      const ad: Ad = {
        id: 1,
        creative_url: 'https://example.com/1.jpg',
        approval_status: 'approved',
        status: 'active',
        end_date: '2020-01-01',
        ad_type: 'banner',
      };
      expect(isAdValid(ad)).toBe(false);
    });

    test('should be valid if end date in future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const ad: Ad = {
        id: 1,
        creative_url: 'https://example.com/1.jpg',
        approval_status: 'approved',
        status: 'active',
        end_date: futureDate.toISOString(),
        ad_type: 'banner',
      };
      expect(isAdValid(ad)).toBe(true);
    });
  });
});

describe('adHelpers - Sorting', () => {
  const ads: Ad[] = [
    {
      id: 1,
      title: 'Ad 1',
      creative_url: 'https://example.com/1.jpg',
      priority: 1,
      created_at: new Date(2024, 0, 1).toISOString(),
      ad_type: 'banner',
      approval_status: 'approved',
      status: 'active',
    },
    {
      id: 2,
      title: 'Ad 2',
      creative_url: 'https://example.com/2.jpg',
      priority: 3,
      created_at: new Date(2024, 0, 2).toISOString(),
      ad_type: 'banner',
      approval_status: 'approved',
      status: 'active',
    },
    {
      id: 3,
      title: 'Ad 3',
      creative_url: 'https://example.com/3.jpg',
      priority: 2,
      created_at: new Date(2024, 0, 3).toISOString(),
      ad_type: 'banner',
      approval_status: 'approved',
      status: 'active',
    },
  ];

  describe('sortAdsByPriority', () => {
    test('should sort by priority descending', () => {
      const result = sortAdsByPriority(ads);
      expect(result[0].priority).toBe(3);
      expect(result[1].priority).toBe(2);
      expect(result[2].priority).toBe(1);
    });

    test('should sort by created_at descending when priority equal', () => {
      const sameAds = [
        { ...ads[0], priority: 1 },
        { ...ads[1], priority: 1 },
      ];

      const result = sortAdsByPriority(sameAds);
      expect(result[0].created_at).toBe(ads[1].created_at);
      expect(result[1].created_at).toBe(ads[0].created_at);
    });

    test('should not modify original array', () => {
      const original = [...ads];
      sortAdsByPriority(ads);
      expect(ads).toEqual(original);
    });
  });
});
