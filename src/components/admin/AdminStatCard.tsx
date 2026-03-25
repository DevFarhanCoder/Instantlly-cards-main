import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

interface AdminStatCardProps {
  label: string;
  value: number;
  previousValue?: number;
  emoji: string;
  isLoading?: boolean;
  index?: number;
}

export default function AdminStatCard({ label, value, previousValue, emoji, isLoading, index = 0 }: AdminStatCardProps) {
  const change = previousValue !== undefined && previousValue > 0
    ? Math.round(((value - previousValue) / previousValue) * 100)
    : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-xl border border-border bg-card p-4 text-center"
    >
      <span className="text-2xl">{emoji}</span>
      <p className="text-2xl font-bold text-foreground mt-1">{isLoading ? "…" : value}</p>
      {change !== undefined && (
        <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-medium ${
          change > 0 ? "text-green-600" : change < 0 ? "text-destructive" : "text-muted-foreground"
        }`}>
          {change > 0 ? <TrendingUp className="h-3 w-3" /> : change < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          {change > 0 ? "+" : ""}{change}%
        </div>
      )}
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </motion.div>
  );
}
