import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";

const severityStyles: Record<Severity, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-green-500/20 text-green-400 border-green-500/30",
  INFO: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge variant="outline" className={cn("font-mono text-xs", severityStyles[severity])}>
      {severity}
    </Badge>
  );
}
