import {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
  createApi,
  fetchBaseQuery,
} from '@reduxjs/toolkit/query/react';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { updateTokens, clearCredentials } from '../authSlice';

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL ||
  'http://localhost:8080';

export { API_URL };

if (API_URL === 'http://localhost:8080') {
  console.warn('[RTK baseApi] ⚠️ EXPO_PUBLIC_API_URL not set — falling back to localhost. Set it as an EAS Secret for production builds.');
} else {
  console.log(`[RTK baseApi] Using API_URL: ${API_URL}`);
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: `${API_URL}/api`,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any).auth?.accessToken;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

/**
 * Base query with automatic JWT refresh on 401.
 * On 401: attempts refresh once, updates tokens in store + SecureStore, retries.
 * On refresh failure: clears credentials (forces logout).
 */
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // Log ads endpoints for debugging
  const url = typeof args === 'string' ? args : args.url;
  if (typeof url === 'string' && url.includes('/ads')) {
    console.log(`[RTK] 📤 Request: ${url}`);
  }

  let result = await rawBaseQuery(args, api, extraOptions);

  // Log ads responses
  if (typeof url === 'string' && url.includes('/ads')) {
    if (result.error) {
      console.error(`[RTK] ❌ Response error for ${url}:`, result.error);
    } else {
      const data = result.data as any;
      const count = Array.isArray(data) ? data.length : '?';
      console.log(`[RTK] 📥 Response: ${url} returned ${count} items`);
      if (Array.isArray(data) && data.length > 0) {
        console.log(`[RTK] 📋 First item:`, data[0]);
      }
    }
  }

  if (result.error?.status === 401) {
    const state = (api.getState() as any).auth;
    const storedRefresh =
      state?.refreshToken ?? (await SecureStore.getItemAsync('refreshToken'));

    if (storedRefresh) {
      const refreshResult = await rawBaseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          body: { refreshToken: storedRefresh },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const { accessToken, refreshToken } = refreshResult.data as any;
        api.dispatch(updateTokens({ accessToken, refreshToken }));
        await SecureStore.setItemAsync('accessToken', accessToken);
        await SecureStore.setItemAsync('refreshToken', refreshToken);

        // Retry original request with new token
        result = await rawBaseQuery(args, api, extraOptions);
      } else {
        api.dispatch(clearCredentials());
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
      }
    } else {
      api.dispatch(clearCredentials());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'User',
    'Category',
    'BusinessCard',
    'Promotion',
    'Voucher',
    'Ad',
    'Review',
    'Group',
    'SharedCard',
    'Booking',
    'Event',
    'Chat',
    'ChatMessages',
    'GroupMessages',
    'Referral',
    'Credits',
    'Notification',
  ],
  endpoints: () => ({}),
});
