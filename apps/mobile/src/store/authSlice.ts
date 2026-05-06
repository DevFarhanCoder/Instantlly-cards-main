import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: number;
  phone: string;
  email?: string | null;
  name?: string | null;
  profile_picture?: string | null;
  roles: string[];
  service_type?: string | null;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  /** The role the user chose when they have multiple roles (customer + business). */
  activeRole: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  activeRole: null,
  isAuthenticated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /**
     * Called after login / signup / session restore.
     * refreshToken is intentionally NOT stored in Redux — it lives only in SecureStore.
     */
    setCredentials(
      state,
      action: PayloadAction<{ user: AuthUser; accessToken: string; refreshToken: string }>
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
    },
    updateTokens(
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string }>
    ) {
      state.accessToken = action.payload.accessToken;
      // refreshToken is updated in SecureStore by baseApi's reauth interceptor
    },
    setActiveRole(state, action: PayloadAction<string | null>) {
      state.activeRole = action.payload;
    },
    updateUser(state, action: PayloadAction<Partial<AuthUser>>) {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    clearCredentials(state) {
      state.user = null;
      state.accessToken = null;
      state.activeRole = null;
      state.isAuthenticated = false;
    },
  },
});

export const { setCredentials, updateTokens, setActiveRole, updateUser, clearCredentials } = authSlice.actions;
export default authSlice.reducer;

const EMPTY_ROLES: string[] = [];

// Selectors
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user;
export const selectAccessToken = (state: { auth: AuthState }) => state.auth.accessToken;
export const selectActiveRole = (state: { auth: AuthState }) => state.auth.activeRole;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectUserRoles = (state: { auth: AuthState }) =>
  state.auth.user?.roles ?? EMPTY_ROLES;
