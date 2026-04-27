import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../hooks/useAuth';
import { useBusinessCards } from '../hooks/useBusinessCards';
import { API_URL } from '../store/api/baseApi';
import {
  useGetGroupDetailQuery,
  useGetGroupMessagesQuery,
  useGetGroupMediaQuery,
  useSendMessageRestMutation,
  useUpdateGroupMutation,
  useUploadChatImageMutation,
  type ChatMessage,
  type GroupDetail,
} from '../store/api/chatApi';
import { toast } from '../lib/toast';
import type { RootStackParamList } from '../navigation/routes';
import { useIconColor } from "../theme/colors";

type GroupChatRoute = RouteProp<RootStackParamList, 'GroupChat'>;

function parseSharedCardPayload(content: string): Record<string, any> | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === 'string') {
      return JSON.parse(parsed);
    }
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function extractSharedCardId(cardData: Record<string, any> | null): string | null {
  const iconColor = useIconColor();
  if (!cardData) return null;
  const explicitId = cardData.detail_id ?? cardData.route_id;
  if (explicitId !== null && explicitId !== undefined) {
    const normalizedExplicitId = String(explicitId).trim();
    if (normalizedExplicitId.length > 0) return normalizedExplicitId;
  }

  const rawId = cardData.card_id ?? cardData.business_card_id ?? cardData.id;
  if (rawId === null || rawId === undefined) return null;

  const normalized = String(rawId).trim();
  if (!normalized) return null;
  if (normalized.startsWith('card-') || normalized.startsWith('promo-')) {
    return normalized;
  }

  return `card-${normalized}`;
}

// ─── Card Picker Modal ────────────────────────────────────────────────────────

