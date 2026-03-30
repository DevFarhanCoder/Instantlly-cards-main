/**
 * EventCreate Screen Tests
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EventCreate from '../screens/EventCreate';
import authReducer from '../store/authSlice';

// ─── Navigation mock ─────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: {} }),
}));

// ─── Auth mock ────────────────────────────────────────────────────────────────
let mockUser: any = { userId: 1, name: 'Test' };

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// ─── Business cards mock ─────────────────────────────────────────────────────
let mockCards: any[] = [];

jest.mock('../hooks/useBusinessCards', () => ({
  useBusinessCards: () => ({ cards: mockCards, isLoading: false }),
}));

// ─── Create event mock ──────────────────────────────────────────────────────
const mockMutateAsync = jest.fn();
let mockIsPending = false;

jest.mock('../hooks/useEvents', () => ({
  useCreateEvent: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
    isSuccess: false,
    error: null,
  }),
}));

// ─── Toast mock ──────────────────────────────────────────────────────────────
jest.mock('../lib/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const { toast } = require('../lib/toast');

// ─── Calendar mock ───────────────────────────────────────────────────────────
let capturedOnDayPress: ((day: any) => void) | null = null;

jest.mock('react-native-calendars', () => ({
  Calendar: (props: any) => {
    capturedOnDayPress = props.onDayPress;
    const MockView = require('react-native').View;
    const MockText = require('react-native').Text;
    const MockPressable = require('react-native').Pressable;
    return (
      <MockView testID="rn-calendar">
        <MockText>Calendar</MockText>
        <MockPressable
          testID="calendar-select-date"
          onPress={() => props.onDayPress?.({ dateString: '2026-04-15' })}
        >
          <MockText>15</MockText>
        </MockPressable>
      </MockView>
    );
  },
}));

// ─── Store & render helpers ──────────────────────────────────────────────────
const createTestStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    middleware: (getDefault) => getDefault({ serializableCheck: false }),
  });

const renderScreen = () =>
  render(
    <Provider store={createTestStore()}>
      <EventCreate />
    </Provider>
  );

/** Press the submit button (last "Create Event" text) */
const pressSubmit = (rendered: ReturnType<typeof renderScreen>) => {
  const all = rendered.getAllByText('Create Event');
  fireEvent.press(all[all.length - 1]);
};

