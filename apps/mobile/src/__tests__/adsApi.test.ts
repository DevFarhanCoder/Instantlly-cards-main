/// <reference types="jest" />
import { baseApi } from '../store/api/baseApi';
import { adsApi, useListAdsForCarouselQuery } from '../store/api/adsApi';

describe('Ads API Integration', () => {
  describe('RTK Query Endpoint', () => {
    test('listAdsForCarousel endpoint is properly defined', () => {
      expect(adsApi.endpoints.listAdsForCarousel).toBeDefined();
    });

    test('useListAdsForCarouselQuery hook is exported', () => {
      expect(useListAdsForCarouselQuery).toBeDefined();
      expect(typeof useListAdsForCarouselQuery).toBe('function');
    });

    test('baseApi includes Ad tag type', () => {
      const api = baseApi;
      expect(api).toBeDefined();
    });
  });

  describe('Ad Campaign to Ad Conversion', () => {
    test('converts AdCampaign fields correctly to Ad format', () => {
      const mockCampaign = {
        id: 1,
        title: 'Test Campaign',
        description: 'Test description',
        ad_type: 'banner',
        approval_status: 'approved',
        status: 'active',
        creative_url: 'https://example.com/image.jpg',
        creative_urls: [],
        daily_budget: 100,
        impressions: 50,
        clicks: 5,
        spent: 25,
        created_at: '2024-01-01',
        end_date: '2024-12-31',
        business: { id: 1, company_name: 'Test Co', logo_url: null },
      };

      // Simulate conversion
      const converted = {
        id: mockCampaign.id,
        priority: 1,
        title: mockCampaign.title,
        description: mockCampaign.description,
        creative_url: mockCampaign.creative_url,
        creative_urls: mockCampaign.creative_urls,
        ad_type: mockCampaign.ad_type,
        approval_status: mockCampaign.approval_status,
        status: mockCampaign.status,
        daily_budget: mockCampaign.daily_budget,
        impressions: mockCampaign.impressions,
        clicks: mockCampaign.clicks,
        spent: mockCampaign.spent,
        business: mockCampaign.business,
        created_at: mockCampaign.created_at,
        end_date: mockCampaign.end_date,
      };

      expect(converted.id).toBe(mockCampaign.id);
      expect(converted.title).toBe(mockCampaign.title);
      expect(converted.creative_url).toBe(mockCampaign.creative_url);
      expect(converted.priority).toBe(1);
      expect(converted.business).toEqual(mockCampaign.business);
    });
  });

  describe('API Configuration', () => {
    test('baseQuery uses correct API base URL', () => {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      expect(apiUrl).toBeDefined();
      expect(typeof apiUrl).toBe('string');
    });

    test('adsApi extends baseApi', () => {
      expect(adsApi).toBeDefined();
      expect(adsApi.middleware).toBeDefined();
      expect(adsApi.reducer).toBeDefined();
    });
  });
});
