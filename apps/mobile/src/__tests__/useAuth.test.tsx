/**
 * useAuth Hook Tests
 * Tests that signUp passes role correctly and signIn handles multi-role responses.
 */
import { renderHook, act } from '@testing-library/react-native';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import authReducer, { selectCurrentUser, selectUserRoles } from '../store/authSlice';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockLoginMutation = jest.fn();
const mockSignupMutation = jest.fn();
const mockLogoutMutation = jest.fn();

jest.mock('../store/api/authApi', () => ({
  useLoginMutation: () => [mockLoginMutation],
  useSignupMutation: () => [mockSignupMutation],
  useLogoutMutation: () => [mockLogoutMutation],
  useLazyGetMeQuery: () => [
    jest.fn().mockReturnValue({
      unwrap: () => Promise.resolve({ id: 1, phone: '9876543210', email: null, name: null, roles: [] }),
    }),
  ],
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildTestStore = () =>
  configureStore({
    reducer: { auth: authReducer },
  });

const buildWrapper = (store: ReturnType<typeof buildTestStore>) =>
  ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>
      <AuthProvider>{children}</AuthProvider>
    </Provider>
  );

// Simulated server auth response
const makeAuthResponse = (roles: string[]) => ({
  accessToken: 'fake-access-token',
  refreshToken: 'fake-refresh-token',
  user: { id: 42, phone: '9876543210', email: null, name: 'Test', roles },
});

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// Flush pending microtasks (e.g. AuthProvider's hydrate() setLoading call)
// so RNTL's global afterEach cleanup doesn't time out between test files.
afterEach(async () => {
  await act(async () => {
    await Promise.resolve();
  });
});

describe('useAuth — signUp', () => {
  it('passes role="customer" to signupMutation', async () => {
    const store = buildTestStore();
    mockSignupMutation.mockReturnValue({
      unwrap: () => Promise.resolve(makeAuthResponse(['customer'])),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: buildWrapper(store) });

    await act(async () => {
      await result.current.signUp('9876543210', 'password', 'Test', undefined, 'customer');
    });

    expect(mockSignupMutation).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'customer' })
    );
  });

  it('passes role="business" to signupMutation', async () => {
    const store = buildTestStore();
    mockSignupMutation.mockReturnValue({
      unwrap: () => Promise.resolve(makeAuthResponse(['business'])),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: buildWrapper(store) });

    await act(async () => {
      await result.current.signUp('9876543210', 'password', 'Biz Owner', undefined, 'business');
    });

    expect(mockSignupMutation).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'business' })
    );
  });

  it('defaults to role="customer" when no role is passed', async () => {
    const store = buildTestStore();
    mockSignupMutation.mockReturnValue({
      unwrap: () => Promise.resolve(makeAuthResponse(['customer'])),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: buildWrapper(store) });

    await act(async () => {
      await result.current.signUp('9876543210', 'password', 'Test');
    });

    expect(mockSignupMutation).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'customer' })
    );
  });

  it('stores tokens and updates Redux state on successful signup', async () => {
    const store = buildTestStore();
    const SecureStore = require('expo-secure-store');
    mockSignupMutation.mockReturnValue({
      unwrap: () => Promise.resolve(makeAuthResponse(['business'])),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: buildWrapper(store) });

    await act(async () => {
      const res = await result.current.signUp('9876543210', 'password', 'Biz', undefined, 'business');
      expect(res.error).toBeUndefined();
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', 'fake-access-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('refreshToken', 'fake-refresh-token');
    expect(selectCurrentUser(store.getState())).toMatchObject({ id: 42, roles: ['business'] });
  });

  it('returns error message on signup failure', async () => {
    const store = buildTestStore();
    mockSignupMutation.mockReturnValue({
      unwrap: () => Promise.reject({ data: { error: 'Phone already exists' } }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: buildWrapper(store) });

    await act(async () => {
      const res = await result.current.signUp('9876543210', 'password');
      expect(res.error).toBe('Phone already exists');
    });
  });
});

describe('useAuth — signIn', () => {
  it('stores tokens and updates Redux state on successful login', async () => {
    const store = buildTestStore();
    const SecureStore = require('expo-secure-store');
    mockLoginMutation.mockReturnValue({
      unwrap: () => Promise.resolve(makeAuthResponse(['customer'])),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: buildWrapper(store) });

    await act(async () => {
      const res = await result.current.signIn('9876543210', 'password');
      expect(res.error).toBeUndefined();
    });

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('accessToken', 'fake-access-token');
    const roles = selectUserRoles(store.getState());
    expect(roles).toContain('customer');
  });

  it('stores both roles when server returns dual roles (business promotion user)', async () => {
    const store = buildTestStore();
    mockLoginMutation.mockReturnValue({
      unwrap: () => Promise.resolve(makeAuthResponse(['customer', 'business'])),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: buildWrapper(store) });

    await act(async () => {
      await result.current.signIn('9876543210', 'password');
    });

    const roles = selectUserRoles(store.getState());
    expect(roles).toContain('customer');
    expect(roles).toContain('business');
  });

  it('returns error on failed login', async () => {
    const store = buildTestStore();
    mockLoginMutation.mockReturnValue({
      unwrap: () => Promise.reject({ data: { error: 'Invalid credentials' } }),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: buildWrapper(store) });

    await act(async () => {
      const res = await result.current.signIn('9876543210', 'wrongpass');
      expect(res.error).toBe('Invalid credentials');
    });
  });

  it('uses phone field when identifier has no @', async () => {
    const store = buildTestStore();
    mockLoginMutation.mockReturnValue({
      unwrap: () => Promise.resolve(makeAuthResponse(['customer'])),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: buildWrapper(store) });

    await act(async () => {
      await result.current.signIn('9876543210', 'password');
    });

    expect(mockLoginMutation).toHaveBeenCalledWith({ phone: '9876543210', password: 'password' });
  });

  it('uses email field when identifier contains @', async () => {
    const store = buildTestStore();
    mockLoginMutation.mockReturnValue({
      unwrap: () => Promise.resolve(makeAuthResponse(['customer'])),
    });

    const { result } = renderHook(() => useAuth(), { wrapper: buildWrapper(store) });

    await act(async () => {
      await result.current.signIn('user@example.com', 'password');
    });

    expect(mockLoginMutation).toHaveBeenCalledWith({ email: 'user@example.com', password: 'password' });
  });
});
