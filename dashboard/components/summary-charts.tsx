"use client";

import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Finding, Severity } from "@/lib/types";

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: "#ef4444",
  HIGH: "#f97316",
  MEDIUM: "#eab308",
  LOW: "#06b6d4",
  INFO: "#3b82f6",
};

interface SummaryChartsProps {
  summary: Record<string, number>;
  findings: Finding[];
}

export function SummaryCharts({ summary, findings }: SummaryChartsProps) {
  const severityData = (["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as Severity[])
    .map((s) => ({ name: s, value: summary[s] || 0, color: SEVERITY_COLORS[s] }))
    .filter((d) => d.value > 0);

  // Group findings by category
  const catMap: Record<string, number> = {};
  for (const f of findings) {
    catMap[f.category] = (catMap[f.category] || 0) + 1;
  }
  const categoryData = Object.entries(catMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

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
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    borderRadius: "8px",
                    color: "hsl(var(--foreground))",
                  }}
                />
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
              <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  color: "hsl(var(--foreground))",
                }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
