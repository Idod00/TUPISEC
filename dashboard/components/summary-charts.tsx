"use client";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Finding, Severity } from "@/lib/types";

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: "#f43f5e",
  HIGH: "#fb923c",
  MEDIUM: "#fbbf24",
  LOW: "#34d399",
  INFO: "#60a5fa",
};

const SEVERITY_ORDER: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

interface SummaryChartsProps {
  summary: Record<string, number>;
  findings: Finding[];
}

export function SummaryCharts({ summary, findings }: SummaryChartsProps) {
  const severityData = (["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as Severity[])
    .map((s) => ({ name: s, value: summary[s] || 0, color: SEVERITY_COLORS[s] }))
    .filter((d) => d.value > 0);

  // Group findings by category and track worst severity per category
  const catMap: Record<string, number> = {};
  const catWorstSeverity: Record<string, Severity> = {};
  for (const f of findings) {
    catMap[f.category] = (catMap[f.category] || 0) + 1;
    const sv = f.severity as Severity;
    if (!catWorstSeverity[f.category] || SEVERITY_ORDER.indexOf(sv) < SEVERITY_ORDER.indexOf(catWorstSeverity[f.category])) {
      catWorstSeverity[f.category] = sv;
    }
  }
  const categoryData = Object.entries(catMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const tooltipStyle = {
    backgroundColor: "var(--card)",
    borderColor: "var(--border)",
    borderRadius: "8px",
    color: "var(--foreground)",
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Findings by Severity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {severityData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {severityData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-mono font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Findings by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {categoryData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={SEVERITY_COLORS[catWorstSeverity[entry.name] || "INFO"]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
