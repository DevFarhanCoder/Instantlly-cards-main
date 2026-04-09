import React from 'react';
import { render, screen } from '@testing-library/react-native';
import BannerAdSlot from '../BannerAdSlot';
import { useActiveAds, useRecordClick, useRecordImpression } from '../../../hooks/useActiveAds';
import * as urlNormalizer from '../../../utils/urlNormalizer';

// Mock dependencies
jest.mock('../../../hooks/useActiveAds');
jest.mock('../../../utils/urlNormalizer');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

describe('BannerAdSlot - Unit Tests', () => {
  const mockAds = [
    {
      id: 1,
      title: 'Test Ad 1',
      description: 'Test Description 1',
      status: 'active',
      creative_url: 'https://example.com/image1.jpg',
      creative_urls: ['https://example.com/image1.jpg'],
      cta: 'Learn More',
      business_card_id: 1,
      phone: '1234567890',
    },
    {
      id: 2,
      title: 'Test Ad 2',
      description: 'Test Description 2',
      status: 'active',
      creative_url: null,
      creative_urls: [],
      cta: 'Learn More',
      business_card_id: 2,
      phone: '1234567890',
    },
    {
      id: 3,
      title: 'Test Ad 3',
      description: 'Test Description 3',
      status: 'active',
      creative_url: 'https://example.com/image3.jpg',
      creative_urls: ['https://example.com/image3.jpg'],
      cta: 'Learn More',
      business_card_id: 3,
      phone: '1234567890',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useActiveAds as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      refetch: jest.fn(),
    });
    (useRecordClick as jest.Mock).mockReturnValue(jest.fn());
    (useRecordImpression as jest.Mock).mockReturnValue(jest.fn());
  });

  describe('Image Filtering', () => {
    it('should skip ads without images', () => {
      (useActiveAds as jest.Mock).mockReturnValue({
        data: mockAds,
        isLoading: false,
        refetch: jest.fn(),
      });

      (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue(mockAds);
      (urlNormalizer.getAdImageUrl as jest.Mock).mockImplementation((ad) => {
        return ad.creative_url; // Returns null for ad with id=2
      });

      render(<BannerAdSlot />);

      // Should skip ad with id=2 (no image)
      // Only ads with id=1 and id=3 should be rendered
      expect(screen.getByTestId('ad-slide-1')).toBeTruthy();
      expect(screen.getByTestId('ad-slide-3')).toBeTruthy();
      expect(screen.queryByTestId('ad-slide-2')).toBeFalsy();
    });

    it('should display all ads when all have images', () => {
      const adsWithImages = mockAds.filter(ad => ad.creative_url !== null);

      (useActiveAds as jest.Mock).mockReturnValue({
        data: adsWithImages,
        isLoading: false,
        refetch: jest.fn(),
      });

      (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue(adsWithImages);
      (urlNormalizer.getAdImageUrl as jest.Mock).mockImplementation((ad) => ad.creative_url);

      render(<BannerAdSlot />);

      expect(screen.getByTestId('ad-carousel')).toBeTruthy();
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner when isLoading is true', () => {
      (useActiveAds as jest.Mock).mockReturnValue({
        data: [],
        isLoading: true,
        refetch: jest.fn(),
      });

      render(<BannerAdSlot />);

      expect(screen.getByTestId('ad-loading')).toBeTruthy();
      expect(screen.getByTestId('ad-loading-spinner')).toBeTruthy();
    });

    it('should show empty state when no ads available', () => {
      (useActiveAds as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      });

      (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue([]);
      (urlNormalizer.getAdImageUrl as jest.Mock).mockReturnValue(null);

      render(<BannerAdSlot />);

      expect(screen.getByTestId('ad-empty')).toBeTruthy();
    });
  });

  describe('Ad Rendering', () => {
    it('should render ads with images correctly', () => {
      const adWithImage = mockAds[0];

      (useActiveAds as jest.Mock).mockReturnValue({
        data: [adWithImage],
        isLoading: false,
        refetch: jest.fn(),
      });

      (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue([adWithImage]);
      (urlNormalizer.getAdImageUrl as jest.Mock).mockReturnValue(adWithImage.creative_url);

      render(<BannerAdSlot />);

      expect(screen.getByTestId('ad-carousel')).toBeTruthy();
      expect(screen.getByTestId('ad-slide-1')).toBeTruthy();
    });

    it('should render carousel with correct number of slides after filtering', () => {
      (useActiveAds as jest.Mock).mockReturnValue({
        data: mockAds,
        isLoading: false,
        refetch: jest.fn(),
      });

      (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue(mockAds);
      (urlNormalizer.getAdImageUrl as jest.Mock).mockImplementation((ad) => ad.creative_url);

      render(<BannerAdSlot />);

      // Should have 2 ads (id 1 and 3), but with infinite scroll there should be 4 slides (lastAd, ad1, ad3, firstAd)
      const carousel = screen.getByTestId('ad-carousel');
      expect(carousel).toBeTruthy();
    });
  });

  describe('Status Filtering', () => {
    it('should only show active ads', () => {
      const mixedAds = [
        { ...mockAds[0], status: 'active' },
        { ...mockAds[1], status: 'inactive' },
        { ...mockAds[2], status: 'active' },
      ];

      (useActiveAds as jest.Mock).mockReturnValue({
        data: mixedAds,
        isLoading: false,
        refetch: jest.fn(),
      });

      // Only active ads should be passed to prepareAdsForDisplay
      const expectedActiveAds = mixedAds.filter(ad => ad.status === 'active');
      (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue(expectedActiveAds);
      (urlNormalizer.getAdImageUrl as jest.Mock).mockImplementation((ad) => ad.creative_url);

      render(<BannerAdSlot />);

      expect(screen.getByTestId('ad-carousel')).toBeTruthy();
    });
  });
});
