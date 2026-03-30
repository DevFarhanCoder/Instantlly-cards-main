/**
 * AdCreate Screen Tests
 */
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdCreate from '../screens/AdCreate';
import authReducer from '../store/authSlice';

// ─── Navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
let mockParams: any = {};

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));

// ─── Auth ────────────────────────────────────────────────────────────────────
let mockUser: any = { userId: 1, name: 'Test', id: '1' };

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: !!mockUser }),
}));

// ─── Business cards ─────────────────────────────────────────────────────────
let mockCards: any[] = [];

jest.mock('../hooks/useBusinessCards', () => ({
  useBusinessCards: () => ({ cards: mockCards, isLoading: false }),
}));

// ─── Ads hook mock ──────────────────────────────────────────────────────────
const mockMutateAsync = jest.fn().mockResolvedValue({ id: 1 });

jest.mock('../hooks/useAds', () => ({
  useCreateAdCampaign: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// ─── Upload mutation mock ────────────────────────────────────────────────────
const mockUploadUnwrap = jest.fn().mockResolvedValue({ url: 'https://example.com/image.jpg' });
const mockUploadAdCreative = jest.fn().mockReturnValue({ unwrap: mockUploadUnwrap });

jest.mock('../store/api/adsApi', () => ({
  useUploadAdCreativeMutation: () => [mockUploadAdCreative, { isLoading: false }],
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true, assets: [] }),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('../lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock('../theme/colors', () => ({
  colors: { primaryForeground: '#ffffff' },
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
      <AdCreate />
    </Provider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('AdCreate', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockMutateAsync.mockClear();
    mockUser = { userId: 1, name: 'Test', id: '1' };
    mockCards = [];
    mockParams = {};
  });

  it('renders Create Ad Campaign header', () => {
    const { getByText } = renderScreen();
    expect(getByText('Create Ad Campaign')).toBeTruthy();
  });

  it('shows Step 1: Ad Type initially', () => {
    const { getByText } = renderScreen();
    expect(getByText('Step 1: Ad Type')).toBeTruthy();
  });

  it('shows all three ad type options', () => {
    const { getByText } = renderScreen();
    expect(getByText('Banner Ad')).toBeTruthy();
    expect(getByText('Featured Listing')).toBeTruthy();
    expect(getByText('Sponsored Card')).toBeTruthy();
  });

  it('shows Continue button', () => {
    const { getByText } = renderScreen();
    expect(getByText('Continue')).toBeTruthy();
  });

  it('navigates to Step 2 after selecting type and pressing Continue', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    expect(getByText('Step 2: Creative')).toBeTruthy();
  });

  it('shows Ad Title input in Step 2', () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    expect(getByText('Ad Title')).toBeTruthy();
    expect(getByPlaceholderText('e.g. Summer Sale - 50% Off')).toBeTruthy();
  });

  it('shows Description textarea in Step 2', () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    expect(getByText('Description')).toBeTruthy();
    expect(getByPlaceholderText('Ad description')).toBeTruthy();
  });

  it('navigates to Step 3 (Targeting)', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    expect(getByText('Step 3: Targeting')).toBeTruthy();
    expect(getByText('Target Audience')).toBeTruthy();
  });

  it('shows city/region input in targeting step', () => {
    const { getByText, getByPlaceholderText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    expect(getByPlaceholderText('e.g. Mumbai, Pune (leave blank for all)')).toBeTruthy();
  });

  it('navigates to Step 4 (Budget & Preview)', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    expect(getByText('Step 4: Budget & Preview')).toBeTruthy();
    expect(getByText('Budget & Duration')).toBeTruthy();
  });

  it('shows Campaign Summary in Budget step', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    expect(getByText('Campaign Summary')).toBeTruthy();
  });

  it('shows Launch Campaign button in final step', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    expect(getByText('Launch Campaign')).toBeTruthy();
  });

  it('calls mutateAsync on Launch Campaign', async () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Launch Campaign'));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        ad_type: 'banner',
        daily_budget: 1000,
        duration_days: 7,
      })
    );
  });

  it('navigates to Ads after successful launch', async () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Launch Campaign'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('Ads');
    });
  });

  it('goes back on arrow press from Step 1', () => {
    const { UNSAFE_root } = renderScreen();
    // Press the back arrow (ArrowLeft Pressable — first Pressable in header)
    const pressables = UNSAFE_root.findAllByType(require('react-native').Pressable);
    if (pressables.length > 0) {
      fireEvent.press(pressables[0]);
      expect(mockGoBack).toHaveBeenCalled();
    }
  });

  it('shows Live Preview in budget step', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Banner Ad'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    fireEvent.press(getByText('Continue'));
    expect(getByText('Live Preview')).toBeTruthy();
  });

  it('shows business card selector when cards exist', () => {
    mockCards = [{ id: '1', full_name: 'Test Business', company_name: 'Test Co' }];
    const { getByText } = renderScreen();
    expect(getByText('Link to Business Card')).toBeTruthy();
  });

  it('shows no card selector when no cards', () => {
    mockCards = [];
    const { queryByText } = renderScreen();
    expect(queryByText('Link to Business Card')).toBeNull();
  });
});
