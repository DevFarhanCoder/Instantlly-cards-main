import { Linking, Text, View } from "react-native";
import { MessageCircle, Phone } from "lucide-react-native";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  VOUCHER_ADMIN_COUNTRY_CODE,
  VOUCHER_ADMIN_NAME,
  VOUCHER_ADMIN_PHONE,
  buildVoucherRequestMessage,
} from "../lib/voucherAdmin";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string | null;
  businessName?: string | null;
}

/**
 * Gate shown when a non-admin user taps "Create Voucher".
 * Offers WhatsApp + Call buttons that deep-link to Rajesh Modi with a
 * pre-filled request message.
 */
export function ContactVoucherAdminModal({ open, onOpenChange, userName, businessName }: Props) {
  const fullPhone = `${VOUCHER_ADMIN_COUNTRY_CODE}${VOUCHER_ADMIN_PHONE}`;
  const message = buildVoucherRequestMessage(userName, businessName);

  const openWhatsApp = async () => {
    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(waUrl);
    } catch {
      // Fallback to the whatsapp:// scheme if the https link fails.
      try {
        await Linking.openURL(`whatsapp://send?phone=${fullPhone}&text=${encodeURIComponent(message)}`);
      } catch {}
    }
    onOpenChange(false);
  };

  const openCall = async () => {
    try {
      await Linking.openURL(`tel:+${fullPhone}`);
    } catch {}
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Voucher</DialogTitle>
        </DialogHeader>

        <View className="gap-3">
          <Text className="text-sm text-muted-foreground">
            Voucher creation on Instantlly Cards is currently handled by our team. To get a voucher
            set up for your business, please contact{" "}
            <Text className="font-semibold text-foreground">{VOUCHER_ADMIN_NAME}</Text>.
          </Text>

          <View className="rounded-lg border border-border bg-muted/30 p-3">
            <Text className="text-[11px] uppercase tracking-wide text-muted-foreground">Contact</Text>
            <Text className="mt-0.5 text-base font-semibold text-foreground">
              {VOUCHER_ADMIN_NAME}
            </Text>
            <Text className="text-xs text-muted-foreground">+{fullPhone}</Text>
          </View>

          <View className="mt-1 gap-2">
            <Button
              className="w-full gap-2 rounded-xl bg-[#25D366]"
              onPress={openWhatsApp}
            >
              <MessageCircle size={16} color="#ffffff" />
              <Text className="text-sm font-semibold text-white">Message on WhatsApp</Text>
            </Button>

            <Button
              variant="outline"
              className="w-full gap-2 rounded-xl"
              onPress={openCall}
            >
              <Phone size={16} color="#2463eb" />
              <Text className="text-sm font-semibold text-primary">Call {VOUCHER_ADMIN_NAME}</Text>
            </Button>
          </View>
        </View>
      </DialogContent>
    </Dialog>
  );
}

export default ContactVoucherAdminModal;
