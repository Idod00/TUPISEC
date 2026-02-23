"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useI18n } from "@/lib/i18n/context";
import type { ScanRecord } from "@/lib/types";

type ScanRow = Omit<ScanRecord, "report_json">;

const LINE_COLORS = [
  "#22d3ee", "#a78bfa", "#4ade80", "#f87171", "#fbbf24",
  "#fb923c", "#e879f9", "#34d399",
];

interface ScoreTrendChartProps {
  scans: ScanRow[];
}

export function ScoreTrendChart({ scans }: ScoreTrendChartProps) {
  const { lang } = useI18n();

  // Filter to completed scans with scores
  const completed = scans.filter((s) => s.status === "completed" && s.risk_score != null);
  if (completed.length < 3) return null;

  // Get unique URLs, sort by most recent scan, take top 5
  const urlGroups = new Map<string, ScanRow[]>();
  for (const s of completed) {
    if (!urlGroups.has(s.target_url)) urlGroups.set(s.target_url, []);
    urlGroups.get(s.target_url)!.push(s);
  }

  const sortedUrls = Array.from(urlGroups.entries())
    .sort(
      (a, b) =>
        new Date(b[1][0].created_at).getTime() - new Date(a[1][0].created_at).getTime()
    )
    .slice(0, 5)
    .map(([url]) => url);

  if (sortedUrls.length === 0) return null;

  function shortUrl(url: string): string {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return url.slice(0, 20);
    }
  }

  // Build unified timeline: all scan dates sorted
  const allScans = completed
    .filter((s) => sortedUrls.includes(s.target_url))
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  // Create data points: one per scan, with its score keyed by short URL
  const dataPoints = allScans.map((s) => ({
    date: new Date(s.created_at).toLocaleDateString(lang === "es" ? "es-PY" : "en-US", {
      month: "short",
      day: "numeric",
    }),
    [shortUrl(s.target_url)]: s.risk_score,
  }));

  const urlKeys = sortedUrls.map(shortUrl);

  return (
    <div className="rounded-lg border border-border/50 bg-card p-4 mb-6">
      <p className="text-sm font-medium text-muted-foreground mb-3">Risk Score Trend</p>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={dataPoints} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              fontSize: "11px",
              padding: "6px 10px",
            }}
            labelStyle={{ color: "var(--muted-foreground)", marginBottom: "4px" }}
          />
          {urlKeys.map((key, i) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={LINE_COLORS[i % LINE_COLORS.length]}
              strokeWidth={1.5}
              dot={{ r: 2, fill: LINE_COLORS[i % LINE_COLORS.length] }}
              activeDot={{ r: 4 }}
              connectNulls
            />
          ))}
          {sortedUrls.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: "10px", paddingTop: "8px" }}
              iconSize={8}
              iconType="circle"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
