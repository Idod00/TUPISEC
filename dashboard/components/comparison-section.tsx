"use client";

import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "./severity-badge";
import type { Finding } from "@/lib/types";

interface ComparisonSectionProps {
  title: string;
  findings: Finding[];
  variant: "new" | "resolved" | "persistent";
}

const variantStyles = {
  new: "border-l-4 border-l-red-500",
  resolved: "border-l-4 border-l-green-500",
  persistent: "border-l-4 border-l-slate-500",
};

const variantLabels = {
  new: "New Issue",
  resolved: "Resolved",
  persistent: "Persistent",
};

export function ComparisonSection({ title, findings, variant }: ComparisonSectionProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        {title}
        <span className="text-xs font-normal text-muted-foreground">({findings.length})</span>
      </h3>
      {findings.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">None</p>
      ) : (
        <div className="space-y-2">
          {findings.map((f, i) => (
            <Card key={i} className={`border-border/50 ${variantStyles[variant]}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <SeverityBadge severity={f.severity} />
                  <span className="text-xs text-muted-foreground">{f.category}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    variant === "new" ? "bg-red-500/20 text-red-400" :
                    variant === "resolved" ? "bg-green-500/20 text-green-400" :
                    "bg-slate-500/20 text-slate-400"
                  }`}>
                    {variantLabels[variant]}
                  </span>
                </div>
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{f.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
