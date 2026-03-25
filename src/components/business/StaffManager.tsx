import { useState } from "react";
import { UserPlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useBusinessStaff } from "@/hooks/useBusinessStaff";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Props {
  businessCardId: string;
}

const StaffManager = ({ businessCardId }: Props) => {
  const { staff, addStaff, removeStaff, isLoading } = useBusinessStaff(businessCardId);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("staff");

  const handleAdd = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    try {
      await addStaff.mutateAsync({ name, email, role });
      toast.success("Staff member added!");
      setShowAdd(false);
      setName("");
      setEmail("");
      setRole("staff");
    } catch { toast.error("Failed to add"); }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">👥 Team Members</h3>
        <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1" onClick={() => setShowAdd(true)}>
          <UserPlus className="h-3 w-3" /> Add
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading...</p>
      ) : staff.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No team members added yet</p>
      ) : (
        <div className="space-y-2">
          {staff.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5">
              <div>
                <p className="text-sm font-medium text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground">{s.role} {s.email ? `• ${s.email}` : ""}</p>
              </div>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => removeStaff.mutate(s.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-lg" />
            <Input placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-lg" />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button className="w-full rounded-xl" onClick={handleAdd} disabled={addStaff.isPending}>
              {addStaff.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffManager;
