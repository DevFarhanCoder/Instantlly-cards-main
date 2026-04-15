/**
 * GroupSharingSessionScreen
 * Full-screen modal for the active group-sharing card-selection session.
 *
 * States:
 *  - loading  : fetching user cards
 *  - empty    : no cards
 *  - select   : pick cards + mark default + share
 *  - complete : post-share completion state
 */

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useBusinessCards, type BusinessCardRow } from '../../hooks/useBusinessCards';
import { submitCards, endGroupSession, leaveGroupSession, type GroupSession } from '../../services/groupSharingService';
import { useGroupToast } from './GroupSharingToast';

interface Props {
  visible: boolean;
  session: GroupSession;
  onClose: () => void;
}

// ─── Card item ────────────────────────────────────────────────────────────────

const CardItem = ({
  card,
  selected,
  isDefault,
  onPress,
  onLongPress,
}: {
  card: BusinessCardRow;
  selected: boolean;
  isDefault: boolean;
  onPress: () => void;
  onLongPress: () => void;
}) => (
  <Pressable
    style={[styles.cardItem, selected && styles.cardItemSelected]}
    onPress={onPress}
    onLongPress={onLongPress}
    delayLongPress={400}
  >
    {/* Default badge */}
    {isDefault && (
      <View style={styles.defaultBadge}>
        <Text style={styles.defaultBadgeText}>DEFAULT</Text>
      </View>
    )}

    <View style={styles.cardRow}>
      {/* Avatar */}
      <View style={styles.cardAvatar}>
        <Text style={styles.cardAvatarLetter}>
          {(card.full_name ?? '?')[0].toUpperCase()}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <Text style={styles.cardName} numberOfLines={1}>{card.full_name}</Text>
        {!!card.job_title && (
          <Text style={styles.cardSub} numberOfLines={1}>{card.job_title}</Text>
        )}
        {!!card.company_name && (
          <Text style={styles.cardSub} numberOfLines={1}>{card.company_name}</Text>
        )}
      </View>

      {/* Checkmark */}
      {selected && (
        <View style={styles.checkCircle}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </View>
      )}
    </View>
  </Pressable>
);

// ─── Completion state ─────────────────────────────────────────────────────────

