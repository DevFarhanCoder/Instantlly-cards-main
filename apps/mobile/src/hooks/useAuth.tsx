/**
 * useAuth — replaces Supabase auth with custom JWT backend.
 * Persists tokens in SecureStore and hydrates Redux on startup.
 */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useAppDispatch, useAppSelector } from '../store';
import {
  setCredentials,
  clearCredentials,
  selectCurrentUser,
  selectIsAuthenticated,
  selectAccessToken,
  AuthUser,
} from '../store/authSlice';
import { useLoginMutation, useSignupMutation, useLogoutMutation, useLazyGetMeQuery } from '../store/api/authApi';
import { baseApi } from '../store/api/baseApi';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: ReturnType<typeof selectCurrentUser>;
  accessToken: string | null;
  signIn: (phoneOrEmail: string, password: string, isEmail?: boolean) => Promise<{ error?: string; user?: AuthUser }>;
  signUp: (phone: string, password: string, name?: string, email?: string, role?: 'customer' | 'business') => Promise<{ error?: string; user?: AuthUser }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const user = useAppSelector(selectCurrentUser);
  const accessToken = useAppSelector(selectAccessToken);

  const [loginMutation] = useLoginMutation();
  const [signupMutation] = useSignupMutation();
  const [logoutMutation] = useLogoutMutation();
  const [fetchMe] = useLazyGetMeQuery();

  // Hydrate tokens from SecureStore on app start
  useEffect(() => {
    async function hydrate() {
      console.log('[AUTH] Hydrating session from SecureStore...');
      try {
        const [storedAccess, storedRefresh] = await Promise.all([
          SecureStore.getItemAsync('accessToken'),
          SecureStore.getItemAsync('refreshToken'),
        ]);

        if (storedAccess && storedRefresh) {
          const payload = parseJwtPayload(storedAccess);
          if (payload && payload.exp * 1000 > Date.now()) {
            console.log(`[AUTH] Session restored — userId: ${payload.userId}, roles: [${(payload.roles ?? []).join(', ')}]`);
            // Set partial credentials from JWT so API calls have a token
            dispatch(
              setCredentials({
                user: { id: payload.userId, phone: '', roles: payload.roles ?? [] },
                accessToken: storedAccess,
                refreshToken: storedRefresh,
              })
            );
            // Fetch full user profile to fill in name/phone/email
            try {
              const me = await fetchMe().unwrap();
              dispatch(setCredentials({ user: me, accessToken: storedAccess, refreshToken: storedRefresh }));
              console.log(`[AUTH] Full profile loaded for userId: ${payload.userId}`);
            } catch {
              console.warn('[AUTH] Could not fetch full profile, using JWT data');
            }
          } else {
            console.log('[AUTH] Stored token expired, starting unauthenticated');
            dispatch(clearCredentials());
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
          }
        } else {
          console.log('[AUTH] No stored session found');
        }
      } catch (e) {
        console.warn('[AUTH] SecureStore unavailable:', e);
      } finally {
        setLoading(false);
      }
    }
    hydrate();
  }, []);

  const signIn = async (
    phoneOrEmail: string,
    password: string,
    isEmail = phoneOrEmail.includes('@')
  ): Promise<{ error?: string; user?: AuthUser }> => {
    console.log(`[SIGNIN] Attempt — identifier: ${phoneOrEmail}, via: ${isEmail ? 'email' : 'phone'}`);
    try {
      const body = isEmail
        ? { email: phoneOrEmail, password }
        : { phone: phoneOrEmail, password };
      const data = await loginMutation(body).unwrap();
      dispatch(setCredentials(data));
      await SecureStore.setItemAsync('accessToken', data.accessToken);
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      console.log(`[SIGNIN] Success — userId: ${data.user.id}, roles: [${data.user.roles.join(', ')}]`);
      return { user: data.user };
    } catch (e: any) {
      const msg = e?.data?.error ?? e?.message ?? 'Login failed';
      console.warn(`[SIGNIN] Failed — ${msg}`, e?.status ?? '');
      return { error: msg };
    }
  };

  const signUp = async (
    phone: string,
    password: string,
    name?: string,
    email?: string,
    role: 'customer' | 'business' = 'customer'
  ): Promise<{ error?: string; user?: AuthUser }> => {
    console.log(`[SIGNUP] Attempt — phone: ${phone}, name: ${name ?? 'N/A'}, email: ${email ?? 'N/A'}, role: ${role}`);
    try {
      const data = await signupMutation({ phone, password, name, email, role }).unwrap();
      dispatch(setCredentials(data));
      await SecureStore.setItemAsync('accessToken', data.accessToken);
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      console.log(`[SIGNUP] Success — userId: ${data.user.id}, roles: [${data.user.roles.join(', ')}]`);
      return { user: data.user };
    } catch (e: any) {
      const msg = e?.data?.error ?? e?.message ?? 'Signup failed';
      console.warn(`[SIGNUP] Failed — ${msg}`, e?.status ?? '');
      return { error: msg };
    }
  };

  const signOut = async () => {
    const storedRefresh = await SecureStore.getItemAsync('refreshToken');
    if (storedRefresh) {
      try {
        await logoutMutation({ refreshToken: storedRefresh }).unwrap();
      } catch {
        // Best-effort logout
      }
    }
    // Clear RTK Query cache so next user doesn't see stale data
    dispatch(baseApi.util.resetApiState());
    dispatch(clearCredentials());
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, user, accessToken, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * Decodes a JWT payload without verification.
 * Uses atob() (available in React Native Hermes/JSC) rather than Node's Buffer.
 */
function parseJwtPayload(token: string): any {
  try {
    // JWT uses base64url; convert to standard base64 before decoding
    const base64url = token.split('.')[1];
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}
