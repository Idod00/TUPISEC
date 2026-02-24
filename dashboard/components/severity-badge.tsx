import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Severity } from "@/lib/types";

const severityStyles: Record<Severity, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  INFO: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <Badge variant="outline" className={cn("font-mono text-xs", severityStyles[severity])}>
      {severity}
    </Badge>
  );
}
