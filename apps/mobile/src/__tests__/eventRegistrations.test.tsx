/**
 * EventRegistrations Screen Tests
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EventRegistrations from '../screens/EventRegistrations';
import authReducer from '../store/authSlice';

// ─── Navigation mock ─────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { id: '3' } }),
}));

// ─── RTK Query mocks ─────────────────────────────────────────────────────────
let mockEvent: any = null;
let mockRegistrations: any[] = [];
let mockIsLoading = false;
const mockRefetch = jest.fn(() => Promise.resolve());

jest.mock('../store/api/eventsApi', () => ({
  useGetEventQuery: jest.fn(() => ({ data: mockEvent })),
  useGetEventRegistrationsQuery: jest.fn(() => ({
    data: mockRegistrations,
    isLoading: mockIsLoading,
    refetch: mockRefetch,
  })),
}));

// ─── Refund hook mock ────────────────────────────────────────────────────────
const mockRefundMutateAsync = jest.fn();
jest.mock('../hooks/useEvents', () => ({
  useRefundRegistration: () => ({
    mutateAsync: mockRefundMutateAsync,
    isPending: false,
  }),
}));

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
      <EventRegistrations />
    </Provider>
  );

describe('EventRegistrations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvent = null;
    mockRegistrations = [];
    mockIsLoading = false;
  });

  it('shows loading state', () => {
    mockIsLoading = true;
    const { getByText } = renderScreen();
    expect(getByText(/Loading registrations/i)).toBeTruthy();
  });

  it('shows empty state when no registrations', () => {
    mockRegistrations = [];
    const { getByText } = renderScreen();
    expect(getByText(/No registrations yet/i)).toBeTruthy();
  });

  it('renders header with event title', () => {
    mockEvent = {
      id: 3,
      title: 'Music Fest',
      date: '2026-07-01T00:00:00Z',
    };
    const { getByText } = renderScreen();
    expect(getByText('Registrations')).toBeTruthy();
    expect(getByText('Music Fest')).toBeTruthy();
  });

  it('renders each registrant with name', () => {
    mockRegistrations = [
      {
        id: 1,
        event_id: 3,
        user_id: 10,
        ticket_count: 1,
        registered_at: '2026-03-30T10:00:00Z',
        user: { id: 10, name: 'Alice', phone: '+91 111' },
      },
      {
        id: 2,
        event_id: 3,
        user_id: 11,
        ticket_count: 3,
        registered_at: '2026-03-30T11:00:00Z',
        user: { id: 11, name: 'Bob', phone: '+91 222' },
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });

  it('shows Refund button for paid registration and triggers mutation on confirm', async () => {
    mockRegistrations = [
      {
        id: 1,
        event_id: 3,
        user_id: 10,
        ticket_count: 1,
        payment_status: 'paid',
        amount_paid: 299,
        registered_at: '2026-03-30T10:00:00Z',
        user: { id: 10, name: 'Alice', phone: '+91 111' },
      },
    ];
    mockRefundMutateAsync.mockResolvedValue({
      registration_id: 1,
      refund_id: 'rfnd_x',
      refund_status: 'refunded',
    });

    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('refund-btn-1'));
    fireEvent.changeText(getByTestId('refund-reason'), 'duplicate');
    fireEvent.press(getByTestId('confirm-refund'));

    await waitFor(() => {
      expect(mockRefundMutateAsync).toHaveBeenCalledWith({
        event_id: 3,
        registration_id: 1,
        reason: 'duplicate',
      });
    });
  });

  it('hides Refund button on already-refunded registrations', () => {
    mockRegistrations = [
      {
        id: 7,
        event_id: 3,
        user_id: 10,
        ticket_count: 1,
        payment_status: 'paid',
        amount_paid: 299,
        refund_status: 'refunded',
        registered_at: '2026-03-30T10:00:00Z',
        user: { id: 10, name: 'Alice', phone: '+91 111' },
      },
    ];
    const { queryByTestId, getAllByText } = renderScreen();
    expect(queryByTestId('refund-btn-7')).toBeNull();
    // "Refunded" appears in the filter pill and the row Badge
    expect(getAllByText(/Refunded/i).length).toBeGreaterThanOrEqual(1);
  });

  it('filters by Refunded tab', () => {
    mockRegistrations = [
      {
        id: 1,
        event_id: 3,
        user_id: 10,
        ticket_count: 1,
        payment_status: 'paid',
        registered_at: '2026-03-30T10:00:00Z',
        user: { id: 10, name: 'Alice' },
      },
      {
        id: 2,
        event_id: 3,
        user_id: 11,
        ticket_count: 1,
        payment_status: 'paid',
        refund_status: 'refunded',
        registered_at: '2026-03-30T11:00:00Z',
        user: { id: 11, name: 'Bob' },
      },
    ];
    const { getByTestId, queryByText, getByText } = renderScreen();
    fireEvent.press(getByTestId('filter-refunded'));
    expect(getByText('Bob')).toBeTruthy();
    expect(queryByText('Alice')).toBeNull();
  });
});
