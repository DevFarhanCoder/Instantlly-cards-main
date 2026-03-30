/**
 * SubcategoryDetail Screen Tests
 * Tests business listing by subcategory: cards, search, filters, empty state, navigation.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../store/authSlice';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({
    params: {
      subcategory: 'AC Service',
      categoryName: 'AC & Appliances',
      categoryIcon: '❄️',
    },
  }),
  useFocusEffect: jest.fn(),
}));

const mockCards = [
  {
    id: '101',
    business_card_id: '101',
    user_id: '1',
    full_name: 'Cool AC Services',
    phone: '9876543210',
    email: 'cool@ac.com',
    location: 'MG Road, Bangalore',
    company_name: 'Cool AC Pvt Ltd',
    job_title: 'Technician',
    logo_url: null,
    description: 'Best AC service in town',
    category: 'AC Service',
    services: ['AC Repair', 'AC Installation', 'AMC'],
    offer: '20% off on first visit',
    website: null,
    business_hours: '9 AM - 6 PM',
    established_year: '2015',
    instagram: null, facebook: null, linkedin: null, youtube: null, twitter: null,
    company_phone: null, company_email: null, company_address: null,
    company_maps_link: null, maps_link: null, keywords: null, gender: null,
    birthdate: null, anniversary: null,
    latitude: 12.97, longitude: 77.59,
    home_service: true,
    service_mode: 'both',
    whatsapp: '9876543210',
    telegram: null,
    is_verified: true,
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: '102',
    business_card_id: '102',
    user_id: '2',
    full_name: 'Fast Cooling Solutions',
    phone: '9876543211',
    email: null,
    location: 'Koramangala, Bangalore',
    company_name: null,
    job_title: null,
    logo_url: 'https://example.com/logo.png',
    description: null,
    category: 'AC Service',
    services: [],
    offer: null,
    website: null, business_hours: null, established_year: null,
    instagram: null, facebook: null, linkedin: null, youtube: null, twitter: null,
    company_phone: null, company_email: null, company_address: null,
    company_maps_link: null, maps_link: null, keywords: null, gender: null,
    birthdate: null, anniversary: null,
    latitude: null, longitude: null,
    home_service: false,
    service_mode: 'visit',
    whatsapp: null, telegram: null,
    is_verified: false,
    created_at: '2025-06-01T00:00:00Z',
  },
];

const mockLoadMore = jest.fn();
const mockUseDirectoryFeed = jest.fn(() => ({
  data: mockCards,
  isLoading: false,
  isFetching: false,
  hasMore: false,
  loadMore: mockLoadMore,
}));

jest.mock('../hooks/useDirectoryCards', () => ({
  useDirectoryFeed: (...args: any[]) => mockUseDirectoryFeed(...args),
}));

jest.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => ({
    toggleFavorite: jest.fn(),
    isFavorite: () => false,
    favorites: [],
  }),
}));

jest.mock('../hooks/useUserLocation', () => ({
  useUserLocation: () => null,
  getDistanceKm: () => 0,
  formatDistance: () => '0 km',
}));

jest.mock('../components/BookAppointmentModal', () => 'BookAppointmentModal');

jest.mock('lucide-react-native', () =>
  new Proxy({}, { get: (_, prop) => prop })
);

jest.mock('../integrations/supabase/client', () => ({
  supabase: { from: jest.fn().mockReturnThis() },
  SUPABASE_CONFIG_OK: false,
}));

jest.mock('../theme/colors', () => ({
  colors: {
    foreground: '#111827',
    mutedForeground: '#6b7280',
    primary: '#2563eb',
    destructive: '#ef4444',
  },
}));

jest.mock('../components/ui/skeleton', () => ({
  Skeleton: 'Skeleton',
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildStore = () => configureStore({ reducer: { auth: authReducer } });
const SubcategoryDetail = require('../screens/SubcategoryDetail').default;
const renderScreen = () =>
  render(
    <Provider store={buildStore()}>
      <SubcategoryDetail />
    </Provider>
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDirectoryFeed.mockReturnValue({
    data: mockCards,
    isLoading: false,
    isFetching: false,
    hasMore: false,
    loadMore: mockLoadMore,
  });
});

describe('SubcategoryDetail', () => {
  it('renders header with category name and subcategory', () => {
    const { getByText, getAllByText } = renderScreen();
    expect(getByText('AC & Appliances')).toBeTruthy();
    // "AC Service" appears in header + as card category text, use getAllByText
    expect(getAllByText('AC Service').length).toBeGreaterThanOrEqual(1);
    expect(getByText('❄️')).toBeTruthy();
  });

  it('renders search input', () => {
    const { getByPlaceholderText } = renderScreen();
    expect(getByPlaceholderText('Search businesses, services...')).toBeTruthy();
  });

  it('shows business card count', () => {
    const { getByText } = renderScreen();
    expect(getByText('2 businesses found')).toBeTruthy();
  });

  it('renders business card names', () => {
    const { getByText } = renderScreen();
    expect(getByText('Cool AC Services')).toBeTruthy();
    expect(getByText('Fast Cooling Solutions')).toBeTruthy();
  });

  it('renders location for cards that have it', () => {
    const { getByText } = renderScreen();
    expect(getByText('MG Road, Bangalore')).toBeTruthy();
    expect(getByText('Koramangala, Bangalore')).toBeTruthy();
  });

  it('renders offer badge when card has offer', () => {
    const { getByText } = renderScreen();
    expect(getByText(/20% off on first visit/)).toBeTruthy();
  });

  it('renders service tags for cards with services', () => {
    const { getByText } = renderScreen();
    expect(getByText('AC Repair')).toBeTruthy();
    expect(getByText('AC Installation')).toBeTruthy();
    expect(getByText('AMC')).toBeTruthy();
  });

  it('renders service mode badges correctly', () => {
    const { getAllByText, getByText } = renderScreen();
    expect(getAllByText(/Home & Visit/).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/Visit/).length).toBeGreaterThanOrEqual(1);
  });

  it('renders Call, Chat, Book action buttons', () => {
    const { getAllByText } = renderScreen();
    expect(getAllByText(/Call/)).toHaveLength(2);
    expect(getAllByText(/Chat/)).toHaveLength(2);
    expect(getAllByText(/Book/)).toHaveLength(2);
  });

  it('navigates to BusinessDetail when card is pressed', () => {
    const { getByText } = renderScreen();
    fireEvent.press(getByText('Cool AC Services'));
    expect(mockNavigate).toHaveBeenCalledWith('BusinessDetail', { id: '101' });
  });

  it('filters cards by search query', () => {
    const { getByPlaceholderText, getByText, queryByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Search businesses, services...'), 'Fast');
    expect(getByText('Fast Cooling Solutions')).toBeTruthy();
    expect(queryByText('Cool AC Services')).toBeNull();
  });

  it('shows empty state when search has no results', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Search businesses, services...'), 'NonexistentBusiness');
    expect(getByText('No businesses found')).toBeTruthy();
  });

  it('shows clear search button when searching with no results', () => {
    const { getByPlaceholderText, getByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Search businesses, services...'), 'NonexistentBusiness');
    expect(getByText('Clear search')).toBeTruthy();
  });

  it('shows loading skeletons when data is loading', () => {
    mockUseDirectoryFeed.mockReturnValueOnce({
      data: [],
      isLoading: true,
      isFetching: false,
      hasMore: false,
      loadMore: jest.fn(),
    });
    const { UNSAFE_getAllByType } = renderScreen();
    expect(UNSAFE_getAllByType('Skeleton')).toHaveLength(3);
  });

  it('shows zero-results message when no cards exist', () => {
    mockUseDirectoryFeed.mockReturnValueOnce({
      data: [],
      isLoading: false,
      isFetching: false,
      hasMore: false,
      loadMore: jest.fn(),
    });
    const { getByText } = renderScreen();
    expect(getByText('No businesses in this category yet')).toBeTruthy();
  });

  it('passes correct category to useDirectoryFeed', () => {
    renderScreen();
    expect(mockUseDirectoryFeed).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'AC Service',
        pageSize: 30,
      })
    );
  });

  it('clears search and shows all results when Clear search is pressed', () => {
    const { getByPlaceholderText, getByText, queryByText } = renderScreen();
    fireEvent.changeText(getByPlaceholderText('Search businesses, services...'), 'NonexistentBusiness');
    expect(queryByText('Cool AC Services')).toBeNull();
    fireEvent.press(getByText('Clear search'));
    expect(getByText('Cool AC Services')).toBeTruthy();
  });
});
