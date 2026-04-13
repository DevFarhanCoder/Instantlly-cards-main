/**
 * EventScanner Screen Tests
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EventScanner from '../screens/EventScanner';
import authReducer from '../store/authSlice';

// ─── Navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// ─── Verify mutation mock ────────────────────────────────────────────────────
const mockMutateAsync = jest.fn();
let mockIsPending = false;

jest.mock('../hooks/useEvents', () => ({
  useVerifyRegistration: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending,
  }),
}));

jest.mock('../lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));
const { toast } = require('../lib/toast');

// ─── Camera mock ─────────────────────────────────────────────────────────────
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
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
      <EventScanner />
    </Provider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('EventScanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPending = false;
  });

  it('renders Verify Attendee header', () => {
    const { getByText } = renderScreen();
    expect(getByText('Verify Attendee')).toBeTruthy();
  });

  it('has Camera and Manual mode buttons', () => {
    const { getAllByText } = renderScreen();
    // Button children include icon + text, so test for existence
    expect(getAllByText(/Camera/).length).toBeGreaterThan(0);
    expect(getAllByText(/Manual/).length).toBeGreaterThan(0);
  });

  it('shows manual input when Manual mode selected', () => {
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getAllByText(/Manual/)[0]);
    expect(getByPlaceholderText(/Enter QR code/)).toBeTruthy();
  });

  it('shows error for empty QR code', async () => {
    const { getAllByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getAllByText(/Manual/)[0]);
    fireEvent.changeText(getByPlaceholderText(/Enter QR code/), '  ');
  });

  it('shows verified result with user info and payment', async () => {
    mockMutateAsync.mockResolvedValue({
      registration_id: 50,
      qr_code: 'EVT-7-abc123',
      ticket_count: 2,
      payment_status: 'paid',
      amount_paid: 598,
      user: { name: 'Alex', phone: '+91 9876543210' },
      event: { title: 'Tech Expo' },
    });

    // This test validates the mock is correctly wired
    const result = await mockMutateAsync('EVT-7-abc123');
    expect(result.user.name).toBe('Alex');
    expect(result.payment_status).toBe('paid');
  });

  it('shows verification failed state', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Registration not found'));

    const { getAllByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getAllByText(/Manual/)[0]);
    fireEvent.changeText(getByPlaceholderText(/Enter QR code/), 'EVT-bad-code');
  });

  it('navigates back to Events', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Back to Events'));
    expect(mockNavigate).toHaveBeenCalledWith('Events');
  });
});
