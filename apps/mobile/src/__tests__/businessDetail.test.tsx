/**
 * BusinessDetail Screen Tests
 * Tests business detail page: header, contact info, services, reviews, actions, navigation.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setCredentials } from '../store/authSlice';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
  useRoute: () => ({ params: { id: '101' } }),
  useFocusEffect: jest.fn(),
}));

const mockCard = {
  id: '101',
  business_card_id: '101',
  user_id: '1',
  full_name: 'Cool AC Services',
  phone: '9876543210',
  email: 'cool@ac.com',
  location: 'MG Road, Bangalore',
  company_name: 'Cool AC Pvt Ltd',
  job_title: 'Lead Technician',
  logo_url: null,
  description: 'Best AC service in town with 10+ years experience',
  category: 'AC Service',
  services: ['AC Repair', 'AC Installation', 'AMC'],
  offer: '20% off on first visit',
  website: 'https://coolac.com',
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
  telegram: '@coolac',
  is_verified: true,
  created_at: '2025-01-01T00:00:00Z',
};

const mockUseDirectoryCard = jest.fn(() => ({
  data: mockCard,
  isLoading: false,
  isFetching: false,
  isError: false,
  error: null,
}));

jest.mock('../hooks/useDirectoryCards', () => ({
  useDirectoryCard: (...args: any[]) => mockUseDirectoryCard(...args),
  useDirectoryFeed: () => ({
    data: [],
    isLoading: false,
    isFetching: false,
    hasMore: false,
    loadMore: jest.fn(),
  }),
}));

jest.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => ({
    toggleFavorite: jest.fn(),
    isFavorite: () => false,
    favorites: [],
  }),
}));

const mockCreateReview = { mutateAsync: jest.fn(), isPending: false };
jest.mock('../hooks/useReviews', () => ({
  useReviews: () => ({
    reviews: [
      {
        id: 'r1',
        rating: 5,
        comment: 'Excellent service!',
        photo_urls: [],
        created_at: '2025-03-15T00:00:00Z',
      },
    ],
    createReview: mockCreateReview,
    uploadReviewPhoto: jest.fn(),
  }),
}));

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: jest.fn(), signUp: jest.fn(), signOut: jest.fn(),
    isAuthenticated: true, loading: false,
    user: { id: 1, phone: '1234567890', email: 'test@test.com', roles: ['customer'] },
    accessToken: 'test-token',
  }),
}));

jest.mock('../hooks/useBookings', () => ({
  useBookings: () => ({ createBooking: jest.fn() }),
}));

jest.mock('../hooks/useMessages', () => ({
  useCreateConversation: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('../hooks/useBusinessFollows', () => ({
  useBusinessFollows: () => ({
    followersCount: 42,
    isFollowing: false,
    toggleFollow: { mutate: jest.fn() },
  }),
}));

jest.mock('../hooks/useReports', () => ({
  useReportBusiness: () => ({ mutateAsync: jest.fn(), isPending: false }),
  useDisputes: () => ({ createDispute: { mutateAsync: jest.fn() } }),
}));

jest.mock('../lib/analytics', () => ({ trackCardEvent: jest.fn() }));
jest.mock('../lib/toast', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

jest.mock('../components/BookAppointmentModal', () => 'BookAppointmentModal');
jest.mock('../components/ShareCardModal', () => 'ShareCardModal');
jest.mock('../components/business/LeadForm', () => 'LeadForm');
jest.mock('../components/ui/skeleton', () => ({ Skeleton: 'Skeleton' }));

jest.mock('../components/ui/dialog', () => {
  const MockText = require('react-native').Text;
  return {
    Dialog: ({ children, open }: any) => (open ? children : null),
    DialogContent: ({ children }: any) => children,
    DialogHeader: ({ children }: any) => children,
    DialogTitle: ({ children }: any) => <MockText>{children}</MockText>,
    DialogFooter: ({ children }: any) => children,
  };
});

jest.mock('../components/ui/badge', () => {
  const MockText = require('react-native').Text;
  return {
    Badge: ({ children, ...props }: any) => <MockText>{children}</MockText>,
  };
});

jest.mock('../components/ui/textarea', () => ({ Textarea: 'Textarea' }));

jest.mock('../components/ui/select', () => ({
  Select: ({ children }: any) => children,
  SelectContent: ({ children }: any) => children,
  SelectItem: ({ children }: any) => children,
  SelectTrigger: ({ children }: any) => children,
  SelectValue: () => null,
}));

jest.mock('react-native-qrcode-svg', () => 'QRCode');
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildStore = () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  store.dispatch(
    setCredentials({
      user: { id: 1, phone: '1234567890', email: 'test@test.com', roles: ['customer'] },
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
    })
  );
  return store;
};

const BusinessDetail = require('../screens/BusinessDetail').default;
const renderScreen = (store?: any) =>
  render(
    <Provider store={store || buildStore()}>
      <BusinessDetail />
    </Provider>
  );

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDirectoryCard.mockReturnValue({
    data: mockCard,
    isLoading: false,
    isFetching: false,
    isError: false,
    error: null,
  });
});

describe('BusinessDetail', () => {
  describe('Header', () => {
    it('renders "Business Details" title', () => {
      const { getByText } = renderScreen();
      expect(getByText('Business Details')).toBeTruthy();
    });

    it('renders business full name', () => {
      const { getByText } = renderScreen();
      expect(getByText('Cool AC Services')).toBeTruthy();
    });

    it('renders job title and company name', () => {
      const { getByText } = renderScreen();
      expect(getByText('Lead Technician')).toBeTruthy();
      expect(getByText('Cool AC Pvt Ltd')).toBeTruthy();
    });

    it('renders category and service mode badges', () => {
      const { getByText } = renderScreen();
      expect(getByText('AC Service')).toBeTruthy();
      expect(getByText(/Home & Visit/)).toBeTruthy();
    });

    it('renders followers count', () => {
      const { getByText } = renderScreen();
      expect(getByText(/42/)).toBeTruthy();
      expect(getByText(/followers/)).toBeTruthy();
    });

    it('renders Follow button', () => {
      const { getByText } = renderScreen();
      expect(getByText(/Follow/)).toBeTruthy();
    });
  });

  describe('Contact Information', () => {
    it('renders phone number', () => {
      const { getAllByText } = renderScreen();
      expect(getAllByText(/9876543210/).length).toBeGreaterThanOrEqual(1);
    });

    it('renders email', () => {
      const { getByText } = renderScreen();
      expect(getByText(/cool@ac.com/)).toBeTruthy();
    });

    it('renders WhatsApp', () => {
      const { getAllByText } = renderScreen();
      expect(getAllByText(/WhatsApp/).length).toBeGreaterThanOrEqual(1);
    });

    it('renders Telegram handle', () => {
      const { getByText } = renderScreen();
      expect(getByText(/Telegram/)).toBeTruthy();
    });

    it('renders location', () => {
      const { getAllByText } = renderScreen();
      expect(getAllByText(/MG Road, Bangalore/).length).toBeGreaterThanOrEqual(1);
    });

    it('renders website', () => {
      const { getByText } = renderScreen();
      expect(getByText(/coolac.com/)).toBeTruthy();
    });

    it('renders business hours', () => {
      const { getByText } = renderScreen();
      expect(getByText(/9 AM - 6 PM/)).toBeTruthy();
    });
  });

  describe('Description and Offer', () => {
    it('renders description', () => {
      const { getByText } = renderScreen();
      expect(getByText('Best AC service in town with 10+ years experience')).toBeTruthy();
    });

    it('renders offer', () => {
      const { getByText } = renderScreen();
      expect(getByText(/20% off on first visit/)).toBeTruthy();
    });
  });

  describe('Services', () => {
    it('renders Services heading and all service badges', () => {
      const { getByText } = renderScreen();
      expect(getByText('Services')).toBeTruthy();
      expect(getByText('AC Repair')).toBeTruthy();
      expect(getByText('AC Installation')).toBeTruthy();
      expect(getByText('AMC')).toBeTruthy();
    });
  });

  describe('Reviews', () => {
    it('renders Reviews heading and review content', () => {
      const { getByText } = renderScreen();
      expect(getByText('Reviews')).toBeTruthy();
      expect(getByText('Excellent service!')).toBeTruthy();
    });

    it('renders "Write a Review" button', () => {
      const { getByText } = renderScreen();
      expect(getByText(/Write a Review/)).toBeTruthy();
    });
  });

  describe('Bottom Action Bar', () => {
    it('renders Message, Call, WhatsApp, Book and Report buttons', () => {
      const { getByText } = renderScreen();
      expect(getByText('Message')).toBeTruthy();
      expect(getByText('Call')).toBeTruthy();
      expect(getByText('WhatsApp')).toBeTruthy();
      expect(getByText('Book')).toBeTruthy();
      expect(getByText('Report')).toBeTruthy();
    });
  });

  describe('Loading and Error States', () => {
    it('shows skeletons when loading', () => {
      mockUseDirectoryCard.mockReturnValueOnce({
        data: undefined,
        isLoading: true,
        isFetching: false,
        isError: false,
        error: null,
      });
      const { UNSAFE_getAllByType } = renderScreen();
      expect(UNSAFE_getAllByType('Skeleton')).toHaveLength(3);
    });

    it('shows "Business not found" when card is null', () => {
      mockUseDirectoryCard.mockReturnValueOnce({
        data: null,
        isLoading: false,
        isFetching: false,
        isError: true,
        error: 'Not found',
      });
      const { getByText } = renderScreen();
      expect(getByText('Business not found')).toBeTruthy();
      expect(getByText('Go back')).toBeTruthy();
    });
  });

  describe('Card without optional fields', () => {
    it('renders gracefully without optional fields', () => {
      mockUseDirectoryCard.mockReturnValueOnce({
        data: {
          ...mockCard,
          email: null, location: null, company_name: null, job_title: null,
          description: null, offer: null, services: [], whatsapp: null,
          telegram: null, website: null, business_hours: null, is_verified: false,
        },
        isLoading: false, isFetching: false, isError: false, error: null,
      });
      const { getByText, queryByText } = renderScreen();
      expect(getByText('Cool AC Services')).toBeTruthy();
      expect(queryByText(/cool@ac.com/)).toBeNull();
      expect(queryByText(/MG Road/)).toBeNull();
      expect(queryByText(/WhatsApp/)).toBeNull();
      expect(queryByText(/Telegram/)).toBeNull();
      expect(queryByText(/coolac.com/)).toBeNull();
      expect(queryByText('Services')).toBeNull();
    });
  });

  describe('QR Code', () => {
    it('renders QR code section', () => {
      const { getByText } = renderScreen();
      expect(getByText('Scan to save this card')).toBeTruthy();
    });
  });

  describe('Analytics tracking', () => {
    it('tracks view event on mount', () => {
      const { trackCardEvent } = require('../lib/analytics');
      renderScreen();
      expect(trackCardEvent).toHaveBeenCalledWith('101', 'view');
    });
  });
});
