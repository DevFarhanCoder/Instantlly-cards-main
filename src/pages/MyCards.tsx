import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, Edit, Trash2, Share2, MoreVertical, Eye, Calendar, Tag, Megaphone, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { QRCodeSVG } from "qrcode.react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useBusinessCards, type BusinessCardRow } from "@/hooks/useBusinessCards";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useDirectoryCards } from "@/hooks/useDirectoryCards";
import BusinessOnboarding from "@/components/business/BusinessOnboarding";

const MyCards = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cards, isLoading, deleteCard } = useBusinessCards();
  const [shareCard, setShareCard] = useState<BusinessCardRow | null>(null);
  const { data: demoCards = [] } = useDirectoryCards();

  if (!user) {
    return (
      <div className="min-h-screen">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-4">
          <h1 className="text-xl font-bold text-foreground">My Business Cards</h1>
        </div>

        {/* Sign-in banner */}
        <div className="mx-4 mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-center">
          <Lock className="h-8 w-8 text-primary mx-auto mb-2" />
          <h2 className="text-base font-bold text-foreground">Sign in to manage your cards</h2>
          <p className="mt-1 text-xs text-muted-foreground">Create, edit, and share your digital business cards</p>
          <Button className="mt-3 rounded-xl" onClick={() => navigate("/auth")}>Sign In</Button>
        </div>

        {/* Demo cards preview */}
        <div className="px-4 pt-4 pb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">📇 Preview: Sample Business Cards</p>
          <div className="space-y-3 opacity-80">
            {demoCards.slice(0, 4).map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-border bg-card p-4 shadow-sm cursor-pointer"
                onClick={() => navigate(`/business/${card.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                    {card.logo_url ? (
                      <img src={card.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl">🏢</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-foreground">{card.full_name}</h3>
                    {card.job_title && <p className="text-xs text-primary font-medium">{card.job_title}</p>}
                    {card.company_name && <p className="text-xs text-muted-foreground">{card.company_name}</p>}
                    <div className="mt-1 flex items-center gap-1.5">
                      {card.category && <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{card.category}</span>}
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${card.home_service ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>
                        {card.home_service ? "🏠 Home" : "🏪 Visit"}
                      </span>
                    </div>
                  </div>
                </div>
                {card.location && <div className="mt-2 text-xs text-muted-foreground">📍 {card.location}</div>}
                {card.offer && (
                  <div className="mt-2 rounded-lg bg-accent/50 px-3 py-1.5 text-xs font-medium text-accent-foreground">
                    🎁 {card.offer}
                  </div>
                )}
                {card.services && card.services.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {card.services.slice(0, 3).map((s) => (
                      <span key={s} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">{s}</span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-card px-4 py-4">
        <h1 className="text-xl font-bold text-foreground">My Business Cards</h1>
        <button onClick={() => navigate("/my-cards/create")} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4 px-4 py-4">
          {[1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="pb-32">
          <BusinessOnboarding />
          <div className="flex flex-col items-center justify-center px-6 pt-16">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-muted">
              <span className="text-4xl">📇</span>
            </motion.div>
            <h2 className="text-lg font-bold text-foreground">You haven't created any cards yet.</h2>
            <p className="mt-2 text-center text-sm text-muted-foreground">Use the Quick Start Guide above or tap + to create your first card</p>
            <Button className="mt-6 gap-2 rounded-xl" onClick={() => navigate("/my-cards/create")}>
              <Plus className="h-4 w-4" /> Create Card
            </Button>
          </div>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-4 pb-32">
          <BusinessOnboarding />
          {cards.map((card, i) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 overflow-hidden">
                    {card.logo_url ? (
                      <img src={card.logo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-xl">🏢</span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">{card.full_name}</h3>
                    {card.job_title && <p className="text-xs text-primary font-medium">{card.job_title}</p>}
                    {card.company_name && <p className="text-xs text-muted-foreground">{card.company_name}</p>}
                    {card.category && <span className="mt-0.5 inline-block rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{card.category}</span>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1"><MoreVertical className="h-4 w-4 text-muted-foreground" /></button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2" onClick={() => navigate(`/card/${card.id}`)}><Eye className="h-3.5 w-3.5" /> View</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => navigate(`/my-cards/edit/${card.id}`)}><Edit className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => setShareCard(card)}><Share2 className="h-3.5 w-3.5" /> Share</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2" onClick={() => navigate(`/ads/create?cardId=${card.id}`)}><Megaphone className="h-3.5 w-3.5" /> Run Ad</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => navigate(`/events/create?cardId=${card.id}`)}><Calendar className="h-3.5 w-3.5" /> List Event</DropdownMenuItem>
                    <DropdownMenuItem className="gap-2" onClick={() => navigate(`/vouchers/create?cardId=${card.id}`)}><Tag className="h-3.5 w-3.5" /> Create Voucher</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 text-destructive" onClick={() => deleteCard.mutate(card.id)}><Trash2 className="h-3.5 w-3.5" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {card.location && <div className="mt-2 text-xs text-muted-foreground">📍 {card.location}</div>}

              {card.offer && (
                <div className="mt-2 rounded-lg bg-accent/50 px-3 py-1.5 text-xs font-medium text-accent-foreground">
                  🎁 {card.offer}
                </div>
              )}

              {card.services && card.services.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {card.services.map((s) => (
                    <span key={s} className="rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-2">
                <Button size="sm" className="gap-1 rounded-lg text-xs" onClick={() => setShareCard(card)}>
                  <Share2 className="h-3.5 w-3.5" /> Share
                </Button>
                <Button size="sm" variant="outline" className="gap-1 rounded-lg text-xs" onClick={() => navigate(`/ads/create?cardId=${card.id}`)}>
                  📣 Promote
                </Button>
                <Button size="sm" variant="outline" className="gap-1 rounded-lg text-xs" onClick={() => navigate(`/events/create?cardId=${card.id}`)}>
                  🎫 Event
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Share FAB */}
      {cards.length > 0 && (
        <div className="fixed bottom-24 right-4 z-40 flex items-center gap-3">
          <div className="rounded-xl bg-foreground/90 px-4 py-2.5 text-xs font-medium text-primary-foreground shadow-lg">
            Share your cards with groups!
          </div>
          <button className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/80 text-primary-foreground shadow-lg">
            <Users className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Share Dialog */}
      <Dialog open={!!shareCard} onOpenChange={() => setShareCard(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Share "{shareCard?.full_name}"</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <QRCodeSVG value={`instantly://card/${shareCard?.id}`} size={160} />
            <p className="text-xs text-muted-foreground">Scan to view this card</p>
          </div>
          <div className="space-y-2">
            <Button className="w-full gap-2 rounded-xl" onClick={() => { toast.success("Link copied!"); setShareCard(null); }}>📋 Copy Link</Button>
            <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={() => { toast.success("Opening WhatsApp..."); setShareCard(null); }}>💬 Share via WhatsApp</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyCards;