/** Fill required fields using the new picker UI */
const fillRequiredFields = (rendered: ReturnType<typeof renderScreen>) => {
  const { getByPlaceholderText, getByTestId, getByText } = rendered;

  // Title
  fireEvent.changeText(getByPlaceholderText('e.g. Digital Marketing Summit 2026'), 'Tech Meetup 2026');
  // Venue
  fireEvent.changeText(getByPlaceholderText('e.g. Jio Convention Centre, Mumbai'), 'Dev Origin Hub');

  // Date — open picker, select date
  fireEvent.press(getByTestId('date-picker-trigger'));
  fireEvent.press(getByTestId('calendar-select-date'));

  // Time — open picker, select a slot
  fireEvent.press(getByTestId('time-picker-trigger'));
  fireEvent.press(getByText('10:00 AM'));
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EventCreate', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockMutateAsync.mockClear();
    mockMutateAsync.mockResolvedValue({});
    toast.success.mockClear();
    toast.error.mockClear();
    mockUser = { userId: 1, name: 'Test' };
    mockCards = [
      { id: '10', full_name: 'Harish Dev Origin', company_name: 'Dev Origin', phone: '+91 99999' },
    ];
    mockIsPending = false;
  });

  it('renders Create Event header and submit button', () => {
    const { getAllByText } = renderScreen();
    expect(getAllByText('Create Event').length).toBeGreaterThanOrEqual(2);
  });

  it('renders all form fields', () => {
    const { getByText, getByPlaceholderText, getByTestId } = renderScreen();
    expect(getByText('Event Title *')).toBeTruthy();
    expect(getByPlaceholderText('e.g. Digital Marketing Summit 2026')).toBeTruthy();
    expect(getByText('Description')).toBeTruthy();
    expect(getByPlaceholderText("What's this event about?")).toBeTruthy();
    expect(getByTestId('date-picker-trigger')).toBeTruthy();
    expect(getByTestId('time-picker-trigger')).toBeTruthy();
    expect(getByPlaceholderText('e.g. Jio Convention Centre, Mumbai')).toBeTruthy();
    expect(getByPlaceholderText('Leave empty for unlimited')).toBeTruthy();
  });

  it('shows business card name (not ID) in selector', () => {
    const { getByText, queryByText } = renderScreen();
    expect(getByText('Link to Business Card')).toBeTruthy();
    // Should show full name, not numeric ID
    expect(getByText(/Harish Dev Origin/)).toBeTruthy();
    expect(queryByText('10')).toBeNull();
  });

  it('hides business card selector when no cards', () => {
    mockCards = [];
    const { queryByText } = renderScreen();
    expect(queryByText('Link to Business Card')).toBeNull();
  });

  it('renders free event toggle', () => {
    const { getByText } = renderScreen();
    expect(getByText('Free Event')).toBeTruthy();
    expect(getByText('Toggle off to set a ticket price')).toBeTruthy();
  });

  it('renders date picker placeholder', () => {
    const { getByText } = renderScreen();
    expect(getByText('Pick a date')).toBeTruthy();
  });

  it('renders time picker placeholder', () => {
    const { getByText } = renderScreen();
    expect(getByText('Pick a time')).toBeTruthy();
  });

  it('opens calendar modal when date trigger is pressed', () => {
    const { getByTestId } = renderScreen();
    fireEvent.press(getByTestId('date-picker-trigger'));
    expect(getByTestId('rn-calendar')).toBeTruthy();
  });

  it('selects date from calendar and shows formatted date', () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('date-picker-trigger'));
    fireEvent.press(getByTestId('calendar-select-date'));
    // Should show formatted date now
    expect(getByText(/Apr/)).toBeTruthy();
    expect(getByText(/2026/)).toBeTruthy();
  });

  it('opens time picker when time trigger is pressed', () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('time-picker-trigger'));
    // Should show time slots
    expect(getByText('10:00 AM')).toBeTruthy();
    expect(getByText('2:30 PM')).toBeTruthy();
  });

  it('selects time and shows formatted time', () => {
    const { getByTestId, getByText } = renderScreen();
    fireEvent.press(getByTestId('time-picker-trigger'));
    fireEvent.press(getByText('10:00 AM'));
    // After selection, picker closes, formatted time shown
    expect(getByText('10:00 AM')).toBeTruthy();
  });

  it('shows Creating... when mutation is pending', () => {
    mockIsPending = true;
    const { getByText } = renderScreen();
    expect(getByText('Creating...')).toBeTruthy();
  });

  it('shows validation error when required fields are empty', async () => {
    const rendered = renderScreen();
    await act(async () => {
      pressSubmit(rendered);
    });
    expect(toast.error).toHaveBeenCalledWith('Please fill all required fields');
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('shows error when no business card exists', async () => {
    mockCards = [];
    const rendered = renderScreen();
    const { getByPlaceholderText, getByTestId, getByText } = rendered;

    fireEvent.changeText(getByPlaceholderText('e.g. Digital Marketing Summit 2026'), 'Test');
    fireEvent.changeText(getByPlaceholderText('e.g. Jio Convention Centre, Mumbai'), 'NYC');
    fireEvent.press(getByTestId('date-picker-trigger'));
    fireEvent.press(getByTestId('calendar-select-date'));
    fireEvent.press(getByTestId('time-picker-trigger'));
    fireEvent.press(getByText('10:00 AM'));

    await act(async () => {
      pressSubmit(rendered);
    });

    expect(toast.error).toHaveBeenCalledWith(
      'No business card found. Please create a business card first.'
    );
  });

  it('redirects to Auth if user is not signed in', async () => {
    mockUser = null;
    const rendered = renderScreen();
    fillRequiredFields(rendered);

    await act(async () => {
      pressSubmit(rendered);
    });

    expect(toast.error).toHaveBeenCalledWith('Please sign in');
    expect(mockNavigate).toHaveBeenCalledWith('Auth');
  });

  it('calls mutateAsync with correct payload on submit', async () => {
    const rendered = renderScreen();
    const { getByPlaceholderText } = rendered;

    fillRequiredFields(rendered);
    fireEvent.changeText(getByPlaceholderText("What's this event about?"), 'A great event');
    fireEvent.changeText(getByPlaceholderText('Leave empty for unlimited'), '50');

    await act(async () => {
      pressSubmit(rendered);
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        title: 'Tech Meetup 2026',
        description: 'A great event',
        date: '2026-04-15',
        time: '10:00',
        location: 'Dev Origin Hub',
        ticket_price: undefined,
        max_attendees: 50,
        business_id: 10,
      });
    });
  });

  it('navigates to Events and shows success toast after creation', async () => {
    const rendered = renderScreen();
    fillRequiredFields(rendered);

    await act(async () => {
      pressSubmit(rendered);
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Event created successfully!');
      expect(mockNavigate).toHaveBeenCalledWith('Events');
    });
  });

  it('shows error toast when creation fails', async () => {
    mockMutateAsync.mockRejectedValueOnce({ data: { error: 'Forbidden' } });
    const rendered = renderScreen();
    fillRequiredFields(rendered);

    await act(async () => {
      pressSubmit(rendered);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Forbidden');
      expect(mockNavigate).not.toHaveBeenCalledWith('Events');
    });
  });

  it('shows validation error message from 422 response', async () => {
    mockMutateAsync.mockRejectedValueOnce({
      data: { errors: [{ msg: 'Invalid value', path: 'business_id' }] },
    });
    const rendered = renderScreen();
    fillRequiredFields(rendered);

    await act(async () => {
      pressSubmit(rendered);
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Invalid value');
    });
  });

  it('renders organizer name and category fields', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    expect(getByPlaceholderText('e.g. John Doe or Company Name')).toBeTruthy();
    expect(getByText('Category')).toBeTruthy();
  });
});
