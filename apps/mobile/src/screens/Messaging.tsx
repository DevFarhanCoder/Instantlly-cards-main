import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ArrowLeft,
  Bell,
  Bot,
  Check,
  CheckCheck,
  MessageCircle,
  Phone,
  PhoneOff,
  Send,
  Sparkles,
  Lock,
} from "lucide-react-native";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { toast } from "../lib/toast";
import { useAuth } from "../hooks/useAuth";
import {
  useConversationMessages,
  useConversations,
  useCreateConversation,
  useSendMessage,
  type DbConversation,
  type DbMessage,
} from "../hooks/useMessages";
import * as Contacts from "expo-contacts";
import { usePushNotifications } from "../contexts/PushNotificationContext";
import { getBulkSentCards, type SentCardRecord } from "../components/BulkSendModal";
import { FEATURES } from "../lib/featureFlags";
import { useGetSharedCardsQuery } from "../store/api/businessCardsApi";
import { useGetGroupsQuery, type GroupInfo } from "../store/api/chatApi";
import { useMatchContactsMutation, type AppUser } from "../store/api/usersApi";
import { socketService, type MessagePayload } from "../services/socketService";

const demoReceivedCards: never[] = [];

type DeviceContact = {
  name: string;
  phone: string;
};

function normalizePhone(raw: string): string {
  const digits = String(raw).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function getGroupPreviewText(group: GroupInfo): string {
  const message = group.lastMessage;
  if (!message) {
    return `${group.memberCount} members · Code: ${group.joinCode}`;
  }

  const senderPrefix = message.senderName ? `${message.senderName}: ` : "";
  const raw = String(message.content ?? "").trim();

  if (!raw) {
    return `${senderPrefix}Sent a message`;
  }

  const isLikelyJson = raw.startsWith("{") || raw.startsWith("[");
  if (isLikelyJson) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const fullName = typeof parsed.full_name === "string" ? parsed.full_name.trim() : "";
      const companyName = typeof parsed.company_name === "string" ? parsed.company_name.trim() : "";

      if (fullName || companyName) {
        const cardLabel = fullName || companyName;
        return `${senderPrefix}Shared card: ${cardLabel}`;
      }

      return `${senderPrefix}Shared a card`;
    } catch {
      // Keep raw text when payload is not valid JSON.
    }
  }

  const isImageUrl = /^https?:\/\/.+\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(raw);
  if (isImageUrl) {
    return `${senderPrefix}Sent an image`;
  }

  return `${senderPrefix}${raw}`;
}

function parseSharedCardPayload(content: string): Record<string, any> | null {
  if (!content) return null;
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed === "string") {
      return JSON.parse(parsed);
    }
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function extractSharedCardId(cardData: Record<string, any> | null): string | null {
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
  if (normalized.startsWith("card-") || normalized.startsWith("promo-")) {
    return normalized;
  }
  return `card-${normalized}`;
}

