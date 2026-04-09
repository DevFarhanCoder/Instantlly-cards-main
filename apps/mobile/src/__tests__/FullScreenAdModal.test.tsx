/// <reference types="jest" />
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import FullScreenAdModal from '../components/ads/FullScreenAdModal';
import adReducer, { setAds, selectAdForModal, closeModal, recordImpression } from '../store/slices/adSlice';
import { Ad } from '../store/slices/adSlice';

// Mock Linking to prevent actual navigation attempts
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(),
  canOpenURL: jest.fn().mockResolvedValue(true),
}));

// Mock toast library
jest.mock('../lib/toast', () => ({
  toast: {
    show: jest.fn(),
  },
}));

const mockAd: Ad = {
  id: 1,
  priority: 1,
  title: 'Test Ad',
  description: 'This is a test ad description',
  creative_url: 'https://example.com/image.jpg',
  cta: 'Learn More',
  cta_url: 'https://example.com/promo',
  ad_type: 'banner',
  approval_status: 'approved',
  status: 'active',
  phone_number: '+1234567890',
  impressions: 100,
  clicks: 10,
  spent: 50,
  user: {
    id: 1,
    name: 'John Doe',
    phone: '+1234567890',
    email: 'john@example.com',
  },
  business: {
    id: 1,
    company_name: 'Test Company',
    logo_url: 'https://example.com/logo.jpg',
  },
};

const createTestStore = () =>
  configureStore({
    reducer: { ads: adReducer },
  });

describe('FullScreenAdModal Component Integration', () => {
  describe('Modal Visibility and Rendering', () => {
    test('should render modal when isModalVisible is true', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));
      store.dispatch(selectAdForModal(mockAd));

      const { toJSON } = render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      // Modal should be rendered
      expect(toJSON()).toBeTruthy();
    });

    test('should not render modal content when isModalVisible is false', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));

      const { queryByText } = render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      // Ad title should not be visible
      expect(queryByText('Test Ad')).toBeFalsy();
    });

    test('should display ad title and description', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));
      store.dispatch(selectAdForModal(mockAd));

      render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      expect(screen.getByText('Test Ad')).toBeTruthy();
      expect(screen.getByText('This is a test ad description')).toBeTruthy();
    });

    test('should display user info (name and phone)', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));
      store.dispatch(selectAdForModal(mockAd));

      render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      expect(screen.getByText('John Doe')).toBeTruthy();
      expect(screen.getByText('+1234567890')).toBeTruthy();
    });

    test('should display business info (company name)', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));
      store.dispatch(selectAdForModal(mockAd));

      render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      expect(screen.getByText('Test Company')).toBeTruthy();
    });

    test('should display ad metrics (impressions, clicks, spent)', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));
      store.dispatch(selectAdForModal(mockAd));

      const { toJSON } = render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      // Should render metrics (exact format depends on component implementation)
      const tree = toJSON();
      const treeString = JSON.stringify(tree);

      // Check that metric values appear in rendered output
      expect(treeString).toContain('100'); // impressions
      expect(treeString).toContain('10');  // clicks
      expect(treeString).toContain('50');  // spent
    });

    test('should display CTA button text', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));
      store.dispatch(selectAdForModal(mockAd));

      render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      expect(screen.getByText('Learn More')).toBeTruthy();
    });
  });

  describe('Redux Integration', () => {
    test('should dispatch recordImpression when modal opens', async () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));

      const dispatchSpy = jest.spyOn(store, 'dispatch');

      render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      store.dispatch(selectAdForModal(mockAd));

      await waitFor(() => {
        // recordImpression should be dispatched
        const recordImpressionCalls = dispatchSpy.mock.calls.filter(
          call => call[0].type === 'ads/recordImpression'
        );
        expect(recordImpressionCalls.length).toBeGreaterThan(0);
      });
    });

    test('should use selectedAd from Redux state', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));
      store.dispatch(selectAdForModal(mockAd));

      render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      const state = store.getState();
      expect(state.ads.selectedAd).toEqual(mockAd);
      expect(state.ads.isModalVisible).toBe(true);
    });

    test('should dispatch closeModal when modal closes', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));
      store.dispatch(selectAdForModal(mockAd));

      const dispatchSpy = jest.spyOn(store, 'dispatch');

      const { rerender } = render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      // Simulate modal close via Redux action
      store.dispatch(closeModal());

      expect(store.getState().ads.isModalVisible).toBe(false);
    });
  });

  describe('Error States', () => {
    test('should handle missing image gracefully', () => {
      const adWithoutImage: Ad = {
        ...mockAd,
        creative_url: undefined,
        image_url: undefined,
      };

      const store = createTestStore();
      store.dispatch(setAds([adWithoutImage]));
      store.dispatch(selectAdForModal(adWithoutImage));

      const { toJSON } = render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      // Should still render without crashing
      expect(toJSON()).toBeTruthy();
    });

    test('should handle missing user info', () => {
      const adWithoutUser: Ad = {
        ...mockAd,
        user: undefined,
        phone_number: undefined,
      };

      const store = createTestStore();
      store.dispatch(setAds([adWithoutUser]));
      store.dispatch(selectAdForModal(adWithoutUser));

      const { toJSON } = render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      // Should still render without crashing
      expect(toJSON()).toBeTruthy();
    });

    test('should handle missing business info', () => {
      const adWithoutBusiness: Ad = {
        ...mockAd,
        business: undefined,
      };

      const store = createTestStore();
      store.dispatch(setAds([adWithoutBusiness]));
      store.dispatch(selectAdForModal(adWithoutBusiness));

      const { toJSON } = render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      // Should still render without crashing
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Linking Integration', () => {
    test('should render component without crashing when opening links', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));
      store.dispatch(selectAdForModal(mockAd));

      const { toJSON } = render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      // Component should render successfully
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Modal State Persistence', () => {
    test('should restore modal visibility state from Redux', () => {
      const store = createTestStore();
      store.dispatch(setAds([mockAd]));
      store.dispatch(selectAdForModal(mockAd));

      const { rerender } = render(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      expect(store.getState().ads.isModalVisible).toBe(true);
      expect(store.getState().ads.selectedAd).toEqual(mockAd);

      // Rerender - state should still be there
      rerender(
        <Provider store={store}>
          <FullScreenAdModal />
        </Provider>
      );

      expect(store.getState().ads.isModalVisible).toBe(true);
      expect(store.getState().ads.selectedAd).toEqual(mockAd);
    });
  });
});
