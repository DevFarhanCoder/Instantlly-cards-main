import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { motion } from "framer-motion";

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
      // Get all followers
      const { data: followers, error: fErr } = await supabase
        .from("business_follows")
        .select("user_id")
        .eq("business_card_id", businessCardId);
      if (fErr) throw fErr;

      // Create campaign record
      const { error: cErr } = await supabase
        .from("push_campaigns")
        .insert({
          business_card_id: businessCardId,
          user_id: user!.id,
          title,
          body,
          sent_count: followers?.length || 0,
        });
      if (cErr) throw cErr;

      // Send notifications to all followers
      const notifications = (followers || []).map((f) => ({
        user_id: f.user_id,
        title,
        description: body,
        emoji: "📢",
        type: "promotion",
      }));

      if (notifications.length > 0) {
        // Insert in batches of 100
        for (let i = 0; i < notifications.length; i += 100) {
          const batch = notifications.slice(i, i + 100);
          const { error: nErr } = await supabase.from("notifications").insert(batch);
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

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Send className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Send Promotion</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Send a notification to all your followers with your latest offer or update.
      </p>
      <div className="space-y-3">
        <Input
          placeholder="Promotion title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-lg"
        />
        <Textarea
          placeholder="Promotion details..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="rounded-xl resize-none"
        />
        <Button
          className="w-full rounded-xl gap-1.5"
          disabled={!title.trim() || !body.trim() || sendCampaign.isPending}
          onClick={() => sendCampaign.mutate()}
        >
          {sendCampaign.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Send className="h-4 w-4" /> Send to Followers</>}
        </Button>
      </div>
    </div>
  );
};

export default PushCampaigns;
