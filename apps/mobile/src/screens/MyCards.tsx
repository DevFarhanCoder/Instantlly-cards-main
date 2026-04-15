import { useCallback, useState } from "react";
import * as Clipboard from "expo-clipboard";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  Linking,
} from "react-native";
import ContactPickerModal from "../components/ContactPickerModal";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  Calendar,
  Edit,
  Eye,
  Megaphone,
  MoreVertical,
  Plus,
  Share2,
  Tag,
  Trash2,
  Lock,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../hooks/useAuth";
import { useBusinessCards, type BusinessCardRow } from "../hooks/useBusinessCards";
import { useDirectoryCards } from "../hooks/useDirectoryCards";
import { useGetMyPromotionsQuery } from "../store/api/promotionsApi";
import BusinessOnboarding from "../components/business/BusinessOnboarding";
import { toast } from "../lib/toast";
import { getTierLabel, getTierColor, type Tier } from "../utils/tierFeatures";
import { useJoinGroupMutation, useCreateGroupMutation } from "../store/api/chatApi";
import GroupSharingFAB from "../components/group-sharing/GroupSharingFAB";
import GroupSharingModal, { type GSModalMode } from "../components/group-sharing/GroupSharingModal";
import GroupConnectionScreen from "../components/group-sharing/GroupConnectionScreen";
import GroupSharingSessionScreen from "../components/group-sharing/GroupSharingSessionScreen";
import type { GroupSession } from "../services/groupSharingService";

