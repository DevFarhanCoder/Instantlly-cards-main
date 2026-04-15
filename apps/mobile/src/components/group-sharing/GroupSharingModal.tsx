/**
 * GroupSharingModal
 * Reusable modal with two modes: 'create' | 'join'
 *
 * Create mode:
 *   Step 1 → description + feature list → Next button
 *   Step 2 → GroupSettingsModal
 *   Step 3 → animated code boxes + auto-proceed to onOpenConnection
 *
 * Join mode:
 *   4-digit box code entry → Join Group button → onOpenConnection
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import {
  createGroupSession,
  joinGroupSession,
  mapJoinError,
  type GroupSession,
} from '../../services/groupSharingService';
import GroupSettingsModal from './GroupSettingsModal';

export type GSModalMode = 'create' | 'join';

interface Props {
  visible: boolean;
  mode: GSModalMode;
  onClose: () => void;
  onOpenConnection: (session: GroupSession) => void;
}

// ─── Animated code digit box ─────────────────────────────────────────────────

const CodeBox = ({
  digit,
  active,
  delay,
  revealed,
}: {
  digit: string;
  active?: boolean;    // join mode active box
  delay?: number;      // create mode stagger delay
  revealed?: boolean;  // create mode: animate in
}) => {
  const scale = useRef(new Animated.Value(revealed ? 0.4 : 1)).current;
  const rotateY = useRef(new Animated.Value(revealed ? 90 : 0)).current;

  useEffect(() => {
    if (revealed) {
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 10 }),
          Animated.timing(rotateY, { toValue: 0, duration: 260, useNativeDriver: true }),
        ]).start();
      }, delay ?? 0);
      return () => clearTimeout(t);
    }
  }, [revealed, delay, scale, rotateY]);

  if (revealed) {
    return (
      <Animated.View
        style={[
          styles.codeBox,
          styles.codeBoxFilled,
          { transform: [{ scale }] },
        ]}
      >
        <Text style={styles.codeBoxDigitWhite}>{digit}</Text>
      </Animated.View>
    );
  }

  // Join mode box
  return (
    <View
      style={[
        styles.codeBox,
        styles.codeBoxJoin,
        digit ? styles.codeBoxJoinFilled : undefined,
        active ? styles.codeBoxJoinActive : undefined,
      ]}
    >
      <Text style={styles.codeBoxDigitDark}>{digit}</Text>
    </View>
  );
};

// ─── Create mode body ─────────────────────────────────────────────────────────

const CreateBody = ({ onNext }: { onNext: () => void }) => (
  <>
    <View style={styles.heroBlock}>
      <View style={styles.heroCircle}>
        <Ionicons name="add-circle" size={48} color="#6366F1" />
      </View>
    </View>

    <View style={styles.bodyPad}>
      <Text style={styles.description}>
        Create a group to share business cards with multiple people at once. You'll become
        the admin and can control when to start sharing.
      </Text>

      <View style={styles.featureList}>
        <FeatureRow icon="people" text="Connect with multiple people" />
        <FeatureRow icon="card" text="Share multiple cards at once" />
        <FeatureRow icon="time" text="10-minute sharing session" />
      </View>
    </View>

    <View style={styles.footer}>
      <Pressable style={styles.primaryBtn} onPress={onNext}>
        <Text style={styles.primaryBtnText}>Next</Text>
      </Pressable>
    </View>
  </>
);

const FeatureRow = ({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) => (
  <View style={styles.featureRow}>
    <Ionicons name={icon} size={20} color="#10B981" />
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

// ─── Code display (create success) ────────────────────────────────────────────

const CodeDisplay = ({
  code,
  onAutoNext,
}: {
  code: string;
  onAutoNext: () => void;
}) => {
  useEffect(() => {
    const timer = setTimeout(onAutoNext, 2000);
    return () => clearTimeout(timer);
  }, [onAutoNext]);

  return (
    <View style={styles.bodyPad}>
      <Text style={styles.codeLabel}>Your Group Code</Text>

      <View style={styles.codeRow}>
        {code.split('').map((d, i) => (
          <CodeBox key={i} digit={d} revealed delay={i * 140} />
        ))}
      </View>

      <Text style={styles.codeHint}>
        Share this code with others to let them join your group
      </Text>

      <View style={styles.timerPill}>
        <Ionicons name="time-outline" size={15} color="#EF4444" />
        <Text style={styles.timerText}>Expires in 10 minutes</Text>
      </View>
    </View>
  );
};

// ─── Join mode body ───────────────────────────────────────────────────────────

const JoinBody = ({
  onJoin,
  joining,
  error,
}: {
  onJoin: (code: string) => Promise<void>;
  joining: boolean;
  error: string;
}) => {
  const [code, setCode] = useState('');
  const inputRef = useRef<TextInput>(null);

  const focusInput = () => inputRef.current?.focus();

  const disabled = joining || code.length !== 4;

  return (
    <>
      <View style={styles.heroBlock}>
        <View style={styles.heroCircle}>
          <Ionicons name="enter" size={48} color="#6366F1" />
        </View>
      </View>

      <View style={styles.bodyPad}>
        <Text style={styles.joinLabel}>Enter Group Code</Text>

        {/* Hidden real input */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(t) => {
            const numeric = t.replace(/\D/g, '').slice(0, 4);
            setCode(numeric);
          }}
          keyboardType="numeric"
          maxLength={4}
          style={styles.hiddenInput}
          autoCorrect={false}
        />

        {/* Visual code boxes */}
        <Pressable style={styles.codeRow} onPress={focusInput}>
          {Array.from({ length: 4 }).map((_, i) => (
            <CodeBox
              key={i}
              digit={code[i] ?? ''}
              active={i === code.length && code.length < 4}
            />
          ))}
        </Pressable>

        <Text style={styles.codeHint}>Tap the boxes above to enter code</Text>

        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.primaryBtn, disabled && styles.primaryBtnDisabled]}
          onPress={() => onJoin(code)}
          disabled={disabled}
        >
          {joining ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryBtnText}>Join Group</Text>
          )}
        </Pressable>
      </View>
    </>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function GroupSharingModal({
  visible,
  mode,
  onClose,
  onOpenConnection,
}: Props) {
  const { user } = useAuth();
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // create flow state
  const [createStep, setCreateStep] = useState<'info' | 'settings' | 'code'>('info');
  const [generatedCode, setGeneratedCode] = useState('');
  const [createdSession, setCreatedSession] = useState<GroupSession | null>(null);
  const [creating, setCreating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // join flow state
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Animate modal entrance
  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.9);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 14 }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  // Reset create state when opened fresh
  useEffect(() => {
    if (visible && mode === 'create') {
      setCreateStep('info');
      setGeneratedCode('');
      setCreatedSession(null);
      setShowSettings(false);
    }
  }, [visible, mode]);

  const handleClose = () => {
    setJoinError('');
    onClose();
  };

  // ── Create flow ─────────────────────────────────────────────────────────────

  const handleCreate = useCallback(
    async (participantSharing: boolean) => {
      if (!user) return;
      setCreating(true);
      try {
        const { session, code } = await createGroupSession(
          String(user.id),
          user.name ?? 'You',
          participantSharing,
        );
        setGeneratedCode(code);
        setCreatedSession(session);
        setShowSettings(false);
        setCreateStep('code');
        if (Platform.OS !== 'web') Vibration.vibrate(80);
      } catch {
        // ignore in mock
      } finally {
        setCreating(false);
      }
    },
    [user],
  );

  const handleAutoNext = useCallback(() => {
    if (createdSession) {
      onOpenConnection(createdSession);
    }
  }, [createdSession, onOpenConnection]);

  // ── Join flow ───────────────────────────────────────────────────────────────

  const handleJoin = useCallback(
    async (code: string) => {
      if (!user) return;
      if (code.length < 4) {
        setJoinError('Please enter a complete 4-digit code');
        return;
      }
      if (!/^\d{4}$/.test(code)) {
        setJoinError('Code must contain only numbers');
        return;
      }
      setJoinError('');
      setJoining(true);
      try {
        const { session } = await joinGroupSession(
          code,
          String(user.id),
          user.name ?? 'Guest',
        );
        if (Platform.OS !== 'web') Vibration.vibrate(60);
        setTimeout(() => onOpenConnection(session), 800);
      } catch (err: any) {
        setJoinError(mapJoinError(err));
        if (Platform.OS !== 'web') Vibration.vibrate([0, 60, 40, 60]);
      } finally {
        setJoining(false);
      }
    },
    [user, onOpenConnection],
  );

  const titleText = mode === 'create' ? 'Create Group Sharing' : 'Join Group Sharing';

  return (
    <>
      <Modal visible={visible} transparent animationType="none">
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.modal,
              { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
            ]}
          >
            {/* ── Header ─────────────────────────────────────────────── */}
            <View style={styles.header}>
              <Pressable onPress={handleClose} hitSlop={8} style={styles.headerBtn}>
                <Ionicons name="close" size={22} color="#111827" />
              </Pressable>
              <Text style={styles.title}>{titleText}</Text>
              <View style={styles.headerBtn} />
            </View>

            {/* ── Body ───────────────────────────────────────────────── */}
            {mode === 'create' && createStep === 'info' && (
              <CreateBody onNext={() => setShowSettings(true)} />
            )}
            {mode === 'create' && createStep === 'code' && (
              <CodeDisplay code={generatedCode} onAutoNext={handleAutoNext} />
            )}
            {mode === 'join' && (
              <JoinBody onJoin={handleJoin} joining={joining} error={joinError} />
            )}
          </Animated.View>
        </View>
      </Modal>

      {/* ── Settings modal (stacked on top) ─────────────────────────── */}
      <GroupSettingsModal
        visible={showSettings}
        onBack={() => setShowSettings(false)}
        onClose={() => {
          setShowSettings(false);
          handleClose();
        }}
        onCreate={handleCreate}
        creating={creating}
      />
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerBtn: {
    width: 32,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  // ── Hero ─────────────────────────────────────────────────────────────────
  heroBlock: {
    alignItems: 'center',
    paddingTop: 28,
  },
  heroCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ── Body ─────────────────────────────────────────────────────────────────
  bodyPad: {
    padding: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  featureList: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  // ── Code display ─────────────────────────────────────────────────────────
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  codeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  codeBox: {
    width: 60,
    height: 60,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxFilled: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  codeBoxJoin: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  codeBoxJoinFilled: {
    backgroundColor: '#F0F4FF',
  },
  codeBoxJoinActive: {
    borderColor: '#6366F1',
  },
  codeBoxDigitWhite: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  codeBoxDigitDark: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  codeHint: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 14,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 14,
  },
  timerText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '500',
  },
  // ── Join ─────────────────────────────────────────────────────────────────
  joinLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 18,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  // ── Footer ───────────────────────────────────────────────────────────────
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  primaryBtn: {
    height: 48,
    backgroundColor: '#6366F1',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
