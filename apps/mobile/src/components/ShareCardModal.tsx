import { Share, Text, View, Linking } from "react-native";
import QRCode from "react-native-qrcode-svg";
import * as Clipboard from "expo-clipboard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { toast } from "../lib/toast";

export type ShareCardData = {
  fullName: string;
  companyName?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  website?: string | null;
  category?: string | null;
  offer?: string | null;
  services?: string[] | null;
  logoUrl?: string | null;
  shareUrl: string;
};

interface ShareCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareCardData;
}

const ShareCardModal = ({ open, onOpenChange, data }: ShareCardModalProps) => {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(data.shareUrl);
    toast.success("Link copied!");
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: data.fullName,
        message: `${data.fullName}${data.companyName ? ` — ${data.companyName}` : ""}\n${data.shareUrl}`,
        url: data.shareUrl,
      });
    } catch {
      toast.error("Unable to share right now");
    }
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `${data.fullName}${data.companyName ? ` — ${data.companyName}` : ""}\n${data.shareUrl}`
    );
    Linking.openURL(`https://wa.me/?text=${text}`).catch(() => {
      toast.error("Unable to open WhatsApp");
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Business Card</DialogTitle>
        </DialogHeader>
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
          <Button className="w-full rounded-xl" onPress={handleShare}>
            Share
          </Button>
          <Button variant="outline" className="w-full rounded-xl" onPress={handleWhatsApp}>
            Share on WhatsApp
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
