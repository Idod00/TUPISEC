"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "./severity-badge";
import { FindingStatusBadge } from "./finding-status-badge";
import { FindingNoteDialog } from "./finding-note-dialog";
import { getOwaspLink } from "@/lib/owasp";
import { useI18n } from "@/lib/i18n/context";
import type { Finding, FindingStatusRecord, FindingStatusValue } from "@/lib/types";

interface FindingCardProps {
  finding: Finding;
  index: number;
  statusRecord?: FindingStatusRecord;
  onStatusChange?: (status: string, note?: string) => void;
}

export function FindingCard({ finding, index, statusRecord, onStatusChange }: FindingCardProps) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const owasp = getOwaspLink(finding.category);
  const currentStatus = statusRecord?.status || "open";
  const currentNote = statusRecord?.note || "";

  return (
    <Card className="border-border/50 transition-colors hover:border-border">
      <CardContent className="p-0">
        <div className="flex w-full items-start">
          <button
            onClick={() => setOpen(!open)}
            className="flex flex-1 items-start gap-3 p-4 text-left min-w-0"
          >
            <span className="mt-0.5 text-muted-foreground shrink-0">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <SeverityBadge severity={finding.severity} />
                <span className="text-xs text-muted-foreground font-mono">#{index}</span>
                <span className="text-xs text-muted-foreground">{finding.category}</span>
              </div>
              <p className="mt-1 text-sm font-medium">{finding.title}</p>
            </div>
          </button>
          {onStatusChange && (
            <div className="flex items-center gap-1 p-2 pt-3 shrink-0">
              <FindingStatusBadge
                status={currentStatus as FindingStatusValue}
                onChange={(s) => onStatusChange(s, currentNote)}
              />
              <FindingNoteDialog
                note={currentNote}
                onSave={(note) => onStatusChange(currentStatus, note)}
              />
            </div>
          )}
        </div>

        {open && (
          <div className="border-t border-border/50 px-4 pb-4 pt-3 ml-7">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {t("finding.detail")}
                </p>
                <p className="text-foreground/80 whitespace-pre-wrap font-mono text-xs">
                  {finding.detail}
                </p>
              </div>

              {finding.recommendation && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    {t("finding.recommendation")}
                  </p>
                  <p className="text-primary/90">{finding.recommendation}</p>
                </div>
              )}

              {currentNote && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    {t("finding.note")}
                  </p>
                  <p className="text-foreground/70 text-xs">{currentNote}</p>
                </div>
              )}

              {owasp && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    {t("finding.owaspRef")}
                  </p>
                  <a
                    href={owasp.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {owasp.id} &mdash; {owasp.name}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
