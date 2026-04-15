/**
 * GroupSharingFAB
 * Floating action button for the Group Sharing feature.
 *
 * - 56×56 indigo circular button in the lower-right corner
 * - Rotates to 45° when open
 * - Shows a small popup menu with "Create Group Sharing" and "Join Via Code"
 * - Dim dismissible overlay behind the menu
 * - Tooltip before first use
 *
 * Props:
 *   onCreate — open create modal
 *   onJoin   — open join modal
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onCreate: () => void;
  onJoin: () => void;
}

export default function GroupSharingFAB({ onCreate, onJoin }: Props) {
  const [open, setOpen] = useState(false);
  const [tooltipVisible, setTooltipVisible] = useState(true);

  const fabRotation = useRef(new Animated.Value(0)).current;
  const menuOpacity = useRef(new Animated.Value(0)).current;
  const menuTranslateY = useRef(new Animated.Value(12)).current;
  const menuScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (open) {
      setTooltipVisible(false);
      Animated.parallel([
        Animated.spring(fabRotation, { toValue: 1, useNativeDriver: true, damping: 12 }),
        Animated.timing(menuOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(menuTranslateY, { toValue: 0, useNativeDriver: true, damping: 14 }),
        Animated.spring(menuScale, { toValue: 1, useNativeDriver: true, damping: 14 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(fabRotation, { toValue: 0, useNativeDriver: true, damping: 12 }),
        Animated.timing(menuOpacity, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(menuTranslateY, { toValue: 12, duration: 140, useNativeDriver: true }),
        Animated.timing(menuScale, { toValue: 0.92, duration: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [open, fabRotation, menuOpacity, menuTranslateY, menuScale]);

  const rotate = fabRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  const handleCreate = () => {
    setOpen(false);
    onCreate();
  };

  const handleJoin = () => {
    setOpen(false);
    onJoin();
  };

  return (
    <>
      {/* ── Dim overlay ──────────────────────────────────────────────────── */}
      {open && (
        <Pressable style={styles.dimOverlay} onPress={() => setOpen(false)} />
      )}

      {/* ── Tooltip ─────────────────────────────────────────────────────── */}
      {tooltipVisible && !open && (
        <Pressable style={styles.tooltip} onPress={() => setTooltipVisible(false)}>
          <Text style={styles.tooltipText}>Share your cards with groups!</Text>
          <View style={styles.tooltipArrow} />
        </Pressable>
      )}

      {/* ── Popup menu ───────────────────────────────────────────────────── */}
      <Animated.View
        pointerEvents={open ? 'box-none' : 'none'}
        style={[
          styles.menu,
          {
            opacity: menuOpacity,
            transform: [{ translateY: menuTranslateY }, { scale: menuScale }],
          },
        ]}
      >
        <Pressable style={styles.menuItem} onPress={handleCreate} hitSlop={4}>
          <View style={[styles.menuIconBg, { backgroundColor: '#EEF2FF' }]}>
            <Ionicons name="people" size={18} color="#6366F1" />
          </View>
          <Text style={styles.menuLabel}>Create Group Sharing</Text>
        </Pressable>

        <View style={styles.menuDivider} />

        <Pressable style={styles.menuItem} onPress={handleJoin} hitSlop={4}>
          <View style={[styles.menuIconBg, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="enter" size={18} color="#10B981" />
          </View>
          <Text style={styles.menuLabel}>Join Via Code</Text>
        </Pressable>
      </Animated.View>

      {/* ── FAB ─────────────────────────────────────────────────────────── */}
      <Pressable style={styles.fab} onPress={() => setOpen((v) => !v)}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons name="people" size={26} color="#FFFFFF" />
        </Animated.View>
      </Pressable>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  dimOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 90,
  },
  tooltip: {
    position: 'absolute',
    bottom: 82,
    right: 68,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    zIndex: 91,
    maxWidth: 200,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -6,
    right: 14,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1F2937',
  },
  menu: {
    position: 'absolute',
    bottom: 76,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 220,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 100,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    minHeight: 48,
  },
  menuIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 100,
  },
});
