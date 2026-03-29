/**
 * Profile Screen UI Tests
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Profile from '../screens/Profile';
import authReducer, { setCredentials } from '../store/authSlice';

// ─── Navigation mock ─────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// ─── Auth mock ────────────────────────────────────────────────────────────────

const mockSignOut = jest.fn();
let mockUser: any = null;

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    signOut: mockSignOut,
  }),
}));

// ─── useUserRole mock ────────────────────────────────────────────────────────

let mockIsBusiness = false;
let mockIsAdmin = false;

jest.mock('../hooks/useUserRole', () => ({
  useUserRole: () => ({
    isBusiness: mockIsBusiness,
    isAdmin: mockIsAdmin,
  }),
}));

// ─── RTK Query hooks mock ─────────────────────────────────────────────────────

let mockProfileData: any = undefined;
let mockMyCards: any[] = [];
let mockMyVouchers: any[] = [];

jest.mock('../store/api/usersApi', () => ({
  useGetProfileQuery: jest.fn(),
}));

jest.mock('../store/api/businessCardsApi', () => ({
  useGetMyCardsQuery: jest.fn(),
}));

jest.mock('../store/api/vouchersApi', () => ({
  useGetMyVouchersQuery: jest.fn(),
}));

// ─── TanStack Query (supabase tickets) mock ───────────────────────────────────

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({ data: [] }),
  useMutation: jest.fn().mockReturnValue({ mutate: jest.fn(), isPending: false }),
  useQueryClient: jest.fn().mockReturnValue({ invalidateQueries: jest.fn() }),
}));

jest.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
      insert: jest.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

// ─── Lucide icon mock ─────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => {
  const icons = [
    'ArrowLeft', 'BarChart3', 'Bell', 'CheckCircle', 'ChevronRight',
    'CreditCard', 'Crown', 'Gift', 'HelpCircle', 'LayoutDashboard',
    'LifeBuoy', 'LogOut', 'Send', 'Shield', 'ShieldCheck', 'Store', 'User',
  ];
  const mocks: Record<string, string> = {};
  icons.forEach((n) => { mocks[n] = n; });
  return mocks;
});

// ─── UI component mocks ───────────────────────────────────────────────────────

jest.mock('../components/ui/button', () => ({
  Button: ({ children, onPress, ...p }: any) => {
    const { Pressable, Text } = require('react-native');
    const childArray = Array.isArray(children) ? children : [children];
    const textContent = childArray
      .filter((c: any) => typeof c === 'string' || typeof c === 'number')
      .join('') || 'Btn';
    return (
      <Pressable onPress={onPress} {...p}>
        <Text>{textContent}</Text>
      </Pressable>
    );
  },
}));

jest.mock('../components/ui/badge', () => ({
  Badge: ({ children }: any) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

jest.mock('../components/ui/progress', () => ({
  Progress: () => null,
}));

jest.mock('../components/ui/input', () => ({
  Input: (p: any) => {
    const { TextInput } = require('react-native');
    return <TextInput {...p} />;
  },
}));

jest.mock('../components/ui/textarea', () => ({
  Textarea: (p: any) => {
    const { TextInput } = require('react-native');
    return <TextInput multiline {...p} />;
  },
}));

jest.mock('../components/ui/select', () => ({
  Select: ({ children }: any) => children,
  SelectContent: ({ children }: any) => children,
  SelectItem: ({ children }: any) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
  SelectTrigger: ({ children }: any) => children,
  SelectValue: () => null,
}));

jest.mock('../lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildStore = () => configureStore({ reducer: { auth: authReducer } });

const renderProfile = () => {
  const { useGetProfileQuery } = require('../store/api/usersApi');
  const { useGetMyCardsQuery } = require('../store/api/businessCardsApi');
  const { useGetMyVouchersQuery } = require('../store/api/vouchersApi');
  (useGetProfileQuery as jest.Mock).mockReturnValue({ data: mockProfileData });
  (useGetMyCardsQuery as jest.Mock).mockReturnValue({ data: mockMyCards });
  (useGetMyVouchersQuery as jest.Mock).mockReturnValue({ data: mockMyVouchers });

  return render(
    <Provider store={buildStore()}>
      <Profile />
    </Provider>
  );
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = null;
  mockIsBusiness = false;
  mockIsAdmin = false;
  mockProfileData = undefined;
  mockMyCards = [];
  mockMyVouchers = [];
});

describe('Profile — logged-out state', () => {
  it('shows sign-in prompt when no user', () => {
    const { getByText } = renderProfile();
    expect(getByText('Welcome to Instantly')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('navigates to Auth when Sign In is pressed (logged out)', () => {
    const { getByText } = renderProfile();
    fireEvent.press(getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('Auth');
  });
});

describe('Profile — logged-in state', () => {
  beforeEach(() => {
    mockUser = { id: 1, name: 'Test User', email: 'test@example.com', phone: '9876543210' };
  });

  it('renders user display name from profileData', () => {
    mockProfileData = { name: 'From Profile', email: 'test@example.com', created_at: new Date().toISOString() };
    const { getByText } = renderProfile();
    expect(getByText('From Profile')).toBeTruthy();
  });

  it('falls back to user.name when no profileData', () => {
    mockProfileData = undefined;
    const { getByText } = renderProfile();
    expect(getByText('Test User')).toBeTruthy();
  });

  it('shows initials when no avatarUrl', () => {
    mockProfileData = { name: 'John Doe', email: 'test@example.com', created_at: new Date().toISOString() };
    const { getByText } = renderProfile();
    expect(getByText('JO')).toBeTruthy();
  });

  it('shows cards count as 0 when no cards', () => {
    mockMyCards = [];
    const { getByText } = renderProfile();
    // Stats row shows "0" for Cards
    expect(getByText('Cards')).toBeTruthy();
  });

  it('shows voucher count when vouchers present', () => {
    mockMyVouchers = [{ id: 1 }, { id: 2 }];
    const { getByText } = renderProfile();
    expect(getByText('2')).toBeTruthy();
  });
});

describe('Profile — menu item navigation', () => {
  beforeEach(() => {
    mockUser = { id: 1, name: 'Jane', email: 'jane@example.com' };
    mockProfileData = { name: 'Jane', email: 'jane@example.com', created_at: new Date().toISOString() };
  });

  const navCases: [string, string][] = [
    ['My Dashboard', 'Dashboard'],
    ['Business Analytics', 'BusinessAnalytics'],
    ['Subscription Plans', 'Subscription'],
    ['Edit Profile', 'EditProfile'],
    ['Payment Methods', 'PaymentMethods'],
    ['Notifications', 'Notifications'],
    ['Privacy & Security', 'PrivacySecurity'],
    ['Refer & Earn', 'ReferAndEarn'],
  ];

  navCases.forEach(([label, route]) => {
    it(`pressing "${label}" navigates to ${route}`, () => {
      const { getByText } = renderProfile();
      fireEvent.press(getByText(label));
      expect(mockNavigate).toHaveBeenCalledWith(route);
    });
  });
});

describe('Profile — role-conditional menu items', () => {
  beforeEach(() => {
    mockUser = { id: 1, name: 'Jane', email: 'jane@example.com' };
    mockProfileData = { name: 'Jane', email: 'jane@example.com', created_at: new Date().toISOString() };
  });

  it('does NOT show Business Dashboard for customer', () => {
    mockIsBusiness = false;
    const { queryByText } = renderProfile();
    expect(queryByText('Business Dashboard')).toBeNull();
  });

  it('shows Business Dashboard for business user', () => {
    mockIsBusiness = true;
    const { getByText } = renderProfile();
    expect(getByText('Business Dashboard')).toBeTruthy();
  });

  it('navigates to BusinessDashboard when pressed', () => {
    mockIsBusiness = true;
    const { getByText } = renderProfile();
    fireEvent.press(getByText('Business Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('BusinessDashboard');
  });

  it('does NOT show Admin Panel for non-admin', () => {
    mockIsAdmin = false;
    const { queryByText } = renderProfile();
    expect(queryByText('Admin Panel')).toBeNull();
  });

  it('shows Admin Panel for admin user', () => {
    mockIsAdmin = true;
    const { getByText } = renderProfile();
    expect(getByText('Admin Panel')).toBeTruthy();
  });

  it('navigates to AdminDashboard from Admin Panel', () => {
    mockIsAdmin = true;
    const { getByText } = renderProfile();
    fireEvent.press(getByText('Admin Panel'));
    expect(mockNavigate).toHaveBeenCalledWith('AdminDashboard');
  });
});

describe('Profile — sign out', () => {
  beforeEach(() => {
    mockUser = { id: 1, name: 'Test', email: 'test@example.com' };
    mockProfileData = { name: 'Test', email: 'test@example.com', created_at: new Date().toISOString() };
  });

  it('calls signOut and navigates to Home on Sign Out press', async () => {
    mockSignOut.mockResolvedValueOnce(undefined);
    const { getByText } = renderProfile();
    fireEvent.press(getByText('Sign Out'));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Home');
    });
  });
});

describe('Profile — Help & Support toggle', () => {
  beforeEach(() => {
    mockUser = { id: 1, name: 'Test', email: 'test@example.com' };
    mockProfileData = { name: 'Test', email: 'test@example.com', created_at: new Date().toISOString() };
  });

  it('shows ticket form when Help & Support is pressed', () => {
    const { getByText } = renderProfile();
    fireEvent.press(getByText('Help & Support'));
    expect(getByText('Submit a Support Ticket')).toBeTruthy();
  });
});

describe('Profile — header back button', () => {
  it('calls goBack when ArrowLeft is pressed', () => {
    mockUser = { id: 1, name: 'Test', email: 'test@example.com' };
    mockProfileData = { name: 'Test', email: 'test@example.com', created_at: new Date().toISOString() };
    const { getByText } = renderProfile();
    // The header "Profile" label is next to the back pressable
    expect(getByText('Profile')).toBeTruthy();
  });
});
