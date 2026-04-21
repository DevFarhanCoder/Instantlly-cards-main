import { useState } from "react";
import { Send, X, ChevronRight, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useBusinessCards, type BusinessCardRow } from "@/hooks/useBusinessCards";
import { categories } from "@/data/categories";
import { subCategories } from "@/data/mockData";

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
}

const SENT_CARDS_KEY = "bulk_sent_cards";

export function getBulkSentCards(): SentCardRecord[] {
  try {
    return JSON.parse(localStorage.getItem(SENT_CARDS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveBulkSentCard(record: SentCardRecord) {
  const existing = getBulkSentCards();
  existing.unshift(record);
  localStorage.setItem(SENT_CARDS_KEY, JSON.stringify(existing.slice(0, 100)));
}

type Step = "select-card" | "select-audience" | "confirm";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BulkSendModal({ open, onClose }: Props) {
  const { cards, isLoading } = useBusinessCards();
  const [step, setStep] = useState<Step>("select-card");
  const [selectedCard, setSelectedCard] = useState<BusinessCardRow | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [selectedSubCategory, setSelectedSubCategory] = useState<{ id: string; name: string; emoji: string } | null>(null);
  const [isSending, setIsSending] = useState(false);

  const handleClose = () => {
    onClose();
    // reset state after animation
    setTimeout(() => {
      setStep("select-card");
      setSelectedCard(null);
      setSelectedCategory(null);
      setSelectedSubCategory(null);
    }, 300);
  };

  const handleSelectCard = (card: BusinessCardRow) => {
    setSelectedCard(card);
    setStep("select-audience");
  };

  const handleSelectCategory = (cat: { id: string; name: string; emoji: string }) => {
    setSelectedCategory(cat);
    setSelectedSubCategory(null);
  };

  const handleSelectSubCategory = (sub: { id: string; name: string; emoji: string }) => {
    setSelectedSubCategory(sub);
  };

  const canProceedToConfirm = selectedCategory !== null || selectedSubCategory !== null;

  const audience = selectedSubCategory ?? selectedCategory;

  const handleSend = async () => {
    if (!selectedCard || !audience) return;
    setIsSending(true);
    await new Promise((r) => setTimeout(r, 800));

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
    };

    saveBulkSentCard(record);
    setIsSending(false);
    toast.success(`Card sent to ${audience.name}!`, {
      description: `"${selectedCard.full_name}" was bulk sent successfully.`,
    });
    handleClose();
  };

  const stepLabel = step === "select-card" ? "Step 1 of 2" : "Step 2 of 2";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl px-0 pb-8 max-h-[92dvh] flex flex-col"
      >
        {/* Header */}
        <SheetHeader className="px-5 pb-3 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Bulk Send Card
              </SheetTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stepLabel}</p>
            </div>
            <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex gap-1.5 mt-2">
            {(["select-card", "select-audience"] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step === s || (step === "confirm" && i <= 1)
                    ? "bg-primary"
                    : step === "select-audience" && i === 0
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              />
            ))}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {/* STEP 1: Select business card */}
            {step === "select-card" && (
              <motion.div
                key="step-card"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-5 pt-4 pb-4"
              >
                <p className="text-sm font-semibold text-foreground mb-1">Select a Business Card</p>
                <p className="text-[11px] text-muted-foreground mb-4">Choose which card you want to send</p>

                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : cards.length === 0 ? (
                  <div className="text-center py-10">
                    <span className="text-4xl">📭</span>
                    <p className="text-sm text-muted-foreground mt-2">No business cards yet</p>
                    <p className="text-xs text-muted-foreground">Create a business card first to bulk send it.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cards.map((card) => (
                      <motion.button
                        key={card.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelectCard(card)}
                        className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left hover:border-primary/50 hover:shadow-sm transition-all"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden shrink-0">
                          {card.logo_url ? (
                            <img src={card.logo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-xl">🏢</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">{card.full_name}</h3>
                          {card.job_title && (
                            <p className="text-[11px] text-primary font-medium truncate">{card.job_title}</p>
                          )}
                          {card.category && (
                            <span className="inline-block mt-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                              {card.category}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </motion.button>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* STEP 2: Select audience */}
            {step === "select-audience" && (
              <motion.div
                key="step-audience"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="px-5 pt-4 pb-4"
              >
                {/* Selected card summary */}
                {selectedCard && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-primary/5 border border-primary/20 p-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 overflow-hidden shrink-0">
                      {selectedCard.logo_url ? (
                        <img src={selectedCard.logo_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-base">🏢</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{selectedCard.full_name}</p>
                      {selectedCard.category && (
                        <p className="text-[10px] text-muted-foreground">{selectedCard.category}</p>
                      )}
                    </div>
                    <button
                      onClick={() => { setSelectedCard(null); setStep("select-card"); }}
                      className="text-[10px] text-primary font-medium shrink-0"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Categories */}
                <p className="text-sm font-semibold text-foreground mb-1">Select Category</p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Your card will be sent to all businesses in this category
                </p>

                <div className="grid grid-cols-3 gap-2 mb-5">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory?.id === cat.id;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => handleSelectCategory(cat)}
                        className={`flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border bg-card hover:border-primary/30 hover:bg-primary/5"
                        }`}
                      >
                        <span className="text-2xl">{cat.emoji}</span>
                        <span className={`text-[10px] font-medium leading-tight text-center ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {cat.name}
                        </span>
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-primary" />}
                      </button>
                    );
                  })}
                </div>

                {/* Subcategories */}
                <p className="text-sm font-semibold text-foreground mb-1">Or Select Subcategory</p>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Narrow down to a specific subcategory
                </p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {subCategories
                    .filter((s) => s.id !== "all")
                    .map((sub) => {
                      const isSelected = selectedSubCategory?.id === sub.id;
                      return (
                        <button
                          key={sub.id}
                          onClick={() => handleSelectSubCategory(sub)}
                          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                            isSelected
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-foreground hover:border-primary/40"
                          }`}
                        >
                          <span>{sub.emoji}</span>
                          <span className="font-medium">{sub.name}</span>
                        </button>
                      );
                    })}
                </div>

                {/* Send button */}
                <div className="mt-2">
                  {audience && (
                    <div className="mb-3 flex items-center gap-2 rounded-xl bg-success/10 border border-success/20 p-3">
                      <span className="text-lg">{audience.emoji}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">Sending to: {audience.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {selectedSubCategory ? "Subcategory" : "Category"} audience
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    className="w-full rounded-xl gap-2"
                    disabled={!canProceedToConfirm || isSending}
                    onClick={handleSend}
                  >
                    {isSending ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Send Card</>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SheetContent>
    </Sheet>
  );
}