const CardPicker = ({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (card: any) => void;
}) => {
  const { cards = [], isLoading } = useBusinessCards() as any;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Share a Card</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color="#6B7280" />
            </Pressable>
          </View>
          {isLoading ? (
            <ActivityIndicator color="#6366F1" style={{ marginTop: 32 }} />
          ) : cards.length === 0 ? (
            <Text style={styles.pickerEmpty}>You have no cards yet.</Text>
          ) : (
            <FlatList
              data={cards}
              keyExtractor={(c: any) => String(c.id)}
              renderItem={({ item }: { item: any }) => (
                <Pressable style={styles.pickerRow} onPress={() => onSelect(item)}>
                  {item.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.pickerCardLogo} />
                  ) : (
                    <View style={[styles.pickerCardLogo, { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="card-outline" size={22} color="#6366F1" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pickerCardName} numberOfLines={1}>{item.full_name}</Text>
                    {item.company_name ? (
                      <Text style={styles.pickerCardSub} numberOfLines={1}>{item.company_name}</Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </Pressable>
              )}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Group Info Full Screen ───────────────────────────────────────────────────

const GroupInfoScreen = ({
  visible,
  onClose,
  detail,
  onWhatsApp,
  onCopyCode,
  groupId,
}: {
  visible: boolean;
  onClose: () => void;
  detail: GroupDetail | undefined;
  onWhatsApp: () => void;
  onCopyCode: () => void;
  groupId: number;
}) => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const [tab, setTab] = useState<'members' | 'media'>('members');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [updateGroup, { isLoading: updatingName }] = useUpdateGroupMutation();
  const { data: mediaData } = useGetGroupMediaQuery(groupId, { skip: !visible });

  const handleSaveName = async () => {
    if (!nameInput.trim() || nameInput.trim() === detail?.name) {
      setEditingName(false);
      return;
    }
    try {
      await updateGroup({ groupId, name: nameInput.trim() }).unwrap();
      setEditingName(false);
    } catch {
      toast.error('Failed to update group name');
    }
  };

  const images = useMemo(
    () => (mediaData?.media ?? []).filter((m) => m.messageType === 'image'),
    [mediaData]
  );
  const cards = useMemo(
    () => (mediaData?.media ?? []).filter((m) => m.messageType === 'card'),
    [mediaData]
  );

  const handleRequestClose = () => {
    if (editingName) {
      setEditingName(false);
      return;
    }
    onClose();
  };

  if (!detail) return null;
  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={handleRequestClose}>
      <SafeAreaView style={styles.infoContainer}>
        {/* Header */}
        <View style={styles.infoHeader}>
          <Pressable onPress={handleRequestClose} hitSlop={8} style={styles.infoBackBtn}>
            <Ionicons name="arrow-back" size={22} color={iconColor} />
          </Pressable>
          <Text style={styles.infoHeaderTitle}>Group Info</Text>
          {detail.myRole === 'admin' ? (
            <Pressable
              hitSlop={8}
              style={{ width: 36, alignItems: 'flex-end' }}
              onPress={() => { setNameInput(detail.name); setEditingName(true); }}
            >
              <Ionicons name="pencil-outline" size={20} color="#6366F1" />
            </Pressable>
          ) : (
            <View style={{ width: 36 }} />
          )}
        </View>

        {/* Group top */}
        <View style={styles.infoGroupTop}>
          <View style={styles.infoGroupIcon}>
            <Text style={styles.infoGroupIconText}>{detail.icon || String.fromCodePoint(0x1F465)}</Text>
          </View>
          {editingName ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={styles.editNameInput}
                value={nameInput}
                onChangeText={setNameInput}
                autoFocus
                maxLength={60}
                returnKeyType="done"
                onSubmitEditing={handleSaveName}
              />
              <Pressable onPress={handleSaveName} hitSlop={6}>
                {updatingName
                  ? <ActivityIndicator size="small" color="#6366F1" />
                  : <Ionicons name="checkmark-circle" size={26} color="#16A34A" />}
              </Pressable>
              <Pressable onPress={() => setEditingName(false)} hitSlop={6}>
                <Ionicons name="close-circle" size={26} color="#EF4444" />
              </Pressable>
            </View>
          ) : (
            <Text style={styles.infoGroupName}>{detail.name}</Text>
          )}
          {detail.description ? <Text style={styles.infoGroupDesc}>{detail.description}</Text> : null}
        </View>

        {/* Join code */}
        <View style={styles.infoSection}>
          <View style={styles.infoCodeBadge}>
            <Ionicons name="key-outline" size={16} color="#6366F1" />
            <Text style={styles.infoCodeText}>
              Join Code: <Text style={styles.infoCodeValue}>{detail.joinCode}</Text>
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.infoActions}>
          <Pressable style={styles.infoActionBtn} onPress={onCopyCode}>
            <View style={[styles.infoActionIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="copy-outline" size={22} color="#3B82F6" />
            </View>
            <Text style={styles.infoActionLabel}>Copy Code</Text>
          </Pressable>
          <Pressable style={styles.infoActionBtn} onPress={onWhatsApp}>
            <View style={[styles.infoActionIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="logo-whatsapp" size={22} color="#16A34A" />
            </View>
            <Text style={styles.infoActionLabel}>WhatsApp</Text>
          </Pressable>
        </View>

        {/* Tab bar: Members | Media */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tabBtn, tab === 'members' && styles.tabBtnActive]}
            onPress={() => setTab('members')}
          >
            <Text style={[styles.tabBtnText, tab === 'members' && styles.tabBtnTextActive]}>
              Members ({detail.members.length})
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabBtn, tab === 'media' && styles.tabBtnActive]}
            onPress={() => setTab('media')}
          >
            <Text style={[styles.tabBtnText, tab === 'media' && styles.tabBtnTextActive]}>
              Media ({images.length + cards.length})
            </Text>
          </Pressable>
        </View>

        {tab === 'members' ? (
          <ScrollView showsVerticalScrollIndicator={false}>
            {detail.members.map((member) => (
              <View key={member.id} style={styles.infoMemberRow}>
                <View style={styles.infoMemberAvatar}>
                  <Text style={styles.infoMemberAvatarLetter}>
                    {(member.name ?? '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.infoMemberInfo}>
                  <Text style={styles.infoMemberName}>{member.name}</Text>
                  <Text style={styles.infoMemberPhone}>{member.phone}</Text>
                </View>
                {member.role === 'admin' && (
                  <View style={styles.infoAdminBadge}>
                    <Text style={styles.infoAdminBadgeText}>Admin</Text>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            {/* Images grid */}
            {images.length > 0 && (
              <>
                <Text style={styles.mediaSectionTitle}>
                  <Ionicons name="image-outline" size={14} color="#6B7280" /> Photos ({images.length})
                </Text>
                <View style={styles.mediaGrid}>
                  {images.map((item) => (
                    <Image
                      key={item.id}
                      source={{ uri: item.content }}
                      style={styles.mediaThumb}
                      resizeMode="cover"
                    />
                  ))}
                </View>
              </>
            )}

            {/* Shared cards list */}
            {cards.length > 0 && (
              <>
                <Text style={[styles.mediaSectionTitle, { marginTop: images.length > 0 ? 20 : 0 }]}>
                  <Ionicons name="card-outline" size={14} color="#6B7280" /> Shared Cards ({cards.length})
                </Text>
                {cards.map((item) => {
                  const card = parseSharedCardPayload(item.content) ?? {};
                  const cardId = extractSharedCardId(card);

                  const handleOpenCard = () => {
                    if (!cardId) {
                      toast.error('Card details are unavailable for this message');
                      return;
                    }
                    navigation.navigate('PublicCard', { id: cardId });
                  };

                  return (
                    <Pressable key={item.id} style={styles.mediaCardRow} onPress={handleOpenCard}>
                      {card.logo_url ? (
                        <Image source={{ uri: card.logo_url }} style={styles.mediaCardLogo} />
                      ) : (
                        <View style={[styles.mediaCardLogo, { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }]}>
                          <Ionicons name="card-outline" size={20} color="#6366F1" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.mediaCardName} numberOfLines={1}>{card.full_name ?? 'Card'}</Text>
                        {card.company_name ? (
                          <Text style={styles.mediaCardSub} numberOfLines={1}>{card.company_name}</Text>
                        ) : null}
                        <Text style={styles.mediaCardMeta}>Shared by {item.senderName} · Tap to view</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            )}

            {images.length === 0 && cards.length === 0 && (
              <View style={{ alignItems: 'center', paddingTop: 40 }}>
                <Ionicons name="images-outline" size={48} color="#D1D5DB" />
                <Text style={{ color: '#9CA3AF', marginTop: 12, fontSize: 14 }}>No media shared yet</Text>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
};

// ─── Message Bubble ───────────────────────────────────────────────────────────

const Bubble = ({ msg, isMe }: { msg: ChatMessage; isMe: boolean }) => {
  const time = new Date(msg.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const isJoinViaLinkSystem = (msg.metadata as any)?.systemEvent === 'group_join_via_link';

  const navigation = useNavigation<any>();
  const cardData = msg.messageType === 'card' ? parseSharedCardPayload(msg.content) : null;
  const cardId = extractSharedCardId(cardData);

  const handleOpenCard = () => {
    if (!cardId) {
      toast.error('Card details are unavailable for this message');
      return;
    }
    navigation.navigate('PublicCard', { id: cardId });
  };

  if (isJoinViaLinkSystem) {
    return (
      <View style={styles.systemWrap}>
        <View style={styles.systemPill}>
          <Text style={styles.systemText}>{msg.content}</Text>
        </View>
        <Text style={styles.systemTime}>{time}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.bubbleWrap, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isMe && <Text style={styles.senderName}>{msg.sender?.name ?? 'Unknown'}</Text>}

      {msg.messageType === 'image' ? (
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem, { padding: 3 }]}>
          <Image
            source={{ uri: msg.content }}
            style={styles.bubbleImage}
            resizeMode="cover"
          />
        </View>
      ) : msg.messageType === 'card' && cardData ? (
        <Pressable style={[styles.bubble, styles.bubbleCard]} onPress={handleOpenCard}>
          <View style={styles.cardBubbleRow}>
            {cardData.logo_url ? (
              <Image source={{ uri: cardData.logo_url }} style={styles.cardBubbleLogo} />
            ) : (
              <View style={[styles.cardBubbleLogo, { backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="card-outline" size={18} color="#6366F1" />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.cardBubbleName} numberOfLines={1}>{cardData.full_name}</Text>
              {cardData.company_name ? (
                <Text style={styles.cardBubbleSub} numberOfLines={1}>{cardData.company_name}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.cardBubbleDivider} />
          <Text style={styles.cardBubbleTag}>Business Card · Tap to view</Text>
        </Pressable>
      ) : (
        <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
          <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.content}</Text>
        </View>
      )}

      <View style={[styles.timeRow, isMe && styles.timeRowRight]}>
        <Text style={[styles.timeLabel, isMe && styles.timeLabelRight]}>{time}</Text>
        {isMe ? (
          msg.isRead ? (
            <Ionicons name="checkmark-done" size={12} color="#93c5fd" style={styles.tickIcon} />
          ) : (
            <Ionicons name="checkmark" size={12} color="#dbeafe" style={styles.tickIcon} />
          )
        ) : null}
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function GroupChat() {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const route = useRoute<GroupChatRoute>();
  const { groupId, groupName } = route.params;
  const { user, accessToken } = useAuth() as any;

  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showCardPicker, setShowCardPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const { data: detail } = useGetGroupDetailQuery(groupId, { pollingInterval: 10000 });
  const { data, isLoading, refetch: refetchMessages } = useGetGroupMessagesQuery({ groupId }, { pollingInterval: 1500 });
  const [sendMessage] = useSendMessageRestMutation();
  const [uploadChatImage] = useUploadChatImageMutation();

  const messages = data?.messages ?? [];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const content = inputText.trim();
    if (!content || sending) return;
    setSending(true);
    setInputText('');
    try {
      await sendMessage({ groupId, content, messageType: 'text' }).unwrap();
      refetchMessages();
    } catch {
      setInputText(content);
    } finally {
      setSending(false);
    }
  }, [inputText, sending, groupId, sendMessage]);

  const handlePickImage = useCallback(async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow access to your photos to send images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsMultipleSelection: false,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingImage(true);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? `image-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      } as any);

      // Use raw fetch so React Native sets the multipart/form-data boundary correctly.
      // RTK's fetchBaseQuery can override/omit the boundary causing multer to reject the upload.
      const response = await fetch(`${API_URL}/api/uploads/chat-image`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      const { url } = await response.json();
      await sendMessage({ groupId, content: url, messageType: 'image' }).unwrap();
      refetchMessages();
    } catch (e: any) {
      console.error('[ImageUpload]', e?.message ?? e);
      toast.error('Failed to send image');
    } finally {
      setUploadingImage(false);
    }
  }, [groupId, accessToken, sendMessage, refetchMessages]);

  const handleSelectCard = useCallback(async (card: any) => {
    setShowCardPicker(false);
    setSending(true);
    try {
      const cardId = String(card.id).trim();
      const content = JSON.stringify({
        id: cardId,
        card_id: cardId,
        detail_id: `card-${cardId}`,
        full_name: card.full_name,
        company_name: card.company_name,
        logo_url: card.logo_url,
        phone: card.phone,
        email: card.email,
      });
      await sendMessage({ groupId, content, messageType: 'card' }).unwrap();
    } catch {
      toast.error('Failed to share card');
    } finally {
      setSending(false);
    }
  }, [groupId, sendMessage]);

  const handleCopyCode = useCallback(async () => {
    if (!detail) return;
    await Clipboard.setStringAsync(detail.joinCode);
    toast.success(`Code ${detail.joinCode} copied!`);
    setShowInfo(false);
  }, [detail]);

  const handleWhatsApp = useCallback(async () => {
    if (!detail) return;
    const inviteUrl = `${process.env.EXPO_PUBLIC_INVITE_URL || 'https://backend.instantllycards.com'}/invite/${detail.joinCode}`;
    const playStoreUrl = `https://play.google.com/store/apps/details?id=com.instantllycards.www.twa`;
    const text = `Join my group *"${detail.name}"* on *Instantlly Cards!* 📇\n\nTap to join directly:\n${inviteUrl}\n\nOr use join code *${detail.joinCode}* inside the app.\n\n📲 *Don't have the app? Download it free here:*\n${playStoreUrl}`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        toast.success('Opening WhatsApp...');
      } else {
        toast.error('WhatsApp is not installed');
      }
    } catch {
      toast.error('Failed to open WhatsApp');
    }
    setShowInfo(false);
  }, [detail]);

  const memberCount = detail?.members.length ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Pressable style={styles.header} onPress={() => setShowInfo(true)}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={iconColor} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{detail?.name ?? groupName}</Text>
          {memberCount > 0 && (
            <Text style={styles.headerSub}>{memberCount} members · tap for info</Text>
          )}
        </View>
        <Pressable onPress={() => setShowInfo(true)} hitSlop={8} style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={24} color="#6366F1" />
        </Pressable>
      </Pressable>

      {/* Messages */}
      {isLoading && messages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color="#6366F1" />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No messages yet. Say hi!</Text>
        </View>
      ) : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => String(m.id)}
          renderItem={({ item }) => (
            <Bubble msg={item} isMe={item.senderId === user?.id} />
          )}
          contentContainerStyle={styles.messagesList}
          onLayout={() => flatRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Upload indicator */}
      {uploadingImage && (
        <View style={styles.uploadingBanner}>
          <ActivityIndicator size="small" color="#6366F1" />
          <Text style={styles.uploadingText}>Uploading image…</Text>
        </View>
      )}

      {/* Input row */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.inputRow}>
          {/* Image picker */}
          <Pressable onPress={handlePickImage} hitSlop={6} style={styles.attachBtn} disabled={uploadingImage}>
            <Ionicons name="image-outline" size={22} color="#6366F1" />
          </Pressable>
          {/* Card share */}
          <Pressable onPress={() => setShowCardPicker(true)} hitSlop={6} style={styles.attachBtn}>
            <Ionicons name="card-outline" size={22} color="#6366F1" />
          </Pressable>

          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            multiline
            maxLength={1000}
          />
          <Pressable
            style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="send" size={18} color="#FFF" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <CardPicker
        visible={showCardPicker}
        onClose={() => setShowCardPicker(false)}
        onSelect={handleSelectCard}
      />

      <GroupInfoScreen
        visible={showInfo}
        onClose={() => setShowInfo(false)}
        detail={detail}
        onWhatsApp={handleWhatsApp}
        onCopyCode={handleCopyCode}
        groupId={groupId}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const MEDIA_COL = 3;
const THUMB_SIZE = 110;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Chat header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  backBtn: { width: 32, alignItems: 'flex-start' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#111827' },
  headerSub: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  infoBtn: { width: 32, alignItems: 'flex-end' },

  // Messages
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },

  // System messages
  systemWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    marginVertical: 6,
    maxWidth: '90%',
  },
  systemPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  systemText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    textAlign: 'center',
  },
  systemTime: {
    marginTop: 3,
    fontSize: 10,
    color: '#9CA3AF',
  },

  // Upload banner
  uploadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  uploadingText: { fontSize: 13, color: '#6366F1' },

  // Bubble
  bubbleWrap: { maxWidth: '80%', marginVertical: 2 },
  bubbleLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubbleRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  senderName: { fontSize: 11, color: '#6B7280', marginBottom: 2, marginLeft: 4 },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  bubbleMe: { backgroundColor: '#6366F1', borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#FFFFFF', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#E5E7EB' },
  bubbleText: { fontSize: 14, color: '#111827', lineHeight: 20 },
  bubbleTextMe: { color: '#FFFFFF' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2, marginLeft: 4 },
  timeRowRight: { marginLeft: 0, marginRight: 4 },
  timeLabel: { fontSize: 10, color: '#9CA3AF' },
  timeLabelRight: {},
  tickIcon: { marginTop: 1 },
  bubbleImage: { width: 200, height: 200, borderRadius: 13 },

  // Card bubble
  bubbleCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', borderBottomLeftRadius: 4, minWidth: 200 },
  cardBubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 8 },
  cardBubbleLogo: { width: 40, height: 40, borderRadius: 8 },
  cardBubbleName: { fontSize: 14, fontWeight: '700', color: '#111827' },
  cardBubbleSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  cardBubbleDivider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 6 },
  cardBubbleTag: { fontSize: 11, color: '#6366F1', fontWeight: '600' },

  // Input
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: 6,
  },
  attachBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#C7D2FE' },

  // Info full-screen
  infoContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  infoBackBtn: { width: 36, alignItems: 'flex-start' },
  infoHeaderTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827', textAlign: 'center' },
  infoGroupTop: { alignItems: 'center', paddingVertical: 24, paddingHorizontal: 24 },
  infoGroupIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  infoGroupIconText: { fontSize: 32 },
  infoGroupName: { fontSize: 19, fontWeight: '700', color: '#111827', textAlign: 'center' },
  infoGroupDesc: { fontSize: 13, color: '#6B7280', marginTop: 5, textAlign: 'center' },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginTop: 4 },
  editNameInput: { flex: 1, fontSize: 17, fontWeight: '700', color: '#111827', borderBottomWidth: 2, borderBottomColor: '#6366F1', paddingVertical: 4, textAlign: 'center' },
  infoSection: { paddingHorizontal: 20, marginBottom: 16 },
  infoCodeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  infoCodeText: { fontSize: 14, color: '#4B5563' },
  infoCodeValue: { fontWeight: '700', color: '#6366F1', letterSpacing: 2 },
  infoActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  infoActionBtn: { alignItems: 'center', gap: 8 },
  infoActionIcon: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  infoActionLabel: { fontSize: 12, color: '#374151', fontWeight: '500' },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginHorizontal: 20,
    marginBottom: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#6366F1' },
  tabBtnText: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },
  tabBtnTextActive: { color: '#6366F1', fontWeight: '700' },

  // Members
  infoMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  infoMemberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoMemberAvatarLetter: { fontSize: 16, fontWeight: '700', color: '#6366F1' },
  infoMemberInfo: { flex: 1 },
  infoMemberName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  infoMemberPhone: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  infoAdminBadge: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  infoAdminBadgeText: { fontSize: 11, fontWeight: '600', color: '#6366F1' },

  // Media tab
  mediaSectionTitle: { fontSize: 13, fontWeight: '600', color: '#6B7280', marginBottom: 10 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  mediaThumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: 6 },
  mediaCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  mediaCardLogo: { width: 44, height: 44, borderRadius: 8 },
  mediaCardName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  mediaCardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  mediaCardMeta: { fontSize: 11, color: '#9CA3AF', marginTop: 3 },

  // Card picker modal
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },
  pickerEmpty: { textAlign: 'center', color: '#9CA3AF', marginTop: 32, fontSize: 14 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  pickerCardLogo: { width: 44, height: 44, borderRadius: 8 },
  pickerCardName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  pickerCardSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
