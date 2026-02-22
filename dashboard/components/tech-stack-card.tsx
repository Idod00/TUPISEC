import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, ShieldAlert } from "lucide-react";
import type { CveRecord } from "@/lib/types";

interface TechStackCardProps {
  techStack: Record<string, string>;
  cveData?: CveRecord[];
}

const cveSeverityClass: Record<string, string> = {
  CRITICAL: "bg-red-500/20 text-red-400 border-red-500/30",
  HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  LOW: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export function TechStackCard({ techStack, cveData }: TechStackCardProps) {
  const entries = Object.entries(techStack);
  const hasCves = cveData && cveData.length > 0;
  if (entries.length === 0) return null;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Server className="h-4 w-4" />
          Technology Stack
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {entries.map(([key, value]) => (
            <div key={key} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
              <span className="text-sm font-medium capitalize">
                {key.replace(/_/g, " ")}
              </span>
              <span className="font-mono text-sm text-muted-foreground truncate ml-4 max-w-[300px]">
                {value}
              </span>
            </div>
          ))}
        </div>

        {hasCves && (
          <div>
            <div className="flex items-center gap-2 mb-2 text-sm font-medium text-muted-foreground">
              <ShieldAlert className="h-4 w-4" />
              CVEs Found ({cveData!.length})
            </div>
            <div className="grid gap-2">
              {cveData!.map((cve) => (
                <div key={cve.cve_id} className="rounded-md border border-border/50 px-3 py-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold">{cve.cve_id}</span>
                    <Badge variant="outline" className={`text-xs ${cveSeverityClass[cve.severity] ?? ""}`}>
                      {cve.severity} {cve.cvss_score.toFixed(1)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{cve.product} {cve.version}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{cve.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
