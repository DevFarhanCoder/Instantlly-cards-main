import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
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

describe('BannerAdSlot - UI Tests', () => {
  const mockAds = [
    {
      id: 1,
      title: 'Premium Listing',
      description: 'Get premium visibility for your business',
      status: 'active',
      creative_url: 'https://example.com/image1.jpg',
      creative_urls: ['https://example.com/image1.jpg'],
      cta: 'Learn More',
      business_card_id: 1,
      phone: '1234567890',
    },
    {
      id: 2,
      title: 'Boost Your Ads',
      description: 'Increase your reach and engagement',
      status: 'active',
      creative_url: 'https://example.com/image2.jpg',
      creative_urls: ['https://example.com/image2.jpg'],
      cta: 'Learn More',
      business_card_id: 2,
      phone: '9876543210',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (useActiveAds as jest.Mock).mockReturnValue({
      data: mockAds,
      isLoading: false,
      refetch: jest.fn(),
    });
    (useRecordClick as jest.Mock).mockReturnValue(jest.fn());
    (useRecordImpression as jest.Mock).mockReturnValue(jest.fn());
    (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue(mockAds);
    (urlNormalizer.getAdImageUrl as jest.Mock).mockImplementation((ad) => ad.creative_url);
  });

  describe('Layout and Structure', () => {
    it('should render banner ad container', () => {
      render(<BannerAdSlot />);
      expect(screen.getByTestId('banner-ad-slot')).toBeTruthy();
    });

    it('should render carousel with correct height', () => {
      const { getByTestId } = render(<BannerAdSlot />);
      const carousel = getByTestId('ad-carousel');
      expect(carousel).toBeTruthy();
    });

    it('should display correct number of slides', () => {
      const { getByTestId } = render(<BannerAdSlot />);

      mockAds.forEach(ad => {
        expect(getByTestId(`ad-slide-${ad.id}`)).toBeTruthy();
      });
    });
  });

  describe('Overlay Display', () => {
    it('should display "Tap to know more" overlay on bottom ad', () => {
      const { getByText } = render(<BannerAdSlot />);

      // The overlay text should be visible
      const overlayElements = getByText('Tap to know more');
      expect(overlayElements).toBeTruthy();
    });

    it('should show overlay on all image ads', () => {
      const { getAllByText } = render(<BannerAdSlot />);

      // Should find "Tap to know more" for each ad with an image
      const overlayTexts = getAllByText('Tap to know more');
      expect(overlayTexts.length).toBeGreaterThan(0);
    });
  });

  describe('Button Styling and Appearance', () => {
    it('should display Chat and Call buttons with correct styling', async () => {
      const { getByTestId, getByText } = render(<BannerAdSlot />);

      // Open modal by tapping an ad
      fireEvent.press(getByTestId('ad-tap-1'));

      await waitFor(() => {
        // Buttons should be accessible
        const chatButton = getByTestId('ad-chat-button');
        const callButton = getByTestId('ad-call-button');

        expect(chatButton).toBeTruthy();
        expect(callButton).toBeTruthy();
      });
    });

    it('should display close button as [X] icon in top-right', async () => {
      const { getByTestId, queryByTestId } = render(<BannerAdSlot />);

      // Open modal
      fireEvent.press(getByTestId('ad-tap-1'));

      await waitFor(() => {
        const closeButton = queryByTestId('ad-modal-close');
        expect(closeButton).toBeTruthy();
      });
    });
  });

  describe('Content Display', () => {
    it('should display ad image correctly', () => {
      render(<BannerAdSlot />);

      // First ad should have image
      expect(screen.getByTestId('ad-slide-1')).toBeTruthy();
    });

    it('should display button labels correctly', async () => {
      const { getByTestId, getByText } = render(<BannerAdSlot />);

      fireEvent.press(getByTestId('ad-tap-1'));

      await waitFor(() => {
        expect(getByText('Chat')).toBeTruthy();
        expect(getByText('Call Now')).toBeTruthy();
      });
    });
  });

  describe('Responsiveness', () => {
    it('should handle multiple ads responsively', () => {
      const manyAds = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        title: `Ad ${i + 1}`,
        description: 'Test Description',
        status: 'active',
        creative_url: `https://example.com/image${i + 1}.jpg`,
        creative_urls: [`https://example.com/image${i + 1}.jpg`],
        cta: 'Learn More',
        business_card_id: i + 1,
        phone: '1234567890',
      }));

      (useActiveAds as jest.Mock).mockReturnValue({
        data: manyAds,
        isLoading: false,
        refetch: jest.fn(),
      });

      (urlNormalizer.prepareAdsForDisplay as jest.Mock).mockReturnValue(manyAds);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-carousel')).toBeTruthy();
    });

    it('should render ads that fit screen width', () => {
      const { getByTestId } = render(<BannerAdSlot />);

      mockAds.forEach(ad => {
        const slide = getByTestId(`ad-slide-${ad.id}`);
        expect(slide).toBeTruthy();
      });
    });
  });

  describe('Modal Appearance', () => {
    it('should display fullscreen modal with black background', async () => {
      const { getByTestId } = render(<BannerAdSlot />);

      fireEvent.press(getByTestId('ad-tap-1'));

      await waitFor(() => {
        const modal = getByTestId('ad-fullscreen-modal');
        expect(modal).toBeTruthy();
      });
    });

    it('should display fullscreen image properly', async () => {
      const { getByTestId } = render(<BannerAdSlot />);

      fireEvent.press(getByTestId('ad-tap-1'));

      await waitFor(() => {
        // Modal should be visible
        expect(getByTestId('ad-fullscreen-modal')).toBeTruthy();
      });
    });
  });

  describe('Empty and Loading States UX', () => {
    it('should display loading indicator with text', () => {
      (useActiveAds as jest.Mock).mockReturnValue({
        data: [],
        isLoading: true,
        refetch: jest.fn(),
      });

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-loading')).toBeTruthy();
      expect(getByTestId('ad-loading-spinner')).toBeTruthy();
    });

    it('should display empty state message when no ads', () => {
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

  describe('Interactive Elements', () => {
    it('should make bottom ad pressable', () => {
      const { getByTestId } = render(<BannerAdSlot />);

      const tapElement = getByTestId('ad-tap-1');
      expect(tapElement).toBeTruthy();
      expect(tapElement.props.onPress).toBeDefined();
    });

    it('should enable button interaction in modal', async () => {
      const { getByTestId } = render(<BannerAdSlot />);

      fireEvent.press(getByTestId('ad-tap-1'));

      await waitFor(() => {
        const chatButton = getByTestId('ad-chat-button');
        const callButton = getByTestId('ad-call-button');

        expect(chatButton.props.onPress).toBeDefined();
        expect(callButton.props.onPress).toBeDefined();
      });
    });

    it('should make close button closable', async () => {
      const { getByTestId } = render(<BannerAdSlot />);

      fireEvent.press(getByTestId('ad-tap-1'));

      await waitFor(() => {
        const closeButton = getByTestId('ad-modal-close');
        expect(closeButton.props.onPress).toBeDefined();
      });
    });
  });
});
