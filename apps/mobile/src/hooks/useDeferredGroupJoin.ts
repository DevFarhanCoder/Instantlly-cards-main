import { useEffect, useRef } from 'react';
import * as ExpoNotifications from 'expo-notifications';
import { useAuth } from './useAuth';
import { useJoinGroupMutation } from '../store/api/chatApi';
import { getPendingJoinCode, clearPendingJoinCode } from '../utils/deferredGroupJoin';

/**
 * useDeferredGroupJoin
 *
 * Runs once after the user logs in or signs up.
 * Checks AsyncStorage for a pending group join code that was saved from
 * the Play Store install referrer (ic_join_XXXX).
 *
 * If a code is found:
 *  1. Calls POST /api/groups/join with the code.
 *  2. Schedules an immediate local notification: "You've joined [Group Name]".
 *     → Tapping the notification navigates to GroupChat (handled in AppNavigator).
 *  3. Clears the pending code from AsyncStorage.
 */
export function useDeferredGroupJoin() {
  const { user } = useAuth();
  const [joinGroup] = useJoinGroupMutation();
  const attempted = useRef(false);

  useEffect(() => {
    if (!user || attempted.current) return;
    attempted.current = true;

    (async () => {
      const code = await getPendingJoinCode();
      if (!code) return;

      try {
        const result = await joinGroup({ joinCode: code }).unwrap();

        // Clear the pending code regardless of outcome
        await clearPendingJoinCode();

        // Request notification permission if not already granted
        const { status } = await ExpoNotifications.getPermissionsAsync();
        let finalStatus = status;
        if (status !== 'granted') {
          const { status: asked } = await ExpoNotifications.requestPermissionsAsync();
          finalStatus = asked;
        }

        if (finalStatus !== 'granted') return; // User denied — skip notification

        // Fire an immediate local notification
        await ExpoNotifications.scheduleNotificationAsync({
          content: {
            title: 'You joined a group!',
            body: `You are now part of "${result.name}". Tap to open the chat.`,
            data: {
              screen: 'GroupChat',
              groupId: result.id,
              groupName: result.name,
            },
          },
          trigger: null, // fire immediately
        });
      } catch {
        // Invalid code or already a member — just clear it silently
        await clearPendingJoinCode();
      }
    })();
  // Only re-run when the user identity changes (login / signup)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
