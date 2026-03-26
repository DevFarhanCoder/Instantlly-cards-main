import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Trash2, UserPlus } from "lucide-react-native";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { useBusinessStaff } from "../../hooks/useBusinessStaff";
import { toast } from "../../lib/toast";
import { colors } from "../../theme/colors";

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
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      await addStaff.mutateAsync({ name, email, role });
      toast.success("Staff member added!");
      setShowAdd(false);
      setName("");
      setEmail("");
      setRole("staff");
    } catch {
      toast.error("Failed to add");
    }
  };

  return (
    <View className="rounded-xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-sm font-bold text-foreground">Team Members</Text>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs rounded-lg gap-1"
          onPress={() => setShowAdd(true)}
        >
          <UserPlus size={12} color={colors.foreground} /> Add
        </Button>
      </View>

      {isLoading ? (
        <Text className="text-xs text-muted-foreground">Loading...</Text>
      ) : staff.length === 0 ? (
        <Text className="text-xs text-muted-foreground text-center py-4">
          No team members added yet
        </Text>
      ) : (
        <View className="space-y-2">
          {staff.map((s: any) => (
            <View
              key={s.id}
              className="flex-row items-center justify-between rounded-lg border border-border bg-muted/30 p-2.5"
            >
              <View>
                <Text className="text-sm font-medium text-foreground">{s.name}</Text>
                <Text className="text-[10px] text-muted-foreground">
                  {s.role} {s.email ? `• ${s.email}` : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => removeStaff.mutate(s.id)}
                className="h-7 w-7 items-center justify-center rounded-full"
              >
                <Trash2 size={14} color={colors.destructive} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <View className="space-y-3">
            <Input
              placeholder="Full name"
              value={name}
              onChangeText={setName}
              className="rounded-lg"
            />
            <Input
              placeholder="Email (optional)"
              value={email}
              onChangeText={setEmail}
              className="rounded-lg"
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
          </View>
          <DialogFooter>
            <Button className="w-full rounded-xl" onPress={handleAdd} disabled={addStaff.isPending}>
              {addStaff.isPending ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

export default StaffManager;

