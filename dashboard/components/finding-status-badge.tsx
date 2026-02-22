"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n/context";
import type { FindingStatusValue } from "@/lib/types";

interface FindingStatusBadgeProps {
  status: FindingStatusValue;
  onChange: (status: FindingStatusValue) => void;
}

const statusColors: Record<FindingStatusValue, string> = {
  open: "text-red-400",
  in_progress: "text-yellow-400",
  accepted: "text-blue-400",
  resolved: "text-green-400",
};

export function FindingStatusBadge({ status, onChange }: FindingStatusBadgeProps) {
  const { t } = useI18n();

  const statusLabels: Record<FindingStatusValue, string> = {
    open: t("findingStatus.open"),
    in_progress: t("findingStatus.inProgress"),
    accepted: t("findingStatus.accepted"),
    resolved: t("findingStatus.resolved"),
  };

  return (
    <Select value={status} onValueChange={(v) => onChange(v as FindingStatusValue)}>
      <SelectTrigger
        className={`h-7 w-[130px] text-xs ${statusColors[status]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(statusColors) as FindingStatusValue[]).map((value) => (
          <SelectItem key={value} value={value} className={`text-xs ${statusColors[value]}`}>
            {statusLabels[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
