"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "./severity-badge";
import { FindingStatusBadge } from "./finding-status-badge";
import { FindingNoteDialog } from "./finding-note-dialog";
import { getOwaspLink } from "@/lib/owasp";
import type { Finding, FindingStatusRecord, FindingStatusValue } from "@/lib/types";

interface FindingCardProps {
  finding: Finding;
  index: number;
  statusRecord?: FindingStatusRecord;
  onStatusChange?: (status: string, note?: string) => void;
}

export function FindingCard({ finding, index, statusRecord, onStatusChange }: FindingCardProps) {
  const [open, setOpen] = useState(false);
  const owasp = getOwaspLink(finding.category);
  const currentStatus = statusRecord?.status || "open";
  const currentNote = statusRecord?.note || "";

  return (
    <Card className="border-border/50 transition-colors hover:border-border">
      <CardContent className="p-0">
        <button
          onClick={() => setOpen(!open)}
          className="flex w-full items-start gap-3 p-4 text-left"
        >
          <span className="mt-0.5 text-muted-foreground">
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <SeverityBadge severity={finding.severity} />
              <span className="text-xs text-muted-foreground font-mono">#{index}</span>
              <span className="text-xs text-muted-foreground">{finding.category}</span>
              {onStatusChange && (
                <FindingStatusBadge
                  status={currentStatus as FindingStatusValue}
                  onChange={(s) => onStatusChange(s, currentNote)}
                />
              )}
              {onStatusChange && (
                <FindingNoteDialog
                  note={currentNote}
                  onSave={(note) => onStatusChange(currentStatus, note)}
                />
              )}
            </div>
            <p className="mt-1 text-sm font-medium">{finding.title}</p>
          </div>
        </button>

        {open && (
          <div className="border-t border-border/50 px-4 pb-4 pt-3 ml-7">
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  Detail
                </p>
                <p className="text-foreground/80 whitespace-pre-wrap font-mono text-xs">
                  {finding.detail}
                </p>
              </div>

              {finding.recommendation && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Recommendation
                  </p>
                  <p className="text-primary/90">{finding.recommendation}</p>
                </div>
              )}

              {currentNote && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Note
                  </p>
                  <p className="text-foreground/70 text-xs">{currentNote}</p>
                </div>
              )}

              {owasp && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    OWASP Reference
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
