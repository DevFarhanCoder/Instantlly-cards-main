import { useAdminAlerts, useMarkAlertRead } from "@/hooks/useAdminActivity";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Info, AlertCircle } from "lucide-react";

const severityConfig: Record<string, { icon: any; bg: string; border: string; text: string }> = {
  critical: { icon: AlertCircle, bg: "bg-destructive/10", border: "border-destructive/30", text: "text-destructive" },
  medium: { icon: AlertTriangle, bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-700" },
  low: { icon: Info, bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-700" },
};

const AlertBanner = () => {
  const { data: alerts = [] } = useAdminAlerts();
  const markRead = useMarkAlertRead();

  const unreadAlerts = alerts.filter((a: any) => !a.is_read);
  if (unreadAlerts.length === 0) return null;

  // Show only top 3 critical/medium alerts
  const topAlerts = unreadAlerts
    .sort((a: any, b: any) => {
      const order: Record<string, number> = { critical: 0, medium: 1, low: 2 };
      return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
    })
    .slice(0, 3);

  return (
    <div className="space-y-2 mb-4">
      {topAlerts.map((alert: any) => {
        const config = severityConfig[alert.severity] || severityConfig.low;
        const Icon = config.icon;
        return (
          <div
            key={alert.id}
            className={`flex items-center gap-3 rounded-xl border ${config.border} ${config.bg} p-3`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${config.text}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${config.text}`}>{alert.message}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{alert.type} • {new Date(alert.created_at).toLocaleTimeString()}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => markRead.mutate(alert.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default AlertBanner;
