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
import { useI18n } from "@/lib/i18n/context";
import type { ScheduleRecord } from "@/lib/types";

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">("daily");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { t } = useI18n();

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
        body: JSON.stringify({ target_url: url.trim(), interval, notify_email: notifyEmail.trim() || undefined }),
      });
      if (res.ok) {
        setUrl("");
        setNotifyEmail("");
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
          {t("schedules.title")}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {t("schedules.subtitle")}
        </p>
      </div>

      {/* Add schedule form */}
      <Card className="border-border/50 mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("schedules.addNew")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3">
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1 min-w-[200px]"
              required
            />
            <Select value={interval} onValueChange={(v) => setInterval(v as typeof interval)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">{t("schedules.daily")}</SelectItem>
                <SelectItem value="weekly">{t("schedules.weekly")}</SelectItem>
                <SelectItem value="monthly">{t("schedules.monthly")}</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="email"
              placeholder="Notify email (optional)"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              className="w-[220px]"
            />
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t("schedules.add")}
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
          {t("schedules.none")}
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("schedules.targetUrl")}</TableHead>
                  <TableHead>{t("schedules.interval")}</TableHead>
                  <TableHead>{t("schedules.status")}</TableHead>
                  <TableHead>{t("schedules.lastRun")}</TableHead>
                  <TableHead>{t("schedules.nextRun")}</TableHead>
                  <TableHead>Notify</TableHead>
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
                        {s.enabled ? t("schedules.active") : t("schedules.paused")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.last_run ? new Date(s.last_run).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.next_run ? new Date(s.next_run).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                      {s.notify_email ?? "—"}
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
