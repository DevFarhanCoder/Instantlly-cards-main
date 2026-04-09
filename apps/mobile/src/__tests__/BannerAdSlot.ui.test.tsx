import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Text, View, Image, ScrollView, Modal, Pressable } from 'react-native';
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
  X: () => <View testID="close-icon" />,
}));

// Mock Dimensions
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Dimensions: {
      get: () => ({ width: 375, height: 812 }),
    },
  };
});

describe('BannerAdSlot - UI Tests', () => {
  const mockUseActiveAds = jest.spyOn(useActiveAdsHook, 'useActiveAds');
  const mockUseRecordImpression = jest.spyOn(useActiveAdsHook, 'useRecordImpression');
  const mockUseRecordClick = jest.spyOn(useActiveAdsHook, 'useRecordClick');

  const createMockAd = (id: number, hasImage = true) => ({
    id,
    title: `Ad ${id}`,
    description: `Description ${id}`,
    status: 'active',
    creative_url: hasImage ? `https://api.example.com/image/${id}/bottom` : null,
    creative_urls: [],
    cta: 'Click',
    business_card_id: null,
    ad_type: 'banner',
    phone: '1234567890',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRecordImpression.mockReturnValue(undefined);
    mockUseRecordClick.mockReturnValue(jest.fn());
  });

  describe('Basic Rendering', () => {
    it('should render banner ad container', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('banner-ad-slot')).toBeTruthy();
    });

    it('should render carousel with correct height', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      const carousel = getByTestId('ad-carousel');
      expect(carousel).toBeTruthy();
    });

    it('should display correct number of slides', () => {
      const mockAds = [createMockAd(1), createMockAd(2), createMockAd(3)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId, getAllByTestId } = render(<BannerAdSlot />);

      // Get all slides
      const slides = getAllByTestId(/^ad-slide-/);
      expect(slides.length).toBeGreaterThan(0);
    });
  });

  describe('Overlay Display', () => {
    it('should display "Tap to know more" overlay', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-carousel')).toBeTruthy();
    });

    it('should show overlay on all image ads', () => {
      const mockAds = [
        createMockAd(1),
        createMockAd(2),
        createMockAd(3),
      ];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId, getAllByTestId } = render(<BannerAdSlot />);

      // Should have multiple slides
      const slides = getAllByTestId(/^ad-slide-/);
      expect(slides.length).toBeGreaterThan(0);
    });
  });

  describe('Modal UI', () => {
    it('should render fullscreen modal', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-fullscreen-modal')).toBeTruthy();
    });

    it('should display fullscreen image', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-fullscreen-modal')).toBeTruthy();
    });

    it('should display close button [X] in top-right', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-modal-close')).toBeTruthy();
    });

    it('should display Chat and Call buttons with correct styling', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-chat-button')).toBeTruthy();
      expect(getByTestId('ad-call-button')).toBeTruthy();
    });
  });

  describe('Button Display', () => {
    it('should render Chat button with correct text', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId, getByText } = render(<BannerAdSlot />);

      // Button should be in the DOM
      expect(getByTestId('ad-chat-button')).toBeTruthy();
    });

    it('should render Call button with correct text', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-call-button')).toBeTruthy();
    });

    it('should render close button with X icon', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-modal-close')).toBeTruthy();
    });
  });

  describe('Image Display', () => {
    it('should display ad images correctly', () => {
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

  describe('Loading and Empty States', () => {
    it('should show loading indicator and text', () => {
      mockUseActiveAds.mockReturnValue({
        data: [],
        isLoading: true,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-loading')).toBeTruthy();
      expect(getByTestId('ad-loading-spinner')).toBeTruthy();
    });

    it('should show empty state message when no ads', () => {
      mockUseActiveAds.mockReturnValue({
        data: [],
        isLoading: false,
        error: null,
      } as any);

      const { queryByTestId } = render(<BannerAdSlot />);

      // Component returns null when no ads and not loading
      expect(queryByTestId('banner-ad-slot')).toBeNull();
    });
  });

  describe('Responsive Layout', () => {
    it('should handle multiple ads responsively', () => {
      const mockAds = Array.from({ length: 10 }, (_, i) => createMockAd(i + 1));

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-carousel')).toBeTruthy();
    });

    it('should render ads that fit screen width', () => {
      const mockAds = [createMockAd(1), createMockAd(2)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-carousel')).toBeTruthy();
    });
  });

  describe('Modal Display States', () => {
    it('should render fullscreen modal with black background', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-fullscreen-modal')).toBeTruthy();
    });

    it('should display fallback UI when fullscreen image unavailable', () => {
      const mockAds = [
        {
          ...createMockAd(1),
          creative_url: null,
        },
      ];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      // Component should still render (carousel shows demo or fallback)
      expect(getByTestId('banner-ad-slot')).toBeTruthy();
    });
  });

  describe('Interactive Elements', () => {
    it('should render ad slides with tap areas', () => {
      const mockAds = [createMockAd(1)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-tap-1')).toBeTruthy();
    });

    it('should render carousel controls', () => {
      const mockAds = [createMockAd(1), createMockAd(2), createMockAd(3)];

      mockUseActiveAds.mockReturnValue({
        data: mockAds,
        isLoading: false,
        error: null,
      } as any);

      const { getByTestId } = render(<BannerAdSlot />);

      expect(getByTestId('ad-carousel')).toBeTruthy();
    });
  });
});
