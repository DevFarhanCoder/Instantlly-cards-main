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
} from '../store/authSlice';
import { useLoginMutation, useSignupMutation, useLogoutMutation } from '../store/api/authApi';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  user: ReturnType<typeof selectCurrentUser>;
  accessToken: string | null;
  signIn: (phoneOrEmail: string, password: string, isEmail?: boolean) => Promise<{ error?: string }>;
  signUp: (phone: string, password: string, name?: string, email?: string, role?: string) => Promise<{ error?: string }>;
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
            dispatch(
              setCredentials({
                user: {
                  id: payload.userId,
                  phone: '',
                  roles: payload.roles ?? [],
                },
                accessToken: storedAccess,
                refreshToken: storedRefresh,
              })
            );
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
  ): Promise<{ error?: string }> => {
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
      return {};
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
    role?: string
  ): Promise<{ error?: string }> => {
    console.log(`[SIGNUP] Attempt — phone: ${phone}, name: ${name ?? 'N/A'}, email: ${email ?? 'N/A'}, role: ${role ?? 'customer'}`);
    try {
      const data = await signupMutation({ phone, password, name, email, role }).unwrap();
      dispatch(setCredentials(data));
      await SecureStore.setItemAsync('accessToken', data.accessToken);
      await SecureStore.setItemAsync('refreshToken', data.refreshToken);
      console.log(`[SIGNUP] Success — userId: ${data.user.id}, roles: [${data.user.roles.join(', ')}]`);
      return {};
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

function parseJwtPayload(token: string): any {
  try {
    const base64 = token.split('.')[1];
    const json = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}
