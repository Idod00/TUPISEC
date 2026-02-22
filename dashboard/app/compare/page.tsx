"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ComparisonHeader } from "@/components/comparison-header";
import { ComparisonSection } from "@/components/comparison-section";
import type { Finding } from "@/lib/types";

interface CompareData {
  scanA: { id: string; target_url: string; created_at: string; risk_score: number | null; finding_count: number };
  scanB: { id: string; target_url: string; created_at: string; risk_score: number | null; finding_count: number };
  newFindings: Finding[];
  resolvedFindings: Finding[];
  persistentFindings: Finding[];
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const a = searchParams.get("a");
  const b = searchParams.get("b");
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!a || !b) {
      setError("Both scan IDs are required");
      setLoading(false);
      return;
    }
    fetch(`/api/compare?a=${a}&b=${b}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load comparison");
        setLoading(false);
      });
  }, [a, b]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link href="/history">
          <Button variant="outline">Back to History</Button>
        </Link>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/history" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="h-4 w-4" />
        History
      </Link>

      <h1 className="text-2xl font-bold mb-6">Scan Comparison</h1>

      <ComparisonHeader scanA={data.scanA} scanB={data.scanB} />

      <Separator className="my-6" />

      <div className="space-y-8">
        <ComparisonSection title="New Findings" findings={data.newFindings} variant="new" />
        <ComparisonSection title="Resolved Findings" findings={data.resolvedFindings} variant="resolved" />
        <ComparisonSection title="Persistent Findings" findings={data.persistentFindings} variant="persistent" />
      </div>
    </div>
  );
}
