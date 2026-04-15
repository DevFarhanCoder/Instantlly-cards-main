import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Contacts from "expo-contacts";
import { Search, X } from "lucide-react-native";
import { Button } from "./ui/button";
import { useMatchContactsMutation, type AppUser } from "../store/api/usersApi";
import { useShareCardMutation } from "../store/api/businessCardsApi";
import { toast } from "../lib/toast";
import { colors } from "../theme/colors";

interface DeviceContact {
  name: string;
  phone: string; // always last-10 digits normalized
}

/** Strip every non-digit, then keep only the last 10 digits.
 *  Handles +91 9876543210, 09876543210, 919876543210, etc. */
function normalizePhone(raw: string): string {
  const digits = String(raw).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  cardId: number;
  cardName: string;
}

export default function ContactPickerModal({ visible, onClose, cardId, cardName }: Props) {
  const [allContacts, setAllContacts] = useState<DeviceContact[]>([]);
  const [appUserMap, setAppUserMap] = useState<Map<string, AppUser>>(new Map());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [sent, setSent] = useState<Set<number>>(new Set());
  const [sending, setSending] = useState<number | null>(null);

  const [matchContacts] = useMatchContactsMutation();
  const [shareCard] = useShareCardMutation();

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== "granted") {
        toast.error("Contacts permission denied");
        onClose();
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      });

      // Build flat list of unique contacts (one entry per unique normalized phone)
      const seen = new Set<string>();
      const contacts: DeviceContact[] = [];
      for (const c of data) {
        const name = c.name ?? "";
        for (const p of c.phoneNumbers ?? []) {
          const phone = normalizePhone(p.number ?? "");
          if (phone.length >= 7 && !seen.has(phone)) {
            seen.add(phone);
            contacts.push({ name, phone });
          }
        }
      }

      setAllContacts(contacts);

      // Match against app users
      const phones = contacts.map((c) => c.phone);
      if (phones.length > 0) {
        try {
          const matched = await matchContacts({ phones }).unwrap();
          console.log("[ContactPicker] sent", phones.length, "phones to API");
          console.log("[ContactPicker] API returned", matched.length, "app users:");
          matched.forEach(u => console.log("  DB user phone:", JSON.stringify(u.phone), "→ normalized:", normalizePhone(u.phone)));
          const map = new Map<string, AppUser>();
          for (const u of matched) {
            // normalize the DB phone to the same last-10 format so
            // the map key always matches the device contact phone key
            map.set(normalizePhone(u.phone), u);
          }
          console.log("[ContactPicker] map keys:", [...map.keys()]);
          console.log("[ContactPicker] first 5 device phones:", phones.slice(0, 5));
          setAppUserMap(map);
        } catch (e) {
          console.error("[ContactPicker] matchContacts API failed:", e);
          // Matching failed — still show all contacts, just no "Send" buttons
          setAppUserMap(new Map());
        }
      }
    } catch (err) {
      console.error("[ContactPickerModal] loadContacts error:", err);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [matchContacts, onClose]);

  useEffect(() => {
    if (visible) {
      setSent(new Set());
      setSearch("");
      loadContacts();
    }
  }, [visible, loadContacts]);

  const handleSend = async (appUser: AppUser) => {
    setSending(appUser.id);
    try {
      await shareCard({ card_id: cardId, recipient_user_id: appUser.id }).unwrap();
      setSent((prev) => new Set(prev).add(appUser.id));
      toast.success(`Card sent to ${appUser.name || appUser.phone}`);
    } catch {
      toast.error("Failed to send card");
    } finally {
      setSending(null);
    }
  };

  const handleInvite = (contact: DeviceContact) => {
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://instantlly.lovable.app";
    const msg = `Hey! I'm using Instantlly Cards to share my business card digitally. Download it here: ${webUrl}`;
    Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent(msg)}`).catch(() =>
      Linking.openURL(`whatsapp://send?phone=${contact.phone}&text=${encodeURIComponent(msg)}`)
    );
  };

  // Sort: app users first, then rest alphabetically
  const filtered = allContacts
    .filter((c) => {
      if (!search) return true;
      return (
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.includes(search)
      );
    })
    .sort((a, b) => {
      const aIsApp = appUserMap.has(a.phone);
      const bIsApp = appUserMap.has(b.phone);
      if (aIsApp && !bIsApp) return -1;
      if (!aIsApp && bIsApp) return 1;
      return a.name.localeCompare(b.name);
    });

  const appCount = [...appUserMap.keys()].filter((p) =>
    allContacts.some((c) => c.phone === p)
  ).length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="border-b border-border bg-card px-4 pt-12 pb-4 flex-row items-center gap-3">
          <Pressable onPress={onClose} className="p-1">
            <X size={22} color={colors.foreground} />
          </Pressable>
          <View className="flex-1">
            <Text className="text-lg font-bold text-foreground">Share Within App</Text>
            <Text className="text-xs text-muted-foreground" numberOfLines={1}>
              "{cardName}"
            </Text>
          </View>
        </View>

        {/* Search */}
        <View className="px-4 pt-3 pb-2">
          <View className="flex-row items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5">
            <Search size={16} color={colors.mutedForeground} />
            <TextInput
              className="flex-1 text-sm text-foreground"
              placeholder="Search contacts..."
              placeholderTextColor={colors.mutedForeground}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>

        {loading ? (
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-sm text-muted-foreground">Loading contacts...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-4xl mb-3">ðŸ“­</Text>
            <Text className="text-sm font-semibold text-foreground">No contacts found</Text>
          </View>
        ) : (
          <>
            <View className="px-4 py-2 flex-row items-center gap-2">
              <Text className="text-xs text-muted-foreground">
                {filtered.length} contact{filtered.length !== 1 ? "s" : ""}
              </Text>
              {appCount > 0 && (
                <Text className="text-xs font-semibold text-primary">
                  · {appCount} on Instantlly
                </Text>
              )}
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.phone}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32, gap: 8 }}
              renderItem={({ item }) => {
                const appUser = appUserMap.get(item.phone);
                const isAppUser = !!appUser;
                const alreadySent = appUser ? sent.has(appUser.id) : false;

                return (
                  <View
                    className={`flex-row items-center gap-3 rounded-xl border p-3 ${
                      isAppUser ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                    }`}
                  >
                    <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
                      {appUser?.profile_picture ? (
                        <Image
                          source={{ uri: appUser.profile_picture }}
                          style={{ width: 44, height: 44 }}
                        />
                      ) : (
                        <Text className="text-lg font-bold text-primary">
                          {(item.name || item.phone)[0].toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
                          {item.name || item.phone}
                        </Text>
                        {isAppUser && (
                          <Text className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                            Instantlly
                          </Text>
                        )}
                      </View>
                      <Text className="text-xs text-muted-foreground">{item.phone}</Text>
                    </View>
                    {isAppUser && appUser ? (
                      <Button
                        size="sm"
                        variant={alreadySent ? "outline" : "default"}
                        className="rounded-lg"
                        onPress={() => !alreadySent && handleSend(appUser)}
                        disabled={sending === appUser.id || alreadySent}
                      >
                        {sending === appUser.id ? (
                          <ActivityIndicator size="small" color="#ffffff" />
                        ) : alreadySent ? (
                          <Text className="text-xs font-semibold text-muted-foreground">✓ Sent</Text>
                        ) : (
                          <Text className="text-xs font-semibold text-primary-foreground">Send</Text>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onPress={() => handleInvite(item)}
                      >
                        <Text className="text-xs font-semibold text-muted-foreground">Invite</Text>
                      </Button>
                    )}
                  </View>
                );
              }}
            />
          </>
        )}
      </View>
    </Modal>
  );
}
