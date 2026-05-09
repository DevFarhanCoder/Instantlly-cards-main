import { useEffect, useRef } from 'react';
import { useAuth } from './useAuth';
import { getPendingEventId, clearPendingEventId } from '../utils/deferredEventNavigation';
import { navigationRef } from '../navigation/AppNavigator';

/**
 * After the user logs in, checks for a deferred event navigation saved from
 * the Play Store install referrer and navigates to EventDetail.
 * Uses navigationRef directly to avoid the "outside NavigationContainer" error.
 */
export function useDeferredEventNavigation() {
  const { user } = useAuth();
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || attempted.current) return;
    attempted.current = true;

    (async () => {
      const eventId = await getPendingEventId();
      if (!eventId) return;
      await clearPendingEventId();
      // Small delay to ensure NavigationContainer is ready
      setTimeout(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('EventDetail', { id: eventId });
        }
      }, 500);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
