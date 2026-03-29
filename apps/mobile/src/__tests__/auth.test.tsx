/**
 * Auth Screen Tests
 * Tests the dual-role signup/login UI flow.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Alert } from 'react-native';
import Auth from '../screens/Auth';
import authReducer, { setCredentials } from '../store/authSlice';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockSignIn = jest.fn();
const mockSignUp = jest.fn();

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    isAuthenticated: false,
    loading: false,
    user: null,
    accessToken: null,
    signOut: jest.fn(),
  }),
}));

jest.mock('lucide-react-native', () => ({
  Users: 'Users',
  Store: 'Store',
  Shield: 'Shield',
  ChevronDown: 'ChevronDown',
  Eye: 'Eye',
  EyeOff: 'EyeOff',
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildTestStore = () =>
  configureStore({ reducer: { auth: authReducer } });

const mockNav = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  push: jest.fn(),
} as any;

const mockRoute = { key: 'Auth', name: 'Auth', params: undefined } as any;

const renderAuth = (store = buildTestStore()) =>
  render(
    <Provider store={store}>
      <Auth navigation={mockNav} route={mockRoute} />
    </Provider>
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Auth Screen — Role Tabs', () => {
  it('renders Customer tab selected by default', () => {
    const { getAllByText } = renderAuth();
    expect(getAllByText('Customer').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('Business').length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Sign in to your customer account" by default on login mode', () => {
    const { getByText } = renderAuth();
    expect(getByText('Sign in to your customer account')).toBeTruthy();
  });

  it('switches to business tab when Business is pressed', () => {
    const { getAllByText, getByText } = renderAuth();
    fireEvent.press(getAllByText('Business')[0]);
    expect(getByText('Sign in to your business account')).toBeTruthy();
  });

  it('shows "Sign up as customer" after switching to sign up mode', () => {
    const { getByText } = renderAuth();
    fireEvent.press(getByText("Don't have an account? Sign Up"));
    expect(getByText('Sign up as customer')).toBeTruthy();
  });

  it('shows "Sign up as business" when business tab + signup mode', () => {
    const { getAllByText, getByText } = renderAuth();
    fireEvent.press(getByText("Don't have an account? Sign Up"));
    fireEvent.press(getAllByText('Business')[0]);
    expect(getByText('Sign up as business')).toBeTruthy();
  });
});

describe('Auth Screen — Signup Role Passing', () => {
  it('calls signUp with role="customer" when customer tab selected', async () => {
    mockSignUp.mockResolvedValueOnce({ user: { id: 1, phone: '919876543210', roles: ['customer'] } });
    const rendered = renderAuth();
    fireEvent.press(rendered.getByText("Don't have an account? Sign Up"));
    rendered.getAllByPlaceholderText('1234567890').forEach((i) => fireEvent.changeText(i, '9876543210'));
    fireEvent.changeText(rendered.getAllByPlaceholderText('••••••••')[0], 'password123');
    fireEvent.changeText(rendered.getAllByPlaceholderText('••••••••')[1], 'password123');
    const nameInputs = rendered.getAllByPlaceholderText('Enter your full name');
    fireEvent.changeText(nameInputs[0], 'Test Customer');

    await act(async () => {
      fireEvent.press(rendered.getByText('Sign Up'));
    });

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.any(String),
        'password123',
        'Test Customer',
        undefined,
        'customer'
      );
    });
  });

  it('calls signUp with role="business" when business tab selected', async () => {
    mockSignUp.mockResolvedValueOnce({ user: { id: 1, phone: '919876543210', roles: ['business'] } });
    const rendered = renderAuth();
    fireEvent.press(rendered.getByText("Don't have an account? Sign Up"));
    fireEvent.press(rendered.getByText('Business'));

    rendered.getAllByPlaceholderText('1234567890').forEach((i) => fireEvent.changeText(i, '9876543210'));
    fireEvent.changeText(rendered.getAllByPlaceholderText('••••••••')[0], 'password123');
    fireEvent.changeText(rendered.getAllByPlaceholderText('••••••••')[1], 'password123');
    const nameInputs = rendered.getAllByPlaceholderText('Enter your business name');
    fireEvent.changeText(nameInputs[0], 'My Business');

    await act(async () => {
      fireEvent.press(rendered.getByText('Sign Up'));
    });

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith(
        expect.any(String),
        'password123',
        'My Business',
        undefined,
        'business'
      );
    });
  });
});

describe('Auth Screen — Login Role Routing', () => {
  const fillAndSubmitLogin = async (rendered: ReturnType<typeof renderAuth>) => {
    rendered.getAllByPlaceholderText('1234567890').forEach((i) => fireEvent.changeText(i, '9876543210'));
    fireEvent.changeText(rendered.getAllByPlaceholderText('••••••••')[0], 'password123');
    await act(async () => {
      fireEvent.press(rendered.getByText('Sign In'));
    });
  };

  it('navigates directly to MyPasses when user has a single role', async () => {
    mockSignIn.mockResolvedValueOnce({ user: { id: 1, phone: '919876543210', roles: ['customer'] } });
    const rendered = renderAuth();
    await fillAndSubmitLogin(rendered);

    await waitFor(() => {
      expect(mockNav.navigate).toHaveBeenCalledWith('MyPasses');
    });
  });

  it('shows role selection modal when user has customer + business roles', async () => {
    mockSignIn.mockResolvedValueOnce({
      user: { id: 1, phone: '919876543210', roles: ['customer', 'business'] },
    });
    const rendered = renderAuth();
    await fillAndSubmitLogin(rendered);

    await waitFor(() => {
      expect(rendered.getByText('Choose Your Role')).toBeTruthy();
      expect(rendered.getByText('Browse & purchase')).toBeTruthy();
      expect(rendered.getByText('Manage listings')).toBeTruthy();
    });
  });

  it('navigates to MyPasses when Customer is selected from role modal', async () => {
    mockSignIn.mockResolvedValueOnce({
      user: { id: 1, phone: '919876543210', roles: ['customer', 'business'] },
    });
    const rendered = renderAuth();
    await fillAndSubmitLogin(rendered);

    await waitFor(() => expect(rendered.getByText('Choose Your Role')).toBeTruthy());
    fireEvent.press(rendered.getByText('Browse & purchase'));

    await waitFor(() => {
      expect(mockNav.navigate).toHaveBeenCalledWith('MyPasses');
    });
  });

  it('navigates to MyPasses when Business is selected from role modal', async () => {
    mockSignIn.mockResolvedValueOnce({
      user: { id: 1, phone: '919876543210', roles: ['customer', 'business'] },
    });
    const rendered = renderAuth();
    await fillAndSubmitLogin(rendered);

    await waitFor(() => expect(rendered.getByText('Choose Your Role')).toBeTruthy());
    fireEvent.press(rendered.getByText('Manage listings'));

    await waitFor(() => {
      expect(mockNav.navigate).toHaveBeenCalledWith('MyPasses');
    });
  });

  it('does NOT navigate when signIn returns an error', async () => {
    mockSignIn.mockResolvedValueOnce({ error: 'Invalid credentials' });
    const rendered = renderAuth();
    await fillAndSubmitLogin(rendered);

    await waitFor(() => {
      expect(mockNav.navigate).not.toHaveBeenCalled();
    });
  });
});

describe('Auth Screen — Validation', () => {
  it('shows error when phone is empty', async () => {
    const rendered = renderAuth();
    await act(async () => {
      fireEvent.press(rendered.getByText('Sign In'));
    });
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Phone number is required');
  });

  it('shows error when password is empty', async () => {
    const rendered = renderAuth();
    rendered.getAllByPlaceholderText('1234567890').forEach((i) => fireEvent.changeText(i, '9876543210'));
    await act(async () => {
      fireEvent.press(rendered.getByText('Sign In'));
    });
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password is required');
  });

  it('shows error when signup passwords do not match', async () => {
    const rendered = renderAuth();
    fireEvent.press(rendered.getByText("Don't have an account? Sign Up"));
    rendered.getAllByPlaceholderText('1234567890').forEach((i) => fireEvent.changeText(i, '9876543210'));
    const passInputs = rendered.getAllByPlaceholderText('••••••••');
    fireEvent.changeText(passInputs[0], 'password123');
    fireEvent.changeText(passInputs[1], 'different456');
    const nameInputs = rendered.getAllByPlaceholderText('Enter your full name');
    fireEvent.changeText(nameInputs[0], 'Test User');
    await act(async () => {
      fireEvent.press(rendered.getByText('Sign Up'));
    });
    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match');
  });
});
