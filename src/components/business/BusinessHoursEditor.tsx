import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Clock, Save } from "lucide-react";
import { toast } from "sonner";

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
    DAY_NAMES.map((_, i) => ({ day_of_week: i, open_time: "09:00", close_time: "18:00", is_closed: i === 0 }))
  );
  const [hasChanges, setHasChanges] = useState(false);

  const { data: savedHours, isLoading } = useQuery({
    queryKey: ["business-hours", businessCardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_hours")
        .select("*")
        .eq("business_card_id", businessCardId)
        .order("day_of_week", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!businessCardId,
  });

  useEffect(() => {
    if (savedHours && savedHours.length > 0) {
      setHours(DAY_NAMES.map((_, i) => {
        const saved = savedHours.find((h) => h.day_of_week === i);
        return saved
          ? { day_of_week: i, open_time: saved.open_time, close_time: saved.close_time, is_closed: saved.is_closed }
          : { day_of_week: i, open_time: "09:00", close_time: "18:00", is_closed: i === 0 };
      }));
    }
  }, [savedHours]);

  const saveHours = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      // Delete existing and re-insert
      await supabase.from("business_hours").delete().eq("business_card_id", businessCardId);
      const rows = hours.map((h) => ({
        business_card_id: businessCardId,
        user_id: user.id,
        day_of_week: h.day_of_week,
        open_time: h.open_time,
        close_time: h.close_time,
        is_closed: h.is_closed,
      }));
      const { error } = await supabase.from("business_hours").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-hours", businessCardId] });
      setHasChanges(false);
      toast.success("Business hours saved!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateDay = (dayIndex: number, field: keyof DayHours, value: any) => {
    setHours((prev) =>
      prev.map((h) => (h.day_of_week === dayIndex ? { ...h, [field]: value } : h))
    );
    setHasChanges(true);
  };

  if (isLoading) {
    return <div className="flex justify-center py-6"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Business Hours
        </h3>
        {hasChanges && (
          <Button size="sm" className="gap-1 rounded-lg text-xs" onClick={() => saveHours.mutate()}>
            <Save className="h-3.5 w-3.5" /> Save
          </Button>
        )}
      </div>

      <div className="space-y-2">
        {hours.map((h) => (
          <div key={h.day_of_week} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
            <div className="w-16">
              <p className="text-xs font-medium text-foreground">{DAY_NAMES[h.day_of_week].slice(0, 3)}</p>
            </div>
            <Switch
              checked={!h.is_closed}
              onCheckedChange={(open) => updateDay(h.day_of_week, "is_closed", !open)}
            />
            {h.is_closed ? (
              <span className="text-[10px] text-muted-foreground italic">Closed</span>
            ) : (
              <div className="flex items-center gap-1.5 flex-1">
                <Input
                  type="time"
                  value={h.open_time}
                  onChange={(e) => updateDay(h.day_of_week, "open_time", e.target.value)}
                  className="rounded-lg text-xs h-8 w-24"
                />
                <span className="text-[10px] text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={h.close_time}
                  onChange={(e) => updateDay(h.day_of_week, "close_time", e.target.value)}
                  className="rounded-lg text-xs h-8 w-24"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
