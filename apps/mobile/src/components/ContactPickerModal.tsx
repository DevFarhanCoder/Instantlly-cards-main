import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Contacts from "expo-contacts";
import { Search, X } from "lucide-react-native";
import { Button } from "./ui/button";
import { useMatchContactsMutation, type AppUser } from "../store/api/usersApi";
import { useShareCardMutation, useGetSharedCardsQuery } from "../store/api/businessCardsApi";
import { toast } from "../lib/toast";
import { colors } from "../theme/colors";

interface DeviceContact {
  name: string;
  phone: string;
}

function normalizePhone(raw: string): string {
  const digits = String(raw).replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

type TabKey = "new" | "sent";

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
  const [sending, setSending] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>("new");

  const [matchContacts] = useMatchContactsMutation();
  const [shareCard] = useShareCardMutation();

  const { data: sharedCards = [], refetch: refetchShared } = useGetSharedCardsQuery(undefined, {
    skip: !visible,
  });

  const previouslySentIds = useMemo(() => {
    const ids = new Set<number>();
    for (const s of sharedCards) {
      if (s.card_id === cardId) {
        const rid = parseInt(s.recipient_id);
        if (!isNaN(rid) && rid > 0) ids.add(rid);
      }
    }
    return ids;
  }, [sharedCards, cardId]);

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

      const phones = contacts.map((c) => c.phone);
      if (phones.length > 0) {
        try {
          const matched = await matchContacts({ phones }).unwrap();
          const map = new Map<string, AppUser>();
          for (const u of matched) {
            map.set(normalizePhone(u.phone), u);
          }
          setAppUserMap(map);
        } catch {
          setAppUserMap(new Map());
        }
      }
    } catch {
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  }, [matchContacts, onClose]);

  useEffect(() => {
    if (visible) {
      setSent(new Set());
      setSelectedIds(new Set());
      setSearch("");
      setActiveTab("new");
      loadContacts();
      refetchShared();
    }
  }, [visible, loadContacts, refetchShared]);

  const toggleSelect = (userId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const sortedContacts = useMemo(() => {
    return allContacts
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
  }, [allContacts, search, appUserMap]);

  const newContacts = useMemo(() => {
    return sortedContacts.filter((c) => {
      const appUser = appUserMap.get(c.phone);
      if (!appUser) return true;
      return !previouslySentIds.has(appUser.id) && !sent.has(appUser.id);
    });
  }, [sortedContacts, appUserMap, previouslySentIds, sent]);

  const sentContacts = useMemo(() => {
    return sortedContacts.filter((c) => {
      const appUser = appUserMap.get(c.phone);
      if (!appUser) return false;
      return previouslySentIds.has(appUser.id) || sent.has(appUser.id);
    });
  }, [sortedContacts, appUserMap, previouslySentIds, sent]);

  // Auto-switch tab when searching: if current tab is empty but other has results, switch
  useEffect(() => {
    if (!search) return;
    if (activeTab === "new" && newContacts.length === 0 && sentContacts.length > 0) {
      setActiveTab("sent");
    } else if (activeTab === "sent" && sentContacts.length === 0 && newContacts.length > 0) {
      setActiveTab("new");
    }
  }, [search, newContacts.length, sentContacts.length, activeTab]);

  const selectableIds = useMemo(() => {
    const ids: number[] = [];
    for (const c of newContacts) {
      const appUser = appUserMap.get(c.phone);
      if (appUser) ids.push(appUser.id);
    }
    return ids;
  }, [newContacts, appUserMap]);

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const handleSendSelected = async () => {
    const toSend = selectableIds.filter((id) => selectedIds.has(id));
    if (toSend.length === 0) {
      toast.error("Select at least one contact");
      return;
    }
    setSending(true);
    let successCount = 0;
    for (const userId of toSend) {
      try {
        await shareCard({ card_id: cardId, recipient_user_id: userId }).unwrap();
        setSent((prev) => new Set(prev).add(userId));
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(userId); return n; });
        successCount++;
      } catch {
        // continue with remaining
      }
    }
    if (successCount > 0) {
      toast.success(`Card sent to ${successCount} contact${successCount > 1 ? "s" : ""}!`);
    } else {
      toast.error("Failed to send cards");
    }
    setSending(false);
  };

  const handleInvite = (contact: DeviceContact) => {
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://instantlly.lovable.app";
    const msg = `Hey! I'm using Instantlly Cards to share my business card digitally. Download it here: ${webUrl}`;
    Linking.openURL(`sms:${contact.phone}?body=${encodeURIComponent(msg)}`).catch(() =>
      Linking.openURL(`whatsapp://send?phone=${contact.phone}&text=${encodeURIComponent(msg)}`)
    );
  };

  const contactTabs: TabKey[] = ["new", "sent"];
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 20,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          setActiveTab((prev) => {
            const i = contactTabs.indexOf(prev);
            return i < contactTabs.length - 1 ? contactTabs[i + 1] : prev;
          });
        } else if (g.dx > 50) {
          setActiveTab((prev) => {
            const i = contactTabs.indexOf(prev);
            return i > 0 ? contactTabs[i - 1] : prev;
          });
        }
      },
    })
  ).current;

  const activeList = activeTab === "new" ? newContacts : sentContacts;

  const renderContact = ({ item }: { item: DeviceContact }) => {
    const appUser = appUserMap.get(item.phone);
    const isAppUser = !!appUser;
    const isSent = appUser ? (previouslySentIds.has(appUser.id) || sent.has(appUser.id)) : false;
    const isChecked = appUser ? selectedIds.has(appUser.id) : false;

    return (
      <Pressable
        onPress={() => {
          if (isAppUser && appUser && !isSent) toggleSelect(appUser.id);
        }}
        className={`flex-row items-center gap-3 rounded-xl border p-3 ${
          isAppUser ? "border-primary/30 bg-primary/5" : "border-border bg-card"
        }`}
      >
        {isAppUser && !isSent ? (
          <View
            style={{
              width: 22, height: 22, borderRadius: 4,
              borderWidth: 2,
              borderColor: isChecked ? colors.primary : '#D1D5DB',
              backgroundColor: isChecked ? colors.primary : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isChecked && <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>✓</Text>}
          </View>
        ) : null}

        <View className="h-11 w-11 items-center justify-center rounded-full bg-primary/10 overflow-hidden">
          {appUser?.profile_picture ? (
            <Image source={{ uri: appUser.profile_picture }} style={{ width: 44, height: 44 }} />
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
          </View>
          <Text className="text-xs text-muted-foreground">{item.phone}</Text>
        </View>

        {isSent ? (
          <View style={{ alignItems: 'flex-end', gap: 2, maxWidth: 120 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View
                style={{
                  width: 18, height: 18, borderRadius: 9,
                  backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓</Text>
              </View>
              <Text className="text-xs font-semibold text-emerald-600">Sent</Text>
            </View>
            <Text style={{ fontSize: 10, color: '#6B7280' }} numberOfLines={1}>
              {cardName}
            </Text>
          </View>
        ) : !isAppUser ? (
          <Button size="sm" variant="outline" className="rounded-lg" onPress={() => handleInvite(item)}>
            <Text className="text-xs font-semibold text-muted-foreground">Invite</Text>
          </Button>
        ) : null}
      </Pressable>
    );
  };

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

        {/* Tabs */}
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', backgroundColor: '#fff' }}>
          <Pressable
            onPress={() => setActiveTab("new")}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === "new" ? colors.primary : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 13, fontWeight: '600',
              color: activeTab === "new" ? colors.primary : '#6B7280',
            }}>
              New ({newContacts.length})
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("sent")}
            style={{
              flex: 1, alignItems: 'center', paddingVertical: 10,
              borderBottomWidth: 2,
              borderBottomColor: activeTab === "sent" ? '#10B981' : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 13, fontWeight: '600',
              color: activeTab === "sent" ? '#10B981' : '#6B7280',
            }}>
              Already Sent ({sentContacts.length})
            </Text>
          </Pressable>
        </View>

        <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        {loading ? (
          <View className="flex-1 items-center justify-center gap-3">
            <ActivityIndicator color={colors.primary} />
            <Text className="text-sm text-muted-foreground">Loading contacts...</Text>
          </View>
        ) : activeList.length === 0 ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text style={{ fontSize: 36, marginBottom: 12 }}>
              {activeTab === "new" ? "🎉" : "📭"}
            </Text>
            <Text className="text-sm font-semibold text-foreground">
              {activeTab === "new" ? "All contacts have been sent this card!" : "No contacts sent yet"}
            </Text>
          </View>
        ) : (
          <>
            {activeTab === "new" && selectableIds.length > 0 && (
              <View className="px-4 py-2 flex-row items-center justify-between">
                <Text className="text-xs text-muted-foreground">
                  {newContacts.length} contact{newContacts.length !== 1 ? "s" : ""}
                  {selectableIds.length > 0 ? ` · ${selectableIds.length} on Instantlly` : ""}
                </Text>
                <Pressable onPress={handleSelectAll} className="flex-row items-center gap-2 px-2 py-1">
                  <View
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      borderWidth: 2,
                      borderColor: allSelected ? colors.primary : '#D1D5DB',
                      backgroundColor: allSelected ? colors.primary : 'transparent',
                      alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {allSelected && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                  </View>
                  <Text className="text-xs font-semibold text-foreground">
                    {allSelected ? 'Deselect All' : 'Select All'}
                  </Text>
                </Pressable>
              </View>
            )}

            {activeTab === "sent" && (
              <View className="px-4 py-2">
                <Text className="text-xs text-muted-foreground">
                  {sentContacts.length} contact{sentContacts.length !== 1 ? "s" : ""} already received this card
                </Text>
              </View>
            )}

            <FlatList
              data={activeList}
              keyExtractor={(item) => item.phone}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100, gap: 8 }}
              renderItem={renderContact}
            />

            {activeTab === "new" && selectedIds.size > 0 && (
              <View
                style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB',
                  paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 28,
                }}
              >
                <Pressable
                  onPress={handleSendSelected}
                  disabled={sending}
                  style={{
                    backgroundColor: sending ? '#9CA3AF' : colors.primary,
                    height: 50, borderRadius: 12,
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>
                      Send to {selectedIds.size} Contact{selectedIds.size > 1 ? 's' : ''}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </>
        )}
        </View>
      </View>
    </Modal>
  );
}
