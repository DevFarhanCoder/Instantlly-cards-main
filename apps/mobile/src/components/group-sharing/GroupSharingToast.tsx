/**
 * GroupSharingToast — a reusable, self-contained toast for the group-sharing flow.
 * Supports: info | success | warning | error
 * Usage:
 *   const { showToast, ToastRenderer } = useGroupToast();
 *   showToast('success', 'Joined group hosted by Alice');
 *   ...
 *   <ToastRenderer />
 */

import React, { useCallback, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastEntry {
  id: number;
  type: ToastType;
  message: string;
}

const typeConfig: Record<
  ToastType,
  { bg: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }
> = {
  info:    { bg: '#1F2937', icon: 'information-circle',  iconColor: '#60A5FA' },
  success: { bg: '#065F46', icon: 'checkmark-circle',    iconColor: '#34D399' },
  warning: { bg: '#92400E', icon: 'warning',             iconColor: '#FCD34D' },
  error:   { bg: '#7F1D1D', icon: 'close-circle',        iconColor: '#FCA5A5' },
};

// ─── Single animated toast item ───────────────────────────────────────────────

const ToastItem = ({
  entry,
  onDone,
}: {
  entry: ToastEntry;
  onDone: (id: number) => void;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;
  const cfg = typeConfig[entry.type];

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 14 }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -12, duration: 200, useNativeDriver: true }),
      ]).start(() => onDone(entry.id));
    }, 2800);
    return () => clearTimeout(timer);
  }, [entry.id, onDone, opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.toast,
        { backgroundColor: cfg.bg, opacity, transform: [{ translateY }] },
      ]}
    >
      <Ionicons name={cfg.icon} size={20} color={cfg.iconColor} style={styles.toastIcon} />
      <Text style={styles.toastText} numberOfLines={2}>
        {entry.message}
      </Text>
    </Animated.View>
  );
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

let _idCounter = 0;

export function useGroupToast() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++_idCounter;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastRenderer = useCallback(
    () => (
      <View style={styles.container} pointerEvents="none">
        {toasts.map((t) => (
          <ToastItem key={t.id} entry={t} onDone={removeToast} />
        ))}
      </View>
    ),
    [toasts, removeToast],
  );

  return { showToast, ToastRenderer };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
  },
  toastIcon: {
    marginRight: 10,
    flexShrink: 0,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});
