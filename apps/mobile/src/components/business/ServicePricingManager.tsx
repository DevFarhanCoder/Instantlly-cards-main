import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, DollarSign, Edit2, Plus, Trash2, X } from "lucide-react-native";
import { supabase } from "../../integrations/supabase/client";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../lib/toast";
import { colors } from "../../theme/colors";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

interface Props {
  businessCardId: string;
}

export default function ServicePricingManager({ businessCardId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    service_name: "",
    price: "",
    duration: "",
    description: "",
  });

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["service-pricing", businessCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_pricing")
        .select("*")
        .eq("business_card_id", businessCardId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as any[];
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
    onError: (err: any) => toast.error(err.message || "Failed to save service"),
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
    <View className="space-y-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <DollarSign size={16} color={colors.primary} />
          <Text className="text-sm font-bold text-foreground">Service Pricing</Text>
        </View>
        {!showForm && (
          <Button
            size="sm"
            variant="outline"
            className="gap-1 rounded-lg text-xs"
            onPress={() => setShowForm(true)}
          >
            <Plus size={12} color={colors.foreground} /> Add
          </Button>
        )}
      </View>

      {showForm && (
        <View className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
          <Input
            placeholder="Service name *"
            value={form.service_name}
            onChangeText={(v) => setForm({ ...form, service_name: v })}
            className="rounded-lg text-xs"
          />
          <View className="flex-row gap-2">
            <Input
              placeholder="Price (INR) *"
              value={form.price}
              onChangeText={(v) => setForm({ ...form, price: v })}
              keyboardType="numeric"
              className="rounded-lg text-xs flex-1"
            />
            <Input
              placeholder="Duration (e.g. 30 min)"
              value={form.duration}
              onChangeText={(v) => setForm({ ...form, duration: v })}
              className="rounded-lg text-xs flex-1"
            />
          </View>
          <Textarea
            placeholder="Description (optional)"
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            className="rounded-lg text-xs min-h-[60px]"
          />
          <View className="flex-row gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1 rounded-lg text-xs"
              onPress={() => upsertService.mutate()}
              disabled={!form.service_name || !form.price}
            >
              <Check size={12} color="#ffffff" /> {editingId ? "Update" : "Add"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 rounded-lg text-xs"
              onPress={resetForm}
            >
              <X size={12} color={colors.foreground} /> Cancel
            </Button>
          </View>
        </View>
      )}

      {isLoading ? (
        <View className="py-6 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : services.length === 0 && !showForm ? (
        <Text className="text-xs text-muted-foreground text-center py-4">
          No services listed yet.
        </Text>
      ) : (
        <View className="space-y-2">
          {services.map((s: any) => (
            <View
              key={s.id}
              className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
            >
              <View className="flex-1 min-w-0">
                <Text className="text-sm font-medium text-foreground">{s.service_name}</Text>
                <View className="flex-row items-center gap-2 mt-0.5">
                  <Text className="text-xs font-bold text-primary">INR {s.price}</Text>
                  {s.duration ? (
                    <Text className="text-[10px] text-muted-foreground">• {s.duration}</Text>
                  ) : null}
                </View>
                {s.description ? (
                  <Text className="text-[10px] text-muted-foreground mt-0.5">{s.description}</Text>
                ) : null}
              </View>
              <View className="flex-row gap-1">
                <Pressable
                  onPress={() => startEdit(s)}
                  className="h-7 w-7 rounded-full bg-muted items-center justify-center"
                >
                  <Edit2 size={12} color={colors.mutedForeground} />
                </Pressable>
                <Pressable
                  onPress={() => deleteService.mutate(s.id)}
                  className="h-7 w-7 rounded-full bg-destructive/10 items-center justify-center"
                >
                  <Trash2 size={12} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

