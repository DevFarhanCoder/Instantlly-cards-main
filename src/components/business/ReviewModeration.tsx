import { useState } from "react";
import { Star, Flag, Reply, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface ReviewModerationProps {
  cardIds: string[];
}

const ReviewModeration = ({ cardIds }: ReviewModerationProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [subTab, setSubTab] = useState("all");

  const { data: reviews = [] } = useQuery({
    queryKey: ["business-reviews", cardIds],
    queryFn: async () => {
      if (cardIds.length === 0) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .in("business_id", cardIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && cardIds.length > 0,
  });

  // Fetch spam flags for reviews on this business
  const reviewIds = reviews.map((r) => r.id);
  const { data: spamFlags = [] } = useQuery({
    queryKey: ["business-review-spam-flags", reviewIds],
    queryFn: async () => {
      if (reviewIds.length === 0) return [];
      const { data, error } = await supabase
        .from("spam_flags")
        .select("*")
        .eq("entity_type", "review")
        .in("entity_id", reviewIds)
        .eq("is_resolved", false);
      if (error) throw error;
      return data;
    },
    enabled: reviewIds.length > 0,
  });

  const spamFlagMap = new Map(spamFlags.map((f: any) => [f.entity_id, f]));

  const replyToReview = useMutation({
    mutationFn: async ({ id, reply }: { id: string; reply: string }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ business_reply: reply, business_reply_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-reviews"] });
      setReplyingTo(null);
      setReplyText("");
      toast.success("Reply posted!");
    },
  });

  const flagForAdmin = useMutation({
    mutationFn: async ({ id, flagged }: { id: string; flagged: boolean }) => {
      const { error } = await supabase
        .from("reviews")
        .update({ is_flagged: flagged } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-reviews"] });
      toast.success("Review flagged for admin review");
    },
  });

  const flaggedReviews = reviews.filter((r: any) => r.is_flagged);
  const spamReviews = reviews.filter((r) => spamFlagMap.has(r.id));
  const displayReviews = subTab === "flagged" ? flaggedReviews : subTab === "spam" ? spamReviews : reviews;

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "—";

  if (reviews.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
        <Star className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No reviews yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Rating Summary */}
      <div className="rounded-xl border border-border bg-card p-4 text-center">
        <p className="text-3xl font-bold text-foreground">{avgRating}</p>
        <div className="flex justify-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{reviews.length} reviews</p>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { key: "all", label: `All (${reviews.length})` },
          { key: "flagged", label: `Flagged (${flaggedReviews.length})` },
          { key: "spam", label: `Spam (${spamReviews.length})` },
        ].map((t) => (
          <button key={t.key}
            className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors ${subTab === t.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setSubTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {displayReviews.map((r: any, i: number) => {
        const spamFlag = spamFlagMap.get(r.id);
        return (
          <motion.div key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className={`rounded-xl border bg-card p-3 space-y-2 ${r.is_flagged ? "border-destructive/40" : spamFlag ? "border-amber-400/40" : "border-border"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3 w-3 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                  ))}
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex gap-1">
                {r.is_flagged && <Badge variant="destructive" className="text-[9px]">Flagged</Badge>}
                {spamFlag && <Badge className="text-[9px] bg-amber-500 text-white">Spam</Badge>}
              </div>
            </div>

            {r.comment && <p className="text-xs text-foreground">{r.comment}</p>}

            {/* Spam flag details */}
            {spamFlag && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{spamFlag.reason}</p>
                  <Badge className={`mt-1 text-[9px] ${spamFlag.severity === "high" ? "bg-destructive" : "bg-amber-500"} text-white`}>
                    {spamFlag.severity} severity
                  </Badge>
                </div>
              </div>
            )}

            {/* Business Reply */}
            {r.business_reply ? (
              <div className="ml-4 pl-3 border-l-2 border-primary/30 mt-2">
                <p className="text-[10px] font-semibold text-primary">Your Reply</p>
                <p className="text-xs text-foreground">{r.business_reply}</p>
                <p className="text-[9px] text-muted-foreground mt-0.5">
                  {r.business_reply_at ? new Date(r.business_reply_at).toLocaleDateString() : ""}
                </p>
              </div>
            ) : replyingTo === r.id ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  placeholder="Write your reply…"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="rounded-lg text-xs min-h-[60px]"
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 gap-1 rounded-lg text-xs" disabled={!replyText.trim()}
                    onClick={() => replyToReview.mutate({ id: r.id, reply: replyText })}>
                    <Reply className="h-3.5 w-3.5" /> Post Reply
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-lg text-xs"
                    onClick={() => { setReplyingTo(null); setReplyText(""); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-1">
                <Button size="sm" variant="ghost" className="text-[10px] h-6 gap-1 text-primary"
                  onClick={() => setReplyingTo(r.id)}>
                  <Reply className="h-3 w-3" /> Reply
                </Button>
                {!r.is_flagged && (
                  <Button size="sm" variant="ghost" className="text-[10px] h-6 gap-1 text-amber-600"
                    onClick={() => flagForAdmin.mutate({ id: r.id, flagged: true })}>
                    <Flag className="h-3 w-3" /> Report to Admin
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        );
      })}

      {displayReviews.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No reviews in this category</p>
      )}
    </div>
  );
};

export default ReviewModeration;