const CompletionView = ({
  isAdmin,
  selectedCount,
  participantCount,
  participantSharing,
  session,
  onCreateNewGroup,
  onQuit,
}: {
  isAdmin: boolean;
  selectedCount: number;
  participantCount: number;
  participantSharing: boolean;
  session: GroupSession;
  onCreateNewGroup: () => void;
  onQuit: () => void;
}) => (
  <View style={styles.completionWrap}>
    <View style={styles.completionIcon}>
      <Ionicons name="checkmark-circle" size={72} color="#10B981" />
    </View>

    {isAdmin ? (
      <>
        <Text style={styles.completionTitle}>Ready to Share!</Text>
        <Text style={styles.completionSub}>
          {selectedCount} cards from all participants ready to be shared
        </Text>
        <Text style={styles.completionExtra}>Choose how to share these cards:</Text>
      </>
    ) : (
      <>
        <Text style={styles.completionTitle}>Cards Ready!</Text>
        <Text style={styles.completionSub}>
          {selectedCount} cards marked. Waiting for admin.
        </Text>
      </>
    )}

    <View style={styles.completionActions}>
      {isAdmin && participantSharing && (
        <Pressable style={styles.createNewBtn} onPress={onCreateNewGroup}>
          <Ionicons name="people" size={18} color="#FFFFFF" />
          <Text style={styles.createNewBtnText}>Create New Group</Text>
        </Pressable>
      )}

      <Pressable style={styles.quitBtn} onPress={onQuit}>
        <Ionicons name="exit" size={18} color="#FFFFFF" />
        <Text style={styles.quitBtnText}>
          {isAdmin ? 'Quit Group Sharing' : 'Quit Sharing'}
        </Text>
      </Pressable>
    </View>
  </View>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function GroupSharingSessionScreen({
  visible,
  session,
  onClose,
}: Props) {
  const { user } = useAuth();
  const { showToast, ToastRenderer } = useGroupToast();
  const { cards, isLoading } = useBusinessCards() as any;

  const isAdmin = String(user?.id) === session.adminId;
  const participantCount = session.participants.length;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [defaultCardId, setDefaultCardId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<'select' | 'complete'>('select');

  const toggleCard = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        if (defaultCardId === id) setDefaultCardId(null);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const setDefault = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setDefaultCardId(id);
  };

  const handleShare = useCallback(async () => {
    if (selectedIds.size === 0) {
      showToast('warning', 'Please select at least one card to share');
      return;
    }
    setSubmitting(true);
    try {
      await submitCards(session.code, Array.from(selectedIds), defaultCardId);
      if (isAdmin) {
        showToast('success', 'Cards ready! Now choose: Create Group or Quit Sharing');
      } else {
        showToast('success', 'Cards ready! Waiting for admin to execute.');
      }
      setPhase('complete');
    } catch {
      showToast('error', 'Failed to submit cards. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [selectedIds, defaultCardId, session.code, isAdmin, showToast]);

  const handleQuit = useCallback(async () => {
    if (isAdmin) {
      await endGroupSession(session.code);
    } else {
      await leaveGroupSession(session.code, String(user?.id));
    }
    onClose();
  }, [isAdmin, session.code, user, onClose]);

  const handleCreateNewGroup = useCallback(async () => {
    // Finalize sharing into a real persistent group
    // In real impl: call backend to save all exchanged cards
    showToast('success', `Group created! Code: ${session.code}`);
    setTimeout(onClose, 1200);
  }, [session.code, showToast, onClose]);

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.safeArea}>
        {/* ── Header ───────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={onClose} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>
          <Text style={styles.headerTitle}>Group Sharing Session</Text>
          <View style={{ width: 40 }} />
        </View>

        {phase === 'select' && (
          <>
            {/* ── Top info ─────────────────────────────────────────────── */}
            <View style={styles.infoPanel}>
              <Text style={styles.infoTitle}>Select Cards to Share</Text>
              <Text style={styles.infoSub}>
                Tap to select, long press to set as default
              </Text>
              <View style={styles.statsRow}>
                <Text style={[styles.statChip, styles.statChipIndigo]}>
                  {selectedIds.size} selected
                </Text>
                <Text style={[styles.statChip, styles.statChipGreen]}>
                  {participantCount} participants
                </Text>
              </View>
            </View>

            {/* ── Card list ────────────────────────────────────────────── */}
            {isLoading ? (
              <View style={styles.centerState}>
                <ActivityIndicator color="#6366F1" />
                <Text style={styles.stateText}>Loading your cards...</Text>
              </View>
            ) : !cards || cards.length === 0 ? (
              <View style={styles.centerState}>
                <Ionicons name="card-outline" size={56} color="#D1D5DB" />
                <Text style={styles.stateTitle}>No Cards Yet</Text>
                <Text style={styles.stateText}>Create a card to get started</Text>
              </View>
            ) : (
              <ScrollView style={styles.cardsList} contentContainerStyle={styles.cardsContent}>
                {cards.map((card: BusinessCardRow) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    selected={selectedIds.has(card.id)}
                    isDefault={defaultCardId === card.id}
                    onPress={() => toggleCard(card.id)}
                    onLongPress={() => setDefault(card.id)}
                  />
                ))}
              </ScrollView>
            )}

            {/* ── Bottom action bar ─────────────────────────────────────── */}
            <View style={styles.actionBar}>
              <Pressable
                style={[
                  styles.shareBtn,
                  (selectedIds.size === 0 || submitting) && styles.shareBtnDisabled,
                ]}
                onPress={handleShare}
                disabled={selectedIds.size === 0 || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="share-social" size={20} color="#FFF" />
                    <Text style={styles.shareBtnText}>Share My Cards</Text>
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}

        {phase === 'complete' && (
          <CompletionView
            isAdmin={isAdmin}
            selectedCount={selectedIds.size}
            participantCount={participantCount}
            participantSharing={session.participantSharing}
            session={session}
            onCreateNewGroup={handleCreateNewGroup}
            onQuit={handleQuit}
          />
        )}

        <ToastRenderer />
      </SafeAreaView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  // Info panel
  infoPanel: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  infoSub: {
    fontSize: 13,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  statChip: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statChipIndigo: {
    backgroundColor: '#EEF2FF',
    color: '#6366F1',
  },
  statChipGreen: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  // Cards list
  cardsList: {
    flex: 1,
  },
  cardsContent: {
    padding: 16,
    gap: 10,
  },
  cardItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardItemSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#F0F4FF',
    shadowColor: '#6366F1',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  defaultBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardAvatarLetter: {
    fontSize: 22,
    fontWeight: '700',
    color: '#6366F1',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cardSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  // States
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 40,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
  },
  stateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Action bar
  actionBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 16,
  },
  shareBtn: {
    height: 56,
    backgroundColor: '#10B981',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  shareBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  // Completion
  completionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  completionIcon: {
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  completionSub: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  completionExtra: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 14,
    fontStyle: 'italic',
  },
  completionActions: {
    width: '100%',
    gap: 12,
    marginTop: 28,
  },
  createNewBtn: {
    backgroundColor: '#6366F1',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  createNewBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  quitBtn: {
    backgroundColor: '#EF4444',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  quitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
