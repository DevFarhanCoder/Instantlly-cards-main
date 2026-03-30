/**
 * EventEdit Screen Tests
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EventEdit from '../screens/EventEdit';
import authReducer from '../store/authSlice';

// ─── Navigation mock ─────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { id: '5' } }),
}));

// ─── Auth mock ────────────────────────────────────────────────────────────────
jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { userId: 1, name: 'Test' } }),
}));

// ─── RTK Query mocks ─────────────────────────────────────────────────────────
const mockUpdateEvent = jest.fn().mockReturnValue({ unwrap: () => Promise.resolve({}) });
let mockEvent: any = null;
let mockIsLoading = false;

jest.mock('../store/api/eventsApi', () => ({
  useGetEventQuery: jest.fn(() => ({
    data: mockEvent,
    isLoading: mockIsLoading,
  })),
  useUpdateEventMutation: jest.fn(() => [
    mockUpdateEvent,
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
      <EventEdit />
    </Provider>
  );

describe('EventEdit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEvent = null;
    mockIsLoading = false;
  });

  it('shows loading state', () => {
    mockIsLoading = true;
    const { getByText } = renderScreen();
    expect(getByText('Loading...')).toBeTruthy();
  });

  it('shows not found when event is null', () => {
    mockEvent = null;
    const { getByText } = renderScreen();
    expect(getByText('Event not found')).toBeTruthy();
  });

  it('renders edit form with event data', () => {
    mockEvent = {
      id: 5,
      title: 'Tech Summit 2026',
      description: 'Annual tech conference',
      date: '2026-06-15T00:00:00Z',
      time: '10:00',
      location: 'Convention Center',
      ticket_price: 500,
      max_attendees: 200,
      status: 'active',
      business_id: 1,
      attendee_count: 50,
      created_at: '2026-03-30T00:00:00Z',
    };
    const { getByText, getByDisplayValue } = renderScreen();
    expect(getByText('Edit Event')).toBeTruthy();
    expect(getByDisplayValue('Tech Summit 2026')).toBeTruthy();
    expect(getByDisplayValue('Annual tech conference')).toBeTruthy();
    expect(getByDisplayValue('Convention Center')).toBeTruthy();
    expect(getByDisplayValue('500')).toBeTruthy();
    expect(getByDisplayValue('200')).toBeTruthy();
    expect(getByText('Save Changes')).toBeTruthy();
  });

  it('renders status selector with active/cancelled/completed', () => {
    mockEvent = {
      id: 5,
      title: 'Test',
      description: '',
      date: '2026-06-15T00:00:00Z',
      time: '10:00',
      location: '',
      ticket_price: null,
      max_attendees: null,
      status: 'active',
      business_id: 1,
      attendee_count: 0,
      created_at: '2026-03-30T00:00:00Z',
    };
    const { getByText } = renderScreen();
    expect(getByText('Active')).toBeTruthy();
    expect(getByText('Cancelled')).toBeTruthy();
    expect(getByText('Completed')).toBeTruthy();
  });

  it('navigates back when Go Back is pressed on not found', () => {
    mockEvent = null;
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Go Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('calls updateEvent on save', async () => {
    mockEvent = {
      id: 5,
      title: 'Tech Summit',
      description: '',
      date: '2026-06-15T00:00:00Z',
      time: '10:00',
      location: 'NYC',
      ticket_price: null,
      max_attendees: null,
      status: 'active',
      business_id: 1,
      attendee_count: 0,
      created_at: '2026-03-30T00:00:00Z',
    };
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Save Changes'));
    await waitFor(() => {
      expect(mockUpdateEvent).toHaveBeenCalledWith(
        expect.objectContaining({ id: 5, title: 'Tech Summit' })
      );
    });
  });
});
