import { useRef } from "react";
import { Share, Text, View, Linking } from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { toast } from "../lib/toast";
import { useAuth } from "../hooks/useAuth";
import { useGetReferralStatsQuery } from "../store/api/referralApi";
import { generateAndShareCardImage } from "../utils/cardImageGenerator";
import BusinessCardTemplate from "./BusinessCardTemplate";

export type ShareCardData = {
  fullName: string;
  companyName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  location?: string | null;
  mapsLink?: string | null;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyAddress?: string | null;
  companyMapsLink?: string | null;
  website?: string | null;
  category?: string | null;
  businessDescription?: string | null;
  keywords?: string | null;
  businessHours?: string | null;
  offer?: string | null;
  services?: string[] | null;
  logoUrl?: string | null;
  profilePhotoUrl?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  youtube?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  shareUrl: string;
};

function fallbackCode(userId: number | string | undefined): string {
  if (!userId) return "------";
  const base = String(userId);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    const seed = (parseInt(base, 10) * (i + 7) + i * 13) % chars.length;
    code += chars[Math.abs(seed)];
  }

  return code;
}

export function buildReferralPlayStoreLink(referralCode?: string | null): string {
  const base = "https://play.google.com/store/apps/details?id=com.instantllycards.www.twa";
  const code = String(referralCode ?? "").trim();
  if (!code) return base;
  return `${base}&referrer=utm_source%3Dreferral%26utm_campaign%3D${encodeURIComponent(code)}`;
}

export function buildWhatsAppMessage(data: ShareCardData, referralPlayStoreLink?: string): string {
  const resolvedReferralLink = referralPlayStoreLink || buildReferralPlayStoreLink();
  const lines: string[] = ["*This is My Instantlly Digital Visiting Card* 📇\n"];

  // Personal details
  if (data.fullName) lines.push(`👤 *Name:* ${data.fullName}`);
  if (data.phone) lines.push(`📱 *Personal Phone:* ${data.phone}`);
  if (data.whatsapp) lines.push(`💬 *Personal WhatsApp:* ${data.whatsapp}`);
  if (data.email) lines.push(`📧 *Personal Email:* ${data.email}`);
  if (data.location) lines.push(`🏠 *Address:* ${data.location}`);
  if (data.mapsLink) lines.push(`📍 *Google Maps:* ${data.mapsLink}`);

  // Company details
  const hasCompany = data.companyName || data.companyPhone || data.companyEmail || data.companyAddress;
  if (hasCompany) lines.push("");
  if (data.companyName) lines.push(`🏢 *Company Name:* ${data.companyName}`);
  if (data.companyPhone) lines.push(`📱 *Company Phone:* ${data.companyPhone}`);
  if (data.jobTitle) lines.push(`💼 *Designation:* ${data.jobTitle}`);
  if (data.businessDescription) lines.push(`🏭 *Company Business:* ${data.businessDescription}`);
  if (data.category) lines.push(`🛠️ *Business Category:* ${data.category}`);
  if (data.keywords) lines.push(`🔎 *Search Keywords:* ${data.keywords}`);
  if (data.website) lines.push(`🌍 *Company Website:* ${data.website}`);
  if (data.companyEmail) lines.push(`📧 *Company Email:* ${data.companyEmail}`);
  if (data.companyAddress) lines.push(`🏭 *Company Address:* ${data.companyAddress}`);
  if (data.businessHours) lines.push(`🕐 *Business Hours:* ${data.businessHours}`);

  // Social media
  const hasSocial = data.facebook || data.instagram || data.youtube || data.linkedin || data.twitter;
  if (hasSocial) {
    lines.push("");
    lines.push("🔗 *Social Media:*");
    if (data.facebook) lines.push(`  👥 Facebook: ${data.facebook}`);
    if (data.instagram) lines.push(`  📸 Instagram: ${data.instagram}`);
    if (data.youtube) lines.push(`  ▶️ YouTube: ${data.youtube}`);
    if (data.linkedin) lines.push(`  🟦 LinkedIn: ${data.linkedin}`);
    if (data.twitter) lines.push(`  🐦 Twitter: ${data.twitter}`);
  }

  // Offer
  if (data.offer) {
    lines.push("");
    lines.push(`🎁 *Special Offer:* ${data.offer}`);
  }


  // Share link (future feature)
  // lines.push("");
  // lines.push(`🔗 *View My Card:* ${data.shareUrl}`);

  lines.push("");
  lines.push("Make your FREE Instantly Digital Visiting Card Download the *Mobile App* to create and share your own card!");
  lines.push("");
  lines.push(`Referrall Link : ${resolvedReferralLink}`);
  lines.push("Visit Website : www.Instantlly.com");

  return lines.join("\n");
}

