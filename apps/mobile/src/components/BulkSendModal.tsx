import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Send, X, ChevronRight, CheckCircle2, Lock, Globe } from "lucide-react-native";
import { useBusinessCards, type BusinessCardRow } from "../hooks/useBusinessCards";
import { useBulkSendCardMutation } from "../store/api/businessCardsApi";
import { categories } from "../data/categories";
import { subCategories } from "../data/mockData";
import { colors } from "../theme/colors";
import { toast } from "../lib/toast";

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface SendLevel {
  id: string;
  label: string;
  emoji: string;
  free: boolean;
  description: string;
}

const SEND_LEVELS: SendLevel[] = [
  { id: "zone",     label: "Zone",     emoji: "🌐", free: true,  description: "Reach users in your local zone" },
  { id: "state",    label: "State",    emoji: "🗺️",  free: false, description: "Reach users across the state" },
  { id: "division", label: "Division", emoji: "📍", free: false, description: "Target a specific division" },
  { id: "pincode",  label: "Pincode",  emoji: "📮", free: false, description: "Reach a specific pincode area" },
  { id: "village",  label: "Village",  emoji: "🏘️",  free: false, description: "Reach a specific village" },
];

export interface SentCardRecord {
  id: string;
  cardId: string;
  cardName: string;
  cardCategory: string | null;
  cardLogo: string | null;
  sentTo: string;
  sentToEmoji: string;
  sentToType: "category" | "subcategory";
  sentAt: string;
  level?: string;
  levelLabel?: string;
}

const SENT_CARDS_KEY = "bulk_sent_cards";

