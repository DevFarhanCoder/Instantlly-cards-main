import { useState } from "react";
import { useAdminCampaigns, useCreateCampaign, useSendCampaign } from "@/hooks/useAdminActivity";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, Megaphone, Gift, Bell } from "lucide-react";
import { motion } from "framer-motion";

const campaignTypeOptions = [
  { value: "push", label: "Push Notification", emoji: "🔔" },
  { value: "voucher_blast", label: "Voucher Blast", emoji: "🎟️" },
  { value: "announcement", label: "Announcement", emoji: "📢" },
];

const audienceOptions = [
  { value: "all", label: "All Users" },
  { value: "business_owners", label: "Business Owners" },
  { value: "customers", label: "Customers Only" },
];

const CampaignBuilder = () => {
  const { user } = useAuth();
  const { data: campaigns = [], isLoading } = useAdminCampaigns();
  const createCampaign = useCreateCampaign();
  const sendCampaign = useSendCampaign();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", campaign_type: "push", target_audience: "all" });

  const handleCreate = () => {
    if (!form.title.trim() || !user) return;
    createCampaign.mutate({
      admin_user_id: user.id,
      title: form.title,
      body: form.body,
      campaign_type: form.campaign_type,
      target_audience: form.target_audience,
    });
    setForm({ title: "", body: "", campaign_type: "push", target_audience: "all" });
    setShowCreate(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Growth Campaigns</h2>
        <Button size="sm" className="text-[11px] rounded-xl gap-1" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-3 w-3" /> New Campaign
        </Button>
      </div>

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/30 bg-card p-4 space-y-3"
        >
          <Input
            placeholder="Campaign title"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            className="rounded-xl"
          />
          <Textarea
            placeholder="Message body"
            value={form.body}
            onChange={e => setForm({ ...form, body: e.target.value })}
            className="rounded-xl"
            rows={3}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={form.campaign_type} onValueChange={v => setForm({ ...form, campaign_type: v })}>
              <SelectTrigger className="rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {campaignTypeOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.emoji} {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={form.target_audience} onValueChange={v => setForm({ ...form, target_audience: v })}>
              <SelectTrigger className="rounded-xl text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audienceOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" className="text-[11px] rounded-xl" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" className="text-[11px] rounded-xl gap-1" onClick={handleCreate} disabled={!form.title.trim()}>
              <Plus className="h-3 w-3" /> Create
            </Button>
          </div>
        </motion.div>
      )}

      {/* Campaign History */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-4xl">📣</span>
            <p className="text-sm text-muted-foreground mt-2">No campaigns yet</p>
            <p className="text-[10px] text-muted-foreground">Create your first campaign to engage users</p>
          </div>
        ) : campaigns.map((c: any, i: number) => {
          const typeEmoji = campaignTypeOptions.find(o => o.value === c.campaign_type)?.emoji || "📢";
          return (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{typeEmoji}</span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{c.title}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{c.target_audience} • {c.campaign_type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={c.status === "sent" ? "default" : c.status === "draft" ? "secondary" : "outline"}
                    className="text-[9px] capitalize"
                  >
                    {c.status}
                  </Badge>
                  {c.status === "draft" && (
                    <Button size="sm" className="h-7 text-[10px] rounded-lg gap-1" onClick={() => sendCampaign.mutate(c.id)}>
                      <Send className="h-3 w-3" /> Send
                    </Button>
                  )}
                </div>
              </div>
              {c.body && <p className="text-xs text-muted-foreground mt-1.5">{c.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-1">
                {new Date(c.created_at).toLocaleDateString()} {c.sent_count > 0 && `• Sent to ${c.sent_count}`}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default CampaignBuilder;
