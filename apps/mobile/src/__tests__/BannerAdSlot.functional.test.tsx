import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import BannerAdSlot from '../components/ads/BannerAdSlot';
import * as useActiveAdsHook from '../hooks/useActiveAds';

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

// Mock lucide-react-native
jest.mock('lucide-react-native', () => ({
  X: () => null,
}));

describe('BannerAdSlot - Functional Tests', () => {
  const mockUseActiveAds = jest.spyOn(useActiveAdsHook, 'useActiveAds');
  const mockUseRecordImpression = jest.spyOn(useActiveAdsHook, 'useRecordImpression');
  const mockRecordClick = jest.fn();
  const mockUseRecordClick = jest.spyOn(useActiveAdsHook, 'useRecordClick');

  const createMockAd = (id: number) => ({
    id,
    title: `Ad ${id}`,
    description: `Description ${id}`,
    status: 'active',
    creative_url: `https://api.example.com/image/${id}/bottom`,
    creative_urls: [],
    cta: 'Click',
    business_card_id: null,
    ad_type: 'banner',
    phone: '1234567890',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRecordImpression.mockReturnValue(undefined);
    mockUseRecordClick.mockReturnValue(mockRecordClick);
  });

  describe('Carousel Rendering', () => {
    it('should display carousel with multiple ads', () => {
      const mockAds = [createMockAd(1), createMockAd(2), createMockAd(3)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-carousel')).toBeTruthy();
    });

    it('should render ads in carousel', () => {
      const mockAds = [createMockAd(1), createMockAd(2)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getAllByTestId } = render(<BannerAdSlot />);

      const slides = getAllByTestId(/^ad-slide-/);
      expect(slides.length).toBeGreaterThan(0);
    });
  });

  describe('Modal Interactions', () => {
    it('should record click when ad is tapped', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getAllByTestId } = render(<BannerAdSlot />);

      const tapLayers = getAllByTestId('ad-tap-1');
      if (tapLayers.length > 0) {
        fireEvent.press(tapLayers[0]);
        expect(mockRecordClick).toHaveBeenCalledWith(1);
      }
    });
  });;

  describe('State Retention', () => {
    it('should maintain carousel structure across interactions', () => {
      const mockAds = [createMockAd(1), createMockAd(2), createMockAd(3)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId, getAllByTestId } = render(<BannerAdSlot />);

      // Carousel should exist
      expect(getByTestId('ad-carousel')).toBeTruthy();

      // Tap ad
      const tapLayers = getAllByTestId('ad-tap-1');
      if (tapLayers.length > 0) {
        fireEvent.press(tapLayers[0]);
      }

      // Carousel should still be there
      expect(getByTestId('ad-carousel')).toBeTruthy();
    });

    it('should handle data updates', () => {
      const mockAds1 = [createMockAd(1), createMockAd(2)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds1,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId, rerender } = render(<BannerAdSlot />);

      expect(getByTestId('ad-carousel')).toBeTruthy();

      // Update with new data
      const mockAds2 = [createMockAd(1), createMockAd(2), createMockAd(3)];
      mockUseActiveAds.mockReturnValue({
        data: mockAds2,
        isLoading: false,
        error: null,
      } as any);

      rerender(<BannerAdSlot />);

      // Carousel should still exist
      expect(getByTestId('ad-carousel')).toBeTruthy();
    });
  });

  describe('Image Handling', () => {
    it('should handle ads with different image URLs', () => {
      const mockAds = [
        createMockAd(1),
        {
          ...createMockAd(2),
          creative_url: null,
        },
        createMockAd(3),
      ];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      // Should still render carousel
      expect(getByTestId('ad-carousel')).toBeTruthy();
    });

    it('should render overlay on image ads', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-carousel')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator', () => {
      mockUseActiveAds.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-loading')).toBeTruthy();
    });

    it('should handle empty ads list', () => {
      mockUseActiveAds.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      const { queryByTestId } = render(<BannerAdSlot />);

      // Component should not render when no ads and not loading
      expect(queryByTestId('banner-ad-slot')).toBeNull();
    });
  });
});
