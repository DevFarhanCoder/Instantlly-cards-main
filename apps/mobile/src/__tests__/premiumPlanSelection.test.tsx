/**
 * PremiumPlanSelection Screen Tests
 * Tests the premium plan selection UI and Razorpay payment flow.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PremiumPlanSelection from '../screens/PremiumPlanSelection';
import authReducer from '../store/authSlice';

// ─── Navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({
    params: {
      formData: {
        full_name: 'Test User',
        company_name: 'Test Co',
        email: 'test@test.com',
        phone: '9876543210',
        whatsapp: '9876543210',
        pincode: '560001',
        city: 'Bangalore',
        state: 'Karnataka',
        description: 'Test biz',
      },
    },
  }),
}));

// ─── Auth ────────────────────────────────────────────────────────────────────
let mockUser: any = { userId: 1, name: 'Test User' };

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: !!mockUser }),
}));

// ─── Business Cards hook ─────────────────────────────────────────────────────
const mockCreateCardMutateAsync = jest.fn();

jest.mock('../hooks/useBusinessCards', () => ({
  useBusinessCards: () => ({
    createCard: { mutateAsync: mockCreateCardMutateAsync },
  }),
}));

// ─── Promotions API hooks ────────────────────────────────────────────────────
const mockCreatePromotion = jest.fn();
const mockCreatePaymentIntent = jest.fn();
const mockVerifyPayment = jest.fn();
const mockPricingPlans = [
  { id: 1, code: 'growth_monthly', rank_label: 'GROWTH', amount: 1500, currency: 'INR', duration_days: 30 },
  { id: 2, code: 'growth_yearly', rank_label: 'GROWTH', amount: 15000, currency: 'INR', duration_days: 365 },
  { id: 3, code: 'boost_monthly', rank_label: 'BOOST', amount: 2500, currency: 'INR', duration_days: 30 },
  { id: 4, code: 'boost_yearly', rank_label: 'BOOST', amount: 25000, currency: 'INR', duration_days: 365 },
  { id: 5, code: 'scale_monthly', rank_label: 'SCALE', amount: 4000, currency: 'INR', duration_days: 30 },
  { id: 6, code: 'scale_yearly', rank_label: 'SCALE', amount: 40000, currency: 'INR', duration_days: 365 },
  { id: 7, code: 'dominate_monthly', rank_label: 'DOMINATE', amount: 5000, currency: 'INR', duration_days: 30 },
  { id: 8, code: 'dominate_yearly', rank_label: 'DOMINATE', amount: 50000, currency: 'INR', duration_days: 365 },
];

jest.mock('../store/api/promotionsApi', () => ({
  useCreatePromotionMutation: () => [
    (data: any) => ({ unwrap: () => mockCreatePromotion(data) }),
  ],
  useCreatePromotionPaymentIntentMutation: () => [
    (data: any) => ({ unwrap: () => mockCreatePaymentIntent(data) }),
  ],
  useVerifyPromotionPaymentMutation: () => [
    (data: any) => ({ unwrap: () => mockVerifyPayment(data) }),
  ],
  useListPricingPlansQuery: () => ({
    data: mockPricingPlans,
    isLoading: false,
  }),
}));

// ─── Toast ───────────────────────────────────────────────────────────────────
jest.mock('../lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
const { toast } = require('../lib/toast');

// ─── Razorpay ────────────────────────────────────────────────────────────────
jest.mock('../lib/payments/razorpayCheckout', () => ({
  isNativeRazorpayAvailable: jest.fn().mockReturnValue(false),
  openRazorpayCheckout: jest.fn(),
}));
const { isNativeRazorpayAvailable, openRazorpayCheckout } = require('../lib/payments/razorpayCheckout');

jest.mock('../lib/payments/RazorpayWebView', () => ({
  RazorpayWebView: ({ visible, onSuccess, onCancel, onError, options }: any) => {
    if (!visible) return null;
    const React = require('react');
    const { View, Text, Pressable } = require('react-native');
    return React.createElement(View, { testID: 'razorpay-webview' }, [
      React.createElement(Text, { key: 'amt' }, `Amount: ${options?.amount}`),
      React.createElement(
        Pressable,
        {
          key: 'pay-btn',
          testID: 'mock-pay-button',
          onPress: () =>
            onSuccess({
              razorpay_order_id: options?.order_id,
              razorpay_payment_id: 'pay_test',
              razorpay_signature: 'sig_test',
            }),
        },
        React.createElement(Text, null, 'Pay Now'),
      ),
      React.createElement(
        Pressable,
        { key: 'cancel', testID: 'mock-cancel', onPress: onCancel },
        React.createElement(Text, null, 'Cancel'),
      ),
    ]);
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────
const createStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    middleware: (gd: any) => gd({ serializableCheck: false }),
  });

const renderScreen = () =>
  render(
    <Provider store={createStore()}>
      <PremiumPlanSelection />
    </Provider>,
  );

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('PremiumPlanSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { userId: 1, name: 'Test User' };
    isNativeRazorpayAvailable.mockReturnValue(false);

    mockCreateCardMutateAsync.mockResolvedValue({ id: 100 });
    mockCreatePromotion.mockResolvedValue({ id: 200 });
    mockCreatePaymentIntent.mockResolvedValue({
      key: 'rzp_test_key',
      order_id: 'order_test',
      amount: 400000,
      currency: 'INR',
    });
    mockVerifyPayment.mockResolvedValue({ success: true });
  });

  /* ─── Rendering ─────────────────────────────────────────────── */

  it('renders the Premium Plans header', () => {
    const { getByText } = renderScreen();
    expect(getByText('Premium Plans')).toBeTruthy();
  });

  it('renders all four plan cards', () => {
    const { getByText } = renderScreen();
    expect(getByText('GROWTH')).toBeTruthy();
    expect(getByText('BOOST')).toBeTruthy();
    expect(getByText('SCALE')).toBeTruthy();
    expect(getByText('DOMINATE')).toBeTruthy();
  });

  it('defaults to SCALE plan selected', () => {
    const { getByText } = renderScreen();
    expect(getByText(/Continue with SCALE/)).toBeTruthy();
  });

  it('renders billing period toggle', () => {
    const { getByText } = renderScreen();
    expect(getByText('Monthly')).toBeTruthy();
    expect(getByText('Yearly')).toBeTruthy();
  });

  /* ─── Plan selection ────────────────────────────────────────── */

  it('changes continue button when a different plan is selected', async () => {
    const { getByText } = renderScreen();

    await act(async () => {
      fireEvent.press(getByText('GROWTH'));
    });

    expect(getByText(/Continue with GROWTH/)).toBeTruthy();
  });

  /* ─── Billing Period Toggle ─────────────────────────────────── */

  it('switches billing period to yearly', async () => {
    const { getByText } = renderScreen();

    await act(async () => {
      fireEvent.press(getByText('Yearly'));
    });

    // The toggle changes internally; verify by triggering payment flow
    // which checks for `scale_yearly` plan code
  });

  /* ─── Payment Flow (WebView) ────────────────────────────────── */

  it('runs full payment flow: card → promo → intent → webview → verify', async () => {
    const { getByText, findByTestId } = renderScreen();

    // Tap Continue
    await act(async () => {
      fireEvent.press(getByText(/Continue with SCALE/));
    });

    // Step 1: card created
    expect(mockCreateCardMutateAsync).toHaveBeenCalled();

    // Step 2: promotion created
    await waitFor(() => {
      expect(mockCreatePromotion).toHaveBeenCalledWith(
        expect.objectContaining({
          business_card_id: 100,
          listing_type: 'premium',
          status: 'draft',
        }),
      );
    });

    // Step 3: payment intent with correct plan id (scale_monthly = id 5)
    await waitFor(() => {
      expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
        promoId: 200,
        pricing_plan_id: 5,
      });
    });

    // Step 4: WebView shown (since native unavailable)
    const webview = await findByTestId('razorpay-webview');
    expect(webview).toBeTruthy();

    // Step 5: Simulate payment success
    await act(async () => {
      fireEvent.press(getByText('Pay Now'));
    });

    // Step 6: Verify called
    await waitFor(() => {
      expect(mockVerifyPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          promoId: 200,
          razorpay_order_id: 'order_test',
          razorpay_payment_id: 'pay_test',
          razorpay_signature: 'sig_test',
        }),
      );
    });

    // Step 7: Navigated to MyCards
    expect(mockNavigate).toHaveBeenCalledWith('MyCards');
    expect(toast.success).toHaveBeenCalledWith('Premium business listing activated!');
  });

  it('uses yearly plan id when yearly billing is selected', async () => {
    const { getByText } = renderScreen();

    // Switch to yearly
    await act(async () => {
      fireEvent.press(getByText('Yearly'));
    });

    // Start payment flow
    await act(async () => {
      fireEvent.press(getByText(/Continue with SCALE/));
    });

    // scale_yearly = id 6
    await waitFor(() => {
      expect(mockCreatePaymentIntent).toHaveBeenCalledWith({
        promoId: 200,
        pricing_plan_id: 6,
      });
    });
  });

  /* ─── Native Razorpay ──────────────────────────────────────── */

  it('uses native Razorpay when available', async () => {
    isNativeRazorpayAvailable.mockReturnValue(true);
    openRazorpayCheckout.mockResolvedValue({
      razorpay_order_id: 'order_test',
      razorpay_payment_id: 'pay_native',
      razorpay_signature: 'sig_native',
    });

    const { getByText, queryByTestId } = renderScreen();

    await act(async () => {
      fireEvent.press(getByText(/Continue with SCALE/));
    });

    await waitFor(() => {
      expect(openRazorpayCheckout).toHaveBeenCalled();
    });

    // WebView should NOT appear
    expect(queryByTestId('razorpay-webview')).toBeNull();

    await waitFor(() => {
      expect(mockVerifyPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          razorpay_payment_id: 'pay_native',
        }),
      );
    });

    expect(mockNavigate).toHaveBeenCalledWith('MyCards');
  });

  /* ─── Error handling ────────────────────────────────────────── */

  it('shows error toast when card creation fails', async () => {
    mockCreateCardMutateAsync.mockRejectedValue(new Error('Network error'));

    const { getByText } = renderScreen();

    await act(async () => {
      fireEvent.press(getByText(/Continue with SCALE/));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Network error');
    });
  });

  it('shows error when promotion creation fails', async () => {
    mockCreatePromotion.mockRejectedValue({ data: { error: 'Promo fail' } });

    const { getByText } = renderScreen();

    await act(async () => {
      fireEvent.press(getByText(/Continue with SCALE/));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Promo fail');
    });
  });

  it('redirects to Auth when user is not signed in', async () => {
    mockUser = null;

    const { getByText } = renderScreen();

    await act(async () => {
      fireEvent.press(getByText(/Continue with/));
    });

    expect(toast.error).toHaveBeenCalledWith('Please sign in to continue');
    expect(mockNavigate).toHaveBeenCalledWith('Auth');
  });
});
