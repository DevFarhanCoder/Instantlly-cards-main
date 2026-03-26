import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Building2, MapPin, Plus, Trash2 } from "lucide-react-native";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { useBusinessLocations } from "../../hooks/useBusinessLocations";
import { colors } from "../../theme/colors";

interface LocationManagerProps {
  businessCardId: string;
}

const LocationManager = ({ businessCardId }: LocationManagerProps) => {
  const { locations, addLocation, deleteLocation } = useBusinessLocations(businessCardId);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    branch_name: "",
    address: "",
    phone: "",
    business_hours: "",
  });

  const handleAdd = () => {
    if (!form.branch_name.trim()) return;
    addLocation.mutate({
      business_card_id: businessCardId,
      branch_name: form.branch_name,
      address: form.address || null,
      phone: form.phone || null,
      latitude: null,
      longitude: null,
      business_hours: form.business_hours || null,
      is_primary: locations.length === 0,
    } as any);
    setForm({ branch_name: "", address: "", phone: "", business_hours: "" });
    setShowAdd(false);
  };

  return (
    <View className="space-y-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Building2 size={16} color={colors.foreground} />
          <Text className="text-sm font-semibold text-foreground">Branches & Locations</Text>
        </View>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 rounded-lg text-xs"
          onPress={() => setShowAdd(true)}
        >
          <Plus size={12} color={colors.foreground} /> Add Branch
        </Button>
      </View>

      {locations.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border bg-muted/30 p-6 items-center">
          <MapPin size={22} color="rgba(106,113,129,0.4)" />
          <Text className="text-xs text-muted-foreground text-center mt-2">
            No branches added yet. Add your first location.
          </Text>
        </View>
      ) : (
        locations.map((loc: any) => (
          <View
            key={loc.id}
            className="rounded-xl border border-border bg-card p-3 flex-row items-start justify-between"
          >
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-sm font-semibold text-foreground">{loc.branch_name}</Text>
                {loc.is_primary && (
                  <View className="rounded-full bg-primary/10 px-2 py-0.5">
                    <Text className="text-[10px] font-semibold text-primary">Primary</Text>
                  </View>
                )}
              </View>
              {loc.address ? (
                <View className="flex-row items-center gap-1 mt-0.5">
                  <MapPin size={12} color={colors.mutedForeground} />
                  <Text className="text-xs text-muted-foreground">{loc.address}</Text>
                </View>
              ) : null}
              {loc.phone ? (
                <Text className="text-xs text-muted-foreground mt-0.5">Phone: {loc.phone}</Text>
              ) : null}
              {loc.business_hours ? (
                <Text className="text-xs text-muted-foreground mt-0.5">
                  Hours: {loc.business_hours}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={() => deleteLocation.mutate(loc.id)}>
              <Trash2 size={14} color={colors.destructive} />
            </Pressable>
          </View>
        ))
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Branch Location</DialogTitle>
          </DialogHeader>
          <View className="space-y-3">
            <Input
              placeholder="Branch name *"
              value={form.branch_name}
              onChangeText={(v) => setForm({ ...form, branch_name: v })}
            />
            <Input
              placeholder="Full address"
              value={form.address}
              onChangeText={(v) => setForm({ ...form, address: v })}
            />
            <Input
              placeholder="Phone number"
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v })}
            />
            <Input
              placeholder="Business hours (e.g. 9 AM - 6 PM)"
              value={form.business_hours}
              onChangeText={(v) => setForm({ ...form, business_hours: v })}
            />
          </View>
          <DialogFooter>
            <Button
              className="w-full rounded-xl"
              onPress={handleAdd}
              disabled={addLocation.isPending || !form.branch_name.trim()}
            >
              {addLocation.isPending ? "Adding..." : "Add Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default LocationManager;

