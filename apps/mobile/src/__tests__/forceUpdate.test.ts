import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useForceUpdate } from '../hooks/useForceUpdate';

// ---------------------------------------------------------------------------
// Mock expo-constants to control APP_VERSION
// ---------------------------------------------------------------------------
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: { version: '1.0.80', extra: {} },
    manifest: { version: '1.0.80' },
  },
}));

// ---------------------------------------------------------------------------
// Mock fetch globally
// ---------------------------------------------------------------------------
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

function mockVersionResponse(overrides: Record<string, unknown> = {}) {
  const defaults = {
    currentVersion: '1.0.80',
    minVersion: '1.0.0',
    recommendedVersion: '1.0.80',
    forceUpdate: false,
    updateUrl: 'https://play.google.com/store/apps/details?id=com.instantllycards.www.twa',
    message: '',
  };
  return {
    ok: true,
    json: () => Promise.resolve({ ...defaults, ...overrides }),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useForceUpdate', () => {
  it('returns no update needed when app is at current version', async () => {
    mockFetch.mockResolvedValueOnce(mockVersionResponse());

    const { result } = renderHook(() => useForceUpdate());

    // Initially checking
    expect(result.current.checking).toBe(true);

    await waitFor(() => expect(result.current.checking).toBe(false));

    expect(result.current.mustUpdate).toBe(false);
    expect(result.current.shouldUpdate).toBe(false);
  });

  it('sets mustUpdate when app version < minVersion', async () => {
    mockFetch.mockResolvedValueOnce(
      mockVersionResponse({ minVersion: '2.0.0' })
    );

    const { result } = renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current.checking).toBe(false));

    expect(result.current.mustUpdate).toBe(true);
    expect(result.current.shouldUpdate).toBe(false);
  });

  it('sets mustUpdate when forceUpdate is true AND app < currentVersion', async () => {
    mockFetch.mockResolvedValueOnce(
      mockVersionResponse({ forceUpdate: true, currentVersion: '2.0.0' })
    );

    const { result } = renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current.checking).toBe(false));

    expect(result.current.mustUpdate).toBe(true);
  });

  it('does NOT block when forceUpdate is true but app matches currentVersion', async () => {
    mockFetch.mockResolvedValueOnce(
      mockVersionResponse({ forceUpdate: true, currentVersion: '1.0.80' })
    );

    const { result } = renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current.checking).toBe(false));

    expect(result.current.mustUpdate).toBe(false);
  });

  it('sets shouldUpdate when app version < recommendedVersion', async () => {
    mockFetch.mockResolvedValueOnce(
      mockVersionResponse({ recommendedVersion: '2.0.0' })
    );

    const { result } = renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current.checking).toBe(false));

    expect(result.current.mustUpdate).toBe(false);
    expect(result.current.shouldUpdate).toBe(true);
  });

  it('dismiss clears shouldUpdate', async () => {
    mockFetch.mockResolvedValueOnce(
      mockVersionResponse({ recommendedVersion: '2.0.0' })
    );

    const { result } = renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current.shouldUpdate).toBe(true));

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.shouldUpdate).toBe(false);
  });

  it('does not block app on network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current.checking).toBe(false));

    expect(result.current.mustUpdate).toBe(false);
    expect(result.current.shouldUpdate).toBe(false);
  });

  it('does not block app on non-200 response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current.checking).toBe(false));

    expect(result.current.mustUpdate).toBe(false);
    expect(result.current.shouldUpdate).toBe(false);
  });

  it('provides updateUrl and message from backend', async () => {
    mockFetch.mockResolvedValueOnce(
      mockVersionResponse({
        minVersion: '5.0.0',
        updateUrl: 'https://custom.link',
        message: 'Please update!',
      })
    );

    const { result } = renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current.checking).toBe(false));

    expect(result.current.updateUrl).toBe('https://custom.link');
    expect(result.current.message).toBe('Please update!');
  });

  it('recheck triggers a new fetch', async () => {
    mockFetch
      .mockResolvedValueOnce(mockVersionResponse())
      .mockResolvedValueOnce(mockVersionResponse({ minVersion: '9.0.0' }));

    const { result } = renderHook(() => useForceUpdate());

    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.mustUpdate).toBe(false);

    await act(async () => {
      result.current.recheck();
    });

    await waitFor(() => expect(result.current.mustUpdate).toBe(true));
  });

  it('handles semver comparison correctly across major/minor/patch', async () => {
    // App is 1.0.80, minVersion 1.0.81 → must update
    mockFetch.mockResolvedValueOnce(
      mockVersionResponse({ minVersion: '1.0.81' })
    );

    const { result } = renderHook(() => useForceUpdate());
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.mustUpdate).toBe(true);
  });

  it('same version as minVersion does NOT trigger update', async () => {
    // App is 1.0.80, minVersion 1.0.80 → no update
    mockFetch.mockResolvedValueOnce(
      mockVersionResponse({ minVersion: '1.0.80' })
    );

    const { result } = renderHook(() => useForceUpdate());
    await waitFor(() => expect(result.current.checking).toBe(false));
    expect(result.current.mustUpdate).toBe(false);
  });
});
