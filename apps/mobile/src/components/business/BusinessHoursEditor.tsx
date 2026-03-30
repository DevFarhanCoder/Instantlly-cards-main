import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Save } from "lucide-react-native";
import { supabase } from "../../integrations/supabase/client";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "../../lib/toast";
import { colors } from "../../theme/colors";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface Props {
  businessCardId: string;
}

interface DayHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export default function BusinessHoursEditor({ businessCardId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<DayHours[]>(
    DAY_NAMES.map((_, i) => ({
      day_of_week: i,
      open_time: "09:00",
      close_time: "18:00",
      is_closed: i === 0,
    }))
  );
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedHours, isLoading } = useQuery({
    queryKey: ["business-hours", businessCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_hours" as any)
        .select("*")
        .eq("business_card_id", businessCardId)
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!businessCardId,
  });

  useEffect(() => {
    if (savedHours && savedHours.length > 0) {
      setHours(
        DAY_NAMES.map((_, i) => {
          const saved = savedHours.find((h: any) => h.day_of_week === i);
          return saved
            ? {
                day_of_week: i,
                open_time: saved.open_time,
                close_time: saved.close_time,
                is_closed: saved.is_closed,
              }
            : {
                day_of_week: i,
                open_time: "09:00",
                close_time: "18:00",
                is_closed: i === 0,
              };
        })
      );
    }
  }, [savedHours]);

  const saveHours = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      await supabase.from("business_hours" as any).delete().eq("business_card_id", businessCardId);
      const rows = hours.map((h) => ({
        business_card_id: businessCardId,
        user_id: user.id,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed,
      }));
      const { error } = await supabase.from("business_hours" as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours", businessCardId] });
      setHasChanges(false);
      toast.success("Business hours saved!");
    },
    onError: (err: any) => toast.error(err.message || "Failed to save hours"),
  });

  const updateDay = (dayIndex: number, field: keyof DayHours, value: any) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayIndex ? { ...h, [field]: value } : h))
    );
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <View className="py-6 items-center justify-center">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color={colors.primary} />
          <Text className="text-sm font-bold text-foreground">Business Hours</Text>
        </View>
        {hasChanges && (
          <Button
            size="sm"
            className="gap-1 rounded-lg text-xs"
            onPress={() => saveHours.mutate()}
          >
            <Save size={12} color="#ffffff" /> Save
          </Button>
        )}
      </View>

      <View className="gap-2">
        {hours.map((h) => (
          <View
            key={h.day_of_week}
            className="flex-row items-center gap-3 rounded-xl border border-border bg-card p-3"
          >
            <View className="w-16">
              <Text className="text-xs font-medium text-foreground">
                {DAY_NAMES[h.day_of_week].slice(0, 3)}
              </Text>
            </View>
            <Switch
              checked={!h.is_closed}
              onCheckedChange={(open) => updateDay(h.day_of_week, "is_closed", !open)}
            />
            {h.is_closed ? (
              <Text className="text-[10px] text-muted-foreground italic">Closed</Text>
            ) : (
              <View className="flex-1 flex-row items-center gap-2">
                <Input
                  value={h.open_time}
                  onChangeText={(v) => updateDay(h.day_of_week, "open_time", v)}
                  placeholder="09:00"
                  className="rounded-lg text-xs h-8 w-24"
                />
                <Text className="text-[10px] text-muted-foreground">to</Text>
                <Input
                  value={h.close_time}
                  onChangeText={(v) => updateDay(h.day_of_week, "close_time", v)}
                  placeholder="18:00"
                  className="rounded-lg text-xs h-8 w-24"
                />
              </View>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

