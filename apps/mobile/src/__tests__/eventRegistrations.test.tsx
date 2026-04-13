/**
 * EventRegistrations Screen Tests
 */
import React from 'react';
import { render } from '@testing-library/react-native';
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

jest.mock('../store/api/eventsApi', () => ({
  useGetEventQuery: jest.fn(() => ({
    data: mockEvent,
  })),
  useGetEventRegistrationsQuery: jest.fn(() => ({
    data: mockRegistrations,
    isLoading: mockIsLoading,
  })),
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
    expect(getByText('Loading registrations...')).toBeTruthy();
  });

  it('shows empty state when no registrations', () => {
    mockRegistrations = [];
    mockIsLoading = false;
    const { getByText } = renderScreen();
    expect(getByText('No registrations yet')).toBeTruthy();
  });

  it('renders header with event title', () => {
    mockEvent = {
      id: 3,
      title: 'Music Fest',
      date: '2026-07-01T00:00:00Z',
      time: '18:00',
      status: 'active',
      business_id: 1,
      attendee_count: 5,
      created_at: '2026-03-30T00:00:00Z',
    };
    const { getByText } = renderScreen();
    expect(getByText('Registrations')).toBeTruthy();
    expect(getByText('Music Fest')).toBeTruthy();
  });

  it('renders registration count stats', () => {
    mockRegistrations = [
      { id: 1, event_id: 3, user_id: 10, ticket_count: 2, registered_at: '2026-03-30T10:00:00Z', user: { id: 10, name: 'Alice', phone: '+91 111', profile_picture: null } },
      { id: 2, event_id: 3, user_id: 11, ticket_count: 1, registered_at: '2026-03-30T11:00:00Z', user: { id: 11, name: 'Bob', phone: '+91 222', profile_picture: null } },
    ];
    const { getAllByText, getByText } = renderScreen();
    expect(getByText('Total Registered')).toBeTruthy();
    expect(getByText('Total Tickets')).toBeTruthy();
  });

  it('renders each registrant with name', () => {
    mockRegistrations = [
      { id: 1, event_id: 3, user_id: 10, ticket_count: 1, registered_at: '2026-03-30T10:00:00Z', user: { id: 10, name: 'Alice', phone: '+91 111', profile_picture: null } },
      { id: 2, event_id: 3, user_id: 11, ticket_count: 3, registered_at: '2026-03-30T11:00:00Z', user: { id: 11, name: 'Bob', phone: '+91 222', profile_picture: null } },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Alice')).toBeTruthy();
    expect(getByText('Bob')).toBeTruthy();
  });

  it('shows max capacity when event has max_attendees', () => {
    mockEvent = {
      id: 3,
      title: 'Music Fest',
      max_attendees: 100,
      date: '2026-07-01T00:00:00Z',
      time: '18:00',
      status: 'active',
      business_id: 1,
      attendee_count: 5,
      created_at: '2026-03-30T00:00:00Z',
    };
    const { getByText } = renderScreen();
    expect(getByText('100')).toBeTruthy();
    expect(getByText('Max Capacity')).toBeTruthy();
  });

  it('shows Paid badge for paid registrations', () => {
    mockRegistrations = [
      {
        id: 1,
        event_id: 3,
        user_id: 10,
        ticket_count: 1,
        payment_status: 'paid',
        amount_paid: 299,
        registered_at: '2026-03-30T10:00:00Z',
        user: { id: 10, name: 'Alice', phone: '+91 111', profile_picture: null },
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Paid')).toBeTruthy();
    expect(getByText('₹299')).toBeTruthy();
  });

  it('does not show payment badge for free event registrations', () => {
    mockRegistrations = [
      {
        id: 1,
        event_id: 3,
        user_id: 10,
        ticket_count: 1,
        payment_status: 'not_required',
        registered_at: '2026-03-30T10:00:00Z',
        user: { id: 10, name: 'Bob', phone: '+91 222', profile_picture: null },
      },
    ];
    const { queryByText } = renderScreen();
    expect(queryByText('Paid')).toBeNull();
  });
});
