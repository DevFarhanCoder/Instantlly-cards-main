import { useState, useRef, useEffect, useCallback } from "react";
import { Send, ArrowLeft, Phone, PhoneOff, Bot, Sparkles, Lock, MessageCircle, Check, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { mockConversations, mockDirectoryCards } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, useConversationMessages, useSendMessage, type DbConversation } from "@/hooks/useMessages";
import { useNavigate } from "react-router-dom";
import { usePushNotifications } from "@/contexts/PushNotificationContext";
import { Bell } from "lucide-react";
import { useDirectoryCards } from "@/hooks/useDirectoryCards";


// Demo shared cards data
const demoSentCards = [
  { id: "s1", name: "Sharma Electronics", category: "AC & Appliances", sentTo: "Rahul Sharma", time: "2 days ago", emoji: "⚡" },
  { id: "s2", name: "Green Farms Organic", category: "Agriculture", sentTo: "Priya Patel", time: "5 days ago", emoji: "🌿" },
  { id: "s3", name: "FitZone Gym", category: "Health", sentTo: "Mumbai Entrepreneurs Group", time: "1 week ago", emoji: "💪" },
];

const demoReceivedCards = [
  { id: "r1", name: "TechVista Solutions", category: "Technology", from: "Amit Kumar", time: "1 day ago", emoji: "💻" },
  { id: "r2", name: "Kapoor Legal Associates", category: "Legal", from: "Neha Gupta", time: "3 days ago", emoji: "⚖️" },
  { id: "r3", name: "StyleStreet Boutique", category: "Fashion", from: "Vikram Singh", time: "4 days ago", emoji: "👗" },
  { id: "r4", name: "EduSpark Academy", category: "Education", from: "Sneha Roy", time: "1 week ago", emoji: "📚" },
];

const SentReceivedCards = ({ tab, navigate }: { tab: string; navigate: (path: string) => void }) => {
  const cards = tab === "Sent" ? demoSentCards : demoReceivedCards;
  return (
    <div className="px-4 pt-4 pb-24 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {tab === "Sent" ? "📤 Cards You've Shared" : "📥 Cards Shared With You"}
      </p>
      {cards.map((card, i) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 cursor-pointer hover:shadow-sm transition-shadow"
          onClick={() => navigate("/")}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-xl shrink-0">
            {card.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground truncate">{card.name}</h3>
            <p className="text-[10px] text-muted-foreground">{card.category}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {tab === "Sent" ? `Sent to ${(card as any).sentTo}` : `From ${(card as any).from}`} • {card.time}
            </p>
          </div>
          <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
            View
          </span>
        </motion.div>
      ))}
    </div>
  );
};

const tabs = ["Chats", "Groups", "Sent", "Received"];

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
  if (msg.length > 5) return "Thanks for your message! Our team will get back to you shortly. Meanwhile, you can check our business card for services, pricing, and booking options. 📇";
  return null;
}

const demoConversations = [
  { id: "demo-1", name: "Sharma Electronics", avatar: "🔌", lastMsg: "Hi! We have the latest smartphones in stock. Visit us today!", time: "2m ago" },
  { id: "demo-2", name: "Green Farms Organic", avatar: "🌿", lastMsg: "Your order of organic vegetables is ready for delivery!", time: "15m ago" },
  { id: "demo-3", name: "StyleCraft Salon", avatar: "💇", lastMsg: "Your appointment for tomorrow at 3 PM is confirmed.", time: "1h ago" },
  { id: "demo-4", name: "FitZone Gym", avatar: "💪", lastMsg: "Welcome! Your first month is 50% off. Come check us out!", time: "3h ago" },
  { id: "demo-5", name: "Delhi Darbar Restaurant", avatar: "🍽️", lastMsg: "Thank you for your order! Your food will be ready in 30 mins.", time: "5h ago" },
];

