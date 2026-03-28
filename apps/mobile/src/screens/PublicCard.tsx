import { useMemo, useState } from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
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

const PublicCard = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = route?.params?.id as string | undefined;
  const { data: card, isLoading, error } = useDirectoryCard(id || "");
  const [showShareCard, setShowShareCard] = useState(false);
  const businessId = card?.business_card_id ?? card?.id ?? "";

  const shareUrl = useMemo(
    () => (id ? `https://instantlly.lovable.app/card/${id}` : "https://instantlly.lovable.app"),
    [id]
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background p-4 space-y-4">
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

  const handleShare = () => setShowShareCard(true);

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
          <ArrowLeft size={20} color="#111827" />
        </Pressable>
        <Text className="text-lg font-bold text-foreground">Business Card</Text>
        <Pressable onPress={handleShare}>
          <Share2 size={20} color="#9aa2b1" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 260 }} className="px-4 py-5 space-y-5">
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

        <View className="rounded-xl border border-border bg-card p-4 space-y-3">
          <Text className="text-sm font-semibold text-foreground">Contact Information</Text>
          <View className="space-y-2">
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
            {card.business_hours && (
              <View className="flex-row items-center gap-2">
                <Clock size={14} color="#6a7181" />
                <Text className="text-sm text-foreground">{card.business_hours}</Text>
              </View>
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
          <View className="rounded-xl border border-border bg-card p-4 space-y-3">
            <Text className="text-sm font-semibold text-foreground">Company Details</Text>
            <View className="space-y-2">
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

        {card.services && card.services.length > 0 && (
          <View className="space-y-2">
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
          <View className="space-y-2">
            <Text className="text-sm font-semibold text-foreground">Social Media</Text>
            <View className="flex-row gap-3">
              {socialLinks.map(({ url, label, icon: Icon }) => (
                <Pressable
                  key={label}
                  onPress={() => openUrl(url!.startsWith("http") ? url! : `https://${url}`)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-muted"
                >
                  <Icon size={16} color="#111827" />
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

      <View className="absolute bottom-48 left-0 right-0 border-t border-border bg-card px-4 py-3 flex-row gap-2">
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
          <Share2 size={14} color="#111827" /> Share
        </Button>
        {card.email && (
          <Button
            variant="outline"
            className="flex-1 gap-1.5 rounded-xl py-4"
            onPress={() => openUrl(`mailto:${card.email}`)}
          >
            <Mail size={14} color="#111827" /> Email
          </Button>
        )}
      </View>

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
    </View>
  );
};

export default PublicCard;

