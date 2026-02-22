"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, Trash2, Loader2 } from "lucide-react";
import type { ScheduleRecord } from "@/lib/types";

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">("daily");
  const [submitting, setSubmitting] = useState(false);

  const fetchSchedules = () => {
    fetch("/api/schedules")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSchedules(data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_url: url.trim(), interval }),
      });
      if (res.ok) {
        setUrl("");
        fetchSchedules();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Scheduled Scans
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Automatically re-scan targets on a schedule.
        </p>
      </div>

      {/* Add schedule form */}
      <Card className="border-border/50 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Add New Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-3">
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
              required
            />
            <Select value={interval} onValueChange={(v) => setInterval(v as typeof interval)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Schedule list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No schedules configured yet.
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Target URL</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">{s.target_url}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">{s.interval}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={s.enabled ? "text-green-400 border-green-500/30" : "text-muted-foreground"}
                      >
                        {s.enabled ? "Active" : "Paused"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.last_run ? new Date(s.last_run).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.next_run ? new Date(s.next_run).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-400"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
