import { Linking, Text, View } from "react-native";
import { MessageCircle, Phone } from "lucide-react-native";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import {
  VOUCHER_ADMIN_COUNTRY_CODE,
  VOUCHER_ADMIN_NAME,
  VOUCHER_ADMIN_PHONE,
  buildVoucherRequestMessage,
  buildVoucherClaimMessage,
} from "../lib/voucherAdmin";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName?: string | null;
  businessName?: string | null;
  /** "create" (default) shows the voucher-creation gate; "claim" shows the claim-this-voucher gate. */
  mode?: "create" | "claim";
  /** Used when mode="claim" to build the pre-filled WhatsApp message. */
  voucherTitle?: string | null;
  /** Optional amount string (already formatted) shown in the claim message. */
  voucherPrice?: number | string | null;
}

/**
 * Contact gate shown when a user taps a voucher action that requires the admin
 * (Rajesh Modi). Offers WhatsApp + Call buttons with a pre-filled message.
 * - mode="create": user wants to create a voucher for their business.
 * - mode="claim":  user wants to claim a specific voucher.
 */
export function ContactVoucherAdminModal({
  open,
  onOpenChange,
  userName,
  businessName,
  mode = "create",
  voucherTitle,
  voucherPrice,
}: Props) {
  const fullPhone = `${VOUCHER_ADMIN_COUNTRY_CODE}${VOUCHER_ADMIN_PHONE}`;
  const message =
    mode === "claim"
      ? buildVoucherClaimMessage(userName, voucherTitle, voucherPrice)
      : buildVoucherRequestMessage(userName, businessName);

  const title = mode === "claim" ? "Claim Voucher" : "Create Voucher";
  const description =
    mode === "claim"
      ? (
          <>
            Voucher claims on Instantlly Cards are currently handled by our team. To claim
            {voucherTitle ? <Text className="font-semibold text-foreground"> "{voucherTitle}"</Text> : " this voucher"},
            please contact <Text className="font-semibold text-foreground">{VOUCHER_ADMIN_NAME}</Text>.
          </>
        )
      : (
          <>
            Voucher creation on Instantlly Cards is currently handled by our team. To get a voucher
            set up for your business, please contact{" "}
            <Text className="font-semibold text-foreground">{VOUCHER_ADMIN_NAME}</Text>.
          </>
        );

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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <View className="gap-3">
          <Text className="text-sm text-muted-foreground">{description}</Text>

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
