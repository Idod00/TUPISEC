"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Layers, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BatchForm } from "@/components/batch-form";
import { useI18n } from "@/lib/i18n/context";
import type { BatchRecord } from "@/lib/types";

export default function BatchPage() {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const router = useRouter();
  const { t, dateLocale } = useI18n();

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString(dateLocale, {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  useEffect(() => {
    fetch("/api/batches")
      .then((r) => { if (r.ok) return r.json(); return []; })
      .then((data) => { if (Array.isArray(data)) setBatches(data.slice(0, 10)); })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <Layers className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">{t("batch.title")}</h1>
        </div>
        <p className="text-muted-foreground">
          {t("batch.subtitle")}
        </p>
      </div>

      <Card className="mb-8 border-primary/20">
        <CardContent className="p-6">
          <BatchForm />
        </CardContent>
      </Card>

      {batches.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              {t("batch.recentBatches")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {batches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => router.push(`/batch/${batch.id}`)}
                  className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm">{batch.total_urls} {t("batch.urls")}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(batch.created_at)}
                    </span>
                    <span className={`text-xs capitalize ${
                      batch.status === "completed" ? "text-primary" :
                      batch.status === "running" ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {batch.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
