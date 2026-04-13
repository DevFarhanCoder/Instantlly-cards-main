import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  CalendarCheck,
  Camera,
  Flag,
  Heart,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  ShieldCheck,
  Star,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import QRCode from "react-native-qrcode-svg";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import BookAppointmentModal from "../components/BookAppointmentModal";
import ShareCardModal from "../components/ShareCardModal";
import LeadForm from "../components/business/LeadForm";
import { useFavorites } from "../contexts/FavoritesContext";
import { useReviews } from "../hooks/useReviews";
import { useAuth } from "../hooks/useAuth";
import { useBookings } from "../hooks/useBookings";
import { useCreateConversation } from "../hooks/useMessages";
import { useDirectoryCard } from "../hooks/useDirectoryCards";
import { Skeleton } from "../components/ui/skeleton";
import { trackCardEvent } from "../lib/analytics";
import { useBusinessFollows } from "../hooks/useBusinessFollows";
import { useDisputes, useReportBusiness } from "../hooks/useReports";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "../lib/toast";
import { colors } from "../theme/colors";

const BusinessDetail = () => {
  const route = useRoute<any>();
  const id = route.params?.id as string | undefined;
  const navigation = useNavigation<any>();
  const { toggleFavorite, isFavorite } = useFavorites();
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewPhotos, setReviewPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [showShareCard, setShowShareCard] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const { user } = useAuth();
  const { createBooking } = useBookings();
  const createConversation = useCreateConversation();
  const { data: card, isLoading, refetch: refetchCard } = useDirectoryCard(id || "0");
  const businessId = card?.business_card_id || (card?._numericId ? String(card._numericId) : "");
  const { reviews, createReview, uploadReviewPhoto } = useReviews(businessId);
  const { followersCount, isFollowing, toggleFollow } = useBusinessFollows(businessId);
  const reportBusiness = useReportBusiness();
  const { createDispute } = useDisputes();
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [showDisputeDialog, setShowDisputeDialog] = useState(false);
  const [disputeType, setDisputeType] = useState("booking");
  const [disputeDescription, setDisputeDescription] = useState("");

  useEffect(() => {
    if (businessId && card) {
      trackCardEvent(businessId, "view");
    }
  }, [businessId, card]);

  const allReviews = useMemo(
    () =>
      reviews.map((r) => ({
        id: r.id,
        userName: user?.email?.split("@")[0] || "User",
        rating: r.rating,
        comment: r.comment || "",
        photo_urls: r.photo_urls || [],
        date: new Date(r.created_at).toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      })),
    [reviews, user]
  );

  const shareUrl = card ? `https://instantlly.lovable.app/card/${businessId}` : "";

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!user) {
      toast.error("Please sign in to review");
      navigation.navigate("Auth");
      return;
    }
    try {
      setUploadingPhotos(true);
      const photoUrls: string[] = [];
      for (const asset of reviewPhotos) {
        const url = await uploadReviewPhoto({
          uri: asset.uri,
          name: asset.fileName ?? "review.jpg",
          type: asset.mimeType ?? "image/jpeg",
        });
        photoUrls.push(url);
      }
      await createReview.mutateAsync({
        rating: reviewRating,
        comment: reviewComment || undefined,
        photo_urls: photoUrls.length > 0 ? photoUrls : undefined,
      });
      toast.success("Review submitted! Thanks for your feedback ⭐");
      setShowReviewDialog(false);
      setReviewRating(0);
      setReviewComment("");
      setReviewPhotos([]);
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const pickReviewPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error("Permission required to access photos");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 3 - reviewPhotos.length,
    });
    if (result.canceled) return;
    setReviewPhotos((prev) => [...prev, ...result.assets].slice(0, 3));
  };

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await refetchCard(); } finally { setRefreshing(false); }
  }, [refetchCard]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background p-4 gap-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </View>
    );
  }

  if (!card) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-5xl mb-3">🔍</Text>
        <Text className="text-muted-foreground">Business not found</Text>
        <Button variant="link" onPress={() => navigation.goBack()}>
          Go back
        </Button>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center justify-between">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Business Details</Text>
        <View className="flex-row items-center gap-3">
          <Pressable onPress={() => toggleFavorite(card.id)}>
            <Heart
              size={20}
              color={isFavorite(card.id) ? colors.destructive : colors.mutedForeground}
              fill={isFavorite(card.id) ? colors.destructive : "transparent"}
            />
          </Pressable>
          <Pressable onPress={() => setShowShareCard(true)}>
            <Share2 size={20} color={colors.mutedForeground} />
          </Pressable>
          <Pressable onPress={() => setShowReportDialog(true)}>
            <Flag size={18} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-5" refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={["#2463eb"]} tintColor="#2463eb" />
        }>
        <View className="flex-row items-start gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 overflow-hidden">
            {card.logo_url ? (
              <Image source={{ uri: card.logo_url }} style={{ height: "100%", width: "100%" }} />
            ) : (
              <Text className="text-3xl">🏢</Text>
            )}
          </View>
          <View className="flex-1 min-w-0">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xl font-bold text-foreground flex-shrink" numberOfLines={2}>{card.full_name}</Text>
              {card.is_verified && (
                <ShieldCheck size={18} color={colors.primary} />
              )}
            </View>
            {card.job_title && <Text className="text-sm text-primary font-medium">{card.job_title}</Text>}
            {card.company_name && card.company_name !== card.full_name && (
              <Text className="text-sm text-muted-foreground">{card.company_name}</Text>
            )}
            <View className="flex-row flex-wrap items-center gap-1.5 mt-1">
              {card.category && <Badge variant="secondary" className="text-xs">{card.category}</Badge>}
              {card.service_mode && (
                <Badge className={`text-xs border ${
                  card.service_mode === "home"
                    ? "bg-blue-100 text-blue-700 border-blue-200"
                    : card.service_mode === "both"
                    ? "bg-purple-100 text-purple-700 border-purple-200"
                    : "bg-amber-100 text-amber-700 border-amber-200"
                }`}>
                  {card.service_mode === "home"
                    ? "🏠 Home Service"
                    : card.service_mode === "both"
                    ? "🔄 Home & Visit"
                    : "🏪 Visit"}
                </Badge>
              )}
              {card.is_verified && (
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">✓ Verified</Badge>
              )}
            </View>
            <View className="mt-1.5 flex-row items-center gap-2 flex-wrap">
              {allReviews.length > 0 && (
                <View className="flex-row items-center gap-1">
                  <Star size={14} color="#f59e0b" />
                  <Text className="text-xs font-medium text-foreground">
                    {(allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length).toFixed(1)}
                  </Text>
                  <Text className="text-xs text-muted-foreground">({allReviews.length})</Text>
                </View>
              )}
              <View className="flex-row items-center gap-1">
                <Users size={14} color={colors.mutedForeground} />
                <Text className="text-xs text-muted-foreground">{followersCount} followers</Text>
              </View>
              <Button
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                className="h-7 text-[11px] rounded-lg gap-1"
                onPress={() => {
                  if (!user) {
                    toast.error("Please sign in to follow");
                    navigation.navigate("Auth");
                    return;
                  }
                  toggleFollow.mutate();
                }}
              >
                {isFollowing ? (
                  <>
                    <UserMinus size={12} color={isFollowing ? colors.foreground : "#ffffff"} /> Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus size={12} color="#ffffff" /> Follow
                  </>
                )}
              </Button>
            </View>
          </View>
        </View>

        {card.description && (
          <Text className="text-sm text-muted-foreground mt-3">{card.description}</Text>
        )}

        {card.offer && (
          <View className="rounded-xl bg-success/10 px-4 py-3 mt-4">
            <Text className="text-sm font-medium text-success">🎁 {card.offer}</Text>
          </View>
        )}

        <View className="rounded-xl border border-border bg-card p-4 gap-3 mt-4">
          <Text className="text-sm font-semibold text-foreground">Contact Information</Text>
          <View className="gap-2">
            <Text className="text-sm text-foreground">📞 {card.phone}</Text>
            {card.email && <Text className="text-sm text-foreground">✉️ {card.email}</Text>}
            {card.whatsapp && (
              <Pressable onPress={() => Linking.openURL(`https://wa.me/${card.whatsapp?.replace(/[^0-9]/g, "")}`)}>
                <Text className="text-sm text-green-600">💬 WhatsApp: {card.whatsapp}</Text>
              </Pressable>
            )}
            {card.telegram && (
              <Pressable onPress={() => Linking.openURL(`https://t.me/${card.telegram?.replace("@", "")}`)}>
                <Text className="text-sm text-blue-500">💬 Telegram: {card.telegram}</Text>
              </Pressable>
            )}
            {card.location && <Text className="text-sm text-foreground">📍 {card.location}</Text>}
            {card.website && <Text className="text-sm text-foreground">🌐 {card.website}</Text>}
          </View>
        </View>

        {/* Business Hours Card */}
        {card.business_hours && (() => {
          const DAY_ORDER = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
          const DAY_SHORT: Record<string, string> = {
            monday:"Mon", tuesday:"Tue", wednesday:"Wed", thursday:"Thu",
            friday:"Fri", saturday:"Sat", sunday:"Sun",
          };
          const todayKey = DAY_ORDER[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

          let parsed: any = card.business_hours;
          if (typeof parsed === "string") {
            try { parsed = JSON.parse(parsed); } catch { /* keep as string */ }
          }

          const formatHours = (val: any): { label: string; status: "open" | "closed" | "unset" } => {
            if (typeof val === "string") {
              if (val.toLowerCase() === "closed") return { label: "Closed", status: "closed" };
              return { label: val, status: "open" };
            }
            if (typeof val === "object" && val !== null) {
              if (val.is_closed || val.closed) return { label: "Closed", status: "closed" };
              const open = val.open_time || val.open || "";
              const close = val.close_time || val.close || "";
              if (open && close) return { label: `${open} – ${close}`, status: "open" };
            }
            return { label: "—", status: "unset" };
          };

          if (typeof parsed === "string") {
            return (
              <View className="rounded-xl border border-border bg-card p-4 mt-4">
                <Text className="text-sm font-semibold text-foreground mb-2">Business Hours</Text>
                <Text className="text-sm text-foreground">{parsed}</Text>
              </View>
            );
          }

          if (typeof parsed === "object" && parsed !== null) {
            const entries = Object.entries(parsed as Record<string, any>)
              .sort(([a], [b]) => DAY_ORDER.indexOf(a.toLowerCase()) - DAY_ORDER.indexOf(b.toLowerCase()));

            const allUnset = entries.every(([, v]) => formatHours(v).status === "unset");
            if (allUnset) return null;

            return (
              <View className="rounded-xl border border-border bg-card overflow-hidden mt-4">
                <View className="flex-row items-center gap-2 px-4 pt-4 pb-3 border-b border-border">
                  <Text className="text-base">🕒</Text>
                  <Text className="text-sm font-semibold text-foreground">Business Hours</Text>
                </View>
                <View className="px-4 py-2">
                  {entries.map(([day, hours], i) => {
                    const isToday = day.toLowerCase() === todayKey;
                    const { label, status } = formatHours(hours);
                    return (
                      <View
                        key={day}
                        className={`flex-row items-center justify-between py-2.5 ${i < entries.length - 1 ? "border-b border-border/50" : ""}`}
                        style={isToday ? { backgroundColor: "rgba(37,99,235,0.06)", borderRadius: 8, paddingHorizontal: 8, marginHorizontal: -8 } : {}}
                      >
                        <View className="flex-row items-center gap-2">
                          <View
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: status === "open" ? "#22c55e" : status === "closed" ? "#ef4444" : "#d1d5db" }}
                          />
                          <Text
                            className={`text-sm ${isToday ? "font-bold text-primary" : "font-medium text-foreground"}`}
                          >
                            {DAY_SHORT[day.toLowerCase()] ?? day}
                            {isToday && <Text className="text-xs font-normal text-primary"> (Today)</Text>}
                          </Text>
                        </View>
                        <Text
                          className={`text-sm ${status === "open" ? "text-foreground" : status === "closed" ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          }
          return null;
        })()}

        {card.services && card.services.length > 0 && (
          <View className="gap-2 mt-4">
            <Text className="text-sm font-semibold text-foreground">Services</Text>
            <View className="flex-row flex-wrap gap-2">
              {card.services.map((s) => (
                <Badge key={s} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
            </View>
          </View>
        )}

        {card.location && (
          <Pressable
            className="rounded-xl border border-border bg-muted h-40 items-center justify-center mt-4"
            onPress={() => {
            trackCardEvent(businessId, "direction_click");
              Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(card.location!)}`);
            }}
          >
            <MapPin size={24} color={colors.mutedForeground} />
            <Text className="text-xs text-muted-foreground mt-1">{card.location}</Text>
          </Pressable>
        )}

        <View className="items-center rounded-xl border border-border bg-card p-4 mt-4">
          <QRCode value={shareUrl} size={120} />
          <Text className="mt-2 text-xs text-muted-foreground">Scan to save this card</Text>
        </View>

        <View className="gap-3 mt-5">
          <View className="flex-row items-center justify-between">
            <Text className="text-sm font-semibold text-foreground">Reviews</Text>
            <Button
              size="sm"
              variant="outline"
              className="text-xs rounded-lg gap-1"
              onPress={() => {
                if (!user) {
                  toast.error("Please sign in to write a review");
                  navigation.navigate("Auth");
                  return;
                }
                setShowReviewDialog(true);
              }}
            >
              <Star size={12} color={colors.foreground} /> Write a Review
            </Button>
          </View>
          {allReviews.length === 0 ? (
            <Text className="text-xs text-muted-foreground text-center py-4">
              No reviews yet. Be the first to review!
            </Text>
          ) : (
            allReviews.map((r) => (
              <View key={r.id} className="rounded-xl border border-border bg-card p-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-sm font-medium text-foreground">{r.userName}</Text>
                  <View className="flex-row items-center gap-0.5">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} size={12} color="#f59e0b" />
                    ))}
                  </View>
                </View>
                <Text className="text-xs text-muted-foreground">{r.comment}</Text>
                {r.photo_urls.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-2">
                    <View className="flex-row gap-2">
                      {r.photo_urls.map((url, i) => (
                        <Pressable key={i} onPress={() => setLightboxImage(url)}>
                          <Image source={{ uri: url }} style={{ height: 64, width: 64, borderRadius: 8 }} />
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                )}
                <Text className="mt-1 text-[10px] text-muted-foreground">{r.date}</Text>
              </View>
            ))
          )}
        </View>

        <View className="mt-4">
        <LeadForm businessCardId={businessId} businessName={card.full_name} />
        </View>
      </ScrollView>

      <View className="border-t border-border bg-card px-4 py-3">
        {/* Top Row - Primary Actions */}
        <View className="flex-row gap-2 mb-2">
          <Button
            className="flex-1 gap-1.5 rounded-xl py-3.5"
            onPress={async () => {
              trackCardEvent(businessId, "message_click");
              if (!user) {
                toast.error("Please sign in to message");
                navigation.navigate("Auth");
                return;
              }
              await createConversation.mutateAsync({
                businessId: businessId,
                businessName: card.full_name,
                businessAvatar: card.logo_url || "🏢",
              });
              navigation.navigate("Messaging");
            }}
          >
            <MessageCircle size={16} color="#ffffff" />
            <Text className="text-xs font-semibold text-white">Message</Text>
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-1.5 rounded-xl py-3.5"
            onPress={() => {
              trackCardEvent(businessId, "phone_click");
              Linking.openURL(`tel:${card.phone}`);
            }}
          >
            <Phone size={16} color={colors.foreground} />
            <Text className="text-xs font-semibold text-foreground">Call</Text>
          </Button>
        </View>
        
        {/* Bottom Row - Secondary Actions */}
        <View className="flex-row gap-2">
          {card.whatsapp && (
            <Button
              variant="outline"
              className="flex-1 gap-1.5 rounded-xl py-3.5"
              onPress={() =>
                Linking.openURL(`https://wa.me/${card.whatsapp!.replace(/[^0-9]/g, "")}`)
              }
            >
              <MessageCircle size={16} color="#25D366" />
              <Text className="text-xs font-semibold text-foreground">WhatsApp</Text>
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 gap-1.5 rounded-xl py-3.5"
            onPress={() => setShowBooking(true)}
          >
            <CalendarCheck size={16} color={colors.foreground} />
            <Text className="text-xs font-semibold text-foreground">Book</Text>
          </Button>
          <Button
            variant="outline"
            className={`gap-1.5 rounded-xl py-3.5 ${card.whatsapp ? '' : 'flex-1'}`}
            onPress={() => {
              if (!user) {
                toast.error("Please sign in");
                navigation.navigate("Auth");
                return;
              }
              setShowDisputeDialog(true);
            }}
          >
            <Flag size={16} color={colors.foreground} />
            <Text className="text-xs font-semibold text-foreground">Report</Text>
          </Button>
        </View>
      </View>

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
          </DialogHeader>
          <View className="gap-4">
            <View>
              <Text className="text-xs font-semibold text-foreground mb-2">Your Rating</Text>
              <View className="flex-row gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Pressable key={s} onPress={() => setReviewRating(s)}>
                    <Star
                      size={28}
                      color={s <= reviewRating ? "#f59e0b" : "#c0c4cc"}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
            <Textarea
              placeholder="Share your experience..."
              value={reviewComment}
              onChangeText={setReviewComment}
              className="rounded-xl"
            />
            <View>
              <Pressable onPress={pickReviewPhotos} className="flex-row items-center gap-2">
                <Camera size={16} color={colors.primary} />
                <Text className="text-xs text-primary font-medium">
                  Add Photos ({reviewPhotos.length}/3)
                </Text>
              </Pressable>
              {reviewPhotos.length > 0 && (
                <View className="flex-row gap-2 mt-2">
                  {reviewPhotos.map((f, i) => (
                    <View key={i} className="relative">
                      <Image source={{ uri: f.uri }} style={{ height: 56, width: 56, borderRadius: 8 }} />
                      <Pressable
                        onPress={() => setReviewPhotos((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -top-1.5 -right-1.5 rounded-full bg-destructive h-4 w-4 items-center justify-center"
                      >
                        <X size={10} color="#ffffff" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
          <DialogFooter>
            <Button
              className="w-full rounded-xl"
              onPress={handleSubmitReview}
              disabled={createReview.isPending || uploadingPhotos}
            >
              {uploadingPhotos
                ? "Uploading photos..."
                : createReview.isPending
                ? "Submitting..."
                : "Submit Review"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightboxImage} onOpenChange={(open) => !open && setLightboxImage(null)}>
        <DialogContent className="max-w-lg p-1 bg-black/90 border-none">
          {lightboxImage && (
            <View className="relative items-center justify-center min-h-[300px]">
              <Image source={{ uri: lightboxImage }} style={{ width: "100%", height: 300, borderRadius: 12 }} resizeMode="contain" />
              <Pressable
                onPress={() => setLightboxImage(null)}
                className="absolute top-2 right-2 rounded-full bg-black/50 h-8 w-8 items-center justify-center"
              >
                <X size={16} color="#ffffff" />
              </Pressable>
            </View>
          )}
        </DialogContent>
      </Dialog>

      <BookAppointmentModal
        open={showBooking}
        onOpenChange={setShowBooking}
        businessName={card.full_name}
        businessLogo={card.logo_url || "🏢"}
        businessId={businessId}
        isSignedIn={!!user}
        onRequireAuth={() => navigation.navigate("Auth")}
        onSubmit={async (payload) => {
          await createBooking({
            business_id: typeof payload.business_id === 'string' ? parseInt(payload.business_id, 10) : payload.business_id,
            business_name: payload.business_name,
            mode: payload.mode as any,
            booking_date: payload.booking_date,
            booking_time: payload.booking_time,
            customer_name: payload.customer_name,
            customer_phone: payload.customer_phone,
            notes: payload.notes,
          });
        }}
      />
      <ShareCardModal
        open={showShareCard}
        onOpenChange={setShowShareCard}
        data={{
          fullName: card.full_name,
          companyName: card.company_name,
          jobTitle: card.job_title,
          phone: card.phone,
          email: card.email,
          location: card.location,
          website: card.website,
          category: card.category,
          offer: card.offer,
          services: card.services,
          logoUrl: card.logo_url,
          shareUrl,
        }}
      />

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Business</DialogTitle>
          </DialogHeader>
          <View className="gap-3">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fake_listing">Fake or misleading listing</SelectItem>
                <SelectItem value="inappropriate">Inappropriate content</SelectItem>
                <SelectItem value="spam">Spam or scam</SelectItem>
                <SelectItem value="wrong_info">Wrong information</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Additional details (optional)..."
              value={reportDetails}
              onChangeText={setReportDetails}
              className="rounded-xl"
            />
          </View>
          <DialogFooter>
            <Button
              className="w-full rounded-xl"
              disabled={!reportReason || reportBusiness.isPending}
              onPress={async () => {
                try {
                  await reportBusiness.mutateAsync({
                    business_id: businessId,
                    reason: reportReason,
                    details: reportDetails,
                  });
                  toast.success("Report submitted. We'll review it shortly.");
                  setShowReportDialog(false);
                  setReportReason("");
                  setReportDetails("");
                } catch {
                  toast.error("Failed to submit report");
                }
              }}
            >
              {reportBusiness.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>File a Dispute</DialogTitle>
          </DialogHeader>
          <View className="gap-3">
            <Select value={disputeType} onValueChange={setDisputeType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="booking">Booking issue</SelectItem>
                <SelectItem value="voucher">Voucher issue</SelectItem>
                <SelectItem value="service">Service complaint</SelectItem>
              </SelectContent>
            </Select>
            <Textarea
              placeholder="Describe the issue..."
              value={disputeDescription}
              onChangeText={setDisputeDescription}
              className="rounded-xl"
            />
          </View>
          <DialogFooter>
            <Button
              className="w-full rounded-xl"
              disabled={!disputeDescription.trim()}
              onPress={async () => {
                try {
                  await createDispute.mutateAsync({
                    dispute_type: disputeType,
                    reference_id: businessId,
                    business_id: businessId,
                    description: disputeDescription,
                  });
                  toast.success("Dispute filed. Our team will review it.");
                  setShowDisputeDialog(false);
                  setDisputeDescription("");
                } catch {
                  toast.error("Failed to file dispute");
                }
              }}
            >
              Submit Dispute
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default BusinessDetail;
