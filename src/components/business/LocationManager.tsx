import { useState } from "react";
import { MapPin, Plus, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useBusinessLocations } from "@/hooks/useBusinessLocations";
import { motion } from "framer-motion";

interface LocationManagerProps {
  businessCardId: string;
}

const LocationManager = ({ businessCardId }: LocationManagerProps) => {
  const { locations, addLocation, deleteLocation } = useBusinessLocations(businessCardId);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ branch_name: "", address: "", phone: "", business_hours: "" });

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
    });
    setForm({ branch_name: "", address: "", phone: "", business_hours: "" });
    setShowAdd(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
          <Building2 className="h-4 w-4" /> Branches & Locations
        </h3>
        <Button size="sm" variant="outline" className="gap-1 rounded-lg text-xs" onClick={() => setShowAdd(true)}>
          <Plus className="h-3.5 w-3.5" /> Add Branch
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center">
          <MapPin className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No branches added yet. Add your first location.</p>
        </div>
      ) : (
        locations.map((loc, i) => (
          <motion.div key={loc.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border bg-card p-3 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{loc.branch_name}</p>
                {loc.is_primary && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">Primary</span>
                )}
              </div>
              {loc.address && <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{loc.address}</p>}
              {loc.phone && <p className="text-xs text-muted-foreground mt-0.5">📞 {loc.phone}</p>}
              {loc.business_hours && <p className="text-xs text-muted-foreground mt-0.5">🕐 {loc.business_hours}</p>}
            </div>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteLocation.mutate(loc.id)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </motion.div>
        ))
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Branch Location</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Branch name *" value={form.branch_name} onChange={(e) => setForm({ ...form, branch_name: e.target.value })} />
            <Input placeholder="Full address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <Input placeholder="Phone number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Business hours (e.g. 9 AM - 6 PM)" value={form.business_hours} onChange={(e) => setForm({ ...form, business_hours: e.target.value })} />
          </div>
          <DialogFooter>
            <Button className="w-full rounded-xl" onClick={handleAdd} disabled={addLocation.isPending || !form.branch_name.trim()}>
              {addLocation.isPending ? "Adding..." : "Add Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationManager;
