"use client";

import { Shield, AlertTriangle, CheckCircle, HelpCircle } from "lucide-react";
import type { VirusTotalData } from "@/lib/types";

interface Props {
  data: VirusTotalData;
}

export function VirusTotalCard({ data }: Props) {
  const total = data.malicious + data.suspicious + data.harmless + data.undetected;
  const maliciousPct = total > 0 ? Math.round((data.malicious / total) * 100) : 0;
  const suspiciousPct = total > 0 ? Math.round((data.suspicious / total) * 100) : 0;
  const harmlessPct = total > 0 ? Math.round((data.harmless / total) * 100) : 0;

  const riskColor =
    data.malicious > 0
      ? "text-red-400"
      : data.suspicious > 0
      ? "text-yellow-400"
      : "text-green-400";

  const RiskIcon =
    data.malicious > 0
      ? AlertTriangle
      : data.suspicious > 0
      ? AlertTriangle
      : CheckCircle;

  return (
    <div className="rounded-lg border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-4 w-4 text-blue-400" />
        <h3 className="font-semibold text-sm">VirusTotal Analysis</h3>
        <a
          href="https://www.virustotal.com"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-muted-foreground hover:text-foreground"
        >
          virustotal.com ↗
        </a>
      </div>

      {/* Reputation score */}
      <div className="flex items-center gap-3 mb-4">
        <RiskIcon className={`h-5 w-5 ${riskColor}`} />
        <div>
          <p className="text-sm font-medium">
            Reputation: <span className={riskColor}>{data.reputation}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Last analyzed: {new Date(data.last_analysis_date).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Detection stats bar */}
      <div className="mb-4">
        <div className="flex text-xs text-muted-foreground mb-1 justify-between">
          <span>Detection results ({total} engines)</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden flex">
          {data.malicious > 0 && (
            <div
              className="bg-red-500 h-full"
              style={{ width: `${maliciousPct}%` }}
              title={`Malicious: ${data.malicious}`}
            />
          )}
          {data.suspicious > 0 && (
            <div
              className="bg-yellow-500 h-full"
              style={{ width: `${suspiciousPct}%` }}
              title={`Suspicious: ${data.suspicious}`}
            />
          )}
          {data.harmless > 0 && (
            <div
              className="bg-green-500 h-full"
              style={{ width: `${harmlessPct}%` }}
              title={`Harmless: ${data.harmless}`}
            />
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="rounded-md bg-red-500/10 p-2">
          <p className="text-base font-bold text-red-400">{data.malicious}</p>
          <p className="text-xs text-muted-foreground">Malicious</p>
        </div>
        <div className="rounded-md bg-yellow-500/10 p-2">
          <p className="text-base font-bold text-yellow-400">{data.suspicious}</p>
          <p className="text-xs text-muted-foreground">Suspicious</p>
        </div>
        <div className="rounded-md bg-green-500/10 p-2">
          <p className="text-base font-bold text-green-400">{data.harmless}</p>
          <p className="text-xs text-muted-foreground">Harmless</p>
        </div>
        <div className="rounded-md bg-muted p-2">
          <p className="text-base font-bold text-muted-foreground">{data.undetected}</p>
          <p className="text-xs text-muted-foreground">Undetected</p>
        </div>
      </div>

      {/* Categories */}
      {data.categories.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Categories</p>
          <div className="flex flex-wrap gap-1">
            {data.categories.map((cat, i) => (
              <span
                key={i}
                className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground"
              >
                {cat}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
