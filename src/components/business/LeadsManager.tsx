import { useState } from "react";
import { Users, Mail, Phone, MessageSquare, CheckCircle, Clock, XCircle, ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useBusinessLeads } from "@/hooks/useBusinessLeads";
import { motion } from "framer-motion";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface LeadsManagerProps {
  businessCardId: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  new: { label: "New", color: "bg-blue-100 text-blue-700", icon: Clock },
  contacted: { label: "Contacted", color: "bg-amber-100 text-amber-700", icon: MessageSquare },
  converted: { label: "Converted", color: "bg-green-100 text-green-700", icon: CheckCircle },
  closed: { label: "Closed", color: "bg-red-100 text-red-700", icon: XCircle },
};

const LeadsManager = ({ businessCardId }: LeadsManagerProps) => {
  const { leads, isLoading, updateLeadStatus } = useBusinessLeads(businessCardId);
  const [filter, setFilter] = useState<string>("all");

  const filteredLeads = filter === "all" ? leads : leads.filter((l: any) => l.status === filter);
  const newCount = leads.filter((l: any) => l.status === "new").length;

  const exportCSV = () => {
    if (leads.length === 0) return;
    const headers = ["Name", "Email", "Phone", "Message", "Status", "Source", "Date"];
    const rows = leads.map((l: any) => [
      l.full_name, l.email || "", l.phone || "", (l.message || "").replace(/"/g, '""'),
      l.status, l.source || "", new Date(l.created_at).toLocaleDateString(),
    ]);
    const csv = [headers, ...rows].map(r => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">
            Leads {newCount > 0 && <span className="ml-1 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{newCount}</span>}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="text-xs gap-1 rounded-lg" onClick={exportCSV} disabled={leads.length === 0}>
            <Download className="h-3 w-3" /> CSV
          </Button>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="text-xs gap-1 rounded-lg">
              {filter === "all" ? "All" : statusConfig[filter]?.label || filter}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setFilter("all")}>All ({leads.length})</DropdownMenuItem>
            {Object.entries(statusConfig).map(([key, val]) => (
              <DropdownMenuItem key={key} onClick={() => setFilter(key)}>
                {val.label} ({leads.filter((l: any) => l.status === key).length})
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : filteredLeads.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {filter === "all" ? "No leads yet. Share your card to start getting inquiries!" : `No ${statusConfig[filter]?.label || filter} leads`}
          </p>
        </div>
      ) : (
        filteredLeads.map((lead: any, i: number) => {
          const cfg = statusConfig[lead.status] || statusConfig.new;
          return (
            <motion.div key={lead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{lead.full_name}</p>
                  {lead.phone && (
                    <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                      <Phone className="h-3 w-3" /> {lead.phone}
                    </a>
                  )}
                  {lead.email && (
                    <a href={`mailto:${lead.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                      <Mail className="h-3 w-3" /> {lead.email}
                    </a>
                  )}
                </div>
                <Badge className={`text-[10px] ${cfg.color} border-0`}>{cfg.label}</Badge>
              </div>
              {lead.message && (
                <p className="text-xs text-foreground bg-muted/50 rounded-lg p-2 italic">"{lead.message}"</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
                <div className="flex gap-1">
                  {lead.status === "new" && (
                    <>
                      <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-lg gap-0.5"
                        onClick={() => updateLeadStatus.mutate({ id: lead.id, status: "contacted" })}>
                        <MessageSquare className="h-2.5 w-2.5" /> Contacted
                      </Button>
                      <Button size="sm" className="h-6 text-[10px] rounded-lg gap-0.5"
                        onClick={() => updateLeadStatus.mutate({ id: lead.id, status: "converted" })}>
                        <CheckCircle className="h-2.5 w-2.5" /> Convert
                      </Button>
                    </>
                  )}
                  {lead.status === "contacted" && (
                    <Button size="sm" className="h-6 text-[10px] rounded-lg gap-0.5"
                      onClick={() => updateLeadStatus.mutate({ id: lead.id, status: "converted" })}>
                      <CheckCircle className="h-2.5 w-2.5" /> Convert
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })
      )}
    </div>
  );
};

export default LeadsManager;
