"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import type { ScanProgress as ScanProgressType } from "@/lib/types";
import { useI18n } from "@/lib/i18n/context";

interface ScanProgressProps {
  scanId: string;
  onComplete: () => void;
}

export function ScanProgress({ scanId, onComplete }: ScanProgressProps) {
  const [progress, setProgress] = useState<ScanProgressType | null>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const eventSource = new EventSource(`/api/scan/${scanId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as ScanProgressType;
        setProgress(data);
        if (data.phase === "done") {
          setDone(true);
          eventSource.close();
          setTimeout(onComplete, 800);
        } else if (data.phase === "error") {
          setError(true);
          eventSource.close();
        }
      } catch {
        // ignore
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [scanId, onComplete]);

  const percentage = progress ? Math.round((progress.step / progress.total) * 100) : 0;

  return (
    <Card className="border-primary/20">
      <CardContent className="flex flex-col gap-3 p-6">
        <div className="flex items-center gap-3">
          {done ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : error ? (
            <XCircle className="h-5 w-5 text-red-400" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          <span className="font-medium">
            {done
              ? t("scanProgress.complete")
              : error
                ? t("scanProgress.failed")
                : progress?.message || t("scanProgress.starting")}
          </span>
          <span className="ml-auto font-mono text-sm text-muted-foreground">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
        {progress && !done && !error && (
          <p className="text-xs text-muted-foreground">
            {t("scanProgress.step", { step: progress.step, total: progress.total })} &mdash; {progress.phase}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
