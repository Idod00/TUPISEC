"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FindingStatusValue } from "@/lib/types";

interface FindingStatusBadgeProps {
  status: FindingStatusValue;
  onChange: (status: FindingStatusValue) => void;
}

const statusConfig: Record<FindingStatusValue, { label: string; className: string }> = {
  open: { label: "Open", className: "text-red-400" },
  in_progress: { label: "In Progress", className: "text-yellow-400" },
  accepted: { label: "Accepted", className: "text-blue-400" },
  resolved: { label: "Resolved", className: "text-green-400" },
};

export function FindingStatusBadge({ status, onChange }: FindingStatusBadgeProps) {
  return (
    <Select value={status} onValueChange={(v) => onChange(v as FindingStatusValue)}>
      <SelectTrigger
        className={`h-7 w-[130px] text-xs ${statusConfig[status].className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([value, config]) => (
          <SelectItem key={value} value={value} className={`text-xs ${config.className}`}>
            {config.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