export async function getBulkSentCards(): Promise<SentCardRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(SENT_CARDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveBulkSentCard(record: SentCardRecord) {
  const existing = await getBulkSentCards();
  existing.unshift(record);
  await AsyncStorage.setItem(SENT_CARDS_KEY, JSON.stringify(existing.slice(0, 100)));
}

type Step = "select-card" | "select-audience" | "select-level";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BulkSendModal({ open, onClose }: Props) {
  const { cards, isLoading } = useBusinessCards();
  const [bulkSendTrigger] = useBulkSendCardMutation();
  const [step, setStep] = useState<Step>("select-card");
  const [selectedCard, setSelectedCard] = useState<BusinessCardRow | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<SendLevel | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentAudiences, setSentAudiences] = useState<Set<string>>(new Set());
  const [sentLevelKeys, setSentLevelKeys] = useState<Set<string>>(new Set());
  const insets = useSafeAreaInsets();

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep("select-card");
      setSelectedCard(null);
      setSelectedCategory(null);
      setSelectedSubCategory(null);
      setSelectedLevel(null);
      setSentAudiences(new Set());
      setSentLevelKeys(new Set());
    }, 300);
  };

  const handleSelectCard = async (card: BusinessCardRow) => {
    setSelectedCard(card);
    const allSent = await getBulkSentCards();
    const filtered = allSent.filter((r) => r.cardId === card.id);
    setSentAudiences(new Set(filtered.map((r) => r.sentTo)));
    setSentLevelKeys(new Set(filtered.flatMap((r) => r.level ? [r.sentTo + "|" + r.level] : [])));
    setStep("select-audience");
  };

  const audience = selectedSubCategory ?? selectedCategory;

  const handleSend = async () => {
    if (!selectedCard || !audience || !selectedLevel) return;
    setIsSending(true);
    try {
      const result = await bulkSendTrigger({
        card_id: parseInt(selectedCard.id, 10),
        audience: audience.name,
        audience_type: selectedSubCategory ? "subcategory" : "category",
        level: selectedLevel.id,
      }).unwrap();

      // Also persist locally for the Sent tab (offline-friendly)
      const record: SentCardRecord = {
        id: `sent-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        cardId: selectedCard.id,
        cardName: selectedCard.full_name,
        cardCategory: selectedCard.category,
        cardLogo: selectedCard.logo_url,
        sentTo: audience.name,
        sentToEmoji: audience.emoji,
        sentToType: selectedSubCategory ? "subcategory" : "category",
        sentAt: new Date().toISOString(),
        level: selectedLevel.id,
        levelLabel: selectedLevel.label,
      };
      await saveBulkSentCard(record);

      setSentAudiences((prev) => new Set([...prev, audience.name]));
      setSentLevelKeys((prev) => new Set([...prev, audience.name + "|" + selectedLevel.id]));

      const sentCount = result.sent ?? 0;
      toast.success(
        sentCount > 0
          ? `Card sent to ${sentCount} people in "${audience.name}" at ${selectedLevel.label} level!`
          : result.message || `Card queued for "${audience.name}"`
      );
      handleClose();
    } catch (err: any) {
      toast.error(err?.data?.error || "Failed to send card. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={handleClose} />
          <View style={[styles.sheet, { maxHeight: SCREEN_HEIGHT * 0.88, paddingBottom: insets.bottom + 16 }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerTitleRow}>
                <Send size={16} color={colors.primary} />
                <Text style={styles.title}>Bulk Send Card</Text>
              </View>
              <Text style={styles.stepLabel}>
                {step === "select-card"
                  ? "Step 1 of 3 — Select your card"
                  : step === "select-audience"
                  ? "Step 2 of 3 — Select audience"
                  : "Step 3 of 3 — Choose send level"}
              </Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={[styles.progressSegment, styles.progressActive]} />
            <View style={[styles.progressSegment, (step === "select-audience" || step === "select-level") ? styles.progressActive : styles.progressInactive]} />
            <View style={[styles.progressSegment, step === "select-level" ? styles.progressActive : styles.progressInactive]} />
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>
            {/* STEP 1: Select card */}
            {step === "select-card" && (
              <View>
                <Text style={styles.sectionTitle}>Select a Business Card</Text>
                <Text style={styles.sectionSubtitle}>Choose which card you want to send</Text>

                {isLoading ? (
                  <View style={styles.centered}>
                    <ActivityIndicator size="large" color={colors.primary} />
                  </View>
                ) : cards.length === 0 ? (
                  <View style={styles.centered}>
                    <Text style={styles.emptyEmoji}>📭</Text>
                    <Text style={styles.emptyTitle}>No business cards yet</Text>
                    <Text style={styles.emptySubtitle}>Create a card first to bulk send it.</Text>
                  </View>
                ) : (
                  cards.map((card) => (
                    <Pressable key={card.id} style={styles.cardItem} onPress={() => handleSelectCard(card)}>
                      <View style={styles.cardLogo}>
                        {card.logo_url ? (
                          <Image source={{ uri: card.logo_url }} style={styles.logoImage} />
                        ) : (
                          <Text style={styles.logoEmoji}>🏢</Text>
                        )}
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.cardName} numberOfLines={1}>{card.full_name}</Text>
                        {card.job_title && (
                          <Text style={styles.cardJobTitle} numberOfLines={1}>{card.job_title}</Text>
                        )}
                        {card.category && (
                          <View style={styles.categoryBadge}>
                            <Text style={styles.categoryBadgeText}>{card.category}</Text>
                          </View>
                        )}
                      </View>
                      <ChevronRight size={16} color={colors.mutedForeground} />
                    </Pressable>
                  ))
                )}
              </View>
            )}

            {/* STEP 2: Select audience */}
            {step === "select-audience" && (
              <View>
                {/* Selected card summary */}
                {selectedCard && (
                  <View style={styles.selectedCardSummary}>
                    <View style={styles.summaryLogo}>
                      {selectedCard.logo_url ? (
                        <Image source={{ uri: selectedCard.logo_url }} style={styles.logoImageSm} />
                      ) : (
                        <Text style={{ fontSize: 16 }}>🏢</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardName} numberOfLines={1}>{selectedCard.full_name}</Text>
                      {selectedCard.category && (
                        <Text style={styles.sectionSubtitle}>{selectedCard.category}</Text>
                      )}
                    </View>
                    <Pressable onPress={() => { setSelectedCard(null); setStep("select-card"); }}>
                      <Text style={styles.changeBtn}>Change</Text>
                    </Pressable>
                  </View>
                )}

                {/* Categories grid */}
                <Text style={styles.sectionTitle}>Select Category</Text>
                <Text style={styles.sectionSubtitle}>Your card will be sent to all in this category</Text>

                <View style={styles.categoriesGrid}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategory?.id === cat.id;
                    const wasSent = sentAudiences.has(cat.name);
                    return (
                      <Pressable
                        key={cat.id}
                        style={[styles.catItem, isSelected && styles.catItemSelected, wasSent && styles.catItemSent]}
                        onPress={() => { setSelectedCategory(cat); setSelectedSubCategory(null); }}
                      >
                        <Text style={styles.catEmoji}>{cat.emoji}</Text>
                        <Text style={[styles.catName, isSelected && styles.catNameSelected, wasSent && styles.catNameSent]} numberOfLines={2}>
                          {cat.name}
                        </Text>
                        {wasSent
                          ? <CheckCircle2 size={12} color={colors.success} />
                          : isSelected && <CheckCircle2 size={12} color={colors.primary} />}
                      </Pressable>
                    );
                  })}
                </View>

                {/* Subcategories */}
                <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Or Select Subcategory</Text>
                <Text style={styles.sectionSubtitle}>Narrow down to a specific type</Text>

                <View style={styles.subCatsRow}>
                  {subCategories
                    .filter((s) => s.id !== "all")
                    .map((sub) => {
                      const isSelected = selectedSubCategory?.id === sub.id;
                      const wasSent = sentAudiences.has(sub.name);
                      return (
                        <Pressable
                          key={sub.id}
                          style={[styles.subCatChip, isSelected && styles.subCatChipSelected, wasSent && styles.subCatChipSent]}
                          onPress={() => setSelectedSubCategory(sub)}
                        >
                          <Text style={styles.subCatEmoji}>{sub.emoji}</Text>
                          <Text style={[styles.subCatText, isSelected && styles.subCatTextSelected, wasSent && styles.subCatTextSent]}>
                            {sub.name}{wasSent ? " ✓" : ""}
                          </Text>
                        </Pressable>
                      );
                    })}
                </View>

                {/* Audience preview */}
                {audience && (
                  <View style={styles.audiencePreview}>
                    <Text style={{ fontSize: 20 }}>{audience.emoji}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.audienceTitle}>Sending to: {audience.name}</Text>
                      <Text style={styles.sectionSubtitle}>
                        {selectedSubCategory ? "Subcategory" : "Category"} audience
                      </Text>
                    </View>
                  </View>
                )}

                {/* Already-sent warning */}
                {sentAudiences.has(audience?.name ?? "") && audience && (
                  <View style={styles.alreadySentBanner}>
                    <CheckCircle2 size={16} color={colors.success} />
                    <Text style={styles.alreadySentText}>
                      Card already sent to {audience.name} (at some level)
                    </Text>
                  </View>
                )}

                {/* Next: Choose Level button */}
                <Pressable
                  style={[styles.nextBtn, !audience && styles.nextBtnDisabled]}
                  onPress={() => { if (audience) { setSelectedLevel(null); setStep("select-level"); } }}
                  disabled={!audience}
                >
                  <Text style={styles.nextBtnText}>Next: Choose Level →</Text>
                </Pressable>
              </View>
            )}

            {/* STEP 3: Select send level */}
            {step === "select-level" && (
              <View>
                {/* Card + Audience summary */}
                <View style={styles.step3Summary}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardName} numberOfLines={1}>{selectedCard?.full_name}</Text>
                    <Text style={styles.sectionSubtitle}>
                      {audience?.emoji} {audience?.name} · {selectedSubCategory ? "Subcategory" : "Category"}
                    </Text>
                  </View>
                  <Pressable onPress={() => setStep("select-audience")}>
                    <Text style={styles.changeBtn}>← Back</Text>
                  </Pressable>
                </View>

                <Text style={styles.sectionTitle}>Choose Send Level</Text>
                <Text style={styles.sectionSubtitle}>Select how wide you want to reach your audience</Text>

                {SEND_LEVELS.map((level) => {
                  const isSelected = selectedLevel?.id === level.id;
                  const alreadySentKey = audience ? sentLevelKeys.has(audience.name + "|" + level.id) : false;
                  return (
                    <Pressable
                      key={level.id}
                      style={[styles.levelItem, isSelected && styles.levelItemSelected, alreadySentKey && styles.levelItemSent]}
                      onPress={() => setSelectedLevel(level)}
                    >
                      <Text style={styles.levelEmoji}>{level.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={styles.levelLabelRow}>
                          <Text style={[styles.levelLabel, isSelected && styles.levelLabelSelected]}>{level.label}</Text>
                          {level.free
                            ? <View style={styles.freeBadge}><Text style={styles.freeBadgeText}>FREE</Text></View>
                            : <View style={styles.paidBadge}><Lock size={10} color="#92400e" /><Text style={styles.paidBadgeText}>PAID</Text></View>}
                          {alreadySentKey && <CheckCircle2 size={14} color={colors.success} />}
                        </View>
                        <Text style={styles.levelDesc}>{level.description}</Text>
                      </View>
                      <View style={[styles.levelRadio, isSelected && styles.levelRadioSelected]}>
                        {isSelected && <View style={styles.levelRadioDot} />}
                      </View>
                    </Pressable>
                  );
                })}

                {/* Already sent at this exact level */}
                {selectedLevel && audience && sentLevelKeys.has(audience.name + "|" + selectedLevel.id) && (
                  <View style={styles.alreadySentBanner}>
                    <CheckCircle2 size={16} color={colors.success} />
                    <Text style={styles.alreadySentText}>
                      Card already sent to {audience.name} at {selectedLevel.label} level
                    </Text>
                  </View>
                )}

                {/* Buy plan for paid levels */}
                {selectedLevel && !selectedLevel.free && !sentLevelKeys.has((audience?.name ?? "") + "|" + selectedLevel.id) && (
                  <Pressable
                    style={styles.buyPlanBtn}
                    onPress={() =>
                      Alert.alert(
                        "Upgrade Required",
                        `Sending at ${selectedLevel.label} level requires a paid plan. Upgrade to reach a wider audience.`,
                        [
                          { text: "Maybe Later", style: "cancel" },
                          { text: "Buy Plan", onPress: () => {} },
                        ]
                      )
                    }
                  >
                    <Lock size={16} color="#fff" />
                    <Text style={styles.buyPlanText}>Buy Plan — Send at {selectedLevel.label} Level</Text>
                  </Pressable>
                )}

                {/* Free send button (Zone only) */}
                {selectedLevel?.free && !sentLevelKeys.has((audience?.name ?? "") + "|" + selectedLevel.id) && (
                  <Pressable
                    style={[styles.sendButton, (!audience || isSending) && styles.sendButtonDisabled]}
                    onPress={handleSend}
                    disabled={!audience || isSending}
                  >
                    {isSending ? <ActivityIndicator color="#fff" size="small" /> : <Send size={16} color="#fff" />}
                    <Text style={styles.sendButtonText}>{isSending ? "Sending..." : "Send Card"}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: SCREEN_HEIGHT * 0.7,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.foreground,
    marginLeft: 6,
  },
  stepLabel: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: colors.muted,
  },
  progressBar: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 4,
  },
  progressActive: {
    backgroundColor: colors.primary,
  },
  progressInactive: {
    backgroundColor: colors.muted,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 20,
    paddingBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.mutedForeground,
    marginBottom: 12,
  },
  centered: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 4,
  },
  cardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  cardLogo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: `${colors.primary}1a`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  logoEmoji: {
    fontSize: 22,
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.foreground,
  },
  cardJobTitle: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "500",
    marginTop: 1,
  },
  categoryBadge: {
    marginTop: 4,
    backgroundColor: `${colors.primary}1a`,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  categoryBadgeText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: "500",
  },
  selectedCardSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}0d`,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  summaryLogo: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${colors.primary}1a`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImageSm: {
    width: 36,
    height: 36,
  },
  changeBtn: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: "600",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  catItem: {
    width: "30%",
    alignItems: "center",
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    gap: 4,
  },
  catItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}1a`,
  },
  catItemSent: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}15`,
  },
  catEmoji: {
    fontSize: 24,
  },
  catName: {
    fontSize: 10,
    fontWeight: "500",
    color: colors.foreground,
    textAlign: "center",
  },
  catNameSelected: {
    color: colors.primary,
  },
  catNameSent: {
    color: colors.success,
  },
  subCatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  subCatChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  subCatChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  subCatChipSent: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}15`,
  },
  subCatEmoji: {
    fontSize: 14,
  },
  subCatText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.foreground,
  },
  subCatTextSelected: {
    color: "#fff",
  },
  subCatTextSent: {
    color: colors.success,
  },
  audiencePreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.success}1a`,
    borderWidth: 1,
    borderColor: `${colors.success}33`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  alreadySentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${colors.success}15`,
    borderWidth: 1,
    borderColor: `${colors.success}40`,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  alreadySentText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.success,
    flex: 1,
  },
  audienceTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
  },
  sendButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  nextBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  nextBtnDisabled: {
    opacity: 0.4,
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  step3Summary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: `${colors.primary}0d`,
    borderWidth: 1,
    borderColor: `${colors.primary}33`,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  levelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  levelItemSelected: {
    borderColor: colors.primary,
    backgroundColor: `${colors.primary}0d`,
  },
  levelItemSent: {
    borderColor: colors.success,
    backgroundColor: `${colors.success}0d`,
  },
  levelEmoji: {
    fontSize: 28,
  },
  levelLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  levelLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  levelLabelSelected: {
    color: colors.primary,
  },
  levelDesc: {
    fontSize: 11,
    color: colors.mutedForeground,
  },
  freeBadge: {
    backgroundColor: `${colors.success}20`,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  freeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: colors.success,
  },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#fef3c7",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  paidBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#92400e",
  },
  levelRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  levelRadioSelected: {
    borderColor: colors.primary,
  },
  levelRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  buyPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f59e0b",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 8,
  },
  buyPlanText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
