import { useCallback, useState } from "react";
import * as Clipboard from "expo-clipboard";
import * as SecureStore from "expo-secure-store";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  View,
  Linking,
} from "react-native";
import ContactPickerModal from "../components/ContactPickerModal";
import { buildWhatsAppMessage, type ShareCardData } from "../components/ShareCardModal";
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
import { BusinessCardItem } from "../components/ui/BusinessCardItem";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Skeleton } from "../components/ui/skeleton";
import { useAuth } from "../hooks/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { useBusinessCards, type BusinessCardRow } from "../hooks/useBusinessCards";
import { useDirectoryCards } from "../hooks/useDirectoryCards";
import { useAppDispatch } from "../store";
import { setActiveRole } from "../store/authSlice";
import { useGetMyPromotionsQuery, useUpdatePromotionMutation } from "../store/api/promotionsApi";
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
  const { isBusiness } = useUserRole();
  const dispatch = useAppDispatch();
  const { cards, isLoading, deleteCard, refetch: refetchCards } = useBusinessCards() as any;
  const { data: directoryCards = [], isLoading: isFetchingNetwork, refetch: refetchDirectory } = useDirectoryCards();
  const { data: myPromotions = [], refetch: refetchPromotions } = useGetMyPromotionsQuery(undefined, { skip: !user });
  const [updatePromotion] = useUpdatePromotionMutation();

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
  const handleOpenConnection = useCallback((session: GroupSession) => {
    setGsSession(session);
    setShowGSModal(false);
    setShowConnection(true);
  }, []);

  const handleStartSharing = useCallback((session: GroupSession) => {
    setGsSession(session);
    setShowConnection(false);
    setShowSession(true);
  }, []);

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
    const cardData: ShareCardData = {
      fullName: shareCard.full_name,
      companyName: shareCard.company_name,
      jobTitle: shareCard.job_title,
      phone: shareCard.phone,
      email: shareCard.email,
      location: shareCard.location,
      mapsLink: shareCard.maps_link,
      companyPhone: shareCard.company_phone,
      companyEmail: shareCard.company_email,
      companyAddress: shareCard.company_address,
      companyMapsLink: shareCard.company_maps_link,
      website: shareCard.website,
      category: shareCard.category,
      businessDescription: shareCard.description,
      keywords: shareCard.keywords,
      businessHours: shareCard.business_hours,
      offer: shareCard.offer,
      services: shareCard.services,
      logoUrl: shareCard.logo_url,
      facebook: shareCard.facebook,
      instagram: shareCard.instagram,
      youtube: shareCard.youtube,
      linkedin: shareCard.linkedin,
      twitter: shareCard.twitter,
      shareUrl,
    };
    const message = buildWhatsAppMessage(cardData);
    const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    
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
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs font-medium text-muted-foreground">
              {isBusiness ? "Business" : "Customer"}
            </Text>
            <Switch
              value={isBusiness}
              onValueChange={async (val) => {
                const newRole = val ? "business" : "customer";
                dispatch(setActiveRole(newRole));
                await SecureStore.setItemAsync("activeRole", newRole);
                if (val) {
                  navigation.navigate("ChooseListingType");
                } else {
                  toast.success("Switched to customer mode");
                }
              }}
              trackColor={{ false: "#d1d5db", true: "#2563eb" }}
              thumbColor="#ffffff"
              style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
            />
          </View>
          <Pressable
            onPress={() => navigation.navigate("CardCreate", plan ? { plan, skipPreview: true } : { skipPreview: true })}
            className="h-10 w-10 items-center justify-center rounded-full bg-primary"
          >
            <Plus size={18} color="#ffffff" />
          </Pressable>
        </View>
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
            {cards.map((card: any) => {
              const promo = promoByCardId[card.id];
              const tier = (promo?.tier || "free") as Tier;
              const isPremium = tier !== "free" && promo?.status === "active";
              const statusColor = promo?.status === "active"
                ? "bg-green-100 text-green-700"
                : promo?.status === "pending_payment"
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-100 text-gray-600";
              const categoryText = card.category
                ? (Array.isArray(card.category) ? card.category : [card.category]).join(" • ")
                : undefined;

              const badges = promo
                ? [
                    {
                      id: "plan",
                      label: isPremium ? `⭐ ${promo.plan_name || "Premium"}` : "🆓 Free",
                      className: `rounded-full px-2 py-0.5 text-[10px] font-bold ${isPremium ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`,
                    },
                    ...(tier !== "free"
                      ? [
                          {
                            id: "tier",
                            label: getTierLabel(tier),
                            className: "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            style: { backgroundColor: `${getTierColor(tier)}20`, color: getTierColor(tier) },
                          },
                        ]
                      : []),
                    {
                      id: "status",
                      label: promo.status === "active" ? "✅ Active" : promo.status === "pending_payment" ? "⏳ Pending Payment" : promo.status,
                      className: `rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`,
                    },
                  ]
                : [];

              return (
                <BusinessCardItem
                  key={card.id}
                  title={card.full_name}
                  subtitle={card.job_title || undefined}
                  secondaryText={card.company_name || undefined}
                  category={categoryText}
                  avatarUri={card.logo_url}
                  badges={badges}
                  badgeFooter={
                    promo?.expiry_date ? (
                      <Text className="text-[10px] text-gray-500">Expires {new Date(promo.expiry_date).toLocaleDateString()}</Text>
                    ) : undefined
                  }
                  location={card.location || undefined}
                  offer={card.offer || undefined}
                  services={Array.isArray(card.services) ? card.services : []}
                  topRight={
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
                        {isBusiness && (
                          <DropdownMenuItem onPress={() => navigation.navigate("AdCreate", { cardId: card.id })}>
                            <Megaphone size={14} color="#111827" /> Run Ad
                          </DropdownMenuItem>
                        )}
                        {isBusiness && (
                          <DropdownMenuItem onPress={() => navigation.navigate("EventCreate", { cardId: card.id })}>
                            <Calendar size={14} color="#111827" /> List Event
                          </DropdownMenuItem>
                        )}
                        {isBusiness && (
                          <DropdownMenuItem onPress={() => navigation.navigate("VoucherCreate", { cardId: card.id })}>
                            <Tag size={14} color="#111827" /> Create Voucher
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onPress={() => deleteCard.mutateAsync(card.id)}>
                          <Trash2 size={14} color="#ef4343" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  }
                  actions={
                    <View className="gap-2">
                      {promo?.status === "pending_payment" ? (
                        <View className="flex-row gap-2">
                          <Button
                            size="sm"
                            className="flex-1 rounded-lg bg-amber-500"
                            onPress={() => navigation.navigate("PremiumPlanSelection", { promotionId: promo.id, businessCardId: card.id })}
                          >
                            <Text className="text-xs font-medium text-white">💳 Complete Payment</Text>
                          </Button>
                        </View>
                      ) : null}
                      <View className="flex-row gap-2">
                        <Button size="sm" className="flex-1 rounded-lg" onPress={() => setShareCard(card)}>
                          <Share2 size={14} color="#ffffff" /> Share
                        </Button>
                        {isBusiness && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-lg"
                            onPress={() => navigation.navigate("AdCreate", { cardId: card.id })}
                          >
                            📣 Promote
                          </Button>
                        )}
                        {isBusiness && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 rounded-lg"
                            onPress={() => navigation.navigate("EventCreate", { cardId: card.id })}
                          >
                            🎫 Event
                          </Button>
                        )}
                      </View>
                    </View>
                  }
                />
              );
            })}
          </View>
        )}

        {/* My Promotions Section */}
        {(myPromotions as any[]).length > 0 && (
          <View className="px-4 py-2">
            <View className="my-3 flex-row items-center gap-3">
              <View className="h-px flex-1 bg-border" />
              <Text className="text-sm font-bold text-foreground">My Promotions</Text>
              <View className="h-px flex-1 bg-border" />
            </View>
            <View className="gap-3">
              {(myPromotions as any[]).map((promo: any) => {
                const tier = (promo.tier || 'free') as Tier;
                const isPremium = tier !== 'free' && promo.status === 'active';
                const statusColor = promo.status === 'active'
                  ? 'bg-green-100 text-green-700'
                  : promo.status === 'pending_payment'
                  ? 'bg-amber-100 text-amber-700'
                  : promo.status === 'expired'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 text-gray-600';
                const statusLabel = promo.status === 'active' ? '✅ Active'
                  : promo.status === 'pending_payment' ? '⏳ Pending Payment'
                  : promo.status === 'expired' ? '❌ Expired'
                  : promo.status;
                const categories = promo.business_card?.category
                  ? (Array.isArray(promo.business_card.category) ? promo.business_card.category : [promo.business_card.category]).join(' • ')
                  : null;

                const badges = [
                  {
                    id: "status",
                    label: statusLabel,
                    className: `rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`,
                  },
                  ...(isPremium
                    ? [
                        {
                          id: "tier",
                          label: getTierLabel(tier),
                          className: "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          style: { backgroundColor: getTierColor(tier) + "20", color: getTierColor(tier) },
                        },
                      ]
                    : []),
                ];

                return (
                  <BusinessCardItem
                    key={promo.id}
                    title={promo.business_name || "Business"}
                    category={categories || undefined}
                    fallbackAvatar="📣"
                    badges={badges}
                    badgeFooter={
                      promo.expiry_date ? (
                        <Text className="text-[10px] text-gray-500">Expires {new Date(promo.expiry_date).toLocaleDateString()}</Text>
                      ) : undefined
                    }
                    minHeight={168}
                    topRight={
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Pressable className="p-1">
                            <MoreVertical size={16} color="#6a7181" />
                          </Pressable>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onPress={() => navigation.navigate("BusinessDetail", { id: `promo-${promo.id}` })}>
                            <Eye size={14} color="#111827" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onPress={() => navigation.navigate("BusinessPromotionForm", { promotionId: promo.id, editMode: true })}>
                            <Edit size={14} color="#111827" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onPress={async () => {
                              try {
                                await updatePromotion({ id: promo.id, data: { status: 'cancelled' } }).unwrap();
                                toast.success("Promotion cancelled");
                                refetchPromotions();
                              } catch (e: any) {
                                toast.error(e?.data?.error || "Failed to cancel");
                              }
                            }}
                          >
                            <Trash2 size={14} color="#ef4343" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    }
                    actions={
                      promo.status === 'pending_payment' ? (
                        <Button
                          size="sm"
                          className="rounded-lg bg-amber-500"
                          onPress={() => navigation.navigate("PremiumPlanSelection", { promotionId: promo.id, businessCardId: promo.business_card_id })}
                        >
                          <Text className="text-xs font-medium text-white">💳 Complete Payment</Text>
                        </Button>
                      ) : undefined
                    }
                  />
                );
              })}
            </View>
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

