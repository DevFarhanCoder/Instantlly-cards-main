/**
 * GroupSettingsModal
 * Second step of the Create Group Sharing flow.
 * Shows sharing-permission options and a Create Group button.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useIconColor } from "../../theme/colors";

interface Props {
  visible: boolean;
  onBack: () => void;
  onClose: () => void;
  onCreate: (participantSharing: boolean) => Promise<void>;
  creating: boolean;
}

export default function GroupSettingsModal({
  visible,
  onBack,
  onClose,
  onCreate,
  creating,
}: Props) {
  const iconColor = useIconColor();
  const [participantSharing, setParticipantSharing] = useState(false);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* ── Header ─────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <Pressable onPress={onBack} hitSlop={8} style={styles.headerBtn}>
              <Ionicons name="arrow-back" size={22} color={iconColor} />
            </Pressable>
            <Text style={styles.title}>Group Settings</Text>
            <View style={styles.headerBtn} />
          </View>

          {/* ── Body ───────────────────────────────────────────────────── */}
          <View style={styles.body}>
            <View style={styles.card}>
              {/* Row header */}
              <View style={styles.cardHeader}>
                <Ionicons
                  name={participantSharing ? 'people' : 'shield-checkmark'}
                  size={22}
                  color="#6366F1"
                />
                <Text style={styles.cardTitle}>Sharing Permissions</Text>
              </View>

              {/* Option 1 */}
              <Pressable
                style={styles.radioRow}
                onPress={() => setParticipantSharing(false)}
              >
                <View style={styles.radioOuter}>
                  {!participantSharing && <View style={styles.radioInner} />}
                </View>
                <View style={styles.radioTextWrap}>
                  <Text style={styles.radioLabel}>Only admin shares cards</Text>
                  <Text style={styles.radioHint}>
                    Participants only exchange with admin
                  </Text>
                </View>
              </Pressable>

              {/* Option 2 */}
              <Pressable
                style={styles.radioRow}
                onPress={() => setParticipantSharing(true)}
              >
                <View style={styles.radioOuter}>
                  {participantSharing && <View style={styles.radioInner} />}
                </View>
                <View style={styles.radioTextWrap}>
                  <Text style={styles.radioLabel}>
                    Participants can share with each other
                  </Text>
                  <Text style={styles.radioHint}>
                    Everyone exchanges cards with everyone
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <View style={styles.footer}>
            <Pressable
              style={[styles.primaryBtn, creating && styles.primaryBtnDisabled]}
              onPress={() => onCreate(participantSharing)}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Group</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  body: {
    padding: 24,
  },
  card: {
    backgroundColor: '#F8F9FF',
    borderWidth: 1,
    borderColor: '#E0E4FF',
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
    flexShrink: 0,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366F1',
  },
  radioTextWrap: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  radioHint: {
    fontSize: 12,
    color: '#6B7280',
  },
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
