/**
 * Events Screen Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Events from '../screens/Events';
import authReducer from '../store/authSlice';

// ─── Navigation mock ─────────────────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// ─── Auth mock ────────────────────────────────────────────────────────────────
let mockUser: any = { userId: 1, name: 'Test' };

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: !!mockUser }),
}));

// ─── Business cards mock ─────────────────────────────────────────────────────
let mockCards: any[] = [];

jest.mock('../hooks/useBusinessCards', () => ({
  useBusinessCards: () => ({ cards: mockCards, isLoading: false }),
}));

// ─── Events hook mock ────────────────────────────────────────────────────────
let mockEvents: any[] = [];
let mockIsLoading = false;
let mockRegistrations: any[] = [];

jest.mock('../hooks/useEvents', () => ({
  useEvents: () => ({
    data: mockEvents,
    isLoading: mockIsLoading,
    refetch: jest.fn(),
  }),
  useMyRegistrations: () => ({
    registrations: mockRegistrations,
    isLoading: false,
    refetch: jest.fn(),
  }),
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
      <Events />
    </Provider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUser = { userId: 1, name: 'Test' };
    mockCards = [];
    mockEvents = [];
    mockIsLoading = false;
    mockRegistrations = [];
  });

  it('renders header with Events Market title', () => {
    const { getByText } = renderScreen();
    expect(getByText('Events Market')).toBeTruthy();
  });

  it('renders My Passes button', () => {
    const { getByText } = renderScreen();
    expect(getByText('My Passes')).toBeTruthy();
  });

  it('renders Scan QR button', () => {
    const { getByText } = renderScreen();
    expect(getByText('Scan QR')).toBeTruthy();
  });

  it('renders search input', () => {
    const { getByPlaceholderText } = renderScreen();
    expect(getByPlaceholderText('Search events, locations...')).toBeTruthy();
  });

  it('shows loading skeletons when loading', () => {
    mockIsLoading = true;
    const { queryByText } = renderScreen();
    expect(queryByText('No events found')).toBeNull();
  });

  it('shows empty state when no events', () => {
    mockEvents = [];
    mockIsLoading = false;
    const { getByText } = renderScreen();
    expect(getByText('No events found')).toBeTruthy();
  });

  it('renders event cards with titles', () => {
    mockEvents = [
      {
        id: 1,
        title: 'Tech Meetup 2026',
        date: '2026-04-15T00:00:00Z',
        time: '10:00',
        location: 'Dev Origin Hub',
        ticket_price: 0,
        status: 'active',
        attendee_count: 25,
        _count: { registrations: 25 },
      },
      {
        id: 2,
        title: 'Music Festival',
        date: '2026-05-01T00:00:00Z',
        time: '18:00',
        location: 'Central Park',
        ticket_price: 500,
        status: 'active',
        attendee_count: 100,
        _count: { registrations: 100 },
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Tech Meetup 2026')).toBeTruthy();
    expect(getByText('Music Festival')).toBeTruthy();
  });

  it('shows FREE badge for free events', () => {
    mockEvents = [
      {
        id: 1,
        title: 'Free Workshop',
        date: '2026-04-15T00:00:00Z',
        time: '10:00',
        location: 'Online',
        ticket_price: 0,
        status: 'active',
        attendee_count: 10,
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('FREE')).toBeTruthy();
  });

  it('shows price for paid events', () => {
    mockEvents = [
      {
        id: 1,
        title: 'Premium Summit',
        date: '2026-04-15T00:00:00Z',
        time: '10:00',
        location: 'NYC',
        ticket_price: 999,
        status: 'active',
        attendee_count: 50,
      },
    ];
    const { getByText } = renderScreen();
    // Badge splits ₹ and number in separate Text nodes
    expect(getByText('999')).toBeTruthy();
  });

  it('shows registration count on event card', () => {
    mockEvents = [
      {
        id: 1,
        title: 'Test Event',
        date: '2026-04-15T00:00:00Z',
        time: '10:00',
        location: 'NYC',
        ticket_price: null,
        status: 'active',
        attendee_count: 42,
        _count: { registrations: 42 },
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText(/42/)).toBeTruthy();
    expect(getByText(/registered/)).toBeTruthy();
  });

  it('filters events by search query', () => {
    mockEvents = [
      {
        id: 1,
        title: 'React Workshop',
        date: '2026-04-15T00:00:00Z',
        time: '10:00',
        location: 'Online',
        ticket_price: null,
        status: 'active',
        attendee_count: 0,
      },
      {
        id: 2,
        title: 'Vue Conference',
        date: '2026-05-01T00:00:00Z',
        time: '14:00',
        location: 'Berlin',
        ticket_price: 200,
        status: 'active',
        attendee_count: 0,
      },
    ];
    const { getByPlaceholderText, getByText, queryByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Search events, locations...'), 'React');
    expect(getByText('React Workshop')).toBeTruthy();
    expect(queryByText('Vue Conference')).toBeNull();
  });

  it('filters events by location search', () => {
    mockEvents = [
      {
        id: 1,
        title: 'Event A',
        date: '2026-04-15T00:00:00Z',
        time: '10:00',
        location: 'Mumbai',
        ticket_price: null,
        status: 'active',
        attendee_count: 0,
      },
      {
        id: 2,
        title: 'Event B',
        date: '2026-05-01T00:00:00Z',
        time: '14:00',
        location: 'Delhi',
        ticket_price: null,
        status: 'active',
        attendee_count: 0,
      },
    ];
    const { getByPlaceholderText, getByText, queryByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Search events, locations...'), 'Mumbai');
    expect(getByText('Event A')).toBeTruthy();
    expect(queryByText('Event B')).toBeNull();
  });

  it('navigates to EventDetail when event card is pressed', () => {
    mockEvents = [
      {
        id: 42,
        title: 'Clickable Event',
        date: '2026-04-15T00:00:00Z',
        time: '10:00',
        location: 'Online',
        ticket_price: null,
        status: 'active',
        attendee_count: 0,
      },
    ];
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Clickable Event'));
    expect(mockNavigate).toHaveBeenCalledWith('EventDetail', { id: 42 });
  });

  it('navigates to MyPasses when My Passes is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('My Passes'));
    expect(mockNavigate).toHaveBeenCalledWith('MyPasses');
  });

  it('navigates to EventScanner when Scan QR is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Scan QR'));
    expect(mockNavigate).toHaveBeenCalledWith('EventScanner');
  });

  it('shows Create button for business users', () => {
    mockCards = [
      { id: '10', full_name: 'Harish Dev Origin', company_name: 'Dev Origin' },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Create')).toBeTruthy();
  });

  it('hides Create button for non-business users', () => {
    mockCards = [];
    const { queryByText } = renderScreen();
    expect(queryByText('Create')).toBeNull();
  });

  it('navigates to EventCreate when Create is pressed', () => {
    mockCards = [
      { id: '10', full_name: 'Harish Dev Origin', company_name: 'Dev Origin' },
    ];
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Create'));
    expect(mockNavigate).toHaveBeenCalledWith('EventCreate');
  });

  it('renders trending events banner', () => {
    const { getByText } = renderScreen();
    expect(getByText('Discover Events Near You')).toBeTruthy();
  });

  it('renders location on event card', () => {
    mockEvents = [
      {
        id: 1,
        title: 'Location Test',
        date: '2026-04-15T00:00:00Z',
        time: '10:00',
        location: 'Bangalore Tech Park',
        ticket_price: null,
        status: 'active',
        attendee_count: 0,
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Bangalore Tech Park')).toBeTruthy();
  });
});
