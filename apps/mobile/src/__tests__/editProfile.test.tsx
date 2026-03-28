/**
 * EditProfile Screen UI Tests
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import EditProfile from '../screens/EditProfile';
import authReducer from '../store/authSlice';

// ─── Navigation mock ─────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// ─── Auth mock ────────────────────────────────────────────────────────────────

let mockUser: any = null;

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// ─── RTK Query mocks ──────────────────────────────────────────────────────────

const mockUpdateProfile = jest.fn();

jest.mock('../store/api/usersApi', () => ({
  useGetProfileQuery: jest.fn(),
  useUpdateProfileMutation: jest.fn(),
}));

// ─── ImagePicker mock ─────────────────────────────────────────────────────────

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: false }),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

// ─── Supabase mock ────────────────────────────────────────────────────────────

jest.mock('../integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/avatar.jpg' } }),
      }),
    },
  },
}));

// ─── TanStack Query mock (used by saveProfile) ────────────────────────────────

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn((opts: any) => ({
    mutate: () => {
      opts.mutationFn().then(opts.onSuccess).catch(opts.onError);
    },
    isPending: false,
  })),
}));

// ─── Lucide icon mock ─────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => ({
  ArrowLeft: 'ArrowLeft',
  Camera: 'Camera',
  Save: 'Save',
  User: 'User',
}));

// ─── UI mocks ─────────────────────────────────────────────────────────────────

jest.mock('../components/ui/button', () => ({
  Button: ({ children, onPress, disabled }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable onPress={onPress} disabled={disabled} testID="button">
        <Text>{children}</Text>
      </Pressable>
    );
  },
}));

jest.mock('../components/ui/input', () => ({
  Input: ({ placeholder, value, onChangeText, editable, ...rest }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        {...rest}
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

jest.mock('../components/ui/textarea', () => ({
  Textarea: ({ placeholder, value, onChangeText, maxLength }: any) => {
    const { TextInput } = require('react-native');
    return (
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        multiline
        testID="textarea-about"
      />
    );
  },
}));

jest.mock('../components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => {
    const { View } = require('react-native');
    return <View testID={`select-${value}`}>{children}</View>;
  },
  SelectContent: ({ children }: any) => children,
  SelectItem: ({ children, value }: any) => {
    const { Pressable, Text } = require('react-native');
    return (
      <Pressable testID={`select-item-${value}`}>
        <Text>{children}</Text>
      </Pressable>
    );
  },
  SelectTrigger: ({ children }: any) => children,
  SelectValue: ({ placeholder }: any) => {
    const { Text } = require('react-native');
    return <Text>{placeholder}</Text>;
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

const renderEditProfile = () => {
  const { useGetProfileQuery, useUpdateProfileMutation } = require('../store/api/usersApi');
  (useUpdateProfileMutation as jest.Mock).mockReturnValue([mockUpdateProfile, { isLoading: false }]);

  return render(
    <Provider store={buildStore()}>
      <EditProfile />
    </Provider>
  );
};

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUser = null;
  const { useGetProfileQuery } = require('../store/api/usersApi');
  (useGetProfileQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
});

describe('EditProfile — logged-out state', () => {
  it('shows sign-in prompt when no user', () => {
    mockUser = null;
    const { getByText } = renderEditProfile();
    expect(getByText('Sign in to edit your profile')).toBeTruthy();
  });

  it('navigates to Auth when Sign In pressed (logged out)', () => {
    mockUser = null;
    const { getByText } = renderEditProfile();
    fireEvent.press(getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('Auth');
  });
});

describe('EditProfile — form rendering', () => {
  beforeEach(() => {
    mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
  });

  it('renders Full Name field', () => {
    const { queryByPlaceholderText } = renderEditProfile();
    expect(queryByPlaceholderText('Enter your full name')).toBeTruthy();
  });

  it('renders Phone Number field', () => {
    const { queryByPlaceholderText } = renderEditProfile();
    expect(queryByPlaceholderText('+91 98765 43210')).toBeTruthy();
  });

  it('renders About field', () => {
    const { queryByPlaceholderText } = renderEditProfile();
    expect(queryByPlaceholderText('Tell others about yourself...')).toBeTruthy();
  });

  it('renders Save Changes button', () => {
    const { getByText } = renderEditProfile();
    expect(getByText('Save Changes')).toBeTruthy();
  });

  it('shows user email as non-editable', () => {
    const { getByText } = renderEditProfile();
    expect(getByText('Email cannot be changed')).toBeTruthy();
  });
});

describe('EditProfile — form pre-population', () => {
  beforeEach(() => {
    mockUser = { id: 1, email: 'test@example.com' };
    const { useGetProfileQuery } = require('../store/api/usersApi');
    (useGetProfileQuery as jest.Mock).mockReturnValue({
      data: {
        name: 'Prefilled Name',
        phone: '9876543210',
        about: 'About me text',
        gender: 'male',
        email: 'test@example.com',
        created_at: '2024-01-15T00:00:00Z',
      },
      isLoading: false,
    });
  });

  it('pre-fills name from profileData', () => {
    const { getByDisplayValue } = renderEditProfile();
    expect(getByDisplayValue('Prefilled Name')).toBeTruthy();
  });

  it('pre-fills phone from profileData', () => {
    const { getByDisplayValue } = renderEditProfile();
    expect(getByDisplayValue('9876543210')).toBeTruthy();
  });

  it('pre-fills about from profileData', () => {
    const { getByDisplayValue } = renderEditProfile();
    expect(getByDisplayValue('About me text')).toBeTruthy();
  });
});

describe('EditProfile — save mutation', () => {
  beforeEach(() => {
    mockUser = { id: 1, email: 'test@example.com', name: 'Test' };
    const { useGetProfileQuery } = require('../store/api/usersApi');
    (useGetProfileQuery as jest.Mock).mockReturnValue({ data: undefined, isLoading: false });
    mockUpdateProfile.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('calls updateProfileMutation with correct fields on save', async () => {
    const { getByPlaceholderText, getByText } = renderEditProfile();
    fireEvent.changeText(getByPlaceholderText('Enter your full name'), 'New Name');
    fireEvent.changeText(getByPlaceholderText('+91 98765 43210'), '9123456789');

    await act(async () => {
      fireEvent.press(getByText('Save Changes'));
    });

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Name',
          phone: '9123456789',
        })
      );
    });
  });

  it('navigates back after successful save', async () => {
    const { getByText } = renderEditProfile();

    await act(async () => {
      fireEvent.press(getByText('Save Changes'));
    });

    await waitFor(() => {
      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
