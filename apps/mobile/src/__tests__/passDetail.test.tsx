/**
 * PassDetail Screen Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PassDetail from '../screens/PassDetail';
import authReducer from '../store/authSlice';

// ─── Navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockPassId: any = '99';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { passId: mockPassId } }),
}));

// ─── Registrations mock ──────────────────────────────────────────────────────
let mockRegistrations: any[] = [];

jest.mock('../hooks/useEvents', () => ({
  useMyRegistrations: () => ({
    registrations: mockRegistrations,
    isLoading: false,
    refetch: jest.fn(),
  }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { userId: 1 }, isAuthenticated: true }),
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
      <PassDetail />
    </Provider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('PassDetail', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockPassId = '99';
    mockRegistrations = [
      {
        id: 99,
        event_id: 1,
        user_id: 1,
        ticket_count: 1,
        qr_code: 'EVT-1-abc123def456',
        registered_at: '2026-04-01T10:00:00Z',
        event: {
          id: 1,
          title: 'Tech Meetup 2026',
          date: '2026-04-15T00:00:00Z',
          time: '10:00',
          location: 'Dev Origin Hub, Bangalore',
          ticket_price: 299,
        },
      },
    ];
  });

  it('renders Event Pass header', () => {
    const { getByText } = renderScreen();
    expect(getByText('Event Pass')).toBeTruthy();
  });

  it('shows event title', () => {
    const { getByText } = renderScreen();
    expect(getByText('Tech Meetup 2026')).toBeTruthy();
  });

  it('shows QR code text', () => {
    const { getByText } = renderScreen();
    expect(getByText('EVT-1-abc123def456')).toBeTruthy();
  });

  it('shows event location', () => {
    const { getByText } = renderScreen();
    expect(getByText('Dev Origin Hub, Bangalore')).toBeTruthy();
  });

  it('shows Registered badge', () => {
    const { getByText } = renderScreen();
    expect(getByText('Registered')).toBeTruthy();
  });

  it('shows ticket price badge for paid events', () => {
    const { getByText } = renderScreen();
    expect(getByText('299')).toBeTruthy();
  });

  it('shows FREE badge for free events', () => {
    mockRegistrations[0].event.ticket_price = 0;
    const { getByText } = renderScreen();
    expect(getByText('FREE')).toBeTruthy();
  });

  it('shows QR verification instruction', () => {
    const { getByText } = renderScreen();
    expect(getByText('Show this QR code at the event entrance')).toBeTruthy();
  });

  it('shows View Event Details button', () => {
    const { getByText } = renderScreen();
    expect(getByText('View Event Details')).toBeTruthy();
  });

  it('navigates to EventDetail when View Event Details pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('View Event Details'));
    expect(mockNavigate).toHaveBeenCalledWith('EventDetail', { id: 1 });
  });

  it('shows pass not found for invalid passId', () => {
    mockPassId = '9999';
    const { getByText } = renderScreen();
    expect(getByText('Pass not found')).toBeTruthy();
  });

  it('shows Back to My Passes button when not found', () => {
    mockPassId = '9999';
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Back to My Passes'));
    expect(mockNavigate).toHaveBeenCalledWith('MyPasses');
  });

  it('shows registration date', () => {
    const { getByText } = renderScreen();
    expect(getByText(/Registered on/)).toBeTruthy();
  });

  it('shows Paid badge with amount for paid passes', () => {
    mockRegistrations = [
      {
        id: 99,
        event_id: 1,
        user_id: 1,
        ticket_count: 1,
        qr_code: 'EVT-1-abc123def456',
        payment_status: 'paid',
        amount_paid: 500,
        registered_at: '2026-04-01T10:00:00Z',
        event: {
          id: 1,
          title: 'Paid Meetup',
          date: '2026-04-15T00:00:00Z',
          time: '10:00',
          location: 'Bangalore',
          ticket_price: 500,
        },
      },
    ];
    const { getAllByText } = renderScreen();
    const paidElements = getAllByText(/Paid/);
    expect(paidElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Unpaid badge when payment_status is not_required but event is paid', () => {
    mockRegistrations = [
      {
        id: 99,
        event_id: 1,
        user_id: 1,
        ticket_count: 1,
        qr_code: 'EVT-1-abc123def456',
        payment_status: 'not_required',
        registered_at: '2026-04-01T10:00:00Z',
        event: {
          id: 1,
          title: 'Pending Pay Event',
          date: '2026-04-15T00:00:00Z',
          time: '10:00',
          location: 'Bangalore',
          ticket_price: 299,
        },
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Unpaid')).toBeTruthy();
  });
});