const GroupsTab = () => {
  const navigation = useNavigation<any>();
  const { data: groups = [], isLoading } = useGetGroupsQuery(undefined, {
    pollingInterval: 5000,
    refetchOnMountOrArgChange: true,
  });

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center pt-24">
        <Text className="text-sm text-muted-foreground">Loading groups...</Text>
      </View>
    );
  }

  if (groups.length === 0) {
    return (
      <View className="flex-1 items-center justify-center px-6 pt-24">
        <View className="mb-6 h-24 w-24 items-center justify-center rounded-3xl bg-muted">
          <MessageCircle size={28} color="#6a7181" />
        </View>
        <Text className="text-lg font-bold text-foreground">No groups yet</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          Create a group from your card to share with multiple people at once
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="px-4 pt-3"
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <View className="gap-1">
        {groups.map((group: GroupInfo) => (
          <Pressable
            key={group.id}
            className="flex-row items-center gap-3 rounded-xl px-3 py-3"
            onPress={() => navigation.navigate('GroupChat', { groupId: group.id, groupName: group.name })}
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Text className="text-lg">{group.icon || '👥'}</Text>
            </View>
            <View className="flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                  {group.name}
                </Text>
                {group.lastMessageTime ? (
                  <Text className="text-[10px] text-muted-foreground">
                    {new Date(group.lastMessageTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                  </Text>
                ) : null}
              </View>
              <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                {getGroupPreviewText(group)}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

const SentReceivedCards = ({ tab }: { tab: string }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [sentCards, setSentCards] = useState<SentCardRecord[]>([]);

  const getSharedCardTargetId = (card: any): string | null => {
    const explicitId = card?.detail_id ?? card?.route_id;
    if (explicitId !== null && explicitId !== undefined) {
      const normalizedExplicitId = String(explicitId).trim();
      if (normalizedExplicitId.length > 0) return normalizedExplicitId;
    }

    const rawId = card?.card_id ?? card?.business_card_id ?? card?.id;
    if (rawId === null || rawId === undefined) return null;
    const normalized = String(rawId).trim();
    if (!normalized) return null;
    if (normalized.startsWith("card-") || normalized.startsWith("promo-")) {
      return normalized;
    }
    return `card-${normalized}`;
  };

  const openCardDetails = (card: any) => {
    const cardId = getSharedCardTargetId(card);
    if (!cardId) {
      toast.error("Card details are unavailable for this item");
      return;
    }
    navigation.navigate("PublicCard", { id: cardId });
  };

  // Real sent + received cards from API (SharedCard)
  const { data: sharedCards = [], isLoading: sharedLoading } = useGetSharedCardsQuery(undefined, {
    skip: tab !== "Received" && tab !== "Sent",
    pollingInterval: 3000,        // poll every 3s as socket fallback
    refetchOnMountOrArgChange: true, // refetch each time the tab is opened
  });
  const myUserId = String(user?.id ?? "");
  const receivedCards = sharedCards.filter((s: any) => s.recipient_id === myUserId);
  const sentIndividualCards = sharedCards.filter((s: any) => s.sender_id === myUserId);

  useEffect(() => {
    if (tab === "Sent" && FEATURES.BULK_SEND) getBulkSentCards().then(setSentCards);
  }, [tab]);

  if (tab === "Received") {
    return (
      <ScrollView
        className="px-4 pt-4"
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          📥 Cards Shared With You
        </Text>
        {sharedLoading ? (
          <View className="items-center py-12">
            <Text className="text-sm text-muted-foreground">Loading...</Text>
          </View>
        ) : receivedCards.length === 0 ? (
          <View className="items-center py-12">
            <Text className="text-4xl mb-3">📭</Text>
            <Text className="text-sm font-semibold text-foreground">No cards received yet</Text>
            <Text className="text-xs text-muted-foreground text-center mt-1 max-w-[220px]">
              When someone bulk-sends their card to your category, it will appear here.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            {receivedCards.map((card: any) => (
              <Pressable
                key={card.id}
                className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
                onPress={() => openCardDetails(card)}
              >
                <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                  {card.card_photo ? (
                    <Image source={{ uri: card.card_photo }} style={{ width: 44, height: 44 }} />
                  ) : (
                    <Text className="text-xl">🏢</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                    From: {card.sender_name}
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-muted-foreground" numberOfLines={1}>
                    {card.card_title}
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatRelativeTime(card.sent_at || card.created_at)}
                  </Text>
                </View>
                <Text className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  View
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    );
  }

  // Sent tab — bulk-sent (AsyncStorage) + individual in-app shares (API)
  return (
    <ScrollView
      className="px-4 pt-4"
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      {/* Individual in-app shares */}
      {(sharedLoading || sentIndividualCards.length > 0) && (
        <>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            📲 Sent Within App
          </Text>
          {sharedLoading ? (
            <View className="items-center py-6">
              <Text className="text-sm text-muted-foreground">Loading...</Text>
            </View>
          ) : (
            <View className="gap-3 mb-4">
              {sentIndividualCards.map((card: any) => (
                <Pressable
                  key={card.id}
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
                  onPress={() => openCardDetails(card)}
                >
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                    {card.card_photo ? (
                      <Image source={{ uri: card.card_photo }} style={{ width: 44, height: 44 }} />
                    ) : (
                      <Text className="text-xl">🏢</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                      To: {card.recipient_name}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-muted-foreground" numberOfLines={1}>
                      {card.card_title}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatRelativeTime(card.sent_at || card.created_at)}
                    </Text>
                  </View>
                  <Text className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                    Sent
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}

      {/* Bulk-sent cards — gated by BULK_SEND feature flag */}
      {FEATURES.BULK_SEND && (
        <>
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            📤 Cards You've Bulk Sent
          </Text>
          {sentCards.length === 0 ? (
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">📤</Text>
              <Text className="text-sm font-semibold text-foreground">No cards sent yet</Text>
              <Text className="text-xs text-muted-foreground text-center mt-1 max-w-[220px]">
                Use the Bulk Send button to send your business cards to categories.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {sentCards.map((record) => (
                <Pressable
                  key={record.id}
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
                  onPress={() => openCardDetails(record)}
                >
                  <View className="h-11 w-11 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                    {record.cardLogo ? (
                      <Image source={{ uri: record.cardLogo }} style={{ width: 44, height: 44 }} />
                    ) : (
                      <Text className="text-xl">🏢</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                      To: {record.sentToEmoji} {record.sentTo}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-muted-foreground" numberOfLines={1}>
                      {record.cardName}{record.cardCategory ? ` · ${record.cardCategory}` : ""}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-muted-foreground">
                      {record.levelLabel ? `${record.levelLabel} level · ` : ""}{formatRelativeTime(record.sentAt)}
                    </Text>
                  </View>
                  <Text className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                    Sent
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const demoConversations = [
  { id: "demo-1", name: "Sharma Electronics", avatar: "🔌", lastMsg: "Hi! We have the latest smartphones in stock. Visit us today!", time: "2m ago" },
  { id: "demo-2", name: "Green Farms Organic", avatar: "🌿", lastMsg: "Your order of organic vegetables is ready for delivery!", time: "15m ago" },
  { id: "demo-3", name: "StyleCraft Salon", avatar: "💇", lastMsg: "Your appointment for tomorrow at 3 PM is confirmed.", time: "1h ago" },
  { id: "demo-4", name: "FitZone Gym", avatar: "💪", lastMsg: "Welcome! Your first month is 50% off. Come check us out!", time: "3h ago" },
  { id: "demo-5", name: "Delhi Darbar Restaurant", avatar: "🍽️", lastMsg: "Thank you for your order! Your food will be ready in 30 mins.", time: "5h ago" },
];

const tabs = FEATURES.BULK_SEND
  ? ["Chats", "Groups", "Sent", "Received"]
  : ["Chats", "Groups", "Sent", "Received"];

const faqKnowledge: Record<string, { q: string; a: string }[]> = {
  default: [
    { q: "hours|timing|open|close|when", a: "We're open Monday–Saturday, 9 AM to 7 PM. Closed on Sundays and public holidays." },
    { q: "price|cost|charge|rate|fee", a: "Our pricing varies by service. Would you like me to share our rate card? You can also check our offers section for current discounts!" },
    { q: "location|address|where|direction|find", a: "You can find our exact location on the business card. Tap the 'Map' button to get directions via Google Maps." },
    { q: "book|appointment|schedule|slot|visit", a: "You can book an appointment directly through the app! Tap the 'Book' button on our business card to choose instant or scheduled booking." },
    { q: "offer|discount|deal|promo|coupon", a: "Check the 'Vouchers' section for our latest deals! We regularly update our offers there." },
    { q: "cancel|refund|return", a: "For cancellations, please contact us at least 2 hours before your appointment. Refunds are processed within 3-5 business days." },
    { q: "payment|pay|upi|card|cash", a: "We accept all payment methods — UPI, credit/debit cards, and cash. All payments go directly to us, no middlemen!" },
    { q: "hi|hello|hey|good morning|good evening", a: "Hello! 👋 Welcome! How can I help you today? Feel free to ask about our services, pricing, or booking an appointment." },
    { q: "thank|thanks|thx", a: "You're welcome! 😊 Is there anything else I can help you with?" },
  ],
};

function getAIReply(userMessage: string): string | null {
  const msg = userMessage.toLowerCase().trim();
  const faqs = faqKnowledge.default;
  for (const faq of faqs) {
    const keywords = faq.q.split("|");
    if (keywords.some((k) => msg.includes(k))) return faq.a;
  }
  if (msg.length > 5) {
    return "Thanks for your message! Our team will get back to you shortly. Meanwhile, you can check our business card for services, pricing, and booking options. 📇";
  }
  return null;
}

const TypingDot = ({ delay = 0 }: { delay?: number }) => {
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.6, duration: 300, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delay, scale]);

  return (
    <Animated.View
      style={{ transform: [{ scale }] }}
      className="h-2 w-2 rounded-full bg-primary/40"
    />
  );
};

const StartChatModal = ({
  visible,
  onClose,
  onStartChat,
}: {
  visible: boolean;
  onClose: () => void;
  onStartChat: (user: AppUser) => Promise<void>;
}) => {
  const [allContacts, setAllContacts] = useState<DeviceContact[]>([]);
  const [appUserMap, setAppUserMap] = useState<Map<string, AppUser>>(new Map());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [matchContacts] = useMatchContactsMutation();

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        toast.error("Contacts permission denied");
        onClose();
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      const seen = new Set<string>();
      const contacts: DeviceContact[] = [];
      for (const c of data) {
        const name = c.name ?? "";
        for (const p of c.phoneNumbers ?? []) {
          const phone = normalizePhone(p.number ?? "");
          if (phone.length >= 7 && !seen.has(phone)) {
            seen.add(phone);
            contacts.push({ name, phone });
          }
        }
      }

      setAllContacts(contacts);

      if (contacts.length > 0) {
        const matched = await matchContacts({ phones: contacts.map((c) => c.phone) }).unwrap();
        const map = new Map<string, AppUser>();
        for (const u of matched) {
          map.set(normalizePhone(u.phone), u);
        }
        setAppUserMap(map);
      }
    } catch {
      toast.error("Failed to load contacts");
      setAppUserMap(new Map());
    } finally {
      setLoading(false);
    }
  }, [matchContacts, onClose]);

  useEffect(() => {
    if (!visible) return;
    setSearch("");
    loadContacts();
  }, [visible, loadContacts]);

  const list = useMemo(() => {
    return allContacts
      .filter((c) => {
        if (!search) return true;
        return c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search);
      })
      .sort((a, b) => {
        const aIsApp = appUserMap.has(a.phone);
        const bIsApp = appUserMap.has(b.phone);
        if (aIsApp && !bIsApp) return -1;
        if (!aIsApp && bIsApp) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [allContacts, appUserMap, search]);

  const handleInvite = (contact: DeviceContact) => {
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://instantlly.lovable.app";
    const msg = `Hey! I'm using Instantlly Cards. Join me here: ${webUrl}`;
    Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent(msg)}`).catch(() =>
      Linking.openURL(`whatsapp://send?phone=${contact.phone}&text=${encodeURIComponent(msg)}`)
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-card px-4 pt-12 pb-4 flex-row items-center gap-3">
          <Pressable onPress={onClose} className="p-1">
            <ArrowLeft size={20} color="#111827" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">Start New Chat</Text>
            <Text className="text-xs text-muted-foreground">Select contact to chat or invite</Text>
          </View>
        </View>

        <View className="px-4 pt-3 pb-2">
          <TextInput
            placeholder="Search contacts..."
            className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground"
            placeholderTextColor="#6a7181"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator color="#2463eb" />
            <Text className="text-sm text-muted-foreground">Loading contacts...</Text>
          </View>
        ) : list.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-sm font-semibold text-foreground">No contacts found</Text>
          </View>
        ) : (
          <ScrollView className="px-4 pt-2 pb-4">
            <View className="gap-2">
              {list.map((item: DeviceContact) => {
                const appUser = appUserMap.get(item.phone);
                const isAppUser = !!appUser;
                return (
                  <View
                    key={`${item.phone}-${item.name}`}
                    className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                      isAppUser ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                      {appUser?.profile_picture ? (
                        <Image source={{ uri: appUser.profile_picture }} style={{ width: 44, height: 44 }} />
                      ) : (
                        <Text className="text-lg font-bold text-primary">{(item.name || item.phone)[0].toUpperCase()}</Text>
                      )}
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                        {item.name || item.phone}
                      </Text>
                      <Text className="text-xs text-muted-foreground">{item.phone}</Text>
                    </View>

                    {isAppUser && appUser ? (
                      <Button
                        size="sm"
                        className="rounded-lg"
                        onPress={async () => {
                          await onStartChat(appUser);
                          onClose();
                        }}
                      >
                        <Text className="text-xs font-semibold text-white">Chat</Text>
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-lg" onPress={() => handleInvite(item)}>
                        <Text className="text-xs font-semibold text-muted-foreground">Invite</Text>
                      </Button>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const Messaging = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { permission, requestPermission, sendPushNotification } = usePushNotifications();

  const [activeTab, setActiveTab] = useState("Chats");
  const [selectedConv, setSelectedConv] = useState<DbConversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const [showStartChatModal, setShowStartChatModal] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<DbMessage[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const callIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tabSwipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          setActiveTab((prev) => {
            const i = tabs.indexOf(prev);
            return i < tabs.length - 1 ? tabs[i + 1] : prev;
          });
        } else if (g.dx > 50) {
          setActiveTab((prev) => {
            const i = tabs.indexOf(prev);
            return i > 0 ? tabs[i - 1] : prev;
          });
        }
      },
    })
  ).current;

  const conversationsQuery = useConversations();
  const messagesQuery = useConversationMessages(selectedConv?.id || null);
  const sendMessageMutation = useSendMessage();
  const createConversationMutation = useCreateConversation();

  const conversations = conversationsQuery.data ?? [];
  const dbMessages = messagesQuery.data ?? [];
  const combinedMessages = useMemo(() => {
    if (!selectedConv) return dbMessages;

    const optimisticForChat = optimisticMessages.filter(
      (m) => m.conversation_id === selectedConv.id
    );

    if (optimisticForChat.length === 0) return dbMessages;

    const merged = [...dbMessages, ...optimisticForChat];
    const byId = new Map<string, DbMessage>();
    for (const msg of merged) {
      byId.set(msg.id, msg);
    }
    return Array.from(byId.values()).sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [dbMessages, optimisticMessages, selectedConv]);

  useEffect(() => {
    setOptimisticMessages([]);
  }, [selectedConv?.id]);

  useEffect(() => {
    if (!user) return;

    socketService.connect().catch(() => {
      // Non-blocking: polling still works if socket is unavailable.
    });

    const onNewMessage = (msg: MessagePayload) => {
      // Keep chat list fresh as soon as a new DM arrives.
      conversationsQuery.refetch();

      // If currently inside this chat, refresh message timeline immediately.
      if (selectedConv?.id && msg.chatId && String(msg.chatId) === selectedConv.id) {
        messagesQuery.refetch();
      }
    };

    const onMessagesRead = (data: { chatId: number; readBy: number; readAt: string }) => {
      if (selectedConv?.id && String(data.chatId) === selectedConv.id) {
        messagesQuery.refetch();
      }
      conversationsQuery.refetch();
    };

    socketService.on("new_message", onNewMessage);
    socketService.on("messages_read", onMessagesRead);

    return () => {
      socketService.off("new_message", onNewMessage);
      socketService.off("messages_read", onMessagesRead);
    };
  }, [user, selectedConv?.id, conversationsQuery, messagesQuery]);

  useEffect(() => {
    if (!selectedConv?.id) return;
    const chatId = Number(selectedConv.id);
    if (Number.isNaN(chatId)) return;

    socketService.markRead({ chatId });
  }, [selectedConv?.id]);

  useEffect(() => {
    if (navigation.isFocused()) {
      navigation.setParams({ hideAdBar: !!selectedConv });
    }
  }, [navigation, selectedConv]);

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [combinedMessages, scrollToBottom]);

  useEffect(() => {
    if (callActive) {
      callIntervalRef.current = setInterval(() => setCallTimer((t) => t + 1), 1000);
    } else {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
      setCallTimer(0);
    }
    return () => {
      if (callIntervalRef.current) clearInterval(callIntervalRef.current);
    };
  }, [callActive]);

  const formatCallTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60)
      .toString()
      .padStart(2, "0")}`;

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedConv || !user) return;
    const inputText = messageInput.trim();
    setMessageInput("");

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMsg: DbMessage = {
      id: tempId,
      conversation_id: selectedConv.id,
      sender_type: "user",
      text: inputText,
      message_type: "text",
      card_data: null,
      created_at: new Date().toISOString(),
      read_at: null,
    };

    setOptimisticMessages((prev) => [...prev, optimisticMsg]);

    try {
      const sentMsg = await sendMessageMutation.mutateAsync({
        conversationId: selectedConv.id,
        text: inputText,
        senderType: "user",
        receiverId: Number(selectedConv.business_id),
      });
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id === tempId ? sentMsg : m))
      );
    } catch {
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessageInput(inputText);
      toast.error("Unable to send message right now");
    }
  };

  const startCall = () => setShowCallDialog(true);
  const connectCall = () => {
    setCallActive(true);
    toast.success("Call connected via masked number");
  };
  const endCall = () => {
    setCallActive(false);
    setShowCallDialog(false);
    toast({ title: "Call ended", description: `Duration: ${formatCallTime(callTimer)}` });
  };

  const handleStartChatWithUser = async (targetUser: AppUser) => {
    try {
      const conversation = await createConversationMutation.mutateAsync({
        businessId: String(targetUser.id),
        businessName: targetUser.name?.trim() || targetUser.phone,
        businessAvatar: targetUser.profile_picture || undefined,
      });
      setSelectedConv(conversation);
      setActiveTab("Chats");
    } catch {
      toast.error("Unable to start chat right now");
    }
  };

  if (!user) {
    return (
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-card">
          <View className="px-4 pt-4 pb-0">
            <Text className="mb-3 text-xl font-bold text-foreground">Messages</Text>
            <View className="flex-row">
              {tabs.map((tab) => (
                <Pressable key={tab} className="flex-1 pb-3">
                  <Text className={`text-center text-sm font-medium ${tab === "Chats" ? "text-primary" : "text-muted-foreground"}`}>
                    {tab}
                  </Text>
                  {tab === "Chats" && <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </Pressable>
              ))}
            </View>
          </View>
        </View>

        <ScrollView className="flex-1">
          <View className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 items-center">
            <Lock size={28} color="#2463eb" />
            <Text className="mt-2 text-base font-bold text-foreground">
              Sign in to access messages
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground text-center">
              Chat with businesses, get AI-powered replies, and make masked calls
            </Text>
            <Button className="mt-3 rounded-xl" onPress={() => navigation.navigate("Auth")}>
              Sign In
            </Button>
          </View>

          <View className="px-4 pt-4 pb-4">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              💬 Preview: Sample Conversations
            </Text>
            <View className="gap-1 opacity-80">
              {demoConversations.map((conv) => (
                <Pressable
                  key={conv.id}
                  className="flex-row items-center gap-3 rounded-xl px-3 py-3"
                  onPress={() => {
                    toast("Sign in to start messaging");
                    navigation.navigate("Auth");
                  }}
                >
                  <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Text className="text-lg">{conv.avatar}</Text>
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                        {conv.name}
                      </Text>
                      <Text className="text-[10px] text-muted-foreground">{conv.time}</Text>
                    </View>
                    <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                      {conv.lastMsg}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View className="mt-4 gap-2">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ✨ Features
              </Text>
              {[
                { icon: "🤖", title: "AI Auto-Replies", desc: "Get instant answers to common questions" },
                { icon: "🔒", title: "Masked Calls", desc: "Call businesses without revealing your number" },
                { icon: "📇", title: "Card Sharing", desc: "Share & receive digital business cards in chat" },
              ].map((f) => (
                <View key={f.title} className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3">
                  <Text className="text-2xl">{f.icon}</Text>
                  <View>
                    <Text className="text-sm font-semibold text-foreground">{f.title}</Text>
                    <Text className="text-xs text-muted-foreground">{f.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (selectedConv) {
    return (
      <View className="flex-1 bg-background">
        <View className="flex-row items-center gap-3 border-b border-border bg-card px-4 py-3">
          <Pressable onPress={() => setSelectedConv(null)}>
            <ArrowLeft size={20} color="#111827" />
          </Pressable>
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Text className="text-xs font-bold text-primary">
              {selectedConv.business_avatar || "📇"}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-foreground">
              {selectedConv.business_name}
            </Text>
            <Text className="text-[10px] text-muted-foreground">Online</Text>
          </View>
          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onPress={startCall}>
            <Phone size={16} color="#111827" />
          </Button>
        </View>

        {permission !== "granted" && permission !== "unsupported" && (
          <Pressable
            onPress={requestPermission}
            className="flex-row items-center gap-2 border-b border-warning/20 bg-warning/10 px-4 py-2"
          >
            <Bell size={14} color="#f59f0a" />
            <Text className="flex-1 text-[10px] font-medium text-warning">
              Enable push notifications to get alerts when businesses reply
            </Text>
            <Text className="text-[10px] font-semibold text-warning">Enable</Text>
          </Pressable>
        )}

        <ScrollView
          ref={scrollRef}
          className="flex-1 px-4 py-4"
          contentContainerStyle={{ paddingBottom: 16, gap: 12 }}
          onContentSizeChange={scrollToBottom}
        >
          {combinedMessages.map((msg) => {
            const isMe = msg.sender_type === "user";
            const isRead = !!msg.read_at;
            const isImage = msg.message_type === "image";
            const cardData = msg.message_type === "card" ? parseSharedCardPayload(msg.text) : null;
            const cardId = extractSharedCardId(cardData);

            const openSharedCard = () => {
              if (!cardId) {
                toast.error("Card details are unavailable for this message");
                return;
              }
              navigation.navigate("PublicCard", { id: cardId });
            };

            return (
              <View
                key={msg.id}
                className={`flex ${isMe ? "items-end" : "items-start"}`}
              >
                <View className="gap-1">
                  {isImage ? (
                    <View className={`max-w-[80%] rounded-2xl p-1 ${isMe ? "bg-primary" : "bg-card border border-border"}`}>
                      <Image source={{ uri: msg.text }} className="h-52 w-52 rounded-xl" resizeMode="cover" />
                    </View>
                  ) : cardData ? (
                    <Pressable onPress={openSharedCard} className="max-w-[80%] rounded-2xl border border-border bg-card px-3 py-3">
                      <View className="flex-row items-center gap-2">
                        {cardData.logo_url ? (
                          <Image source={{ uri: cardData.logo_url }} className="h-10 w-10 rounded-lg" />
                        ) : (
                          <View className="h-10 w-10 rounded-lg bg-primary/10 items-center justify-center">
                            <MessageCircle size={16} color="#2463eb" />
                          </View>
                        )}
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                            {cardData.full_name || "Business Card"}
                          </Text>
                          {cardData.company_name ? (
                            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                              {cardData.company_name}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View className="mt-2 border-t border-border pt-2">
                        <Text className="text-[11px] font-medium text-primary">Business Card · Tap to view</Text>
                      </View>
                    </Pressable>
                  ) : (
                    <View
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                        isMe ? "bg-primary rounded-br-sm" : "bg-card border border-border rounded-bl-sm"
                      }`}
                    >
                      <Text className={`text-sm ${isMe ? "text-primary-foreground" : "text-foreground"}`}>
                        {msg.text}
                      </Text>
                    </View>
                  )}

                  <View className={`mt-1 flex-row items-center gap-1 ${isMe ? "justify-end" : ""}`}>
                    <Text className={`text-[10px] ${isMe ? "text-primary/70" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </Text>
                    {isMe && (isRead ? <CheckCheck size={12} color="#93c5fd" /> : <Check size={12} color="#dbeafe" />)}
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View className="border-t border-border bg-card px-4 py-3">
          <View className="flex-row gap-2">
            <Input
              placeholder="Type a message..."
              value={messageInput}
              onChangeText={setMessageInput}
              className="flex-1 rounded-xl"
            />
            <Button
              size="icon"
              className="rounded-xl"
              onPress={handleSend}
              disabled={!messageInput.trim() || sendMessageMutation.isPending}
            >
              <Send size={16} color="#ffffff" />
            </Button>
          </View>
        </View>

        <Dialog
          open={showCallDialog}
          onOpenChange={(open) => {
            if (!open && callActive) endCall();
            else setShowCallDialog(open);
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{callActive ? "Call in Progress" : "Masked Call"}</DialogTitle>
            </DialogHeader>
            <View className="items-center py-4 gap-4">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Text className="text-2xl font-bold text-primary">
                  {selectedConv.business_avatar || "📇"}
                </Text>
              </View>
              <View>
                <Text className="text-base font-semibold text-foreground">
                  {selectedConv.business_name}
                </Text>
                <Text className="mt-1 text-xs text-muted-foreground">
                  Masked number: +91 XXXXX XX789
                </Text>
              </View>
              {callActive ? (
                <>
                  <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full bg-success" />
                    <Text className="text-lg font-mono font-bold text-foreground">
                      {formatCallTime(callTimer)}
                    </Text>
                  </View>
                  <Text className="text-[10px] text-muted-foreground">
                    Your real number is hidden from the business
                  </Text>
                  <Button variant="destructive" className="w-full rounded-xl" onPress={endCall}>
                    <PhoneOff size={16} color="#ffffff" /> End Call
                  </Button>
                </>
              ) : (
                <>
                  <View className="rounded-xl bg-muted p-3">
                    <Text className="text-xs text-muted-foreground">🔒 Your real phone number will be hidden</Text>
                    <Text className="text-xs text-muted-foreground">📞 A masked number will be used for this call</Text>
                    <Text className="text-xs text-muted-foreground">⏱️ Call duration is tracked for your records</Text>
                  </View>
                  <View className="flex-row gap-2 w-full">
                    <Button className="flex-1 rounded-xl" onPress={connectCall}>
                      <Phone size={16} color="#ffffff" /> Connect Call
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-xl" onPress={() => setShowCallDialog(false)}>
                      Cancel
                    </Button>
                  </View>
                </>
              )}
            </View>
          </DialogContent>
        </Dialog>
      </View>
    );
  }

  const displayConversations = conversations.length > 0 ? conversations : [];

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card">
        <View className="px-4 pt-4 pb-0">
          <Text className="mb-3 text-xl font-bold text-foreground">Messages</Text>
          <View className="flex-row">
            {tabs.map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                className="flex-1 pb-3"
              >
                <View className="flex-row items-center justify-center gap-1.5">
                  <Text className={`text-center text-sm font-medium ${activeTab === tab ? "text-primary" : "text-muted-foreground"}`}>
                    {tab}
                  </Text>
                </View>
                {activeTab === tab && <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={{ flex: 1 }} {...tabSwipeResponder.panHandlers}>
      <View className="px-4 pt-3">
        <TextInput
          placeholder="Search conversations..."
          className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground"
          placeholderTextColor="#6a7181"
        />
      </View>

      {activeTab === "Sent" || activeTab === "Received" ? (
        <SentReceivedCards tab={activeTab} />
      ) : activeTab === "Groups" ? (
        <GroupsTab />
      ) : displayConversations.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6 pt-24">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-3xl bg-muted">
            <MessageCircle size={28} color="#6a7181" />
          </View>
          <Text className="text-lg font-bold text-foreground">No conversations yet</Text>
          <Text className="mt-2 text-center text-sm text-muted-foreground">
            Start a conversation by messaging a business from their detail page
          </Text>
        </View>
      ) : (
        <ScrollView className="px-4 pt-3 pb-4">
          <View className="gap-1">
            {displayConversations.map((conv) => (
              <Pressable
                key={conv.id}
                className="flex-row items-center gap-3 rounded-xl px-3 py-3"
                onPress={() => setSelectedConv(conv)}
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Text className="text-lg font-bold text-primary">
                    {conv.business_avatar || "📇"}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center justify-between">
                    <Text
                      className={`text-sm ${conv.unread_count > 0 ? "font-bold text-foreground" : "font-semibold text-foreground"}`}
                      numberOfLines={1}
                    >
                      {conv.business_name}
                    </Text>
                    <View className="items-end gap-1">
                      <Text
                        className={`text-[10px] ${conv.unread_count > 0 ? "text-primary font-semibold" : "text-muted-foreground"}`}
                      >
                        {new Date(conv.updated_at).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                      {conv.unread_count > 0 ? (
                        <View className="min-w-[20px] rounded-full bg-primary px-1.5 py-0.5 items-center justify-center">
                          <Text className="text-[10px] font-semibold text-white">
                            {conv.unread_count}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Text
                    className={`mt-0.5 text-xs ${conv.unread_count > 0 ? "text-foreground font-semibold" : "text-muted-foreground"}`}
                    numberOfLines={1}
                  >
                    {conv.last_message_preview || "Tap to continue conversation"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
      </View>

      {activeTab === "Chats" && (
        <Pressable
          onPress={() => setShowStartChatModal(true)}
          className="absolute bottom-6 right-4 h-14 w-14 items-center justify-center rounded-full bg-primary shadow-lg"
        >
          <MessageCircle size={22} color="#ffffff" />
        </Pressable>
      )}

      <StartChatModal
        visible={showStartChatModal}
        onClose={() => setShowStartChatModal(false)}
        onStartChat={handleStartChatWithUser}
      />
    </View>
  );
};

export default Messaging;

