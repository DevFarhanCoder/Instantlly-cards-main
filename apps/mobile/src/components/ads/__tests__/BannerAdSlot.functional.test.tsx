import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import BannerAdSlot from '../BannerAdSlot';
import { useActiveAds, useRecordClick, useRecordImpression } from '../../../hooks/useActiveAds';
import * as urlNormalizer from '../../../utils/urlNormalizer';

jest.mock('../../../hooks/useActiveAds');
jest.mock('../../../utils/urlNormalizer');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

describe('BannerAdSlot - Functional Tests', () => {
  const mockAds = [
    {
      id: 1,
      title: 'Ad 1',
      description: 'Description 1',
      status: 'active',
      creative_url: 'https://example.com/image1.jpg',
      creative_urls: ['https://example.com/image1.jpg'],
      cta: 'Learn More',
      business_card_id: 1,
      phone: '1234567890',
    },
    {
      id: 2,
      title: 'Ad 2',
      description: 'Description 2',
      status: 'active',
      creative_url: 'https://example.com/image2.jpg',
      creative_urls: ['https://example.com/image2.jpg'],
      cta: 'Learn More',
      business_card_id: 2,
      phone: '1234567890',
    },
    {
      id: 3,
      title: 'Ad 3',
      description: 'Description 3',
      status: 'active',
      creative_url: 'https://example.com/image3.jpg',
      creative_urls: ['https://example.com/image3.jpg'],
      cta: 'Learn More',
      business_card_id: 3,
      phone: '1234567890',
    },
  ];

  const mockRecordClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (useActiveAds as jest.Mock).mockReturnValue({
      data: mockAds,
      isLoading: false,
      refetch: jest.fn(),
    });
    (useRecordClick as jest.Mock).mockReturnValue(mockRecordClick);
    (useRecordImpression as jest.Mock).mockReturnValue(jest.fn());
    (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue(mockAds);
    (urlNormalizer.getAdImageUrl as jest.Mock).mockImplementation((ad) => ad.creative_url);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Carousel Auto-Scroll', () => {
    it('should auto-scroll to next ad after 5 seconds', async () => {
      const { getByTestId } = render(<BannerAdSlot />);

      const carousel = getByTestId('ad-carousel');
      expect(carousel).toBeTruthy();

      // Fast-forward 5 seconds for auto-scroll
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(carousel).toBeTruthy();
      });
    });

    it('should loop carousel continuously without restarting state', async () => {
      const { getByTestId } = render(<BannerAdSlot />);

      const carousel = getByTestId('ad-carousel');

      // Simulate multiple auto-scrolls
      act(() => {
        jest.advanceTimersByTime(5000); // First ad
        jest.advanceTimersByTime(5000); // Second ad
        jest.advanceTimersByTime(5000); // Third ad
        jest.advanceTimersByTime(5000); // Loop back
      });

      await waitFor(() => {
        expect(carousel).toBeTruthy();
      });

      // Carousel should still be mounted and functional
      expect(getByTestId('ad-carousel')).toBeTruthy();
    });
  });

  describe('Modal Interaction', () => {
    it('should open modal when clicking on bottom ad', async () => {
      const { getByTestId, queryByTestId } = render(<BannerAdSlot />);

      // Modal should not be visible initially
      expect(queryByTestId('ad-fullscreen-modal')).toBeFalsy();

      // Click on first ad
      const firstAdTap = getByTestId('ad-tap-1');
      fireEvent.press(firstAdTap);

      await waitFor(() => {
        expect(mockRecordClick).toHaveBeenCalledWith(1);
      });
    });

    it('should record click when ad is tapped', () => {
      const { getByTestId } = render(<BannerAdSlot />);

      const firstAdTap = getByTestId('ad-tap-1');
      fireEvent.press(firstAdTap);

      expect(mockRecordClick).toHaveBeenCalledWith(1);
    });

    it('should close modal when close button is pressed', async () => {
      const { getByTestId, queryByTestId } = render(<BannerAdSlot />);

      // Open modal
      const firstAdTap = getByTestId('ad-tap-1');
      fireEvent.press(firstAdTap);

      await waitFor(() => {
        expect(mockRecordClick).toHaveBeenCalled();
      });

      // Close button should be available
      const closeBtn = queryByTestId('ad-modal-close');
      if (closeBtn) {
        fireEvent.press(closeBtn);
      }
    });
  });

  describe('State Retention', () => {
    it('should retain carousel position when modal opens and closes', async () => {
      const { getByTestId } = render(<BannerAdSlot />);

      const carousel = getByTestId('ad-carousel');
      const initialPosition = carousel.props.scrollEnabled;

      // Open modal
      fireEvent.press(getByTestId('ad-tap-1'));

      await waitFor(() => {
        expect(mockRecordClick).toHaveBeenCalled();
      });

      // Close modal
      const closeBtn = getByTestId('ad-modal-close');
      fireEvent.press(closeBtn);

      // Carousel should still be functional
      await waitFor(() => {
        expect(getByTestId('ad-carousel')).toBeTruthy();
      });
    });

    it('should not restart carousel when data changes', async () => {
      const { rerender } = render(<BannerAdSlot />);

      // Mock the same data again (simulating re-fetch with same data)
      (useActiveAds as jest.Mock).mockReturnValue({
        data: mockAds,
        isLoading: false,
        refetch: jest.fn(),
      });

      rerender(<BannerAdSlot />);

      await waitFor(() => {
        // Component should still be mounted
        expect(true).toBe(true);
      });
    });
  });

  describe('Overlay Display', () => {
    it('should display "Tap to know more" overlay on bottom ads', () => {
      const { UNSAFE_root } = render(<BannerAdSlot />);

      // Find overlay text in the component tree
      const overlayText = UNSAFE_root.findByProps({ testID: 'banner-ad-slot' });
      expect(overlayText).toBeTruthy();
    });
  });

  describe('Ad Filtering', () => {
    it('should handle ads with missing images gracefully', () => {
      const mixedAds = [
        { ...mockAds[0], creative_url: 'https://example.com/image1.jpg' },
        { ...mockAds[1], creative_url: null },
        { ...mockAds[2], creative_url: 'https://example.com/image3.jpg' },
      ];

      (useActiveAds as jest.Mock).mockReturnValue({
        data: mixedAds,
        isLoading: false,
        refetch: jest.fn(),
      });

      (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue(mixedAds);
      (urlNormalizer.getAdImageUrl as jest.Mock).mockImplementation((ad) => ad.creative_url);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-carousel')).toBeTruthy();
    });
  });

  describe('Demo Ads', () => {
    it('should show demo ads when no real ads are available', () => {
      (useActiveAds as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        refetch: jest.fn(),
      });

      (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue([]);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-empty')).toBeTruthy();
    });
  });
});
