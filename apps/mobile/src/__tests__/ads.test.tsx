/**
 * Ads Screen Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import Ads from '../screens/Ads';
import authReducer from '../store/authSlice';

// ─── Navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

// ─── Auth ────────────────────────────────────────────────────────────────────
let mockUser: any = { userId: 1, email: 'test@test.com' };

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: mockUser, isAuthenticated: !!mockUser }),
}));

// ─── Ads hook mock ──────────────────────────────────────────────────────────
let mockCampaigns: any[] = [];
let mockIsLoading = false;

jest.mock('../hooks/useAds', () => ({
  useAdCampaigns: () => ({
    data: mockCampaigns,
    isLoading: mockIsLoading,
    refetch: jest.fn(),
  }),
}));

jest.mock('../lib/toast', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
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
      <Ads />
    </Provider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('Ads', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockUser = { userId: 1, email: 'test@test.com' };
    mockCampaigns = [];
    mockIsLoading = false;
  });

  it('renders Ads Manager header', () => {
    const { getByText } = renderScreen();
    expect(getByText('Ads Manager')).toBeTruthy();
  });

  it('shows sign in prompt when not authenticated', () => {
    mockUser = null;
    const { getByText } = renderScreen();
    expect(getByText('Sign in to manage your ads')).toBeTruthy();
  });

  it('navigates to Auth on Sign In press', () => {
    mockUser = null;
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Sign In'));
    expect(mockNavigate).toHaveBeenCalledWith('Auth');
  });

  it('shows demo preview when not authenticated', () => {
    mockUser = null;
    const { getByText } = renderScreen();
    expect(getByText('Summer Sale Campaign')).toBeTruthy();
    expect(getByText('Featured Business Listing')).toBeTruthy();
    expect(getByText('Diwali Special Promo')).toBeTruthy();
  });

  it('shows summary stats when authenticated', () => {
    mockCampaigns = [
      { id: 1, title: 'Test Ad', status: 'active', impressions: 1500, clicks: 50, spent: 200, ad_type: 'banner' },
    ];
    const { getByText } = renderScreen();
    expect(getByText('1')).toBeTruthy(); // Active Ads count
    expect(getByText('1.5K')).toBeTruthy(); // Impressions
    expect(getByText('50')).toBeTruthy(); // Clicks
  });

  it('shows Reach More Customers cta section', () => {
    const { getByText } = renderScreen();
    expect(getByText('Reach More Customers')).toBeTruthy();
    expect(getByText('Create Ad')).toBeTruthy();
  });

  it('navigates to AdCreate on Create Ad press', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Create Ad'));
    expect(mockNavigate).toHaveBeenCalledWith('AdCreate');
  });

  it('navigates to AdDashboard on Dashboard button', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Dashboard'));
    expect(mockNavigate).toHaveBeenCalledWith('AdDashboard');
  });

  it('navigates to AdDashboard on View Stats press', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('View Stats'));
    expect(mockNavigate).toHaveBeenCalledWith('AdDashboard');
  });

  it('shows Ad Formats section', () => {
    const { getByText } = renderScreen();
    expect(getByText('Ad Formats')).toBeTruthy();
    expect(getByText('Banner Ads')).toBeTruthy();
    expect(getByText('Featured Listing')).toBeTruthy();
    expect(getByText('Sponsored Card')).toBeTruthy();
  });

  it('shows no campaigns empty state when authenticated', () => {
    const { getByText } = renderScreen();
    expect(getByText('No campaigns yet. Create your first ad!')).toBeTruthy();
  });

  it('shows recent campaigns when data exists', () => {
    mockCampaigns = [
      { id: 1, title: 'Campaign Alpha', status: 'active', impressions: 500, clicks: 20, spent: 100, ad_type: 'banner' },
      { id: 2, title: 'Campaign Beta', status: 'paused', impressions: 300, clicks: 10, spent: 50, ad_type: 'featured' },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Campaign Alpha')).toBeTruthy();
    expect(getByText('Campaign Beta')).toBeTruthy();
  });

  it('shows See All link for recent campaigns', () => {
    mockCampaigns = [{ id: 1, title: 'Test', status: 'active', impressions: 0, clicks: 0, spent: 0, ad_type: 'banner' }];
    const { getByText } = renderScreen();
    expect(getByText('See All')).toBeTruthy();
  });

  it('navigates to AdDashboard on See All press', () => {
    mockCampaigns = [{ id: 1, title: 'Test', status: 'active', impressions: 0, clicks: 0, spent: 0, ad_type: 'banner' }];
    const { getByText } = renderScreen();
    fireEvent.press(getByText('See All'));
    expect(mockNavigate).toHaveBeenCalledWith('AdDashboard');
  });

  it('displays ad format prices', () => {
    const { getByText } = renderScreen();
    expect(getByText('From ₹100/day')).toBeTruthy();
    expect(getByText('From ₹200/day')).toBeTruthy();
    expect(getByText('From ₹150/day')).toBeTruthy();
  });
});
