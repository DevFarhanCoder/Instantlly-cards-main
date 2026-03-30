/**
 * BookingDetail Screen Tests
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import BookingDetail from '../screens/BookingDetail';
import authReducer from '../store/authSlice';

// ─── Navigation mock ─────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { id: '1' } }),
}));

// ─── Auth mock ────────────────────────────────────────────────────────────────
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { userId: 1, name: 'Test' } }),
}));

// ─── RTK Query mocks ─────────────────────────────────────────────────────────
const mockUpdateStatus = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
let mockBooking: any = null;
let mockIsLoading = false;

jest.mock('../store/api/bookingsApi', () => ({
  useGetBookingQuery: jest.fn(() => ({
    data: mockBooking,
    isLoading: mockIsLoading,
  })),
  useUpdateBookingStatusMutation: jest.fn(() => [
    mockUpdateStatus,
    { isLoading: false },
  ]),
}));

// ─── Toast mock ──────────────────────────────────────────────────────────────
jest.mock('../lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

// ─── Store helper ────────────────────────────────────────────────────────────
const createTestStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  });

const renderScreen = () =>
  render(
    <Provider store={createTestStore()}>
      <BookingDetail />
    </Provider>
  );

describe('BookingDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBooking = null;
    mockIsLoading = false;
  });

  it('shows loading state', () => {
    mockIsLoading = true;
    const { getByText } = renderScreen();
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('shows not found when booking is null', () => {
    mockBooking = null;
    mockIsLoading = false;
    const { getByText } = renderScreen();
    expect(getByText('Booking not found')).toBeTruthy();
  });

  it('renders booking details correctly', () => {
    mockBooking = {
      id: 1,
      user_id: 1,
      business_id: 10,
      business_name: 'Test Salon',
      mode: 'visit',
      booking_date: '2026-04-01',
      booking_time: '10:00 AM',
      customer_name: 'John Doe',
      customer_phone: '+91 98765',
      notes: 'Cut and style',
      status: 'confirmed',
      created_at: '2026-03-30T10:00:00Z',
    };
    const { getByText } = renderScreen();
    expect(getByText('Test Salon')).toBeTruthy();
    expect(getByText('Confirmed')).toBeTruthy();
    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('+91 98765')).toBeTruthy();
    expect(getByText('Visit')).toBeTruthy();
    expect(getByText('10:00 AM')).toBeTruthy();
    expect(getByText('Cut and style')).toBeTruthy();
  });

  it('shows mark completed button for confirmed bookings', () => {
    mockBooking = {
      id: 1,
      user_id: 1,
      business_id: 10,
      business_name: 'Test Salon',
      mode: 'visit',
      booking_date: '2026-04-01',
      booking_time: '10:00 AM',
      customer_name: 'John',
      customer_phone: '+91 98765',
      notes: null,
      status: 'confirmed',
      created_at: '2026-03-30T10:00:00Z',
    };
    const { getByText } = renderScreen();
    expect(getByText('Mark Completed')).toBeTruthy();
    expect(getByText('Cancel Booking')).toBeTruthy();
  });

  it('shows confirm and cancel buttons for pending bookings', () => {
    mockBooking = {
      id: 1,
      user_id: 1,
      business_id: 10,
      business_name: 'Test Salon',
      mode: 'visit',
      booking_date: null,
      booking_time: null,
      customer_name: 'John',
      customer_phone: '+91 98765',
      notes: null,
      status: 'pending',
      created_at: '2026-03-30T10:00:00Z',
    };
    const { getByText } = renderScreen();
    expect(getByText('Confirm Booking')).toBeTruthy();
    expect(getByText('Cancel Booking')).toBeTruthy();
  });

  it('shows re-book button for completed bookings', () => {
    mockBooking = {
      id: 1,
      user_id: 1,
      business_id: 10,
      business_name: 'Test Salon',
      mode: 'visit',
      booking_date: null,
      booking_time: null,
      customer_name: 'John',
      customer_phone: '+91 98765',
      notes: null,
      status: 'completed',
      created_at: '2026-03-30T10:00:00Z',
    };
    const { getByText } = renderScreen();
    expect(getByText(/Re-book with/)).toBeTruthy();
  });

  it('navigates back when Go Back is pressed', () => {
    mockBooking = null;
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Go Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
