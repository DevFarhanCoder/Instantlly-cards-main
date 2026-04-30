/**
 * EventCreate — Promo Selector Smoke Test
 *
 * Verifies Step 1 shows a promo Select dropdown when the user has not
 * preselected a promotion, and a CTA when they have no promotions at all.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EventCreate from '../screens/EventCreate';
import authReducer from '../store/authSlice';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: {} }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { userId: 1, name: 'Test' } }),
}));

jest.mock('../hooks/useUserRole', () => ({
  useUserRole: () => ({ isBusiness: true, isCustomer: false, effective: 'business' }),
}));

jest.mock('../hooks/useBusinessCards', () => ({
  useBusinessCards: () => ({ cards: [], isLoading: false }),
}));

jest.mock('../hooks/useEvents', () => ({
  useCreateEvent: () => ({
    mutateAsync: jest.fn(),
    isPending: false,
    isSuccess: false,
    error: null,
  }),
}));

jest.mock('../lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('react-native-calendars', () => ({
  Calendar: () => null,
}));

// Promotion context mock — controllable per test via mutable state object
const mockPromoState: any = {
  promotions: [] as any[],
  selectedPromotionId: null as number | null,
  selectedPromotion: null as any,
  selectPromotion: jest.fn(),
  isLoading: false,
};
jest.mock('../contexts/PromotionContext', () => ({
  usePromotionContext: () => mockPromoState,
  usePromotionTier: () => ({ tier: 'free', isLoading: false }),
  useSelectedBusinessCardId: () => null,
}));

const renderScreen = () =>
  render(
    <Provider
      store={configureStore({
        reducer: { auth: authReducer },
        middleware: (g) => g({ serializableCheck: false }),
      })}
    >
      <EventCreate />
    </Provider>,
  );

describe('EventCreate — promo selector', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockPromoState.selectPromotion = jest.fn();
    mockPromoState.selectedPromotionId = null;
    mockPromoState.selectedPromotion = null;
    mockPromoState.promotions = [];
  });

  it('shows promo select dropdown when user has promotions but none selected', () => {
    mockPromoState.promotions = [
      { id: 5, business_name: 'Acme Co' },
      { id: 6, business_name: 'Beta Ltd' },
    ];
    const { getByTestId, getByText } = renderScreen();
    expect(getByTestId('promo-select-trigger')).toBeTruthy();
    expect(getByText('Choose a promoted business to host this event:')).toBeTruthy();
  });

  it('opens dropdown and calls selectPromotion when an option is picked', () => {
    mockPromoState.promotions = [
      { id: 5, business_name: 'Acme Co' },
      { id: 6, business_name: 'Beta Ltd' },
    ];
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('promo-select-trigger'));
    fireEvent.press(getByText('Beta Ltd'));
    expect(mockPromoState.selectPromotion).toHaveBeenCalledWith(6);
  });

  it('shows create-promotion CTA when user has zero promotions', () => {
    mockPromoState.promotions = [];
    const { getByTestId } = renderScreen();
    const cta = getByTestId('promo-create-cta');
    expect(cta).toBeTruthy();
    fireEvent.press(cta);
    expect(mockNavigate).toHaveBeenCalledWith('BusinessPromotionForm');
  });

  it('hides promo selector once a promotion is preselected', () => {
    mockPromoState.promotions = [{ id: 5, business_name: 'Acme Co' }];
    mockPromoState.selectedPromotionId = 5;
    mockPromoState.selectedPromotion = { id: 5, business_name: 'Acme Co' };
    const { queryByTestId, getByText } = renderScreen();
    expect(queryByTestId('promo-select-trigger')).toBeNull();
    expect(queryByTestId('promo-create-cta')).toBeNull();
    expect(getByText(/Acme Co/)).toBeTruthy();
  });
});
