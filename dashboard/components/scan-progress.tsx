"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  const [cancelling, setCancelling] = useState(false);
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

  async function handleCancel() {
    setCancelling(true);
    try {
      await fetch(`/api/scan/${scanId}/cancel`, { method: "POST" });
    } catch {
      // error state will come through the SSE stream
    }
  }

  const percentage = progress ? Math.round((progress.step / progress.total) * 100) : 0;
  const isRunning = !done && !error;

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
                ? cancelling
                  ? t("scanProgress.cancelled")
                  : t("scanProgress.failed")
                : cancelling
                  ? t("scanProgress.cancelling")
                  : progress?.message || t("scanProgress.starting")}
          </span>
          <span className="ml-auto font-mono text-sm text-muted-foreground">{percentage}%</span>
        </div>
        <Progress value={percentage} className="h-2" />
        <div className="flex items-center justify-between">
          {progress && !done && !error && (
            <p className="text-xs text-muted-foreground">
              {t("scanProgress.step", { step: progress.step, total: progress.total })} &mdash; {progress.phase}
            </p>
          )}
          {isRunning && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
              className="ml-auto text-xs text-red-400 border-red-400/30 hover:bg-red-500/10 hover:text-red-400"
            >
              {cancelling ? t("scanProgress.cancelling") : t("scanProgress.cancel")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
