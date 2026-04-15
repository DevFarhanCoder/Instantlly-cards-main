import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
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
  useSendMessage,
  type DbConversation,
} from "../hooks/useMessages";
import { usePushNotifications } from "../contexts/PushNotificationContext";
import { getBulkSentCards, type SentCardRecord } from "../components/BulkSendModal";
import { FEATURES } from "../lib/featureFlags";
import { useGetSharedCardsQuery } from "../store/api/businessCardsApi";

const demoReceivedCards: never[] = [];

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

const SentReceivedCards = ({ tab }: { tab: string }) => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [sentCards, setSentCards] = useState<SentCardRecord[]>([]);

  // Real sent + received cards from API (SharedCard)
  const { data: sharedCards = [], isLoading: sharedLoading } = useGetSharedCardsQuery(undefined, {
    skip: tab !== "Received" && tab !== "Sent",
  });
  const myUserId = String(user?.id ?? "");
  const receivedCards = sharedCards.filter((s: any) => s.recipient_id === myUserId);
  const sentIndividualCards = sharedCards.filter((s: any) => s.sender_id === myUserId);

  useEffect(() => {
    if (tab === "Sent" && FEATURES.BULK_SEND) getBulkSentCards().then(setSentCards);
  }, [tab]);

  if (tab === "Received") {
    return (
      <ScrollView className="px-4 pt-4 pb-4">
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
                onPress={() => navigation.navigate("PublicCard", { id: String(card.card_id) })}
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
                    {card.card_title}
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-muted-foreground">
                    From {card.sender_name}
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
    <ScrollView className="px-4 pt-4 pb-4">
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
                <View
                  key={card.id}
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
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
                      {card.card_title}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-muted-foreground">
                      To {card.recipient_name}
                    </Text>
                    <Text className="mt-0.5 text-[10px] text-muted-foreground">
                      {formatRelativeTime(card.sent_at || card.created_at)}
                    </Text>
                  </View>
                  <Text className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                    Sent
                  </Text>
                </View>
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
                <View
                  key={record.id}
                  className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
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
                      {record.cardName}
                    </Text>
                    {record.cardCategory && (
                      <Text className="text-[10px] text-muted-foreground">{record.cardCategory}</Text>
                    )}
                    <Text className="mt-0.5 text-[10px] text-muted-foreground">
                      {record.sentToEmoji} {record.sentTo}
                      {record.levelLabel ? ` · ${record.levelLabel} level` : ""} · {formatRelativeTime(record.sentAt)}
                    </Text>
                  </View>
                  <Text className="rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-medium text-success">
                    Sent
                  </Text>
                </View>
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

  const scrollRef = useRef<ScrollView>(null);
  const callIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const conversationsQuery = useConversations();
  const messagesQuery = useConversationMessages(selectedConv?.id || null);
  const sendMessageMutation = useSendMessage();

  const conversations = conversationsQuery.data ?? [];
  const dbMessages = messagesQuery.data ?? [];

  const scrollToBottom = useCallback(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [dbMessages, scrollToBottom]);

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

    await sendMessageMutation.mutateAsync({
      conversationId: selectedConv.id,
      text: inputText,
      senderType: "user",
    });

    const aiReply = getAIReply(inputText);
    if (aiReply) {
      setIsTyping(true);
      setTimeout(async () => {
        await sendMessageMutation.mutateAsync({
          conversationId: selectedConv.id,
          text: aiReply,
          senderType: "bot",
        });
        setIsTyping(false);
        sendPushNotification(
          `${selectedConv.business_name} replied`,
          aiReply.substring(0, 100),
          { tag: `msg-${selectedConv.id}`, url: "/messaging" }
        );
      }, 1000 + Math.random() * 1500);
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

        <View className="flex-row items-center gap-2 border-b border-primary/10 bg-primary/5 px-4 py-2">
          <Bot size={14} color="#2463eb" />
          <Text className="text-[10px] font-medium text-primary flex-1">
            AI auto-replies enabled for FAQs • Powered by Instantly AI
          </Text>
          <Sparkles size={12} color="#2463eb" />
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
          {dbMessages.map((msg) => {
            const isMe = msg.sender_type === "user";
            const isBot = msg.sender_type === "bot";
            const isRead = !!msg.read_at;
            return (
              <View
                key={msg.id}
                className={`flex ${isMe ? "items-end" : "items-start"}`}
              >
                <View className="gap-1">
                  {isBot && (
                    <View className="flex-row items-center gap-1">
                      <Bot size={12} color="#2463eb" />
                      <Text className="text-[9px] font-medium text-primary">
                        AI Assistant
                      </Text>
                    </View>
                  )}
                  <View
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? "bg-primary rounded-br-sm"
                        : isBot
                        ? "bg-primary/10 border border-primary/20 rounded-bl-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    }`}
                  >
                    <Text className={`text-sm ${isMe ? "text-primary-foreground" : "text-foreground"}`}>
                      {msg.text}
                    </Text>
                    <View className={`mt-1 flex-row items-center gap-1 ${isMe ? "justify-end" : ""}`}>
                      <Text className={`text-[10px] ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </Text>
                      {isMe && (isRead ? <CheckCheck size={12} color="#93c5fd" /> : <Check size={12} color="#dbeafe" />)}
                    </View>
                  </View>
                </View>
              </View>
            );
          })}

          {isTyping && (
            <View className="items-start">
              <View className="flex-row items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3 rounded-bl-sm">
                <Bot size={14} color="#2463eb" />
                <View className="flex-row gap-1">
                  <TypingDot delay={0} />
                  <TypingDot delay={150} />
                  <TypingDot delay={300} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View className="border-t border-border bg-card px-4 py-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {["What are your hours?", "Pricing info", "How to book?", "Payment methods"].map((q) => (
              <Pressable
                key={q}
                onPress={() => setMessageInput(q)}
                className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5"
              >
                <Text className="text-[11px] font-medium text-primary">{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

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
                <Text className={`text-center text-sm font-medium ${activeTab === tab ? "text-primary" : "text-muted-foreground"}`}>
                  {tab}
                </Text>
                {activeTab === tab && <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View className="px-4 pt-3">
        <TextInput
          placeholder="Search conversations..."
          className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground"
          placeholderTextColor="#6a7181"
        />
      </View>

      {activeTab === "Sent" || activeTab === "Received" ? (
        <SentReceivedCards tab={activeTab} />
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
                    <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                      {conv.business_name}
                    </Text>
                    <Text className="text-[10px] text-muted-foreground">
                      {new Date(conv.updated_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <Text className="mt-0.5 text-xs text-muted-foreground" numberOfLines={1}>
                    Tap to continue conversation
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

export default Messaging;

