/**
 * PrivacySecurity Screen UI Tests
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import PrivacySecurity from '../screens/PrivacySecurity';
import authReducer from '../store/authSlice';

// ─── Navigation mock ─────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// ─── Auth mock ────────────────────────────────────────────────────────────────

const mockAuthSignOut = jest.fn();
let mockUser: any = null;

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, signOut: mockAuthSignOut }),
}));

// ─── Mutations mock ───────────────────────────────────────────────────────────

const mockChangePassword = jest.fn();
const mockDeleteAccount = jest.fn();

jest.mock('../store/api/usersApi', () => ({
  useChangePasswordMutation: jest.fn(),
  useDeleteAccountMutation: jest.fn(),
}));

// ─── AsyncStorage mock ────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
  },
}));

// ─── Lucide icon mock ─────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => ({
  ArrowLeft: 'ArrowLeft',
  Bell: 'Bell',
  Eye: 'Eye',
  EyeOff: 'EyeOff',
  Key: 'Key',
  Lock: 'Lock',
  Shield: 'Shield',
  Smartphone: 'Smartphone',
  Trash2: 'Trash2',
}));

// ─── UI mocks ─────────────────────────────────────────────────────────────────

jest.mock('../components/ui/button', () => ({
  Button: ({ children, onPress, disabled }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onPress} disabled={!!disabled}>
        <Text>{typeof children === 'string' ? children : 'ButtonText'}</Text>
      </Pressable>
    );
  },
}));

jest.mock('../components/ui/input', () => ({
  Input: ({ placeholder, value, onChangeText, secureTextEntry }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        testID={`input-${placeholder}`}
      />
    );
  },
}));

jest.mock('../components/ui/label', () => ({
  Label: ({ children }: any) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

jest.mock('../components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => {
    const { Pressable } = require('react-native');
    return (
      <Pressable
        testID={`switch-${checked}`}
        onPress={() => onCheckedChange(!checked)}
        accessibilityRole="switch"
      />
    );
  },
}));

jest.mock('../components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => {
    const { View } = require('react-native');
    if (!open) return null;
    return <View testID="dialog">{children}</View>;
  },
  DialogContent: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
  DialogHeader: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
  DialogTitle: ({ children }: any) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
  DialogFooter: ({ children }: any) => {
    const { View } = require('react-native');
    return <View>{children}</View>;
  },
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

const renderPrivacySecurity = () => {
  const { useChangePasswordMutation, useDeleteAccountMutation } = require('../store/api/usersApi');
  (useChangePasswordMutation as jest.Mock).mockReturnValue([mockChangePassword, { isLoading: false }]);
  (useDeleteAccountMutation as jest.Mock).mockReturnValue([mockDeleteAccount, { isLoading: false }]);

  return render(
    <Provider store={buildStore()}>
      <PrivacySecurity />
    </Provider>
  );
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = null;
});

describe('PrivacySecurity — logged-out state', () => {
  it('shows sign-in prompt when no user', () => {
    mockUser = null;
    const { getByText } = renderPrivacySecurity();
    expect(getByText('Sign in to manage security settings')).toBeTruthy();
  });

  it('navigates to Auth when Sign In pressed (logged out)', () => {
    mockUser = null;
    const { getByText } = renderPrivacySecurity();
    fireEvent.press(getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('Auth');
  });
});

describe('PrivacySecurity — logged-in rendering', () => {
  beforeEach(() => {
    mockUser = { id: 1, email: 'test@example.com' };
  });

  it('renders Account Security section', () => {
    const { getByText } = renderPrivacySecurity();
    expect(getByText('Account Security')).toBeTruthy();
  });

  it('shows user email in security section', () => {
    const { getByText } = renderPrivacySecurity();
    expect(getByText('test@example.com')).toBeTruthy();
  });

  it('renders Change Password option', () => {
    const { getByText } = renderPrivacySecurity();
    expect(getByText('Change Password')).toBeTruthy();
  });

  it('renders Privacy Settings section', () => {
    const { getByText } = renderPrivacySecurity();
    expect(getByText('Privacy Settings')).toBeTruthy();
  });

  it('renders Delete Account button', () => {
    const { getByText } = renderPrivacySecurity();
    expect(getByText('Delete My Account')).toBeTruthy();
  });
});

describe('PrivacySecurity — change password dialog', () => {
  beforeEach(() => {
    mockUser = { id: 1, email: 'test@example.com' };
  });

  it('opens Change Password dialog when tapped', () => {
    const { getByText } = renderPrivacySecurity();
    fireEvent.press(getByText('Change Password'));
    // Dialog opened — "Current Password" label is inside the dialog
    expect(getByText('Current Password')).toBeTruthy();
    expect(getByText('New Password')).toBeTruthy();
  });

  it('shows error toast when current password is empty', async () => {
    const { toast } = require('../lib/toast');
    const { getByText } = renderPrivacySecurity();
    // Open the dialog first
    fireEvent.press(getByText('Change Password'));
    // Press submit without filling fields
    await act(async () => {
      fireEvent.press(getByText('Update Password'));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Enter your current password');
    });
  });

  it('shows error toast when new password is too short', async () => {
    const { toast } = require('../lib/toast');
    const { getByText, getByPlaceholderText } = renderPrivacySecurity();
    fireEvent.press(getByText('Change Password'));

    fireEvent.changeText(getByPlaceholderText('Enter current password'), 'oldpass');
    fireEvent.changeText(getByPlaceholderText('Enter new password (min 6 chars)'), '123');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), '123');

    await act(async () => {
      fireEvent.press(getByText('Update Password'));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('New password must be at least 6 characters');
    });
  });

  it('shows error toast when passwords do not match', async () => {
    const { toast } = require('../lib/toast');
    const { getByText, getByPlaceholderText } = renderPrivacySecurity();
    fireEvent.press(getByText('Change Password'));

    fireEvent.changeText(getByPlaceholderText('Enter current password'), 'oldpass');
    fireEvent.changeText(getByPlaceholderText('Enter new password (min 6 chars)'), 'newpass1');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'newpass2');

    await act(async () => {
      fireEvent.press(getByText('Update Password'));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Passwords don't match");
    });
  });

  it('calls changePasswordMutation and signs out on success', async () => {
    const { toast } = require('../lib/toast');
    mockChangePassword.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockAuthSignOut.mockResolvedValue(undefined);

    const { getByText, getByPlaceholderText } = renderPrivacySecurity();
    fireEvent.press(getByText('Change Password'));

    fireEvent.changeText(getByPlaceholderText('Enter current password'), 'oldpass');
    fireEvent.changeText(getByPlaceholderText('Enter new password (min 6 chars)'), 'newpass123');
    fireEvent.changeText(getByPlaceholderText('Confirm new password'), 'newpass123');

    await act(async () => {
      fireEvent.press(getByText('Update Password'));
    });

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith({
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
      });
      expect(mockAuthSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Auth');
      expect(toast.success).toHaveBeenCalledWith('Password updated! Please sign in again.');
    });
  });
});

describe('PrivacySecurity — delete account dialog', () => {
  beforeEach(() => {
    mockUser = { id: 1, email: 'test@example.com' };
  });

  it('opens Delete Account confirmation dialog', () => {
    const { getByText } = renderPrivacySecurity();
    fireEvent.press(getByText('Delete My Account'));
    expect(getByText('Delete Account?')).toBeTruthy();
  });

  it('closes dialog when Cancel is pressed', () => {
    const { getByText, queryByText } = renderPrivacySecurity();
    fireEvent.press(getByText('Delete My Account'));
    expect(getByText('Delete Account?')).toBeTruthy();
    fireEvent.press(getByText('Cancel'));
    expect(queryByText('Delete Account?')).toBeNull();
  });

  it('calls deleteAccountMutation and signs out on confirm', async () => {
    const { toast } = require('../lib/toast');
    mockDeleteAccount.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockAuthSignOut.mockResolvedValue(undefined);

    const { getByText } = renderPrivacySecurity();
    fireEvent.press(getByText('Delete My Account'));

    await act(async () => {
      fireEvent.press(getByText('Delete'));
    });

    await waitFor(() => {
      expect(mockDeleteAccount).toHaveBeenCalled();
      expect(mockAuthSignOut).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('Home');
      expect(toast.success).toHaveBeenCalledWith('Account deleted.');
    });
  });

  it('shows error toast when delete fails', async () => {
    const { toast } = require('../lib/toast');
    mockDeleteAccount.mockReturnValue({
      unwrap: () => Promise.reject({ data: { error: 'Failed to delete' } }),
    });

    const { getByText } = renderPrivacySecurity();
    fireEvent.press(getByText('Delete My Account'));

    await act(async () => {
      fireEvent.press(getByText('Delete'));
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to delete');
    });
  });
});
