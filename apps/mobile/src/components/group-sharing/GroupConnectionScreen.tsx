/**
 * GroupConnectionScreen
 * Full-screen lobby/waiting screen shown after create or join.
 * - Shows participants in a circular orbit around the Instantlly Cards logo.
 * - Pulsing rings behind the logo.
 * - Admin sees "Start Sharing" button; participants see a waiting state.
 * - Polls session state every 2 s.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import {
  leaveGroupSession,
  pollGroupSession,
  startGroupSharing,
  type GroupParticipant,
  type GroupSession,
} from '../../services/groupSharingService';
import { useGroupToast } from './GroupSharingToast';

const logoImg = require('../../../assets/icon.png');

interface Props {
  visible: boolean;
  session: GroupSession;
  onClose: () => void;
  onStartSharing: (session: GroupSession) => void;
}

// ─── Timer pill ───────────────────────────────────────────────────────────────

function useCountdown(expiresAt: number) {
  const [remaining, setRemaining] = useState(Math.max(0, expiresAt - Date.now()));
  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, expiresAt - Date.now());
      setRemaining(left);
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const mins = String(Math.floor(remaining / 60000)).padStart(2, '0');
  const secs = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
  return `${mins}:${secs}`;
}

// ─── Pulsing Ring ─────────────────────────────────────────────────────────────

const PulseRing = ({ delay, size }: { delay: number; size: number }) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, delay]);

  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.4] });
  const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 0.2, 0] });

  return (
    <Animated.View
      style={[
        styles.pulseRing,
        { width: size, height: size, borderRadius: size / 2, transform: [{ scale }], opacity },
      ]}
    />
  );
};

// ─── Participant Avatar ───────────────────────────────────────────────────────

const ParticipantAvatar = ({
  participant,
  angle,
  orbitRadius,
}: {
  participant: GroupParticipant;
  angle: number;
  orbitRadius: number;
}) => {
  const entryAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(entryAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 10,
      delay: 150,
    }).start();
  }, [entryAnim]);

  const x = orbitRadius * Math.cos((angle * Math.PI) / 180);
  const y = orbitRadius * Math.sin((angle * Math.PI) / 180);

  return (
    <Animated.View
      style={[
        styles.avatarWrap,
        {
          left: '50%',
          top: '50%',
          transform: [
            { translateX: x - 32 },
            { translateY: y - 32 },
            { scale: entryAnim },
          ],
        },
      ]}
    >
      {participant.photoUrl ? (
        <Image
          source={{ uri: participant.photoUrl }}
          style={[
            styles.avatarImg,
            participant.isOnline ? styles.avatarOnline : styles.avatarOffline,
          ]}
        />
      ) : (
        <View
          style={[
            styles.avatarPlaceholder,
            participant.isOnline ? styles.avatarOnline : styles.avatarOffline,
          ]}
        >
          <Text style={styles.avatarLetter}>
            {(participant.name ?? '?')[0].toUpperCase()}
          </Text>
        </View>
      )}
      {participant.isOnline && <View style={styles.onlineDot} />}
      <View style={styles.namePill}>
        <Text style={styles.namePillText} numberOfLines={1}>
          {participant.name.split(' ')[0]}
        </Text>
      </View>
    </Animated.View>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function GroupConnectionScreen({
  visible,
  session: initialSession,
  onClose,
  onStartSharing,
}: Props) {
  const { user } = useAuth();
  const { showToast, ToastRenderer } = useGroupToast();
  const [session, setSession] = useState<GroupSession>(initialSession);
  const [starting, setStarting] = useState(false);
  const timerLabel = useCountdown(session.expiresAt);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isAdmin = String(user?.id) === session.adminId;

  // ── Poll ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    pollRef.current = setInterval(async () => {
      const updated = await pollGroupSession(session.code);
      if (!updated) {
        clearInterval(pollRef.current!);
        showToast('info', 'Group session has ended.');
        onClose();
        return;
      }
      setSession(updated);
      if (updated.status === 'sharing' || updated.status === 'connected') {
        clearInterval(pollRef.current!);
        onStartSharing(updated);
      }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [visible, session.code]);

  // ── Start sharing ───────────────────────────────────────────────────────────
  const handleStartSharing = useCallback(async () => {
    setStarting(true);
    try {
      const updated = await startGroupSharing(session.code);
      onStartSharing(updated);
    } catch {
      showToast('error', 'Failed to start sharing. Please try again.');
    } finally {
      setStarting(false);
    }
  }, [session.code, onStartSharing, showToast]);

  // ── Close / leave ───────────────────────────────────────────────────────────
  const handleClose = useCallback(async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    await leaveGroupSession(session.code, String(user?.id));
    onClose();
  }, [session.code, user, onClose]);

  // ── Compute orbit positions ─────────────────────────────────────────────────
  const ORBIT_RADIUS = 110;
  const participants = session.participants;
  const orbitParticipants = isAdmin
    ? participants.filter((p) => !p.isAdmin)
    : participants;
  const angleStep = orbitParticipants.length > 0 ? 360 / orbitParticipants.length : 360;

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.safeArea}>
        {/* ── Decorative background circles ─────────────────────────── */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />

        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={styles.topBar}>
          <Pressable style={styles.closeCircle} onPress={handleClose} hitSlop={8}>
            <Ionicons name="close" size={20} color="#111827" />
          </Pressable>
          <View style={styles.timerBadge}>
            <Ionicons name="time-outline" size={15} color="#EF4444" />
            <Text style={styles.timerBadgeText}>{timerLabel}</Text>
          </View>
        </View>

        {/* ── Title + code badge ─────────────────────────────────────── */}
        <View style={styles.titleSection}>
          <Text style={styles.mainTitle}>Group Sharing</Text>
          <View style={styles.codeBadge}>
            <Text style={styles.codeBadgePrefix}>Code: </Text>
            <Text style={styles.codeBadgeValue}>{session.code}</Text>
          </View>
        </View>

        {/* ── Orbit area ─────────────────────────────────────────────── */}
        <View style={styles.orbitContainer}>
          {/* Pulsing rings */}
          <PulseRing size={130} delay={0} />
          <PulseRing size={160} delay={600} />
          <PulseRing size={190} delay={1200} />

          {/* Center logo */}
          <View style={styles.centerLogoWrap}>
            <Image source={logoImg} style={styles.centerLogo} />
          </View>

          {/* Participant avatars */}
          {orbitParticipants.map((participant, i) => (
            <ParticipantAvatar
              key={participant.id}
              participant={participant}
              angle={i * angleStep - 90}
              orbitRadius={ORBIT_RADIUS}
            />
          ))}
        </View>

        {/* ── Bottom action ───────────────────────────────────────────── */}
        <View style={styles.bottomSection}>
          {isAdmin ? (
            <Pressable
              style={[styles.startBtn, starting && styles.startBtnDisabled]}
              onPress={handleStartSharing}
              disabled={starting}
            >
              {starting ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.startBtnText}>Start Sharing</Text>
              )}
            </Pressable>
          ) : (
            <View style={styles.waitingPanel}>
              <ActivityIndicator color="#6B7280" size="small" />
              <Text style={styles.waitingText}>Waiting for Admin to Start...</Text>
            </View>
          )}

          {/* ── Stats row ──────────────────────────────────────────────── */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={18} color="#6366F1" />
              <Text style={styles.statValue}>{participants.length}</Text>
              <Text style={styles.statCaption}>Participants</Text>
            </View>
            {isAdmin && (
              <View style={styles.statCard}>
                <Ionicons name="shield-checkmark" size={18} color="#6366F1" />
                <Text style={styles.statValue}>Admin</Text>
                <Text style={styles.statCaption}>You're the host</Text>
              </View>
            )}
          </View>
        </View>

        <ToastRenderer />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  // Decorative background
  bgCircle1: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#EEF0FF',
    top: -80,
    right: -80,
  },
  bgCircle2: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#EEF0FF',
    bottom: 100,
    left: -60,
  },
  // Header
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
    paddingBottom: 8,
  },
  closeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  timerBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  // Title
  titleSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1F2937',
    letterSpacing: -0.5,
  },
  codeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  codeBadgePrefix: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  codeBadgeValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#6366F1',
    letterSpacing: 4,
  },
  // Orbit
  orbitContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseRing: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  centerLogoWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  centerLogo: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  // Participant avatar
  avatarWrap: {
    position: 'absolute',
    width: 64,
    height: 64,
    alignItems: 'center',
  },
  avatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E0E4FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarLetter: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366F1',
  },
  avatarOnline: {
    borderColor: '#10B981',
  },
  avatarOffline: {
    borderColor: '#9CA3AF',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 14,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  namePill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    maxWidth: 80,
  },
  namePillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  // Bottom section
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 16,
  },
  startBtn: {
    backgroundColor: '#10B981',
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  startBtnDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  waitingPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 16,
  },
  waitingText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  statCaption: {
    fontSize: 11,
    color: '#6B7280',
  },
});
