/**
 * MyPasses Screen Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MyPasses from '../screens/MyPasses';
import authReducer from '../store/authSlice';

// ─── Navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// ─── Auth ────────────────────────────────────────────────────────────────────
let mockUser: any = { userId: 1, email: 'test@test.com' };

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: jest.fn(),
    loading: false,
    isAuthenticated: !!mockUser,
  }),
}));

// ─── Registrations ──────────────────────────────────────────────────────────
let mockPasses: any[] = [];
let mockPassesLoading = false;

jest.mock('../hooks/useEvents', () => ({
  useMyRegistrations: () => ({
    registrations: mockPasses,
    isLoading: mockPassesLoading,
    refetch: jest.fn(),
  }),
}));

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
      <MyPasses />
    </Provider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('MyPasses', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUser = { userId: 1, email: 'test@test.com' };
    mockPasses = [];
    mockPassesLoading = false;
  });

  it('shows sign in prompt when not authenticated', () => {
    mockUser = null;
    const { getByText } = renderScreen();
    expect(getByText('Your Event Passes')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('navigates to Auth when Sign In pressed', () => {
    mockUser = null;
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('Auth');
  });

  it('shows My Passes header', () => {
    const { getByText } = renderScreen();
    expect(getByText('My Passes')).toBeTruthy();
  });

  it('shows empty state when no passes', () => {
    const { getByText } = renderScreen();
    expect(getByText('No event passes yet')).toBeTruthy();
    expect(getByText('Browse Events')).toBeTruthy();
  });

  it('navigates to Events from empty state', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Browse Events'));
    expect(mockNavigate).toHaveBeenCalledWith('Events');
  });

  it('renders pass cards with event title', () => {
    mockPasses = [
      {
        id: 1,
        event_id: 10,
        qr_code: 'EVT-10-abc',
        ticket_count: 1,
        registered_at: '2026-04-01T10:00:00Z',
        event: {
          title: 'Tech Meetup 2026',
          date: '2026-04-15T00:00:00Z',
          time: '10:00',
          location: 'Bangalore',
        },
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Tech Meetup 2026')).toBeTruthy();
    expect(getByText('Registered')).toBeTruthy();
  });

  it('shows tap hint on pass cards', () => {
    mockPasses = [
      {
        id: 1,
        event_id: 10,
        qr_code: 'EVT-10-abc',
        ticket_count: 1,
        registered_at: '2026-04-01T10:00:00Z',
        event: {
          title: 'Tapable Event',
          date: '2026-04-15T00:00:00Z',
          time: '10:00',
          location: 'NYC',
        },
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Tap to view full pass')).toBeTruthy();
  });

  it('navigates to PassDetail when pass card is pressed', () => {
    mockPasses = [
      {
        id: 42,
        event_id: 10,
        qr_code: 'EVT-10-abc',
        ticket_count: 1,
        registered_at: '2026-04-01T10:00:00Z',
        event: {
          title: 'Navigate Test',
          date: '2026-04-15T00:00:00Z',
          time: '10:00',
          location: 'NYC',
        },
      },
    ];
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Navigate Test'));
    expect(mockNavigate).toHaveBeenCalledWith('PassDetail', { passId: 42 });
  });

  it('shows tap to view details for passes without QR', () => {
    mockPasses = [
      {
        id: 1,
        event_id: 10,
        qr_code: null,
        ticket_count: 1,
        registered_at: '2026-04-01T10:00:00Z',
        event: {
          title: 'No QR Event',
          date: '2026-04-15T00:00:00Z',
          time: '10:00',
          location: 'NYC',
        },
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Tap to view details')).toBeTruthy();
  });

  it('renders multiple passes', () => {
    mockPasses = [
      {
        id: 1,
        event_id: 10,
        qr_code: 'EVT-1',
        ticket_count: 1,
        registered_at: '2026-04-01T10:00:00Z',
        event: { title: 'Event A', date: '2026-04-15T00:00:00Z', time: '10:00' },
      },
      {
        id: 2,
        event_id: 20,
        qr_code: 'EVT-2',
        ticket_count: 1,
        registered_at: '2026-04-02T10:00:00Z',
        event: { title: 'Event B', date: '2026-05-01T00:00:00Z', time: '14:00' },
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Event A')).toBeTruthy();
    expect(getByText('Event B')).toBeTruthy();
  });

  it('shows Paid badge for passes with payment_status paid', () => {
    mockPasses = [
      {
        id: 1,
        event_id: 10,
        qr_code: 'EVT-10-abc',
        ticket_count: 1,
        payment_status: 'paid',
        amount_paid: 299,
        registered_at: '2026-04-01T10:00:00Z',
        event: {
          title: 'Paid Event',
          date: '2026-04-15T00:00:00Z',
          time: '10:00',
          location: 'Mumbai',
        },
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Paid')).toBeTruthy();
    expect(getByText('Registered')).toBeTruthy();
  });

  it('does not show Paid badge for free event passes', () => {
    mockPasses = [
      {
        id: 1,
        event_id: 10,
        qr_code: 'EVT-10-abc',
        ticket_count: 1,
        payment_status: 'not_required',
        registered_at: '2026-04-01T10:00:00Z',
        event: {
          title: 'Free Event',
          date: '2026-04-15T00:00:00Z',
          time: '10:00',
          location: 'Delhi',
        },
      },
    ];
    const { queryByText, getByText } = renderScreen();
    expect(getByText('Registered')).toBeTruthy();
    expect(queryByText('Paid')).toBeNull();
  });
});
