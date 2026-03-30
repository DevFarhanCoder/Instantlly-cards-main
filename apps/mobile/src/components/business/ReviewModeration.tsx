import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, Reply, Shield, Star } from "lucide-react-native";
import { supabase } from "../../integrations/supabase/client";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../lib/toast";
import { colors } from "../../theme/colors";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

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
      return data as any[];
    },
    enabled: !!user && cardIds.length > 0,
  });

  const reviewIds = reviews.map((r: any) => r.id);
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
      return data as any[];
    },
    enabled: reviewIds.length > 0,
  });

  const spamFlagMap = useMemo(
    () => new Map(spamFlags.map((f: any) => [f.entity_id, f])),
    [spamFlags]
  );

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
  const spamReviews = reviews.filter((r: any) => spamFlagMap.has(r.id));
  const displayReviews =
    subTab === "flagged" ? flaggedReviews : subTab === "spam" ? spamReviews : reviews;

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "-";

  if (reviews.length === 0) {
    return (
      <View className="rounded-xl border border-dashed border-border bg-muted/30 p-8 items-center">
        <Star size={28} color="rgba(106,113,129,0.4)" />
        <Text className="text-sm text-muted-foreground mt-2">No reviews yet</Text>
      </View>
    );
  }

  return (
    <View className="gap-3">
      <View className="rounded-xl border border-border bg-card p-4 items-center">
        <Text className="text-3xl font-bold text-foreground">{avgRating}</Text>
        <View className="flex-row justify-center gap-0.5 mt-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={14}
              color={s <= Math.round(Number(avgRating)) ? "#f59e0b" : "rgba(106,113,129,0.3)"}
            />
          ))}
        </View>
        <Text className="text-xs text-muted-foreground mt-1">{reviews.length} reviews</Text>
      </View>

      <View className="flex-row gap-1 rounded-lg bg-muted p-1">
        {[
          { key: "all", label: `All (${reviews.length})` },
          { key: "flagged", label: `Flagged (${flaggedReviews.length})` },
          { key: "spam", label: `Spam (${spamReviews.length})` },
        ].map((t) => (
          <Pressable
            key={t.key}
            onPress={() => setSubTab(t.key)}
            className={`flex-1 rounded-md px-2 py-1.5 ${subTab === t.key ? "bg-background" : ""}`}
          >
            <Text
              className={`text-[11px] font-medium text-center ${
                subTab === t.key ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {displayReviews.map((r: any) => {
        const spamFlag = spamFlagMap.get(r.id);
        return (
          <View
            key={r.id}
            className={`rounded-xl border bg-card p-3 gap-2 ${
              r.is_flagged ? "border-destructive/40" : spamFlag ? "border-amber-400/40" : "border-border"
            }`}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View className="flex-row gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={12} color={s <= r.rating ? "#f59e0b" : "rgba(106,113,129,0.3)"} />
                  ))}
                </View>
                <Text className="text-[10px] text-muted-foreground">
                  {new Date(r.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View className="flex-row gap-1">
                {r.is_flagged && <Badge variant="destructive" className="text-[9px]">Flagged</Badge>}
                {spamFlag && (
                  <View className="rounded-full bg-amber-500 px-2 py-0.5">
                    <Text className="text-[9px] font-semibold text-white">Spam</Text>
                  </View>
                )}
              </View>
            </View>

            {r.comment ? (
              <Text className="text-xs text-foreground">{r.comment}</Text>
            ) : null}

            {spamFlag && (
              <View className="rounded-lg bg-amber-50 p-2 flex-row items-start gap-2">
                <Shield size={14} color="#b45309" />
                <View className="flex-1">
                  <Text className="text-xs font-medium text-amber-800">{spamFlag.reason}</Text>
                  <View className="mt-1 rounded-full bg-amber-500 px-2 py-0.5 self-start">
                    <Text className="text-[9px] font-semibold text-white">
                      {spamFlag.severity} severity
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {r.business_reply ? (
              <View className="ml-3 pl-3 border-l-2 border-primary/30 mt-2">
                <Text className="text-[10px] font-semibold text-primary">Your Reply</Text>
                <Text className="text-xs text-foreground">{r.business_reply}</Text>
                <Text className="text-[9px] text-muted-foreground mt-0.5">
                  {r.business_reply_at ? new Date(r.business_reply_at).toLocaleDateString() : ""}
                </Text>
              </View>
            ) : replyingTo === r.id ? (
              <View className="mt-2 gap-2">
                <Textarea
                  placeholder="Write your reply..."
                  value={replyText}
                  onChangeText={setReplyText}
                  className="rounded-lg text-xs min-h-[60px]"
                />
                <View className="flex-row gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gap-1 rounded-lg text-xs"
                    disabled={!replyText.trim()}
                    onPress={() => replyToReview.mutate({ id: r.id, reply: replyText })}
                  >
                    <Reply size={12} color="#ffffff" /> Post Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-lg text-xs"
                    onPress={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                </View>
              </View>
            ) : (
              <View className="flex-row gap-2 mt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-[10px] h-6 gap-1 text-primary"
                  onPress={() => setReplyingTo(r.id)}
                >
                  <Reply size={12} color={colors.primary} /> Reply
                </Button>
                {!r.is_flagged && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-[10px] h-6 gap-1 text-amber-600"
                    onPress={() => flagForAdmin.mutate({ id: r.id, flagged: true })}
                  >
                    <Flag size={12} color="#b45309" /> Report to Admin
                  </Button>
                )}
              </View>
            )}
          </View>
        );
      })}

      {displayReviews.length === 0 && (
        <Text className="text-sm text-muted-foreground text-center py-8">
          No reviews in this category
        </Text>
      )}
    </View>
  );
};

export default ReviewModeration;