const MyCards = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const plan = route.params?.plan;
  const { user } = useAuth();
  const { cards, isLoading, deleteCard, refetch: refetchCards } = useBusinessCards() as any;
  const { data: directoryCards = [], isLoading: isFetchingNetwork, refetch: refetchDirectory } = useDirectoryCards();
  const { data: myPromotions = [], refetch: refetchPromotions } = useGetMyPromotionsQuery(undefined, { skip: !user });

  // Build a map from business_card_id → promotion info
  const promoByCardId = (myPromotions as any[]).reduce((acc: Record<number, any>, p: any) => {
    if (p.business_card_id) acc[p.business_card_id] = p;
    return acc;
  }, {} as Record<number, any>);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await Promise.all([refetchCards?.(), refetchDirectory(), refetchPromotions()]); } finally { setRefreshing(false); }
  }, [refetchCards, refetchDirectory, refetchPromotions]);
  const networkCards = directoryCards;
  const demoCards = directoryCards;
  const [shareCard, setShareCard] = useState<BusinessCardRow | null>(null);
  const [contactPickerCard, setContactPickerCard] = useState<BusinessCardRow | null>(null);

  // ── Group Sharing state ────────────────────────────────────────────────────
  const [gsModalMode, setGsModalMode] = useState<GSModalMode>('create');
  const [showGSModal, setShowGSModal] = useState(false);
  const [gsSession, setGsSession] = useState<GroupSession | null>(null);
  const [showConnection, setShowConnection] = useState(false);
  const [showSession, setShowSession] = useState(false);

  // Keep legacy mutations to avoid breaking the old API layer (not used in new flow)
  const [joinGroupMutation] = useJoinGroupMutation();
  const [createGroupMutation] = useCreateGroupMutation();

  // ── Group sharing handlers ─────────────────────────────────────────────────
  const handleOpenConnection = (session: GroupSession) => {
    setGsSession(session);
    setShowGSModal(false);
    setShowConnection(true);
  };

  const handleStartSharing = (session: GroupSession) => {
    setGsSession(session);
    setShowConnection(false);
    setShowSession(true);
  };

  const handleCopyLink = async () => {
    if (!shareCard) return;
    const shareUrl = `${process.env.EXPO_PUBLIC_WEB_URL || 'https://instantlly.lovable.app'}/card/${shareCard.id}`;
    await Clipboard.setStringAsync(shareUrl);
    toast.success("Link copied!");
    setShareCard(null);
  };

  const handleWhatsAppShare = async () => {
    if (!shareCard) return;
    
    const shareUrl = `${process.env.EXPO_PUBLIC_WEB_URL || 'https://instantlly.lovable.app'}/card/${shareCard.id}`;
    const text = `${shareCard.full_name}${shareCard.company_name ? ` — ${shareCard.company_name}` : ""}${shareCard.job_title ? ` | ${shareCard.job_title}` : ""}\n\n${shareCard.phone}${shareCard.email ? `\n${shareCard.email}` : ""}${shareCard.location ? `\n📍 ${shareCard.location}` : ""}${shareCard.offer ? `\n\n🎁 ${shareCard.offer}` : ""}\n\n${shareUrl}`;
    
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(text)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        toast.success("Opening WhatsApp...");
      } else {
        toast.error("WhatsApp is not installed");
      }
    } catch (error) {
      console.error("Error opening WhatsApp:", error);
      toast.error("Failed to open WhatsApp");
    }
    
    setShareCard(null);
  };

  if (!user) {
    return (
      <View className="flex-1 bg-background">
        <View className="border-b border-border bg-card px-4 py-4">
          <Text className="text-xl font-bold text-foreground">My Business Cards</Text>
        </View>

        <ScrollView className="flex-1">
          <View className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 items-center">
            <Lock size={28} color="#2463eb" />
            <Text className="mt-2 text-base font-bold text-foreground">
              Sign in to manage your cards
            </Text>
            <Text className="mt-1 text-xs text-muted-foreground text-center">
              Create, edit, and share your digital business cards
            </Text>
            <Button
              className="mt-3 rounded-xl"
              onPress={() => navigation.navigate("Auth")}
            >
              Sign In
            </Button>
          </View>

          <View className="px-4 pt-4 pb-4">
            <Text className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              📇 Preview: Sample Business Cards
            </Text>
            <View className="gap-3 opacity-80">
              {demoCards.slice(0, 4).map((card: any) => (
                <Pressable
                  key={card.id}
                  className="rounded-2xl border border-border bg-card p-4 shadow-sm"
                  onPress={() => navigation.navigate("BusinessDetail", { id: `card-${card.id}` })}
                >
                  <View className="flex-row items-start gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                      {card.logo_url ? (
                        <Image
                          source={{ uri: card.logo_url }}
                          className="h-full w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-xl">🏢</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground">
                        {card.full_name}
                      </Text>
                      {card.job_title && (
                        <Text className="text-xs font-medium text-primary">
                          {card.job_title}
                        </Text>
                      )}
                      {card.company_name && (
                        <Text className="text-xs text-muted-foreground">
                          {card.company_name}
                        </Text>
                      )}
                      <View className="mt-1 flex-row items-center gap-1.5">
                        {card.category && (
                          <Text className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {card.category}
                          </Text>
                        )}
                        <Text
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            card.home_service
                              ? "bg-blue-100 text-blue-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {card.home_service ? "🏠 Home" : "🏪 Visit"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {card.location && (
                    <Text className="mt-2 text-xs text-muted-foreground">
                      📍 {card.location}
                    </Text>
                  )}

                  {card.offer && (
                    <View className="mt-2 rounded-lg bg-accent/50 px-3 py-1.5">
                      <Text className="text-xs font-medium text-accent-foreground">
                        🎁 {card.offer}
                      </Text>
                    </View>
                  )}

                  {card.services && card.services.length > 0 && (
                    <View className="mt-2 flex-row flex-wrap gap-1.5">
                      {card.services.slice(0, 3).map((s: string) => (
                        <Text
                          key={s}
                          className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
                        >
                          {s}
                        </Text>
                      ))}
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>

          {/* My Network Business Cards — shown to logged-in customers */}
          {isFetchingNetwork ? (
            <View className="px-4 pb-4">
              <View className="my-4 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-border" />
                <Text className="text-sm font-bold text-foreground">My Network Business Cards</Text>
                <View className="h-px flex-1 bg-border" />
              </View>
              <Skeleton className="h-36 w-full rounded-2xl mb-3" />
              <Skeleton className="h-36 w-full rounded-2xl mb-3" />
            </View>
          ) : networkCards.length > 0 ? (
            <View className="px-4 pb-4">
              <View className="my-4 flex-row items-center gap-3">
                <View className="h-px flex-1 bg-border" />
                <Text className="text-sm font-bold text-foreground">My Network Business Cards</Text>
                <View className="h-px flex-1 bg-border" />
              </View>
              {networkCards.map((card: any) => (
                <Pressable
                  key={card.id}
                  className="mb-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
                  onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                >
                  <View className="flex-row items-start gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                      {card.logo_url ? (
                        <Image source={{ uri: card.logo_url }} className="h-full w-full" resizeMode="cover" />
                      ) : (
                        <Text className="text-xl">🏢</Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <Text className="text-base font-bold text-foreground">{card.full_name}</Text>
                      {card.job_title && (
                        <Text className="text-xs font-medium text-primary">{card.job_title}</Text>
                      )}
                      {card.company_name && (
                        <Text className="text-xs text-muted-foreground">{card.company_name}</Text>
                      )}
                      <View className="mt-1 flex-row items-center gap-1.5 flex-wrap">
                        {card.category && (
                          <Text className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {card.category}
                          </Text>
                        )}
                        <Text className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                          👥 Friend
                        </Text>
                      </View>
                    </View>
                  </View>
                  {card.location && (
                    <Text className="mt-2 text-xs text-muted-foreground">📍 {card.location}</Text>
                  )}
                  {card.offer && (
                    <View className="mt-2 rounded-lg bg-accent/50 px-3 py-1.5">
                      <Text className="text-xs font-medium text-accent-foreground">🎁 {card.offer}</Text>
                    </View>
                  )}
                  {card.services && card.services.length > 0 && (
                    <View className="mt-2 flex-row flex-wrap gap-1.5">
                      {card.services.slice(0, 3).map((s: string, idx: number) => (
                        <Text key={idx} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                          {s}
                        </Text>
                      ))}
                    </View>
                  )}
                  <View className="mt-3 flex-row gap-2">
                    <Button
                      size="sm"
                      className="flex-1 rounded-lg"
                      onPress={() => Linking.openURL(`tel:${card.phone}`)}
                    >
                      📞 Call
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 rounded-lg"
                      onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                    >
                      👁️ View
                    </Button>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-foreground">My Business Cards</Text>
        <Pressable
          onPress={() => navigation.navigate("CardCreate", plan ? { plan, skipPreview: true } : { skipPreview: true })}
          className="h-10 w-10 items-center justify-center rounded-full bg-primary"
        >
          <Plus size={18} color="#ffffff" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: cards.length > 0 ? 80 : 16 }} refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }>
        {isLoading ? (
          <View className="px-4 py-4 gap-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </View>
        ) : cards.length === 0 ? (
          <View>
            <BusinessOnboarding />
            <View className="items-center px-6 pt-16">
              <View className="mb-6 h-24 w-24 items-center justify-center rounded-3xl bg-muted">
                <Text className="text-4xl">📇</Text>
              </View>
              <Text className="text-lg font-bold text-foreground">
                You haven't created any cards yet.
              </Text>
              <Text className="mt-2 text-center text-sm text-muted-foreground">
                Use the Quick Start Guide above or tap + to create your first card
              </Text>
              <Button
                className="mt-6 rounded-xl"
                onPress={() => navigation.navigate("CardCreate", plan ? { plan, skipPreview: true } : { skipPreview: true })}
              >
                <Plus size={14} color="#ffffff" />
                <Text className="text-sm font-medium text-primary-foreground">Create Card</Text>
              </Button>
            </View>
          </View>
        ) : (
          <View className="px-4 py-4 gap-4">
            <BusinessOnboarding />
            {cards.map((card: any) => (
              <View
                key={card.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-row items-start gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                      {card.logo_url ? (
                        <Image
                          source={{ uri: card.logo_url }}
                          className="h-full w-full"
                          resizeMode="cover"
                        />
                      ) : (
                        <Text className="text-xl">🏢</Text>
                      )}
                    </View>
                    <View>
                      <Text className="text-base font-bold text-foreground">
                        {card.full_name}
                      </Text>
                      {card.job_title && (
                        <Text className="text-xs font-medium text-primary">
                          {card.job_title}
                        </Text>
                      )}
                      {card.company_name && (
                        <Text className="text-xs text-muted-foreground">
                          {card.company_name}
                        </Text>
                      )}
                      {card.category && (
                        <View className="mt-0.5 flex-row flex-wrap gap-1">
                          {(Array.isArray(card.category) ? card.category : [card.category]).map((cat: string) => (
                            <Text key={cat} className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {cat}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Promotion status badges */}
                  {(() => {
                    const promo = promoByCardId[card.id];
                    if (!promo) return null;
                    const tier = (promo.tier || 'free') as Tier;
                    const isPremium = tier !== 'free' && promo.status === 'active';
                    const statusColor = promo.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : promo.status === 'pending_payment'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-600';
                    return (
                      <View className="items-end gap-1">
                        <View className="flex-row flex-wrap items-center gap-1.5">
                          <Text className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${isPremium ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isPremium ? `⭐ ${promo.plan_name || 'Premium'}` : '🆓 Free'}
                          </Text>
                          {tier !== 'free' && (
                            <Text style={{ backgroundColor: getTierColor(tier) + '20', color: getTierColor(tier) }} className="rounded-full px-2 py-0.5 text-[10px] font-bold">
                              {getTierLabel(tier)}
                            </Text>
                          )}
                          <Text className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>
                            {promo.status === 'active' ? '✅ Active' : promo.status === 'pending_payment' ? '⏳ Pending Payment' : promo.status}
                          </Text>
                        </View>
                        {promo.expiry_date && (
                          <Text className="text-[10px] text-gray-500">
                            Expires {new Date(promo.expiry_date).toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    );
                  })()}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Pressable className="p-1">
                        <MoreVertical size={16} color="#6a7181" />
                      </Pressable>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onPress={() => navigation.navigate("PublicCard", { id: `card-${card.id}` })}>
                        <Eye size={14} color="#111827" /> View
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => navigation.navigate("CardCreate", { cardId: card.id })}>
                        <Edit size={14} color="#111827" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => setShareCard(card)}>
                        <Share2 size={14} color="#111827" /> Share
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onPress={() => navigation.navigate("AdCreate", { cardId: card.id })}>
                        <Megaphone size={14} color="#111827" /> Run Ad
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => navigation.navigate("EventCreate", { cardId: card.id })}>
                        <Calendar size={14} color="#111827" /> List Event
                      </DropdownMenuItem>
                      <DropdownMenuItem onPress={() => navigation.navigate("VoucherCreate", { cardId: card.id })}>
                        <Tag size={14} color="#111827" /> Create Voucher
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onPress={() => deleteCard.mutateAsync(card.id)}
                      >
                        <Trash2 size={14} color="#ef4343" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </View>

                {card.location && (
                  <Text className="mt-2 text-xs text-muted-foreground">
                    📍 {card.location}
                  </Text>
                )}

                {card.offer && (
                  <View className="mt-2 rounded-lg bg-accent/50 px-3 py-1.5">
                    <Text className="text-xs font-medium text-accent-foreground">
                      🎁 {card.offer}
                    </Text>
                  </View>
                )}

                {card.services && card.services.length > 0 && (
                  <View className="mt-3 flex-row flex-wrap gap-1.5">
                    {card.services.map((s: any) => (
                      <Text
                        key={s}
                        className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        {s}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Pending payment actions */}
                {(() => {
                  const promo = promoByCardId[card.id];
                  if (!promo || promo.status !== 'pending_payment') return null;
                  return (
                    <View className="mt-3 flex-row gap-2">
                      <Button
                        size="sm"
                        className="flex-1 rounded-lg bg-amber-500"
                        onPress={() => navigation.navigate("PremiumPlanSelection", { promotionId: promo.id, businessCardId: card.id })}
                      >
                        <Text className="text-xs font-medium text-white">💳 Complete Payment</Text>
                      </Button>
                    </View>
                  );
                })()}

                <View className="mt-3 flex-row gap-2">
                  <Button size="sm" className="flex-1 rounded-lg" onPress={() => setShareCard(card)}>
                    <Share2 size={14} color="#ffffff" /> Share
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-lg"
                    onPress={() => navigation.navigate("AdCreate", { cardId: card.id })}
                  >
                    📣 Promote
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-lg"
                    onPress={() => navigation.navigate("EventCreate", { cardId: card.id })}
                  >
                    🎫 Event
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* My Network Business Cards */}
        {isFetchingNetwork ? (
          <View className="px-4 pb-4">
            <View className="my-4 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-sm font-bold text-foreground">My Network Business Cards</Text>
              <View className="h-px flex-1 bg-border" />
            </View>
            <Skeleton className="h-36 w-full rounded-2xl mb-3" />
            <Skeleton className="h-36 w-full rounded-2xl mb-3" />
          </View>
        ) : networkCards.length > 0 ? (
          <View className="px-4 pb-4">
            <View className="my-4 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-sm font-bold text-foreground">My Network Business Cards</Text>
              <View className="h-px flex-1 bg-border" />
            </View>
            {networkCards.map((card: any) => (
              <Pressable
                key={card.id}
                className="mb-3 rounded-2xl border border-border bg-card p-4 shadow-sm"
                onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
              >
                <View className="flex-row items-start gap-3">
                  <View className="h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                    {card.logo_url ? (
                      <Image source={{ uri: card.logo_url }} className="h-full w-full" resizeMode="cover" />
                    ) : (
                      <Text className="text-xl">🏢</Text>
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-base font-bold text-foreground">{card.full_name}</Text>
                    {card.job_title && (
                      <Text className="text-xs font-medium text-primary">{card.job_title}</Text>
                    )}
                    {card.company_name && (
                      <Text className="text-xs text-muted-foreground">{card.company_name}</Text>
                    )}
                    <View className="mt-1 flex-row items-center gap-1.5 flex-wrap">
                      {card.category && (
                        <Text className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                          {card.category}
                        </Text>
                      )}
                      <Text className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        👥 Friend
                      </Text>
                    </View>
                  </View>
                </View>
                {card.location && (
                  <Text className="mt-2 text-xs text-muted-foreground">📍 {card.location}</Text>
                )}
                {card.offer && (
                  <View className="mt-2 rounded-lg bg-accent/50 px-3 py-1.5">
                    <Text className="text-xs font-medium text-accent-foreground">🎁 {card.offer}</Text>
                  </View>
                )}
                {card.services && card.services.length > 0 && (
                  <View className="mt-2 flex-row flex-wrap gap-1.5">
                    {card.services.slice(0, 3).map((s: string, idx: number) => (
                      <Text key={idx} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                        {s}
                      </Text>
                    ))}
                  </View>
                )}
                <View className="mt-3 flex-row gap-2">
                  <Button
                    size="sm"
                    className="flex-1 rounded-lg"
                    onPress={() => Linking.openURL(`tel:${card.phone}`)}
                  >
                    📞 Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-lg"
                    onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                  >
                    👁️ View
                  </Button>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      {cards.length > 0 && (
        <GroupSharingFAB
          onCreate={() => { setGsModalMode('create'); setShowGSModal(true); }}
          onJoin={() => { setGsModalMode('join'); setShowGSModal(true); }}
        />
      )}

      {/* ── Group Sharing modals ──────────────────────────────────────── */}
      <GroupSharingModal
        visible={showGSModal}
        mode={gsModalMode}
        onClose={() => setShowGSModal(false)}
        onOpenConnection={handleOpenConnection}
      />

      {gsSession && (
        <GroupConnectionScreen
          visible={showConnection}
          session={gsSession}
          onClose={() => setShowConnection(false)}
          onStartSharing={handleStartSharing}
        />
      )}

      {gsSession && (
        <GroupSharingSessionScreen
          visible={showSession}
          session={gsSession}
          onClose={() => { setShowSession(false); setGsSession(null); }}
        />
      )}

      <Dialog open={!!shareCard} onOpenChange={() => setShareCard(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Share "{shareCard?.full_name}"</DialogTitle>
          </DialogHeader>
          <View className="items-center gap-4 py-4">
            {shareCard ? (
              <QRCode value={`${process.env.EXPO_PUBLIC_WEB_URL || 'https://instantlly.lovable.app'}/card/${shareCard.id}`} size={160} />
            ) : null}
            <Text className="text-xs text-muted-foreground">
              Scan to view this card
            </Text>
          </View>
          <View className="gap-2">
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onPress={() => {
                setContactPickerCard(shareCard);
                setShareCard(null);
              }}
            >
              📲 Share Within App
            </Button>
            <Button
              className="w-full rounded-xl"
              onPress={handleCopyLink}
            >
              📋 Copy Link
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              onPress={handleWhatsAppShare}
            >
              💬 Share via WhatsApp
            </Button>
          </View>
        </DialogContent>
      </Dialog>

      <ContactPickerModal
        visible={!!contactPickerCard}
        onClose={() => setContactPickerCard(null)}
        cardId={contactPickerCard ? Number(contactPickerCard.id) : 0}
        cardName={contactPickerCard?.full_name ?? ""}
      />
    </View>
  );
};

export default MyCards;

