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
  Image,
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
import { endGroupSession, leaveGroupSession, type GroupSession } from '../../services/groupSharingService';
import { useSendMessageRestMutation, useGetGroupMediaQuery, useStopGroupSharingMutation } from '../../store/api/chatApi';
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
  receivedCards,
  onCreateNewGroup,
  onQuit,
}: {
  isAdmin: boolean;
  selectedCount: number;
  participantCount: number;
  participantSharing: boolean;
  session: GroupSession;
  receivedCards: { id: number; content: string; senderName: string }[];
  onCreateNewGroup: () => void;
  onQuit: () => void;
}) => (
  <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.completionWrap}>
    <View style={styles.completionIcon}>
      <Ionicons name="checkmark-circle" size={72} color="#10B981" />
    </View>

    {isAdmin ? (
      <>
        <Text style={styles.completionTitle}>Ready to Share!</Text>
        <Text style={styles.completionSub}>
          {selectedCount} cards from all participants ready to be shared
        </Text>
        <Text style={styles.completionExtra}>{receivedCards.length} cards received so far</Text>
        <Text style={styles.completionExtra}>Choose how to share these cards:</Text>
      </>
    ) : (
      <>
        <Text style={styles.completionTitle}>Cards Ready!</Text>
        <Text style={styles.completionSub}>
          {selectedCount} cards marked. Waiting for admin.
        </Text>
        <Text style={styles.completionExtra}>{receivedCards.length} cards received so far</Text>
      </>
    )}

    {receivedCards.length > 0 && (
      <ScrollView style={styles.completionReceivedList} contentContainerStyle={styles.completionReceivedContent}>
        {receivedCards.map((item) => {
          let card: any = {};
          try { card = JSON.parse(item.content); } catch {}
          return (
            <View key={item.id} style={styles.receivedCard}>
              {card.logo_url ? (
                <Image source={{ uri: card.logo_url }} style={styles.receivedLogo} />
              ) : (
                <View style={[styles.receivedLogo, { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="card-outline" size={22} color="#6366F1" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.receivedName} numberOfLines={1}>{card.full_name ?? 'Card'}</Text>
                {card.company_name ? <Text style={styles.receivedSub} numberOfLines={1}>{card.company_name}</Text> : null}
                <Text style={styles.receivedMeta}>Shared by {item.senderName}</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
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
  </ScrollView>
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

  const groupId = Number(session.sessionId);
  const isAdmin = String(user?.id) === session.adminId;
  const participantCount = session.participants.length;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [defaultCardId, setDefaultCardId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<'select' | 'complete'>('select');
  const [activeTab, setActiveTab] = useState<'share' | 'received'>('share');

  // Received cards from the group
  const { data: mediaData, refetch: refetchMedia } = useGetGroupMediaQuery(groupId, { skip: !groupId, pollingInterval: 3000 });
  const receivedCards = (mediaData?.media ?? []).filter((m) => m.messageType === 'card' && m.senderId !== user?.id);

  const [sendMessage] = useSendMessageRestMutation();
  const [stopGroupSharing] = useStopGroupSharingMutation();

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
      const selectedCards = (cards as BusinessCardRow[]).filter((c) => selectedIds.has(c.id));
      // Send each selected card as a card message to the group
      const results = await Promise.allSettled(
        selectedCards.map((card) =>
          sendMessage({
            groupId,
            content: JSON.stringify({
              id: card.id,
              full_name: card.full_name,
              company_name: card.company_name,
              job_title: card.job_title,
              phone: card.phone,
              email: card.email,
              logo_url: card.logo_url,
            }),
            messageType: 'card',
          }).unwrap()
        )
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      if (succeeded > 0) {
        showToast('success', `${succeeded} card${succeeded > 1 ? 's' : ''} shared with the group!`);
      }
      if (failed > 0) {
        console.warn('Some cards failed to share:', results.filter((r) => r.status === 'rejected'));
      }
      // Always move to completion so the user can quit
      setActiveTab('received');
      refetchMedia();
      setPhase('complete');
    } catch (err) {
      console.error('handleShare unexpected error:', err);
      showToast('error', 'Failed to share cards. Please try again.');
      // Still move to completion so user can quit
      setPhase('complete');
    } finally {
      setSubmitting(false);
    }
  }, [selectedIds, cards, groupId, sendMessage, showToast, refetchMedia]);

  const handleQuit = useCallback(async () => {
    if (isAdmin) {
      try {
        await stopGroupSharing(groupId).unwrap();
      } catch {
        // Fallback to local mock cleanup if API fails
        await endGroupSession(session.code);
      }
    } else {
      await leaveGroupSession(session.code, String(user?.id));
    }
    onClose();
  }, [isAdmin, groupId, session.code, stopGroupSharing, user, onClose]);

  const handleCreateNewGroup = useCallback(async () => {
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

        {/* ── Tab bar ──────────────────────────────────────────────────── */}
        {phase === 'select' && (
          <View style={styles.tabRow}>
            <Pressable
              style={[styles.tabBtn, activeTab === 'share' && styles.tabBtnActive]}
              onPress={() => setActiveTab('share')}
            >
              <Ionicons name="card-outline" size={16} color={activeTab === 'share' ? '#6366F1' : '#6B7280'} />
              <Text style={[styles.tabBtnText, activeTab === 'share' && styles.tabBtnTextActive]}>
                Share ({selectedIds.size} selected)
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabBtn, activeTab === 'received' && styles.tabBtnActive]}
              onPress={() => setActiveTab('received')}
            >
              <Ionicons name="people-outline" size={16} color={activeTab === 'received' ? '#6366F1' : '#6B7280'} />
              <Text style={[styles.tabBtnText, activeTab === 'received' && styles.tabBtnTextActive]}>
                Received ({receivedCards.length})
              </Text>
            </Pressable>
          </View>
        )}

        {phase === 'select' && activeTab === 'share' && (
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

        {phase === 'select' && activeTab === 'received' && (
          <>
            <ScrollView style={styles.cardsList} contentContainerStyle={[styles.cardsContent, { paddingBottom: 32 }]}>
              {receivedCards.length === 0 ? (
                <View style={styles.centerState}>
                  <Ionicons name="people-outline" size={56} color="#D1D5DB" />
                  <Text style={styles.stateTitle}>No Cards Yet</Text>
                  <Text style={styles.stateText}>Cards shared by others will appear here</Text>
                </View>
              ) : (
                receivedCards.map((item) => {
                  let card: any = {};
                  try { card = JSON.parse(item.content); } catch {}
                  return (
                    <View key={item.id} style={styles.receivedCard}>
                      {card.logo_url ? (
                        <Image source={{ uri: card.logo_url }} style={styles.receivedLogo} />
                      ) : (
                        <View style={[styles.receivedLogo, { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="card-outline" size={22} color="#6366F1" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.receivedName} numberOfLines={1}>{card.full_name ?? 'Card'}</Text>
                        {card.company_name ? <Text style={styles.receivedSub} numberOfLines={1}>{card.company_name}</Text> : null}
                        {card.phone ? <Text style={styles.receivedSub} numberOfLines={1}>{card.phone}</Text> : null}
                        <Text style={styles.receivedMeta}>Shared by {item.senderName}</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Quit button always available on received tab */}
            <View style={styles.actionBar}>
              <Pressable style={styles.quitBtn} onPress={handleQuit}>
                <Ionicons name="exit" size={18} color="#FFFFFF" />
                <Text style={styles.quitBtnText}>
                  {isAdmin ? 'Quit Group Sharing' : 'Quit Sharing'}
                </Text>
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
            receivedCards={receivedCards}
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
  // Tab bar
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#6366F1',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#6366F1',
  },
  // Received cards
  receivedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  receivedLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  receivedName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  receivedSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  receivedMeta: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
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
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    paddingBottom: 48,
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
  completionReceivedList: {
    width: '100%',
    maxHeight: 220,
    marginBottom: 20,
  },
  completionReceivedContent: {
    gap: 10,
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
