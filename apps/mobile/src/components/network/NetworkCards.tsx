import { useEffect, useRef, useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { ArrowRight, Loader2, Phone, Plus, Users } from "lucide-react-native";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { colors } from "../../theme/colors";
import { useAuth } from "../../hooks/useAuth";
import {
  useNetworkCards,
  useSyncContacts,
  useSyncedContacts,
  isContactPickerSupported,
  pickContacts,
} from "../../hooks/useContactSync";

const NetworkCards = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { data: networkCards = [], isLoading } = useNetworkCards();
  const { data: syncedContacts = [] } = useSyncedContacts();
  const syncMutation = useSyncContacts();
  const [showManual, setShowManual] = useState(false);
  const [manualPhone, setManualPhone] = useState("");
  const [manualName, setManualName] = useState("");
  const autoSyncAttempted = useRef(false);

  useEffect(() => {
    if (!user || autoSyncAttempted.current || !isContactPickerSupported()) return;
    if (syncedContacts.length > 0) return;
    autoSyncAttempted.current = true;
    pickContacts().then((contacts) => {
      if (contacts.length > 0) syncMutation.mutate(contacts);
    });
  }, [user, syncedContacts.length, syncMutation]);

  const handleContactPicker = async () => {
    const contacts = await pickContacts();
    if (contacts.length > 0) syncMutation.mutate(contacts);
  };

  const handleManualAdd = () => {
    if (!manualPhone.trim()) return;
    syncMutation.mutate([
      {
        phone_number: manualPhone.trim(),
        contact_name: manualName.trim() || null,
      },
    ]);
    setManualPhone("");
    setManualName("");
    setShowManual(false);
  };

  if (!user) return null;

  return (
    <View className="space-y-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Users size={16} color={colors.primary} />
          <Text className="text-base font-bold text-foreground">My Network</Text>
          {networkCards.length > 0 && (
            <View className="rounded-full bg-primary/10 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-primary">{networkCards.length}</Text>
            </View>
          )}
        </View>
        <Pressable onPress={() => navigation.navigate("MyCards")} className="flex-row items-center gap-1">
          <Text className="text-xs font-semibold text-primary">View all</Text>
          <ArrowRight size={14} color={colors.primary} />
        </Pressable>
      </View>

      {isLoading ? (
        <View className="rounded-xl border border-border bg-card p-4 items-center">
          <Loader2 size={16} color={colors.primary} />
          <Text className="text-xs text-muted-foreground mt-2">Loading network...</Text>
        </View>
      ) : networkCards.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3">
            {networkCards.map((card: any) => (
              <Pressable
                key={card.id}
                onPress={() => navigation.navigate("BusinessDetail", { id: card.id })}
                className="w-36 rounded-xl border border-border bg-card p-3"
              >
                <View className="flex-row items-center gap-2 mb-2">
                  {card.logo_url ? (
                    <Image
                      source={{ uri: card.logo_url }}
                      style={{ height: 40, width: 40, borderRadius: 20 }}
                    />
                  ) : (
                    <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center">
                      <Text className="text-lg font-bold text-primary">
                        {card.full_name?.charAt(0) || "?"}
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
                  {card.full_name}
                </Text>
                {card.company_name ? (
                  <Text className="text-[10px] text-muted-foreground" numberOfLines={1}>
                    {card.company_name}
                  </Text>
                ) : null}
                {card.category ? (
                  <View className="mt-1 rounded-full bg-muted px-1.5 py-0.5 self-start">
                    <Text className="text-[9px] text-muted-foreground">{card.category}</Text>
                  </View>
                ) : null}
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <View className="rounded-xl border border-dashed border-border bg-muted/30 p-4 items-center">
          <Users size={28} color={colors.mutedForeground} />
          <Text className="text-xs text-muted-foreground text-center mt-2">
            Find friends & family who have business cards on Instantly
          </Text>
          <View className="flex-row gap-2 mt-3">
            <Button
              size="sm"
              variant="outline"
              className="rounded-lg text-xs gap-1"
              onPress={handleContactPicker}
            >
              <Phone size={12} color={colors.foreground} /> Sync Contacts
            </Button>
            <Button
              size="sm"
              className="rounded-lg text-xs gap-1"
              onPress={() => setShowManual(true)}
            >
              <Plus size={12} color="#fff" /> Add Manually
            </Button>
          </View>
        </View>
      )}

      <Dialog open={showManual} onOpenChange={setShowManual}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
          </DialogHeader>
          <View className="space-y-3">
            <Input
              placeholder="Contact name (optional)"
              value={manualName}
              onChangeText={setManualName}
              className="rounded-lg"
            />
            <Input
              placeholder="Phone number *"
              value={manualPhone}
              onChangeText={setManualPhone}
              keyboardType="phone-pad"
              className="rounded-lg"
            />
            <Button className="w-full rounded-xl" onPress={handleManualAdd}>
              Add Contact
            </Button>
          </View>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default NetworkCards;

