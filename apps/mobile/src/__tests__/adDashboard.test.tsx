/**
 * AdDashboard Screen Tests
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import AdDashboard from '../screens/AdDashboard';
import authReducer from '../store/authSlice';

// ─── Navigation ──────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

// ─── Ads hook mock ──────────────────────────────────────────────────────────
let mockCampaigns: any[] = [];
let mockCampaignsLoading = false;
const mockMutate = jest.fn();

jest.mock('../hooks/useAds', () => ({
  useAdCampaigns: () => ({
    data: mockCampaigns,
    isLoading: mockCampaignsLoading,
    refetch: jest.fn(),
  }),
  useUpdateAdCampaign: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useDeleteAdCampaign: () => ({
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));

// ─── Variants hook mock ─────────────────────────────────────────────────────
let mockVariants: any[] = [];

jest.mock('../hooks/useActiveAds', () => ({
  useAdVariants: () => ({
    data: mockVariants,
    isLoading: false,
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
      <AdDashboard />
    </Provider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('AdDashboard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockGoBack.mockClear();
    mockMutate.mockClear();
    mockCampaigns = [];
    mockCampaignsLoading = false;
    mockVariants = [];
  });

  it('renders Ad Dashboard header', () => {
    const { getByText } = renderScreen();
    expect(getByText('Ad Dashboard')).toBeTruthy();
  });

  it('shows New Ad button in header', () => {
    const { getByText } = renderScreen();
    expect(getByText('New Ad')).toBeTruthy();
  });

  it('navigates to AdCreate on New Ad press', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('New Ad'));
    expect(mockNavigate).toHaveBeenCalledWith('AdCreate');
  });

  it('shows KPI cards with zero stats when no campaigns', () => {
    const { getByText } = renderScreen();
    expect(getByText('Impressions')).toBeTruthy();
    expect(getByText('Clicks')).toBeTruthy();
    expect(getByText('CTR')).toBeTruthy();
    expect(getByText('Spent')).toBeTruthy();
  });

  it('shows empty state when no campaigns', () => {
    const { getByText } = renderScreen();
    expect(getByText('No campaigns yet')).toBeTruthy();
    expect(getByText('Create First Ad')).toBeTruthy();
  });

  it('navigates to AdCreate from empty state', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Create First Ad'));
    expect(mockNavigate).toHaveBeenCalledWith('AdCreate');
  });

  it('shows campaign cards when data exists', () => {
    mockCampaigns = [
      {
        id: 1,
        title: 'Summer Sale',
        ad_type: 'banner',
        status: 'active',
        approval_status: 'approved',
        impressions: 1500,
        clicks: 75,
        spent: 500,
        total_budget: 2000,
        creative_url: null,
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Summer Sale')).toBeTruthy();
    expect(getByText('banner Ad')).toBeTruthy();
  });

  it('shows status badge on campaigns', () => {
    mockCampaigns = [
      {
        id: 1,
        title: 'Test',
        ad_type: 'banner',
        status: 'active',
        approval_status: 'approved',
        impressions: 0,
        clicks: 0,
        spent: 0,
        total_budget: 1000,
        creative_url: null,
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('active')).toBeTruthy();
  });

  it('shows campaign stats (Views, Clicks, Spent)', () => {
    mockCampaigns = [
      {
        id: 1,
        title: 'Test',
        ad_type: 'featured',
        status: 'active',
        approval_status: 'pending',
        impressions: 2500,
        clicks: 120,
        spent: 800,
        total_budget: 3000,
        creative_url: null,
      },
    ];
    const { getByText, getAllByText } = renderScreen();
    expect(getByText('Views')).toBeTruthy();
    // "2,500" appears in both KPI card and campaign card
    expect(getAllByText('2,500').length).toBeGreaterThanOrEqual(1);
    expect(getAllByText('120').length).toBeGreaterThanOrEqual(1);
  });

  it('shows budget progress bar', () => {
    mockCampaigns = [
      {
        id: 1,
        title: 'Budget Test',
        ad_type: 'banner',
        status: 'active',
        approval_status: 'approved',
        impressions: 100,
        clicks: 5,
        spent: 500,
        total_budget: 1000,
        creative_url: null,
      },
    ];
    const { getByText } = renderScreen();
    // Budget text shows percentage
    expect(getByText(/₹500.*₹1,000.*50%/)).toBeTruthy();
  });

  it('shows Pause button for active campaigns', () => {
    mockCampaigns = [
      {
        id: 1,
        title: 'Active Test',
        ad_type: 'banner',
        status: 'active',
        approval_status: 'approved',
        impressions: 0,
        clicks: 0,
        spent: 0,
        total_budget: 1000,
        creative_url: null,
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Pause')).toBeTruthy();
  });

  it('shows Resume button for paused campaigns', () => {
    mockCampaigns = [
      {
        id: 1,
        title: 'Paused Test',
        ad_type: 'banner',
        status: 'paused',
        approval_status: 'approved',
        impressions: 0,
        clicks: 0,
        spent: 0,
        total_budget: 1000,
        creative_url: null,
      },
    ];
    const { getByText } = renderScreen();
    expect(getByText('Resume')).toBeTruthy();
  });

  it('calls mutate to pause an active campaign', () => {
    mockCampaigns = [
      {
        id: 1,
        title: 'Pause Me',
        ad_type: 'banner',
        status: 'active',
        approval_status: 'approved',
        impressions: 0,
        clicks: 0,
        spent: 0,
        total_budget: 1000,
        creative_url: null,
      },
    ];
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Pause'));
    expect(mockMutate).toHaveBeenCalledWith({ id: 1, status: 'paused' });
  });

  it('calls mutate to resume a paused campaign', () => {
    mockCampaigns = [
      {
        id: 1,
        title: 'Resume Me',
        ad_type: 'banner',
        status: 'paused',
        approval_status: 'approved',
        impressions: 0,
        clicks: 0,
        spent: 0,
        total_budget: 1000,
        creative_url: null,
      },
    ];
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Resume'));
    expect(mockMutate).toHaveBeenCalledWith({ id: 1, status: 'active' });
  });

  it('does not show Pause/Resume for completed campaigns', () => {
    mockCampaigns = [
      {
        id: 1,
        title: 'Done Campaign',
        ad_type: 'banner',
        status: 'completed',
        approval_status: 'approved',
        impressions: 5000,
        clicks: 250,
        spent: 1000,
        total_budget: 1000,
        creative_url: null,
      },
    ];
    const { queryByText } = renderScreen();
    expect(queryByText('Pause')).toBeNull();
    expect(queryByText('Resume')).toBeNull();
  });

  it('calculates correct KPI totals across campaigns', () => {
    mockCampaigns = [
      { id: 1, title: 'A', ad_type: 'banner', status: 'active', approval_status: 'approved', impressions: 1000, clicks: 50, spent: 300, total_budget: 1000, creative_url: null },
      { id: 2, title: 'B', ad_type: 'featured', status: 'active', approval_status: 'approved', impressions: 500, clicks: 30, spent: 200, total_budget: 700, creative_url: null },
    ];
    const { getByText } = renderScreen();
    // Total impressions: 1500, clicks: 80, spent: ₹500, CTR: 5.3%
    expect(getByText('1,500')).toBeTruthy();
    expect(getByText('80')).toBeTruthy();
    expect(getByText('₹500')).toBeTruthy();
    expect(getByText('5.3%')).toBeTruthy();
  });

  it('shows Your Campaigns section', () => {
    const { getByText } = renderScreen();
    expect(getByText('Your Campaigns')).toBeTruthy();
  });

  it('goes back on header back button', () => {
    const { UNSAFE_root } = renderScreen();
    const pressables = UNSAFE_root.findAllByType(require('react-native').Pressable);
    if (pressables.length > 0) {
      fireEvent.press(pressables[0]);
      expect(mockGoBack).toHaveBeenCalled();
    }
  });
});
