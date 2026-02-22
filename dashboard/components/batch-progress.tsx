"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";

interface BatchProgressProps {
  batchId: string;
  onComplete: () => void;
}

interface BatchProgressData {
  completedUrls: number;
  failedUrls: number;
  totalUrls: number;
  currentUrl?: string;
  phase: string;
}

export function BatchProgress({ batchId, onComplete }: BatchProgressProps) {
  const [progress, setProgress] = useState<BatchProgressData | null>(null);

  useEffect(() => {
    const es = new EventSource(`/api/batch/${batchId}/stream`);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as BatchProgressData;
        setProgress(data);
        if (data.phase === "done" || data.phase === "error") {
          es.close();
          onComplete();
        }
      } catch {
        // ignore
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [batchId, onComplete]);

  if (!progress) {
    return (
      <div className="text-sm text-muted-foreground animate-pulse">
        Connecting to batch scan...
      </div>
    );
  }

  const done = progress.completedUrls + progress.failedUrls;
  const pct = progress.totalUrls > 0 ? Math.round((done / progress.totalUrls) * 100) : 0;

  return (
    <div className="space-y-3">
      <Progress value={pct} className="h-3" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {done} of {progress.totalUrls} URLs scanned
        </span>
        <span className="font-mono text-primary">{pct}%</span>
      </div>
      {progress.currentUrl && (
        <p className="text-xs text-muted-foreground truncate">
          Scanning: <span className="font-mono">{progress.currentUrl}</span>
        </p>
      )}
      {progress.failedUrls > 0 && (
        <p className="text-xs text-red-400">{progress.failedUrls} failed</p>
      )}
    </div>
  );
}