interface ShareCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareCardData;
}

const ShareCardModal = ({ open, onOpenChange, data }: ShareCardModalProps) => {
  const { user } = useAuth();
  const { data: referralStats } = useGetReferralStatsQuery(undefined, { skip: !user });
  const referralCode = referralStats?.referralCode || fallbackCode(user?.id);
  const referralPlayStoreLink = buildReferralPlayStoreLink(referralCode === "------" ? null : referralCode);
  const cardViewRef = useRef<View>(null);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(data.shareUrl);
    toast.success("Link copied!");
  };

  const handleShare = async () => {
    try {
      const message = buildWhatsAppMessage(data, referralPlayStoreLink);
      await Share.share({
        title: data.fullName,
        message,
        url: data.shareUrl,
      });
    } catch {
      toast.error("Unable to share right now");
    }
  };

  const handleWhatsApp = async () => {
    try {
      const result = await generateAndShareCardImage(cardViewRef, data, "whatsapp");
      if (!result.success && result.error !== "native_module_not_available") {
        // Fallback to text-only if image capture fails
        const message = buildWhatsAppMessage(data, referralPlayStoreLink);
        const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
        const canOpen = await Linking.canOpenURL(whatsappUrl);
        if (canOpen) {
          await Linking.openURL(whatsappUrl);
        } else {
          await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
        }
      }
    } catch {
      toast.error("Unable to share card");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Business Card</DialogTitle>
        </DialogHeader>

        {/* Hidden off-screen card view — captured as image when sharing */}
        <View
          ref={cardViewRef}
          collapsable={false}
          style={{ position: 'absolute', left: -9999, top: 0 }}
        >
          <BusinessCardTemplate
            name={data.fullName}
            designation={data.jobTitle ?? ""}
            companyName={data.companyName ?? ""}
            personalPhone={data.phone ?? undefined}
            companyPhone={data.companyPhone ?? undefined}
            email={data.email ?? undefined}
            companyEmail={data.companyEmail ?? undefined}
            website={data.website ?? undefined}
            address={data.location ?? undefined}
            companyAddress={data.companyAddress ?? undefined}
            profilePhoto={data.profilePhotoUrl ?? undefined}
            companyPhoto={data.logoUrl ?? undefined}
            mapsLink={data.mapsLink ?? undefined}
            companyMapsLink={data.companyMapsLink ?? undefined}
            linkedin={data.linkedin ?? undefined}
            twitter={data.twitter ?? undefined}
            instagram={data.instagram ?? undefined}
            facebook={data.facebook ?? undefined}
            youtube={data.youtube ?? undefined}
            whatsapp={data.whatsapp ?? undefined}
          />
        </View>

        <View className="items-center gap-3 py-2">
          <QRCode value={data.shareUrl} size={160} />
          <Text className="text-xs text-muted-foreground text-center">
            Scan to open the card or share the link below
          </Text>
          <Text className="text-xs font-semibold text-foreground text-center">
            {data.fullName}
          </Text>
        </View>
        <View className="gap-2">
          <Button className="w-full rounded-xl bg-[#25D366]" onPress={handleWhatsApp}>
            <Text className="text-white font-bold text-base">📲 Share on WhatsApp</Text>
          </Button>
          <Button variant="outline" className="w-full rounded-xl" onPress={handleCopy}>
            Copy Link
          </Button>
        </View>
      </DialogContent>
    </Dialog>
  );
};

export default ShareCardModal;
