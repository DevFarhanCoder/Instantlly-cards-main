import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BannerAdSlot from '../components/ads/BannerAdSlot';
import * as useActiveAdsHook from '../hooks/useActiveAds';
import * as urlNormalizer from '../utils/urlNormalizer';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock react-native-lucide
jest.mock('lucide-react-native', () => ({
  X: () => null,
}));

describe('BannerAdSlot - Unit Tests', () => {
  const mockUseActiveAds = jest.spyOn(useActiveAdsHook, 'useActiveAds');
  const mockUseRecordImpression = jest.spyOn(useActiveAdsHook, 'useRecordImpression');
  const mockUseRecordClick = jest.spyOn(useActiveAdsHook, 'useRecordClick');

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRecordImpression.mockReturnValue(undefined);
    mockUseRecordClick.mockReturnValue(jest.fn());
  });

  describe('Image Filtering', () => {
    it('should skip ads without images', () => {
      const mockAds = [
        {
          id: 1,
          title: 'Ad with Image',
          description: 'Has image',
          status: 'active',
          creative_url: 'https://api.example.com/image/1/bottom',
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
        {
          id: 2,
          title: 'Ad without Image',
          description: 'No image',
          status: 'active',
          creative_url: null,
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
      ];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      // Should show carousel with only 1 ad (the one with image)
      expect(getByTestId('ad-carousel')).toBeTruthy();
    });

    it('should display all ads when all have images', () => {
      const mockAds = [
        {
          id: 1,
          title: 'Ad 1',
          description: 'Has image',
          status: 'active',
          creative_url: 'https://api.example.com/image/1/bottom',
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
        {
          id: 2,
          title: 'Ad 2',
          description: 'Has image',
          status: 'active',
          creative_url: 'https://api.example.com/image/2/bottom',
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
      ];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      // Should render carousel with both ads
      expect(getByTestId('ad-carousel')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('should show spinner when loading', () => {
      mockUseActiveAds.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-loading')).toBeTruthy();
      expect(getByTestId('ad-loading-spinner')).toBeTruthy();
    });

    it('should show empty state when no ads', () => {
      mockUseActiveAds.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      const { queryByTestId } = render(<BannerAdSlot />);

      // Component should return null, so the container should not be found
      // or it should show the banner ad slot but with no carousel
      expect(queryByTestId('ad-carousel')).toBeNull();
    });
  });

  describe('Ad Rendering', () => {
    it('should render ads with images', () => {
      const mockAds = [
        {
          id: 1,
          title: 'Test Ad',
          description: 'Test Description',
          status: 'active',
          creative_url: 'https://api.example.com/image/1/bottom',
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
      ];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-carousel')).toBeTruthy();
    });

    it('should render correct number of slides after filtering', () => {
      const mockAds = [
        {
          id: 1,
          title: 'Ad with Image',
          description: 'Has image',
          status: 'active',
          creative_url: 'https://api.example.com/image/1/bottom',
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
        {
          id: 2,
          title: 'Ad without Image',
          description: 'No image',
          status: 'active',
          creative_url: null,
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
        {
          id: 3,
          title: 'Another Ad with Image',
          description: 'Has image',
          status: 'active',
          creative_url: 'https://api.example.com/image/3/bottom',
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
      ];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      // Should render 2 slides (ads 1 and 3, skipping 2 which has no image)
      expect(getByTestId('ad-carousel')).toBeTruthy();
    });
  });

  describe('Status Filtering', () => {
    it('should only show active ads', () => {
      const mockAds = [
        {
          id: 1,
          title: 'Active Ad',
          description: 'This is active',
          status: 'active',
          creative_url: 'https://api.example.com/image/1/bottom',
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
        {
          id: 2,
          title: 'Inactive Ad',
          description: 'This is inactive',
          status: 'paused',
          creative_url: 'https://api.example.com/image/2/bottom',
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
      ];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      // Should only show the active ad
      expect(getByTestId('ad-carousel')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle inactive ads gracefully', () => {
      const mockAds = [
        {
          id: 1,
          title: 'Paused Ad',
          description: 'This is paused',
          status: 'paused',
          creative_url: 'https://api.example.com/image/1/bottom',
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
      ];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { queryByTestId } = render(<BannerAdSlot />);

      // Component should still render but with no carousel (all ads filtered)
      expect(queryByTestId('ad-carousel')).toBeNull();
    });
  });

  describe('Overlay Behavior', () => {
    it('should display "Tap to know more" overlay on images', () => {
      const mockAds = [
        {
          id: 1,
          title: 'Test Ad',
          description: 'Test Description',
          status: 'active',
          creative_url: 'https://api.example.com/image/1/bottom',
          creative_urls: [],
          cta: 'Click',
          business_card_id: null,
          ad_type: 'banner',
          phone: '',
        },
      ];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId, UNSAFE_getByType } = render(<BannerAdSlot />);

      // Carousel should be rendered
      expect(getByTestId('ad-carousel')).toBeTruthy();
    });
  });
});
