import { useActivityFeed } from "@/hooks/useAdminActivity";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

const eventEmojis: Record<string, string> = {
  new_booking: "📅",
  new_review: "⭐",
  new_business: "🏢",
  new_dispute: "⚖️",
  new_ticket: "🎫",
  new_user: "👤",
  complaint: "🚩",
};

const eventColors: Record<string, string> = {
  new_booking: "bg-blue-500/10 text-blue-700",
  new_review: "bg-amber-500/10 text-amber-700",
  new_business: "bg-green-500/10 text-green-700",
  new_dispute: "bg-red-500/10 text-red-700",
  new_ticket: "bg-purple-500/10 text-purple-700",
};

const ActivityFeed = () => {
  const { data: activities = [], isLoading } = useActivityFeed();

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <span className="text-4xl">📭</span>
        <p className="text-sm text-muted-foreground mt-2">No activity yet</p>
        <p className="text-[10px] text-muted-foreground">Activity will appear here as users interact with the platform</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-foreground">Live Activity Feed</h2>
      <div className="space-y-2">
        {activities.map((activity: any, i: number) => {
          const emoji = eventEmojis[activity.event_type] || "📌";
          const colorClass = eventColors[activity.event_type] || "bg-muted text-foreground";
          const timeAgo = getTimeAgo(activity.created_at);

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${colorClass}`}>
                {emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{activity.description || activity.event_type}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[9px] capitalize">
                    {activity.entity_type}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">{timeAgo}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}

export default ActivityFeed;