const Messaging = () => {
  const [activeTab, setActiveTab] = useState("Chats");
  const [selectedConv, setSelectedConv] = useState<DbConversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callTimer, setCallTimer] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const callIntervalRef = useRef<number | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { permission, requestPermission, sendPushNotification } = usePushNotifications();

  // DB hooks
  const conversationsQuery = useConversations();
  const messagesQuery = useConversationMessages(selectedConv?.id || null);
  const sendMessageMutation = useSendMessage();

  const conversations = conversationsQuery.data ?? [];
  const dbMessages = messagesQuery.data ?? [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [dbMessages, scrollToBottom]);

  useEffect(() => {
    if (callActive) {
      callIntervalRef.current = window.setInterval(() => setCallTimer((t) => t + 1), 1000);
    } else {
      if (callIntervalRef.current) window.clearInterval(callIntervalRef.current);
      setCallTimer(0);
    }
    return () => { if (callIntervalRef.current) window.clearInterval(callIntervalRef.current); };
  }, [callActive]);

  const formatCallTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const handleSend = async () => {
    if (!messageInput.trim() || !selectedConv || !user) return;
    const inputText = messageInput.trim();
    setMessageInput("");

    await sendMessageMutation.mutateAsync({
      conversationId: selectedConv.id,
      text: inputText,
      senderType: "user",
    });

    // AI auto-reply
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
        // Send push notification for AI reply
        sendPushNotification(
          `${selectedConv.business_name} replied`,
          aiReply.substring(0, 100),
          { tag: `msg-${selectedConv.id}`, url: "/messaging" }
        );
      }, 1000 + Math.random() * 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const startCall = () => setShowCallDialog(true);
  const connectCall = () => { setCallActive(true); toast.success("Call connected via masked number"); };
  const endCall = () => { setCallActive(false); setShowCallDialog(false); toast("Call ended", { description: `Duration: ${formatCallTime(callTimer)}` }); };

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-40 border-b border-border bg-card">
          <div className="px-4 pt-4 pb-0">
            <h1 className="mb-3 text-xl font-bold text-foreground">Messages</h1>
            <div className="flex gap-0">
              {tabs.map((tab) => (
                <button key={tab} className={cn("relative flex-1 pb-3 text-sm font-medium transition-colors", tab === "Chats" ? "text-primary" : "text-muted-foreground")}>
                  {tab}
                  {tab === "Chats" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sign-in banner */}
        <div className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
          <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
          <h2 className="text-base font-bold text-foreground">Sign in to access messages</h2>
          <p className="mt-1 text-xs text-muted-foreground">Chat with businesses, get AI-powered replies, and make masked calls</p>
          <Button className="mt-3 rounded-xl" onClick={() => navigate("/auth")}>Sign In</Button>
        </div>

        {/* Demo conversations */}
        <div className="px-4 pt-4 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">💬 Preview: Sample Conversations</p>
          <div className="space-y-1 opacity-80">
            {demoConversations.map((conv, i) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => { toast.info("Sign in to start messaging"); navigate("/auth"); }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg shrink-0">
                  {conv.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground truncate">{conv.name}</h3>
                    <span className="text-[10px] text-muted-foreground shrink-0">{conv.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMsg}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Feature highlights */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">✨ Features</p>
            {[
              { icon: "🤖", title: "AI Auto-Replies", desc: "Get instant answers to common questions" },
              { icon: "🔒", title: "Masked Calls", desc: "Call businesses without revealing your number" },
              { icon: "📇", title: "Card Sharing", desc: "Share & receive digital business cards in chat" },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{f.title}</h4>
                  <p className="text-xs text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Chat View
  if (selectedConv) {
    return (
      <div className="relative min-h-screen flex flex-col">
        <div className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
          <button onClick={() => setSelectedConv(null)}>
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {selectedConv.business_avatar || "📇"}
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-foreground">{selectedConv.business_name}</h2>
            <p className="text-[10px] text-muted-foreground">Online</p>
          </div>
          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-full" onClick={startCall}>
            <Phone className="h-4 w-4 text-foreground" />
          </Button>
        </div>

        <div className="flex items-center gap-2 bg-primary/5 border-b border-primary/10 px-4 py-2">
          <Bot className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] text-primary font-medium">AI auto-replies enabled for FAQs • Powered by Instantly AI</p>
          <Sparkles className="h-3 w-3 text-primary ml-auto" />
        </div>
        {permission !== "granted" && permission !== "unsupported" && (
          <button
            onClick={requestPermission}
            className="flex items-center gap-2 bg-warning/10 border-b border-warning/20 px-4 py-2 w-full text-left"
          >
            <Bell className="h-3.5 w-3.5 text-warning" />
            <p className="text-[10px] text-warning font-medium flex-1">Enable push notifications to get alerts when businesses reply</p>
            <span className="text-[10px] font-semibold text-warning">Enable</span>
          </button>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
          {dbMessages.map((msg) => {
            const isMe = msg.sender_type === "user";
            const isBot = msg.sender_type === "bot";
            const isRead = !!(msg as any).read_at;
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className="flex flex-col gap-0.5">
                  {isBot && (
                    <div className="flex items-center gap-1 mb-0.5">
                      <Bot className="h-3 w-3 text-primary" />
                      <span className="text-[9px] font-medium text-primary">AI Assistant</span>
                    </div>
                  )}
                  <div className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5",
                    isMe ? "bg-primary text-primary-foreground rounded-br-sm"
                      : isBot ? "bg-primary/10 border border-primary/20 text-foreground rounded-bl-sm"
                      : "bg-card border border-border text-foreground rounded-bl-sm"
                  )}>
                    <p className="text-sm">{msg.text}</p>
                    <div className={cn("flex items-center gap-1 mt-1", isMe ? "justify-end" : "")}>
                      <p className={cn("text-[10px]", isMe ? "text-primary-foreground/60" : "text-muted-foreground")}>
                        {new Date(msg.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                      {isMe && (
                        isRead
                          ? <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                          : <Check className="h-3.5 w-3.5 text-primary-foreground/50" />
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}

          <AnimatePresence>
            {isTyping && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl bg-primary/10 border border-primary/20 px-4 py-3 rounded-bl-sm">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border bg-card px-4 py-2">
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {["What are your hours?", "Pricing info", "How to book?", "Payment methods"].map((q) => (
              <button key={q} onClick={() => setMessageInput(q)} className="shrink-0 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="fixed bottom-20 left-0 right-0 border-t border-border bg-card px-4 py-3">
          <div className="flex gap-2">
            <Input placeholder="Type a message..." value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={handleKeyDown} className="flex-1 rounded-xl" />
            <Button size="icon" className="rounded-xl shrink-0" onClick={handleSend} disabled={!messageInput.trim() || sendMessageMutation.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Dialog open={showCallDialog} onOpenChange={(open) => { if (!open && callActive) endCall(); else setShowCallDialog(open); }}>
          <DialogContent className="sm:max-w-sm text-center">
            <DialogHeader><DialogTitle>{callActive ? "Call in Progress" : "Masked Call"}</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center py-4 space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <span className="text-2xl font-bold text-primary">{selectedConv.business_avatar || "📇"}</span>
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">{selectedConv.business_name}</p>
                <p className="text-xs text-muted-foreground mt-1">Masked number: +91 XXXXX XX789</p>
              </div>
              {callActive ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
                    <span className="text-lg font-mono font-bold text-foreground">{formatCallTime(callTimer)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Your real number is hidden from the business</p>
                  <Button variant="destructive" className="w-full rounded-xl gap-2" onClick={endCall}><PhoneOff className="h-4 w-4" /> End Call</Button>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-muted p-3 text-xs text-muted-foreground text-left space-y-1">
                    <p>🔒 Your real phone number will be hidden</p>
                    <p>📞 A masked number will be used for this call</p>
                    <p>⏱️ Call duration is tracked for your records</p>
                  </div>
                  <div className="flex gap-2 w-full">
                    <Button className="flex-1 rounded-xl gap-2" onClick={connectCall}><Phone className="h-4 w-4" /> Connect Call</Button>
                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowCallDialog(false)}>Cancel</Button>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Conversation List
  // Use mock conversations if no DB conversations (for demo purposes, show both)
  const displayConversations = conversations.length > 0 ? conversations : [];

  return (
    <div className="relative min-h-screen">
      <div className="sticky top-0 z-40 border-b border-border bg-card">
        <div className="px-4 pt-4 pb-0">
          <h1 className="mb-3 text-xl font-bold text-foreground">Messages</h1>
          <div className="flex gap-0">
            {tabs.map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={cn("relative flex-1 pb-3 text-sm font-medium transition-colors", activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
                {tab}
                {activeTab === tab && <motion.div layoutId="msg-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-3">
        <input type="text" placeholder="Search conversations..." className="w-full rounded-xl border border-border bg-muted/50 py-2.5 px-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
      </div>

      {activeTab === "Sent" || activeTab === "Received" ? (
        <SentReceivedCards tab={activeTab} navigate={navigate} />
      ) : displayConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 pt-24">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-muted">
            <span className="text-4xl">💬</span>
          </motion.div>
          <h2 className="text-lg font-bold text-foreground">No conversations yet</h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">Start a conversation by messaging a business from their detail page</p>
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-1 pb-24">
          {displayConversations.map((conv, i) => (
            <motion.button
              key={conv.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/50"
              onClick={() => setSelectedConv(conv)}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary shrink-0">
                {conv.business_avatar || "📇"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground truncate">{conv.business_name}</h3>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(conv.updated_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">Tap to continue conversation</p>
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messaging;
