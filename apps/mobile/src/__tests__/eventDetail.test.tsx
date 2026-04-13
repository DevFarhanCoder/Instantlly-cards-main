/**
 * EventDetail Screen Tests
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EventDetail from '../screens/EventDetail';
import authReducer from '../store/authSlice';

// ─── Navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
  useRoute: () => ({ params: { id: '1' } }),
}));

// ─── Auth ────────────────────────────────────────────────────────────────────
let mockUser: any = { userId: 1, name: 'Test' };

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: !!mockUser }),
}));

// ─── Events hooks ────────────────────────────────────────────────────────────
let mockEvent: any = null;
let mockEventLoading = false;
let mockRegistrations: any[] = [];
const mockMutateAsync = jest.fn();
const mockCreatePaymentIntent = jest.fn();

jest.mock('../hooks/useEvents', () => ({
  useEvent: () => ({ data: mockEvent, isLoading: mockEventLoading }),
  useCreateEventPaymentIntent: () => ({
    mutateAsync: mockCreatePaymentIntent,
    isPending: false,
  }),
  useRegisterForEvent: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
  useMyRegistrations: () => ({
    registrations: mockRegistrations,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
const { toast } = require('../lib/toast');

jest.mock('../lib/payments/razorpayCheckout', () => ({
  openRazorpayCheckout: jest.fn(),
}));
const { openRazorpayCheckout } = require('../lib/payments/razorpayCheckout');

jest.mock('react-native-qrcode-svg', () => 'QRCode');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const createStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    middleware: (gd: any) => gd({ serializableCheck: false }),
  });

const renderScreen = () =>
  render(
    <Provider store={createStore()}>
      <EventDetail />
    </Provider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('EventDetail', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockMutateAsync.mockClear();
    mockCreatePaymentIntent.mockClear();
    openRazorpayCheckout.mockClear();
    toast.success.mockClear();
    toast.error.mockClear();
    mockUser = { userId: 1, name: 'Test' };
    mockRegistrations = [];
    mockEventLoading = false;
    mockEvent = {
      id: 1,
      title: 'Tech Meetup',
      description: 'A great meetup',
      date: '2026-04-15T00:00:00Z',
      time: '10:00',
      location: 'Bangalore',
      ticket_price: 0,
      max_attendees: 100,
      attendee_count: 42,
      status: 'active',
      business: { id: 10, full_name: 'Harish', company_name: 'Dev Origin' },
    };
    mockCreatePaymentIntent.mockResolvedValue({
      key_id: 'rzp_test_key',
      order_id: 'order_123',
      amount: 50000,
      currency: 'INR',
      event_id: 1,
      event_title: 'Tech Meetup',
      ticket_count: 1,
      unit_price: 500,
    });
    openRazorpayCheckout.mockResolvedValue({
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'sig_123',
    });
  });

  it('shows loading state', () => {
    mockEventLoading = true;
    const { getByTestId, queryByText } = renderScreen();
    // PageLoader renders ActivityIndicator, not text
    expect(queryByText('Tech Meetup')).toBeNull();
  });

  it('shows not found when no event', () => {
    mockEvent = null;
    const { getByText } = renderScreen();
    expect(getByText('Event not found')).toBeTruthy();
  });

  it('renders event title and details', () => {
    const { getByText } = renderScreen();
    expect(getByText('Tech Meetup')).toBeTruthy();
    expect(getByText('A great meetup')).toBeTruthy();
    expect(getByText('Bangalore')).toBeTruthy();
  });

  it('shows FREE badge for free events', () => {
    const { getByText } = renderScreen();
    expect(getByText('FREE')).toBeTruthy();
  });

  it('shows price badge for paid events', () => {
    mockEvent = { ...mockEvent, ticket_price: 500 };
    const { getByText } = renderScreen();
    expect(getByText('500')).toBeTruthy();
  });

  it('shows Register Now button for free events', () => {
    const { getByText } = renderScreen();
    expect(getByText(/Register Now/)).toBeTruthy();
  });

  it('shows price in register button for paid events', () => {
    mockEvent = { ...mockEvent, ticket_price: 299 };
    const { getByText } = renderScreen();
    expect(getByText(/Register.*299/)).toBeTruthy();
  });

  it('shows price confirmation screen for paid events', () => {
    mockEvent = { ...mockEvent, ticket_price: 500 };
    const { getByText } = renderScreen();
    fireEvent.press(getByText(/Register.*500/));
    expect(getByText('Confirm Registration')).toBeTruthy();
    expect(getByText('₹500')).toBeTruthy();
    expect(getByText('Ticket Price')).toBeTruthy();
    expect(getByText('Proceed to Register')).toBeTruthy();
  });

  it('shows form after confirming paid event price', () => {
    mockEvent = { ...mockEvent, ticket_price: 500 };
    const { getByText } = renderScreen();
    fireEvent.press(getByText(/Register.*500/));
    fireEvent.press(getByText('Proceed to Register'));
    expect(getByText('Full Name *')).toBeTruthy();
    expect(getByText('Email *')).toBeTruthy();
  });

  it('can cancel price confirmation', () => {
    mockEvent = { ...mockEvent, ticket_price: 500 };
    const { getByText } = renderScreen();
    fireEvent.press(getByText(/Register.*500/));
    fireEvent.press(getByText('Cancel'));
    // Should be back to original register button
    expect(getByText(/Register.*500/)).toBeTruthy();
  });

  it('shows Already Registered when user has an existing pass', () => {
    mockRegistrations = [
      { id: 99, event_id: 1, user_id: 1, qr_code: 'EVT-1-abc123', ticket_count: 1 },
    ];
    const { getByText, queryByText } = renderScreen();
    expect(getByText('Already Registered')).toBeTruthy();
    expect(getByText('You have a pass for this event')).toBeTruthy();
    expect(getByText('View All Passes')).toBeTruthy();
    expect(queryByText(/Register Now/)).toBeNull();
  });

  it('shows QR code for existing registration', () => {
    mockRegistrations = [
      { id: 99, event_id: 1, user_id: 1, qr_code: 'EVT-1-abc123', ticket_count: 1 },
    ];
    const { getByText } = renderScreen();
    expect(getByText('EVT-1-abc123')).toBeTruthy();
  });

  it('navigates to MyPasses from existing registration', () => {
    mockRegistrations = [
      { id: 99, event_id: 1, user_id: 1, qr_code: 'EVT-1-abc123', ticket_count: 1 },
    ];
    const { getByText } = renderScreen();
    fireEvent.press(getByText('View All Passes'));
    expect(mockNavigate).toHaveBeenCalledWith('MyPasses');
  });

  it('redirects to Auth when not signed in', () => {
    mockUser = null;
    const { getByText } = renderScreen();
    fireEvent.press(getByText(/Register Now/));
    expect(toast.error).toHaveBeenCalledWith('Please sign in to register');
    expect(mockNavigate).toHaveBeenCalledWith('Auth');
  });

  it('shows registration form when Register Now pressed (free event)', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText(/Register Now/));
    expect(getByText('Full Name *')).toBeTruthy();
    expect(getByText('Email *')).toBeTruthy();
  });

  it('shows ticket price reminder in form for paid events', () => {
    mockEvent = { ...mockEvent, ticket_price: 299 };
    const { getByText } = renderScreen();
    fireEvent.press(getByText(/Register.*299/));
    fireEvent.press(getByText('Proceed to Register'));
    expect(getByText('₹299')).toBeTruthy();
    expect(getByText(/secure online checkout/)).toBeTruthy();
  });

  it('runs paid checkout before registering', async () => {
    mockEvent = { ...mockEvent, ticket_price: 500 };
    const { getByText, getByPlaceholderText } = renderScreen();

    fireEvent.press(getByText(/Register.*500/));
    fireEvent.press(getByText('Proceed to Register'));
    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Alex Doe');
    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'alex@example.com');

    await act(async () => {
      fireEvent.press(getByText(/Confirm & Register/));
    });

    await waitFor(() => {
      expect(mockCreatePaymentIntent).toHaveBeenCalled();
      expect(openRazorpayCheckout).toHaveBeenCalled();
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          payment: {
            razorpay_order_id: 'order_123',
            razorpay_payment_id: 'pay_123',
            razorpay_signature: 'sig_123',
          },
        })
      );
    });
  });

  it('validates name and email before submit', async () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText(/Register Now/));
    await act(async () => {
      fireEvent.press(getByText(/Confirm Registration/));
    });
    expect(toast.error).toHaveBeenCalledWith('Please fill in your name and email');
  });

  it('shows Razorpay payment text for paid events in form', () => {
    mockEvent = { ...mockEvent, ticket_price: 299 };
    const { getByText } = renderScreen();
    fireEvent.press(getByText(/Register.*299/));
    fireEvent.press(getByText('Proceed to Register'));
    expect(getByText(/secure online/)).toBeTruthy();
  });

  it('shows Already Registered with QR for paid registration (no Payment Confirmed in overview)', () => {
    mockRegistrations = [
      {
        id: 99,
        event_id: 1,
        user_id: 1,
        qr_code: 'EVT-1-paidpass',
        ticket_count: 1,
        payment_status: 'paid',
        amount_paid: 500,
      },
    ];
    const { getByText, queryByText } = renderScreen();
    expect(getByText('Already Registered')).toBeTruthy();
    expect(getByText('EVT-1-paidpass')).toBeTruthy();
    // Payment Confirmed only shows for fresh registrations, not existing passes
    expect(queryByText('Payment Confirmed')).toBeNull();
  });

  it('does not show Payment Confirmed for free registrations', () => {
    mockRegistrations = [
      {
        id: 99,
        event_id: 1,
        user_id: 1,
        qr_code: 'EVT-1-freepass',
        ticket_count: 1,
        payment_status: 'not_required',
      },
    ];
    const { queryByText } = renderScreen();
    expect(queryByText('Payment Confirmed')).toBeNull();
  });

  it('shows error toast when Razorpay checkout fails', async () => {
    mockEvent = { ...mockEvent, ticket_price: 500 };
    openRazorpayCheckout.mockRejectedValue(new Error('Payment cancelled'));
    const { getByText, getByPlaceholderText } = renderScreen();

    fireEvent.press(getByText(/Register.*500/));
    fireEvent.press(getByText('Proceed to Register'));
    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Alex');
    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'a@b.com');

    await act(async () => {
      fireEvent.press(getByText(/Confirm & Register/));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('shows error toast when payment intent creation fails', async () => {
    mockEvent = { ...mockEvent, ticket_price: 500 };
    mockCreatePaymentIntent.mockRejectedValue(new Error('Server error'));
    const { getByText, getByPlaceholderText } = renderScreen();

    fireEvent.press(getByText(/Register.*500/));
    fireEvent.press(getByText('Proceed to Register'));
    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Alex');
    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'a@b.com');

    await act(async () => {
      fireEvent.press(getByText(/Confirm & Register/));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });

  it('submits free event registration without Razorpay', async () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getByText(/Register Now/));
    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'Free User');
    fireEvent.changeText(getByPlaceholderText('your@email.com'), 'free@test.com');

    await act(async () => {
      fireEvent.press(getByText(/Confirm Registration/));
    });

    await waitFor(() => {
      expect(openRazorpayCheckout).not.toHaveBeenCalled();
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          event_id: '1',
          full_name: 'Free User',
          email: 'free@test.com',
        })
      );
    });
  });
});
