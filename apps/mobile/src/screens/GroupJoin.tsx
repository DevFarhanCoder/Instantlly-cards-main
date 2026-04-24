import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useJoinGroupMutation } from '../store/api/chatApi';
import type { RootStackParamList } from '../navigation/routes';

type GroupJoinRoute = RouteProp<RootStackParamList, 'GroupJoin'>;

/**
 * GroupJoin — opened via deep link  instantllycards://join?code=XXXX
 *
 * Flow:
 *  - Not logged in  → redirect to Auth (with pending join saved)
 *  - Logged in      → call POST /api/groups/join, then navigate to GroupChat
 */
export default function GroupJoin() {
  const navigation = useNavigation<any>();
  const route = useRoute<GroupJoinRoute>();
  const { code } = route.params ?? {};

  const { user, loading: authLoading } = useAuth();
  const [joinGroup] = useJoinGroupMutation();

  const [status, setStatus] = useState<'pending' | 'joining' | 'done' | 'error'>('pending');
  const [errorMsg, setErrorMsg] = useState('');
  const attempted = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Not logged in — go to Auth, pass the join code as a redirect param
      navigation.replace('Auth', {
        redirect: 'GroupJoin',
        redirectParams: { code },
      });
      return;
    }

    if (attempted.current) return;
    attempted.current = true;

    if (!code) {
      setStatus('error');
      setErrorMsg('Invalid invite link — no join code found.');
      return;
    }

    setStatus('joining');
    joinGroup({ joinCode: code, source: 'invite_link' })
      .unwrap()
      .then((result) => {
        setStatus('done');
        // Small delay so "Joined!" briefly shows before navigating
        setTimeout(() => {
          navigation.replace('GroupChat', {
            groupId: result.id,
            groupName: result.name,
          });
        }, 800);
      })
      .catch((err) => {
        setStatus('error');
        setErrorMsg(err?.data?.error ?? 'Failed to join group. The code may be invalid.');
      });
  }, [authLoading, user, code]);

  return (
    <View style={styles.container}>
      {(status === 'pending' || status === 'joining') && (
        <>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.label}>
            {status === 'joining' ? 'Joining group…' : 'Loading…'}
          </Text>
        </>
      )}

      {status === 'done' && (
        <>
          <Ionicons name="checkmark-circle" size={64} color="#16A34A" />
          <Text style={styles.label}>Joined!</Text>
        </>
      )}

      {status === 'error' && (
        <>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text style={styles.errorText}>{errorMsg}</Text>
          <Pressable style={styles.backBtn} onPress={() => navigation.replace('Home')}>
            <Text style={styles.backBtnText}>Go Home</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  errorText: {
    fontSize: 15,
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  backBtn: {
    marginTop: 12,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  backBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
