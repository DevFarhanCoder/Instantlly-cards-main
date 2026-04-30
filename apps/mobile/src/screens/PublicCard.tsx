import { useCallback, useMemo, useState } from "react";
import { Image, Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Share2,
} from "lucide-react-native";
import QRCode from "react-native-qrcode-svg";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import ShareCardModal from "../components/ShareCardModal";
import LeadForm from "../components/business/LeadForm";
import { useDirectoryCard } from "../hooks/useDirectoryCards";
import { toast } from "../lib/toast";
import { useIconColor } from "../theme/colors";

const PublicCard = () => {
  const iconColor = useIconColor();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id as string | undefined;
  const { data: card, isLoading, error, refetch: refetchCard } = useDirectoryCard(id || "");
  const [showShareCard, setShowShareCard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const businessId = card?.business_card_id ?? card?.id ?? "";

  const shareUrl = useMemo(
    () => (id ? `instantllycards://card/${id}` : "instantllycards://"),
    [id]
  );

  const handleShare = () => setShowShareCard(true);

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
        <Skeleton className="h-32 w-full rounded-2xl" />
      </View>
    );
  }

  if (error || !card) {
    return (
      <View className="flex-1 items-center justify-center px-4">
        <Text className="text-5xl mb-3">🔍</Text>
        <Text className="text-sm text-muted-foreground">Card not found</Text>
        <Button variant="link" onPress={() => navigation.navigate("Home")}>
          Go to Home
        </Button>
      </View>
    );
  }

  const socialLinks = [
    { url: card.instagram, label: "Instagram", icon: Globe },
    { url: card.facebook, label: "Facebook", icon: Globe },
    { url: card.linkedin, label: "LinkedIn", icon: Globe },
    { url: card.youtube, label: "YouTube", icon: Globe },
    { url: card.twitter, label: "Twitter", icon: Globe },
  ].filter((s) => s.url);

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => toast.error("Unable to open link"));
  };

  return (
    <View className="flex-1 bg-background">
      <View className="border-b border-border bg-card px-4 py-4 flex-row items-center justify-between">
        <Pressable onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color={iconColor} />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Business Card</Text>
        <Pressable onPress={handleShare}>
          <Share2 size={20} color="#9aa2b1" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 16 }} className="px-4 py-5 gap-5" refreshControl={
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
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xl font-bold text-foreground">{card.full_name}</Text>
              {(card as any).is_verified && <ShieldCheck size={18} color="#2563eb" />}
            </View>
            {card.job_title && (
              <Text className="text-sm text-primary font-medium">{card.job_title}</Text>
            )}
            {card.company_name && (
              <Text className="text-sm text-muted-foreground">{card.company_name}</Text>
            )}
            <View className="flex-row items-center gap-1.5 mt-1 flex-wrap">
              {card.category && <Badge variant="secondary">{card.category}</Badge>}
              {(card as any).is_verified && (
                <Badge className="bg-primary/10 text-primary border-primary/20">✓ Verified</Badge>
              )}
            </View>
          </View>
        </View>

        {card.description && (
          <Text className="text-sm text-muted-foreground">{card.description}</Text>
        )}

        {card.offer && (
          <View className="rounded-xl bg-success/10 px-4 py-3">
            <Text className="text-sm font-medium text-success">🎁 {card.offer}</Text>
          </View>
        )}

        <View className="rounded-xl border border-border bg-card p-4 gap-3">
          <Text className="text-sm font-semibold text-foreground">Contact Information</Text>
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <Phone size={14} color="#6a7181" />
              <Text className="text-sm text-foreground">{card.phone}</Text>
            </View>
            {card.email && (
              <View className="flex-row items-center gap-2">
                <Mail size={14} color="#6a7181" />
                <Text className="text-sm text-foreground">{card.email}</Text>
              </View>
            )}
            {card.location && (
              <View className="flex-row items-center gap-2">
                <MapPin size={14} color="#6a7181" />
                <Text className="text-sm text-foreground">{card.location}</Text>
              </View>
            )}
            {card.website && (
              <Pressable onPress={() => openUrl(card.website!.startsWith("http") ? card.website! : `https://${card.website}`)}>
                <View className="flex-row items-center gap-2">
                  <Globe size={14} color="#6a7181" />
                  <Text className="text-sm text-primary">{card.website}</Text>
                </View>
              </Pressable>
            )}
            {card.established_year && (
              <View className="flex-row items-center gap-2">
                <Calendar size={14} color="#6a7181" />
                <Text className="text-sm text-foreground">Est. {card.established_year}</Text>
              </View>
            )}
          </View>
        </View>

        {(card.company_phone || card.company_email || card.company_address) && (
          <View className="rounded-xl border border-border bg-card p-4 gap-3">
            <Text className="text-sm font-semibold text-foreground">Company Details</Text>
            <View className="gap-2">
              {card.company_phone && (
                <View className="flex-row items-center gap-2">
                  <Phone size={14} color="#6a7181" />
                  <Text className="text-sm text-foreground">{card.company_phone}</Text>
                </View>
              )}
              {card.company_email && (
                <View className="flex-row items-center gap-2">
                  <Mail size={14} color="#6a7181" />
                  <Text className="text-sm text-foreground">{card.company_email}</Text>
                </View>
              )}
              {card.company_address && (
                <View className="flex-row items-center gap-2">
                  <MapPin size={14} color="#6a7181" />
                  <Text className="text-sm text-foreground">{card.company_address}</Text>
                </View>
              )}
            </View>
          </View>
        )}

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
              const open = val.open_time || val.open || val.openTime || "";
              const close = val.close_time || val.close || val.closeTime || "";
              if (open && close) return { label: `${open} – ${close}`, status: "open" };
            }
            return { label: "—", status: "unset" };
          };

          if (typeof parsed === "string") {
            return (
              <View className="rounded-xl border border-border bg-card p-4">
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
              <View className="rounded-xl border border-border bg-card overflow-hidden">
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
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Services</Text>
            <View className="flex-row flex-wrap gap-2">
              {card.services.map((s) => (
                <Badge key={s} variant="secondary">
                  {s}
                </Badge>
              ))}
            </View>
          </View>
        )}

        {socialLinks.length > 0 && (
          <View className="gap-2">
            <Text className="text-sm font-semibold text-foreground">Social Media</Text>
            <View className="flex-row gap-3">
              {socialLinks.map(({ url, label, icon: Icon }) => (
                <Pressable
                  key={label}
                  onPress={() => openUrl(url!.startsWith("http") ? url! : `https://${url}`)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-muted"
                >
                  <Icon size={16} color={iconColor} />
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {card.location && (
          <Pressable
            className="rounded-xl border border-border bg-muted h-40 items-center justify-center"
            onPress={() => openUrl(`https://maps.google.com/?q=${encodeURIComponent(card.location!)}`)}
          >
            <MapPin size={28} color="#9aa2b1" />
            <Text className="text-xs text-muted-foreground mt-1">{card.location}</Text>
            <Text className="text-[10px] text-primary mt-1">Tap to open in Maps</Text>
          </Pressable>
        )}

        <LeadForm businessCardId={businessId || card.id} businessName={card.full_name} />

        <View className="items-center rounded-xl border border-border bg-card p-4">
          <QRCode value={shareUrl} size={120} />
          <Text className="mt-2 text-xs text-muted-foreground">Scan to save this card</Text>
        </View>
      </ScrollView>

      <View className="border-t border-border bg-card px-4 py-3 flex-row gap-2">
        <Button
          className="flex-1 gap-1.5 rounded-xl py-4"
          onPress={() => openUrl(`tel:${card.phone}`)}
        >
          <Phone size={14} color="#ffffff" /> Call
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-1.5 rounded-xl py-4"
          onPress={handleShare}
        >
          <Share2 size={14} color={iconColor} /> Share
        </Button>
        {card.email && (
          <Button
            variant="outline"
            className="flex-1 gap-1.5 rounded-xl py-4"
            onPress={() => openUrl(`mailto:${card.email}`)}
          >
            <Mail size={14} color={iconColor} /> Email
          </Button>
        )}
      </View>

      <ShareCardModal
        open={showShareCard}
        onOpenChange={setShowShareCard}
        cardId={Number(card.id)}
        cardName={card.full_name}
        data={{
          fullName: card.full_name,
          companyName: card.company_name,
          jobTitle: card.job_title,
          phone: card.phone,
          whatsapp: card.whatsapp,
          email: card.email,
          location: card.location,
          mapsLink: card.maps_link,
          companyPhone: card.company_phone,
          companyEmail: card.company_email,
          companyAddress: card.company_address,
          companyMapsLink: card.company_maps_link,
          website: card.website,
          category: card.category,
          businessDescription: card.description,
          keywords: card.keywords,
          businessHours: card.business_hours,
          offer: card.offer,
          services: card.services,
          logoUrl: card.logo_url,
          facebook: card.facebook,
          instagram: card.instagram,
          youtube: card.youtube,
          linkedin: card.linkedin,
          twitter: card.twitter,
          shareUrl,
        }}
      />
    </View>
  );
};

export default PublicCard;

