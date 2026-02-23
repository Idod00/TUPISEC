"use client";

import { ShieldCheck, ShieldAlert, ShieldOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/context";
import type { Finding } from "@/lib/types";

interface Props {
  findings: Finding[];
}

const OWASP = [
  {
    id: "A01",
    name: "Broken Access Control",
    categories: ["Open Redirect", "CORS Misconfiguration", "Parameter Fuzzing"],
  },
  {
    id: "A02",
    name: "Cryptographic Failures",
    categories: ["SSL/TLS", "Sensitive Data Exposure", "Mixed Content"],
  },
  {
    id: "A03",
    name: "Injection",
    categories: ["SQL Injection", "XSS", "SSTI", "XXE", "SSRF"],
  },
  {
    id: "A04",
    name: "Insecure Design",
    categories: ["CSRF", "Form Security", "Rate Limiting"],
  },
  {
    id: "A05",
    name: "Security Misconfiguration",
    categories: [
      "Missing Security Header",
      "HTTP Methods",
      "GraphQL",
      "Sensitive File/Directory",
      "Directory Enumeration",
      "Cookie Security",
      "Information Disclosure",
    ],
  },
  {
    id: "A06",
    name: "Vulnerable Components",
    categories: ["CVE"],
  },
  {
    id: "A07",
    name: "Auth & Session Failures",
    categories: ["JWT Security", "Cookie Security", "Rate Limiting"],
  },
  {
    id: "A08",
    name: "Software Integrity Failures",
    categories: ["Broken Link Hijacking"],
  },
  {
    id: "A09",
    name: "Security Logging Failures",
    categories: [],
  },
  {
    id: "A10",
    name: "Server-Side Request Forgery",
    categories: ["SSRF"],
  },
] as const;

export function OwaspCoverageCard({ findings }: Props) {
  const { t } = useI18n();
  const presentCategories = new Set(findings.map((f) => f.category));

  const results = OWASP.map((item) => {
    const covered = item.categories.length > 0;
    const hits = item.categories.filter((c) => presentCategories.has(c));
    return { ...item, covered, hits };
  });

  const withFindings = results.filter((r) => r.hits.length > 0).length;
  const tested = results.filter((r) => r.covered).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-blue-400" />
          {t("owasp.title")}
          <Badge variant="secondary" className="ml-auto text-xs font-normal">
            {withFindings} / {tested} {t("owasp.affected")}
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("owasp.subtitle")}</p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {results.map((item) => {
            const hasFindings = item.hits.length > 0;
            const isTestable  = item.covered;

            return (
              <div
                key={item.id}
                className={`flex items-start gap-2 rounded-md border px-3 py-2 text-xs transition-colors ${
                  hasFindings
                    ? "border-red-800/50 bg-red-950/20"
                    : isTestable
                    ? "border-green-800/30 bg-green-950/10"
                    : "border-border/30 opacity-50"
                }`}
              >
                <div className="mt-0.5 shrink-0">
                  {hasFindings ? (
                    <ShieldAlert className="h-3.5 w-3.5 text-red-400" />
                  ) : isTestable ? (
                    <ShieldCheck className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <ShieldOff className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-muted-foreground shrink-0">
                      {item.id}
                    </span>
                    <span className={`font-medium truncate ${hasFindings ? "text-red-300" : isTestable ? "text-green-300" : "text-muted-foreground"}`}>
                      {item.name}
                    </span>
                  </div>
                  {hasFindings && (
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {item.hits.map((h) => (
                        <span
                          key={h}
                          className="inline-block bg-red-900/40 text-red-300 rounded px-1 py-px text-[10px] font-mono"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  )}
                  {!hasFindings && isTestable && (
                    <p className="mt-0.5 text-[10px] text-green-500/70">{t("owasp.clean")}</p>
                  )}
                  {!isTestable && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{t("owasp.notCovered")}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
