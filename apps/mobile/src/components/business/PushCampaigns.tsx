import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Loader2, Send } from "lucide-react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../integrations/supabase/client";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../lib/toast";
import { colors } from "../../theme/colors";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

interface Props {
  businessCardId: string;
}

const PushCampaigns = ({ businessCardId }: Props) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const sendCampaign = useMutation({
    mutationFn: async () => {
      const { data: followers, error: fErr } = await supabase
        .from("business_follows")
        .select("user_id")
        .eq("business_card_id", businessCardId);
      if (fErr) throw fErr;

      const { error: cErr } = await supabase
        .from("push_campaigns")
        .insert({
          business_card_id: businessCardId,
          user_id: user!.id,
          title,
          body,
          sent_count: followers?.length || 0,
        } as any);
      if (cErr) throw cErr;

      const notifications = (followers || []).map((f: any) => ({
        user_id: f.user_id,
        title,
        description: body,
        emoji: "promo",
        type: "promotion",
      }));

      if (notifications.length > 0) {
        for (let i = 0; i < notifications.length; i += 100) {
          const batch = notifications.slice(i, i + 100);
          const { error: nErr } = await supabase.from("notifications").insert(batch as any);
          if (nErr) throw nErr;
        }
      }

      return followers?.length || 0;
    },
    onSuccess: (count) => {
      toast.success(`Campaign sent to ${count} followers!`);
      setTitle("");
      setBody("");
      queryClient.invalidateQueries({ queryKey: ["push-campaigns"] });
    },
    onError: () => toast.error("Failed to send campaign"),
  });

  const disabled = !title.trim() || !body.trim() || sendCampaign.isPending;

  return (
    <View className="rounded-xl border border-border bg-card p-4">
      <View className="flex-row items-center gap-2 mb-3">
        <Send size={16} color={colors.primary} />
        <Text className="text-sm font-bold text-foreground">Send Promotion</Text>
      </View>
      <Text className="text-xs text-muted-foreground mb-3">
        Send a notification to all your followers with your latest offer or update.
      </Text>
      <View className="space-y-3">
        <Input
          placeholder="Promotion title"
          value={title}
          onChangeText={setTitle}
          className="rounded-lg"
        />
        <Textarea
          placeholder="Promotion details..."
          value={body}
          onChangeText={setBody}
          rows={3}
          className="rounded-xl"
        />
        <Pressable
          className="w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary py-3"
          disabled={disabled}
          style={disabled ? { opacity: 0.6 } : undefined}
          onPress={() => sendCampaign.mutate()}
        >
          {sendCampaign.isPending ? (
            <>
              <Loader2 size={14} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: "600", fontSize: 13 }}>
                Sending...
              </Text>
            </>
          ) : (
            <>
              <Send size={14} color={colors.primaryForeground} />
              <Text style={{ color: colors.primaryForeground, fontWeight: "600", fontSize: 13 }}>
                Send to Followers
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

export default PushCampaigns;

