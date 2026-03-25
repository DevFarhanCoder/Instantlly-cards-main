import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DollarSign, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Props {
  businessCardId: string;
}

export default function ServicePricingManager({ businessCardId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ service_name: "", price: "", duration: "", description: "" });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["service-pricing", businessCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_pricing")
        .select("*")
        .eq("business_card_id", businessCardId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!businessCardId,
  });

  const upsertService = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        business_card_id: businessCardId,
        user_id: user.id,
        service_name: form.service_name,
        price: parseFloat(form.price) || 0,
        duration: form.duration || null,
        description: form.description || null,
        sort_order: editingId ? undefined : services.length,
      };
      if (editingId) {
        const { error } = await supabase.from("service_pricing").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("service_pricing").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-pricing", businessCardId] });
      resetForm();
      toast.success(editingId ? "Service updated" : "Service added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_pricing").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["service-pricing", businessCardId] });
      toast.success("Service removed");
    },
  });

  const resetForm = () => {
    setForm({ service_name: "", price: "", duration: "", description: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (s: any) => {
    setForm({
      service_name: s.service_name,
      price: String(s.price),
      duration: s.duration || "",
      description: s.description || "",
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Service Pricing
        </h3>
        {!showForm && (
          <Button size="sm" variant="outline" className="gap-1 rounded-lg text-xs" onClick={() => setShowForm(true)}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        )}
      </div>

      {showForm && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <Input placeholder="Service name *" value={form.service_name} onChange={(e) => setForm({ ...form, service_name: e.target.value })} className="rounded-lg text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Price (₹) *" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="rounded-lg text-xs" />
            <Input placeholder="Duration (e.g. 30 min)" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} className="rounded-lg text-xs" />
          </div>
          <Textarea placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-lg text-xs min-h-[60px]" />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 gap-1 rounded-lg text-xs" onClick={() => upsertService.mutate()} disabled={!form.service_name || !form.price}>
              <Check className="h-3.5 w-3.5" /> {editingId ? "Update" : "Add"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1 rounded-lg text-xs" onClick={resetForm}>
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : services.length === 0 && !showForm ? (
        <p className="text-xs text-muted-foreground text-center py-4">No services listed yet.</p>
      ) : (
        <div className="space-y-2">
          {services.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{s.service_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-bold text-primary">₹{s.price}</span>
                  {s.duration && <span className="text-[10px] text-muted-foreground">• {s.duration}</span>}
                </div>
                {s.description && <p className="text-[10px] text-muted-foreground mt-0.5">{s.description}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(s)} className="h-7 w-7 rounded-full bg-muted flex items-center justify-center">
                  <Edit2 className="h-3 w-3 text-muted-foreground" />
                </button>
                <button onClick={() => deleteService.mutate(s.id)} className="h-7 w-7 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-3 w-3 text-destructive" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
