import { useMemo, useState } from "react";
import { ActivityIndicator, Share, Text, View } from "react-native";
import {
  CheckCircle,
  ChevronDown,
  Clock,
  Download,
  Mail,
  MessageSquare,
  Phone,
  Users,
  XCircle,
} from "lucide-react-native";
import { useBusinessLeads } from "../../hooks/useBusinessLeads";
import { colors } from "../../theme/colors";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface LeadsManagerProps {
  businessCardId?: string | null;
  promotionId?: string | number | null;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: any }
> = {
  new: { label: "New", color: "#1d4ed8", bg: "#dbeafe", icon: Clock },
  contacted: { label: "Contacted", color: "#b45309", bg: "#fef3c7", icon: MessageSquare },
  converted: { label: "Converted", color: "#15803d", bg: "#dcfce7", icon: CheckCircle },
  closed: { label: "Closed", color: "#b91c1c", bg: "#fee2e2", icon: XCircle },
};

const LeadsManager = ({ businessCardId, promotionId }: LeadsManagerProps) => {
  const { leads, isLoading, updateLeadStatus } = useBusinessLeads(businessCardId, promotionId);
  const [filter, setFilter] = useState("all");

  const filteredLeads = useMemo(
    () => (filter === "all" ? leads : leads.filter((l: any) => l.status === filter)),
    [filter, leads]
  );
  const newCount = leads.filter((l: any) => l.status === "new").length;

  const exportCSV = async () => {
    if (leads.length === 0) return;
    const headers = ["Name", "Email", "Phone", "Message", "Status", "Source", "Date"];
    const rows = leads.map((l: any) => [
      l.full_name,
      l.email || "",
      l.phone || "",
      String(l.message || "").replace(/"/g, '""'),
      l.status,
      l.source || "",
      new Date(l.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c: string) => `"${c}"`).join(","))
      .join("\n");
    await Share.share({ message: csv });
  };

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Users size={16} color={colors.primary} />
          <Text className="text-sm font-bold text-foreground">
            Leads
            {newCount > 0 && (
              <Text className="text-xs text-destructive">
                {" "}
                ({newCount})
              </Text>
            )}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1 rounded-lg"
            onPress={exportCSV}
            disabled={leads.length === 0}
          >
            <Download size={12} color={colors.foreground} /> CSV
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs gap-1 rounded-lg">
                {filter === "all" ? "All" : statusConfig[filter]?.label || filter}
                <ChevronDown size={12} color={colors.foreground} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onPress={() => setFilter("all")}>
                All ({leads.length})
              </DropdownMenuItem>
              {Object.entries(statusConfig).map(([key, val]) => (
                <DropdownMenuItem key={key} onPress={() => setFilter(key)}>
                  {val.label} ({leads.filter((l: any) => l.status === key).length})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </View>
      </View>

      {isLoading ? (
        <View className="py-8 items-center justify-center">
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : filteredLeads.length === 0 ? (
        <View className="rounded-xl border border-dashed border-border bg-muted/30 p-6 items-center">
          <Users size={28} color="rgba(106,113,129,0.4)" />
          <Text className="text-sm text-muted-foreground text-center mt-2">
            {filter === "all"
              ? "No leads yet. Share your card to start getting inquiries!"
              : `No ${statusConfig[filter]?.label || filter} leads`}
          </Text>
        </View>
      ) : (
        filteredLeads.map((lead: any) => {
          const cfg = statusConfig[lead.status] || statusConfig.new;
          const StatusIcon = cfg.icon;
          return (
            <View
              key={lead.id}
              className="rounded-xl border border-border bg-card p-3 gap-2"
            >
              <View className="flex-row items-start justify-between">
                <View>
                  <Text className="text-sm font-bold text-foreground">{lead.full_name}</Text>
                  {lead.phone && (
                    <View className="flex-row items-center gap-1 mt-1">
                      <Phone size={12} color={colors.mutedForeground} />
                      <Text className="text-xs text-muted-foreground">{lead.phone}</Text>
                    </View>
                  )}
                  {lead.email && (
                    <View className="flex-row items-center gap-1 mt-1">
                      <Mail size={12} color={colors.mutedForeground} />
                      <Text className="text-xs text-muted-foreground">{lead.email}</Text>
                    </View>
                  )}
                </View>
                <View
                  style={{
                    backgroundColor: cfg.bg,
                    borderRadius: 999,
                    paddingHorizontal: 8,
                    paddingVertical: 2,
                  }}
                >
                  <View className="flex-row items-center gap-1">
                    <StatusIcon size={10} color={cfg.color} />
                    <Text style={{ color: cfg.color, fontSize: 10, fontWeight: "700" }}>
                      {cfg.label}
                    </Text>
                  </View>
                </View>
              </View>
              {lead.message ? (
                <Text className="text-xs text-foreground bg-muted/50 rounded-lg p-2 italic">
                  "{lead.message}"
                </Text>
              ) : null}
              <View className="flex-row items-center justify-between">
                <Text className="text-[10px] text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString("en-IN", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </Text>
                <View className="flex-row gap-1">
                  {lead.status === "new" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] rounded-lg gap-0.5"
                        onPress={() =>
                          updateLeadStatus.mutate({ id: lead.id, status: "contacted" })
                        }
                      >
                        <MessageSquare size={10} color={colors.foreground} /> Contacted
                      </Button>
                      <Button
                        size="sm"
                        className="h-6 text-[10px] rounded-lg gap-0.5"
                        onPress={() =>
                          updateLeadStatus.mutate({ id: lead.id, status: "converted" })
                        }
                      >
                        <CheckCircle size={10} color="#ffffff" /> Convert
                      </Button>
                    </>
                  )}
                  {lead.status === "contacted" && (
                    <Button
                      size="sm"
                      className="h-6 text-[10px] rounded-lg gap-0.5"
                      onPress={() =>
                        updateLeadStatus.mutate({ id: lead.id, status: "converted" })
                      }
                    >
                      <CheckCircle size={10} color="#ffffff" /> Convert
                    </Button>
                  )}
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};

export default LeadsManager;
