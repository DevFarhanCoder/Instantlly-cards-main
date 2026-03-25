import { useState } from "react";
import { useAdminBusinessCards, useAdminEvents, useAdminAds, useAdminVouchers, useUpdateBusinessApproval, useUpdateEventApproval, useUpdateAdApproval, useUpdateVoucherApproval, useAdminReviews, useFlagReview } from "@/hooks/useAdminData";
import { useBulkApprove } from "@/hooks/useAdminActivity";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, XCircle } from "lucide-react";
import { motion } from "framer-motion";

type ApprovalType = "all" | "businesses" | "events" | "ads" | "vouchers" | "reviews";

const ApprovalQueue = () => {
  const [typeFilter, setTypeFilter] = useState<ApprovalType>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: cards = [] } = useAdminBusinessCards();
  const { data: events = [] } = useAdminEvents();
  const { data: ads = [] } = useAdminAds();
  const { data: vouchers = [] } = useAdminVouchers();
  const { data: reviews = [] } = useAdminReviews();

  const updateBiz = useUpdateBusinessApproval();
  const updateEvent = useUpdateEventApproval();
  const updateAd = useUpdateAdApproval();
  const updateVoucher = useUpdateVoucherApproval();
  const flagReview = useFlagReview();
  const bulkApprove = useBulkApprove();

  const pendingCards = cards.filter(c => (c as any).approval_status === "pending");
  const pendingEvents = events.filter(e => (e as any).approval_status === "pending");
  const pendingAds = ads.filter(a => (a as any).approval_status === "pending");
  const pendingVouchers = vouchers.filter(v => v.status === "draft");
  const flaggedReviews = reviews.filter(r => (r as any).is_flagged);

  type QueueItem = { id: string; type: string; title: string; subtitle: string; status: string; tableType: "business_cards" | "events" | "ad_campaigns" | "vouchers" };

  const allItems: QueueItem[] = [
    ...pendingCards.map(c => ({ id: c.id, type: "businesses", title: c.full_name, subtitle: `${c.company_name || "Personal"} • ${c.category || "N/A"}`, status: (c as any).approval_status, tableType: "business_cards" as const })),
    ...pendingEvents.map(e => ({ id: e.id, type: "events", title: e.title, subtitle: `${e.venue} • ${e.date}`, status: (e as any).approval_status, tableType: "events" as const })),
    ...pendingAds.map(a => ({ id: a.id, type: "ads", title: a.title, subtitle: `₹${a.daily_budget}/day • ${a.ad_type}`, status: (a as any).approval_status, tableType: "ad_campaigns" as const })),
    ...pendingVouchers.map(v => ({ id: v.id, type: "vouchers", title: v.title, subtitle: `₹${v.discounted_price} • ${v.category}`, status: v.status, tableType: "vouchers" as const })),
  ];

  const filtered = typeFilter === "all" ? allItems :
    typeFilter === "reviews" ? [] :
    allItems.filter(i => i.type === typeFilter);

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const handleBulkAction = (status: string) => {
    const grouped: Record<string, string[]> = {};
    for (const id of selectedIds) {
      const item = allItems.find(i => i.id === id);
      if (item) {
        if (!grouped[item.tableType]) grouped[item.tableType] = [];
        grouped[item.tableType].push(id);
      }
    }
    for (const [type, ids] of Object.entries(grouped)) {
      if (type === "vouchers") {
        ids.forEach(id => updateVoucher.mutate({ id, status: status === "approved" ? "active" : "expired" }));
      } else {
        bulkApprove.mutate({ type: type as any, ids, status });
      }
    }
    setSelectedIds(new Set());
  };

  const typeEmojis: Record<string, string> = { businesses: "🏢", events: "📅", ads: "📣", vouchers: "🎫", reviews: "⭐" };
  const typeCounts = {
    all: allItems.length,
    businesses: pendingCards.length,
    events: pendingEvents.length,
    ads: pendingAds.length,
    vouchers: pendingVouchers.length,
    reviews: flaggedReviews.length,
  };

  const handleApprove = (item: QueueItem) => {
    if (item.tableType === "business_cards") updateBiz.mutate({ id: item.id, status: "approved" });
    else if (item.tableType === "events") updateEvent.mutate({ id: item.id, status: "approved" });
    else if (item.tableType === "vouchers") updateVoucher.mutate({ id: item.id, status: "active" });
    else updateAd.mutate({ id: item.id, status: "approved" });
  };

  const handleReject = (item: QueueItem) => {
    if (item.tableType === "business_cards") updateBiz.mutate({ id: item.id, status: "rejected" });
    else if (item.tableType === "events") updateEvent.mutate({ id: item.id, status: "rejected" });
    else if (item.tableType === "vouchers") updateVoucher.mutate({ id: item.id, status: "expired" });
    else updateAd.mutate({ id: item.id, status: "rejected" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Approval Queue</h2>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <Button size="sm" className="text-[10px] h-7 rounded-lg gap-1" onClick={() => handleBulkAction("approved")}>
              <CheckCircle className="h-3 w-3" /> Approve {selectedIds.size}
            </Button>
            <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg gap-1 text-destructive" onClick={() => handleBulkAction("rejected")}>
              <XCircle className="h-3 w-3" /> Reject {selectedIds.size}
            </Button>
          </div>
        )}
      </div>

      {/* Type Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "businesses", "events", "ads", "vouchers", "reviews"] as ApprovalType[]).map(t => (
          <Button
            key={t}
            size="sm"
            variant={typeFilter === t ? "default" : "outline"}
            className="text-[11px] rounded-xl capitalize gap-1"
            onClick={() => { setTypeFilter(t); setSelectedIds(new Set()); }}
          >
            {typeEmojis[t] || "📋"} {t} {typeCounts[t] > 0 && (
              <Badge variant="secondary" className="text-[9px] ml-1 px-1.5">{typeCounts[t]}</Badge>
            )}
          </Button>
        ))}
      </div>

      {/* Flagged Reviews Section */}
      {typeFilter === "reviews" && (
        <div className="space-y-2">
          {flaggedReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No flagged reviews</p>
          ) : flaggedReviews.map((r: any) => (
            <div key={r.id} className="rounded-xl border border-destructive/30 bg-card p-3">
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: r.rating }).map((_, i) => <span key={i} className="text-amber-500 text-xs">★</span>)}
              </div>
              <p className="text-sm text-foreground">{r.comment || "No comment"}</p>
              <div className="flex gap-2 mt-2 justify-end">
                <Button size="sm" variant="outline" className="text-[10px] h-7 rounded-lg" onClick={() => flagReview.mutate({ id: r.id, flagged: false })}>
                  Unflag
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Items */}
      {typeFilter !== "reviews" && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <span className="text-4xl">✅</span>
              <p className="text-sm text-muted-foreground mt-2">All caught up!</p>
              <p className="text-[10px] text-muted-foreground">No pending approvals</p>
            </div>
          ) : filtered.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <Checkbox
                checked={selectedIds.has(item.id)}
                onCheckedChange={() => toggleSelect(item.id)}
              />
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-lg">
                {typeEmojis[item.type]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                <p className="text-[10px] text-muted-foreground">{item.subtitle}</p>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg" onClick={() => handleApprove(item)}>
                  <CheckCircle className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button size="sm" variant="outline" className="h-7 w-7 p-0 rounded-lg" onClick={() => handleReject(item)}>
                  <XCircle className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
