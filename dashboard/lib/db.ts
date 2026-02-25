import { Pool } from "pg";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import type { ScanRecord, ScanReport, BatchRecord, FindingStatusRecord, FindingStatusValue, ScheduleRecord, NotificationConfig, EnrichmentData, SSLMonitorRecord, SSLCheckHistoryRecord, SSLCheckResult, AppMonitorRecord, AppCheckHistoryRecord } from "./types";

const execAsync = promisify(exec);

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

export async function initDb(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      target_url TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'running',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      report_json TEXT,
      finding_count INTEGER DEFAULT 0,
      critical_count INTEGER DEFAULT 0,
      high_count INTEGER DEFAULT 0,
      medium_count INTEGER DEFAULT 0,
      low_count INTEGER DEFAULT 0,
      info_count INTEGER DEFAULT 0,
      risk_score INTEGER DEFAULT NULL,
      enrichment_json TEXT
    );

    CREATE TABLE IF NOT EXISTS batches (
      id TEXT PRIMARY KEY,
      status TEXT NOT NULL DEFAULT 'running',
      created_at TEXT NOT NULL,
      completed_at TEXT,
      total_urls INTEGER DEFAULT 0,
      completed_urls INTEGER DEFAULT 0,
      failed_urls INTEGER DEFAULT 0,
      urls_json TEXT NOT NULL,
      scan_ids_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS finding_status (
      id SERIAL PRIMARY KEY,
      scan_id TEXT NOT NULL,
      finding_index INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      note TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL,
      UNIQUE(scan_id, finding_index)
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      target_url TEXT NOT NULL,
      interval TEXT NOT NULL,
      cron_expr TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      last_run TEXT,
      next_run TEXT,
      notify_email TEXT
    );

    CREATE TABLE IF NOT EXISTS notification_configs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      notify_on_complete INTEGER DEFAULT 1,
      notify_on_critical INTEGER DEFAULT 1,
      min_risk_score INTEGER DEFAULT 100,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ssl_monitors (
      id TEXT PRIMARY KEY,
      domain TEXT NOT NULL,
      port INTEGER DEFAULT 443,
      interval TEXT NOT NULL,
      cron_expr TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      last_check TEXT,
      next_check TEXT,
      last_status TEXT,
      last_days_remaining INTEGER,
      notify_days_before INTEGER DEFAULT 14,
      notify_email TEXT,
      last_result_json TEXT
    );

    CREATE TABLE IF NOT EXISTS ssl_check_history (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      status TEXT NOT NULL,
      days_remaining INTEGER,
      result_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS api_tokens (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      token_prefix TEXT NOT NULL,
      created_at TEXT NOT NULL,
      last_used TEXT
    );

    CREATE TABLE IF NOT EXISTS app_monitors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      username TEXT NOT NULL,
      password_enc TEXT NOT NULL,
      interval TEXT NOT NULL,
      cron_expr TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      last_check TEXT,
      next_check TEXT,
      last_status TEXT,
      last_response_ms INTEGER,
      notify_email TEXT,
      last_login_status TEXT
    );

    CREATE TABLE IF NOT EXISTS app_check_history (
      id TEXT PRIMARY KEY,
      monitor_id TEXT NOT NULL,
      checked_at TEXT NOT NULL,
      status TEXT NOT NULL,
      response_ms INTEGER,
      status_code INTEGER,
      error TEXT,
      check_type TEXT NOT NULL DEFAULT 'login',
      response_detail TEXT
    );
  `);
}

// ─── Scans ─────────────────────────────────────────────────────────

export async function createScan(id: string, targetUrl: string): Promise<ScanRecord> {
  const now = new Date().toISOString();
  await getPool().query(
    `INSERT INTO scans (id, target_url, status, created_at) VALUES ($1, $2, 'running', $3)`,
    [id, targetUrl, now]
  );
  return {
    id,
    target_url: targetUrl,
    status: "running",
    created_at: now,
    completed_at: null,
    report_json: null,
    finding_count: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0,
    low_count: 0,
    info_count: 0,
    risk_score: null,
  };
}

export async function completeScan(id: string, report: ScanReport, riskScore: number): Promise<void> {
  const now = new Date().toISOString();
  const summary = report.summary || {};
  await getPool().query(
    `UPDATE scans SET
      status = 'completed',
      completed_at = $1,
      report_json = $2,
      finding_count = $3,
      critical_count = $4,
      high_count = $5,
      medium_count = $6,
      low_count = $7,
      info_count = $8,
      risk_score = $9
    WHERE id = $10`,
    [
      now,
      JSON.stringify(report),
      report.findings.length,
      summary.CRITICAL || 0,
      summary.HIGH || 0,
      summary.MEDIUM || 0,
      summary.LOW || 0,
      summary.INFO || 0,
      riskScore,
      id,
    ]
  );
}

export async function failScan(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getPool().query(
    `UPDATE scans SET status = 'failed', completed_at = $1 WHERE id = $2`,
    [now, id]
  );
}

export async function getScan(id: string): Promise<ScanRecord | undefined> {
  const { rows } = await getPool().query(`SELECT * FROM scans WHERE id = $1`, [id]);
  return rows[0];
}

export async function listScans(): Promise<Omit<ScanRecord, "report_json">[]> {
  const { rows } = await getPool().query(
    `SELECT id, target_url, status, created_at, completed_at,
            finding_count, critical_count, high_count, medium_count, low_count, info_count,
            risk_score
     FROM scans ORDER BY created_at DESC`
  );
  return rows;
}

export async function deleteScan(id: string): Promise<boolean> {
  const result = await getPool().query(`DELETE FROM scans WHERE id = $1`, [id]);
  await getPool().query(`DELETE FROM finding_status WHERE scan_id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

// ─── Batches ───────────────────────────────────────────────────────

export async function createBatch(id: string, urls: string[]): Promise<BatchRecord> {
  const now = new Date().toISOString();
  const urlsJson = JSON.stringify(urls);
  await getPool().query(
    `INSERT INTO batches (id, status, created_at, total_urls, urls_json, scan_ids_json) VALUES ($1, 'running', $2, $3, $4, '[]')`,
    [id, now, urls.length, urlsJson]
  );
  return {
    id,
    status: "running",
    created_at: now,
    completed_at: null,
    total_urls: urls.length,
    completed_urls: 0,
    failed_urls: 0,
    urls_json: urlsJson,
    scan_ids_json: "[]",
  };
}

export async function getBatch(id: string): Promise<BatchRecord | undefined> {
  const { rows } = await getPool().query(`SELECT * FROM batches WHERE id = $1`, [id]);
  return rows[0];
}

export async function updateBatchProgress(id: string, scanIds: string[], completedUrls: number, failedUrls: number): Promise<void> {
  await getPool().query(
    `UPDATE batches SET scan_ids_json = $1, completed_urls = $2, failed_urls = $3 WHERE id = $4`,
    [JSON.stringify(scanIds), completedUrls, failedUrls, id]
  );
}

export async function completeBatch(id: string): Promise<void> {
  const now = new Date().toISOString();
  await getPool().query(
    `UPDATE batches SET status = 'completed', completed_at = $1 WHERE id = $2`,
    [now, id]
  );
}

export async function listBatches(): Promise<BatchRecord[]> {
  const { rows } = await getPool().query(`SELECT * FROM batches ORDER BY created_at DESC`);
  return rows;
}

export async function deleteBatch(id: string): Promise<boolean> {
  const result = await getPool().query(`DELETE FROM batches WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

// ─── Finding Status ────────────────────────────────────────────────

export async function getFindingStatuses(scanId: string): Promise<FindingStatusRecord[]> {
  const { rows } = await getPool().query(
    `SELECT * FROM finding_status WHERE scan_id = $1`,
    [scanId]
  );
  return rows;
}

export async function upsertFindingStatus(scanId: string, findingIndex: number, status: FindingStatusValue, note: string): Promise<FindingStatusRecord> {
  const now = new Date().toISOString();
  const { rows } = await getPool().query(
    `INSERT INTO finding_status (scan_id, finding_index, status, note, updated_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT(scan_id, finding_index) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, updated_at = EXCLUDED.updated_at
     RETURNING *`,
    [scanId, findingIndex, status, note, now]
  );
  return rows[0];
}

// ─── Schedules ─────────────────────────────────────────────────────

export async function createSchedule(
  id: string,
  targetUrl: string,
  interval: ScheduleRecord["interval"],
  cronExpr: string,
  nextRun: string,
  notifyEmail?: string
): Promise<ScheduleRecord> {
  const now = new Date().toISOString();
  const { rows } = await getPool().query(
    `INSERT INTO schedules (id, target_url, interval, cron_expr, enabled, created_at, next_run, notify_email)
     VALUES ($1, $2, $3, $4, 1, $5, $6, $7)
     RETURNING *`,
    [id, targetUrl, interval, cronExpr, now, nextRun, notifyEmail ?? null]
  );
  return rows[0];
}

export async function listSchedules(): Promise<ScheduleRecord[]> {
  const { rows } = await getPool().query(`SELECT * FROM schedules ORDER BY created_at DESC`);
  return rows;
}

export async function getSchedule(id: string): Promise<ScheduleRecord | undefined> {
  const { rows } = await getPool().query(`SELECT * FROM schedules WHERE id = $1`, [id]);
  return rows[0];
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const result = await getPool().query(`DELETE FROM schedules WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateScheduleRun(id: string, lastRun: string, nextRun: string): Promise<void> {
  await getPool().query(
    `UPDATE schedules SET last_run = $1, next_run = $2 WHERE id = $3`,
    [lastRun, nextRun, id]
  );
}

// ─── Notification Configs ───────────────────────────────────────────

export async function listNotificationConfigs(): Promise<NotificationConfig[]> {
  const { rows } = await getPool().query(`SELECT * FROM notification_configs ORDER BY created_at DESC`);
  return rows;
}

export async function getNotificationConfig(id: string): Promise<NotificationConfig | undefined> {
  const { rows } = await getPool().query(
    `SELECT * FROM notification_configs WHERE id = $1`,
    [id]
  );
  return rows[0];
}

export async function createNotificationConfig(config: Omit<NotificationConfig, "created_at">): Promise<NotificationConfig> {
  const now = new Date().toISOString();
  const { rows } = await getPool().query(
    `INSERT INTO notification_configs (id, name, type, url, enabled, notify_on_complete, notify_on_critical, min_risk_score, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      config.id, config.name, config.type, config.url,
      config.enabled ? 1 : 0, config.notify_on_complete ? 1 : 0,
      config.notify_on_critical ? 1 : 0, config.min_risk_score, now,
    ]
  );
  return rows[0];
}

export async function deleteNotificationConfig(id: string): Promise<boolean> {
  const result = await getPool().query(
    `DELETE FROM notification_configs WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

// ─── Settings ──────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const { rows } = await getPool().query(
    `SELECT value FROM settings WHERE key = $1`,
    [key]
  );
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await getPool().query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT(key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [key, value, now]
  );
}

export async function listSettings(): Promise<{ key: string; value: string; updated_at: string }[]> {
  const { rows } = await getPool().query(`SELECT * FROM settings`);
  return rows;
}

// ─── Enrichment ────────────────────────────────────────────────────

export async function updateScanEnrichment(id: string, enrichment: EnrichmentData): Promise<void> {
  await getPool().query(
    `UPDATE scans SET enrichment_json = $1 WHERE id = $2`,
    [JSON.stringify(enrichment), id]
  );
}

export async function getScanEnrichment(id: string): Promise<EnrichmentData | null> {
  const { rows } = await getPool().query(
    `SELECT enrichment_json FROM scans WHERE id = $1`,
    [id]
  );
  const row = rows[0];
  if (!row || !row.enrichment_json) return null;
  try {
    return JSON.parse(row.enrichment_json) as EnrichmentData;
  } catch {
    return null;
  }
}

// ─── SSL Monitors ──────────────────────────────────────────────────

export async function createSSLMonitor(monitor: Omit<SSLMonitorRecord, "last_check" | "next_check" | "last_status" | "last_days_remaining" | "last_result_json">): Promise<SSLMonitorRecord> {
  const { rows } = await getPool().query(
    `INSERT INTO ssl_monitors (id, domain, port, interval, cron_expr, enabled, created_at, notify_days_before, notify_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      monitor.id, monitor.domain, monitor.port, monitor.interval, monitor.cron_expr,
      monitor.enabled, monitor.created_at, monitor.notify_days_before, monitor.notify_email ?? null,
    ]
  );
  return rows[0];
}

export async function listSSLMonitors(): Promise<SSLMonitorRecord[]> {
  const { rows } = await getPool().query(`SELECT * FROM ssl_monitors ORDER BY created_at DESC`);
  return rows;
}

export async function getSSLMonitor(id: string): Promise<SSLMonitorRecord | undefined> {
  const { rows } = await getPool().query(`SELECT * FROM ssl_monitors WHERE id = $1`, [id]);
  return rows[0];
}

export async function deleteSSLMonitor(id: string): Promise<boolean> {
  const result = await getPool().query(`DELETE FROM ssl_monitors WHERE id = $1`, [id]);
  await getPool().query(`DELETE FROM ssl_check_history WHERE monitor_id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateSSLMonitor(
  id: string,
  fields: {
    domain?: string;
    port?: number;
    interval?: string;
    cron_expr?: string;
    enabled?: number;
    notify_days_before?: number;
    notify_email?: string | null;
  }
): Promise<SSLMonitorRecord | undefined> {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const { rows } = await getPool().query(
    `UPDATE ssl_monitors SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  return rows[0];
}

export async function updateSSLMonitorAfterCheck(
  id: string,
  status: string,
  daysRemaining: number | null,
  lastCheck: string,
  nextCheck: string,
  result?: SSLCheckResult
): Promise<void> {
  await getPool().query(
    `UPDATE ssl_monitors SET last_status = $1, last_days_remaining = $2, last_check = $3, next_check = $4, last_result_json = $5 WHERE id = $6`,
    [status, daysRemaining, lastCheck, nextCheck, result ? JSON.stringify(result) : null, id]
  );
}

// ─── SSL Check History ─────────────────────────────────────────────

export async function saveSSLCheckHistory(
  id: string,
  monitorId: string,
  status: string,
  daysRemaining: number | null,
  result: SSLCheckResult
): Promise<void> {
  await getPool().query(
    `INSERT INTO ssl_check_history (id, monitor_id, checked_at, status, days_remaining, result_json)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, monitorId, result.checked_at, status, daysRemaining, JSON.stringify(result)]
  );
}

export async function getSSLCheckHistory(monitorId: string, limit = 20): Promise<SSLCheckHistoryRecord[]> {
  const { rows } = await getPool().query(
    `SELECT * FROM ssl_check_history WHERE monitor_id = $1 ORDER BY checked_at DESC LIMIT $2`,
    [monitorId, limit]
  );
  return rows;
}

// ─── Backup ────────────────────────────────────────────────────────

export async function backupDb(destPath: string): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  await execAsync(`pg_dump "${url}" -f "${destPath}"`);
}

export function listBackups(): { filename: string; size: number; created_at: string }[] {
  const fs = require("fs") as typeof import("fs");
  const backupDir = path.join(process.cwd(), "data", "backups");
  if (!fs.existsSync(backupDir)) return [];
  return fs
    .readdirSync(backupDir)
    .filter((f: string) => f.endsWith(".sql"))
    .map((f: string) => {
      const stat = fs.statSync(path.join(backupDir, f));
      return { filename: f, size: stat.size, created_at: stat.mtime.toISOString() };
    })
    .sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
}

// ─── API Tokens ────────────────────────────────────────────────────

export async function createApiToken(id: string, name: string, tokenPrefix: string): Promise<void> {
  const now = new Date().toISOString();
  await getPool().query(
    `INSERT INTO api_tokens (id, name, token_prefix, created_at) VALUES ($1, $2, $3, $4)`,
    [id, name, tokenPrefix, now]
  );
}

export async function listApiTokens(): Promise<{ id: string; name: string; token_prefix: string; created_at: string; last_used: string | null }[]> {
  const { rows } = await getPool().query(`SELECT * FROM api_tokens ORDER BY created_at DESC`);
  return rows;
}

export async function deleteApiToken(id: string): Promise<boolean> {
  const result = await getPool().query(`DELETE FROM api_tokens WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function touchApiToken(id: string): Promise<void> {
  await getPool().query(
    `UPDATE api_tokens SET last_used = $1 WHERE id = $2`,
    [new Date().toISOString(), id]
  );
}

// ─── App Monitors ──────────────────────────────────────────────────

export async function createAppMonitor(monitor: Omit<AppMonitorRecord, "last_check" | "next_check" | "last_status" | "last_login_status" | "last_response_ms">): Promise<AppMonitorRecord> {
  const { rows } = await getPool().query(
    `INSERT INTO app_monitors (id, name, url, username, password_enc, interval, cron_expr, enabled, created_at, notify_email)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      monitor.id, monitor.name, monitor.url, monitor.username, monitor.password_enc,
      monitor.interval, monitor.cron_expr, monitor.enabled, monitor.created_at, monitor.notify_email ?? null,
    ]
  );
  return rows[0];
}

export async function listAppMonitors(): Promise<AppMonitorRecord[]> {
  const { rows } = await getPool().query(`SELECT * FROM app_monitors ORDER BY created_at DESC`);
  return rows;
}

export async function getAppMonitor(id: string): Promise<AppMonitorRecord | undefined> {
  const { rows } = await getPool().query(`SELECT * FROM app_monitors WHERE id = $1`, [id]);
  return rows[0];
}

export async function deleteAppMonitor(id: string): Promise<boolean> {
  const result = await getPool().query(`DELETE FROM app_monitors WHERE id = $1`, [id]);
  await getPool().query(`DELETE FROM app_check_history WHERE monitor_id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function updateAppMonitor(
  id: string,
  fields: {
    name?: string;
    url?: string;
    username?: string;
    password_enc?: string;
    interval?: string;
    cron_expr?: string;
    enabled?: number;
    notify_email?: string | null;
  }
): Promise<AppMonitorRecord | undefined> {
  const keys = Object.keys(fields);
  const values = Object.values(fields);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const { rows } = await getPool().query(
    `UPDATE app_monitors SET ${sets} WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );
  return rows[0];
}

export async function updateAppMonitorAfterCheck(
  id: string,
  status: "up" | "down",
  responseMs: number,
  lastCheck: string,
  nextCheck: string,
  loginStatus?: "up" | "down" | null
): Promise<void> {
  await getPool().query(
    `UPDATE app_monitors SET last_status = $1, last_response_ms = $2, last_check = $3, next_check = $4, last_login_status = $5 WHERE id = $6`,
    [status, responseMs, lastCheck, nextCheck, loginStatus ?? null, id]
  );
}

// ─── App Check History ─────────────────────────────────────────────

export async function saveAppCheckHistory(
  id: string,
  monitorId: string,
  checkedAt: string,
  status: "up" | "down",
  responseMs: number | null,
  statusCode: number | null,
  error: string | null,
  checkType: "availability" | "login" = "login",
  responseDetail: string | null = null
): Promise<void> {
  await getPool().query(
    `INSERT INTO app_check_history (id, monitor_id, checked_at, status, response_ms, status_code, error, check_type, response_detail)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, monitorId, checkedAt, status, responseMs, statusCode, error ?? null, checkType, responseDetail]
  );
}

export async function getAppCheckHistory(monitorId: string, limit = 50): Promise<AppCheckHistoryRecord[]> {
  const { rows } = await getPool().query(
    `SELECT * FROM app_check_history WHERE monitor_id = $1 ORDER BY checked_at DESC LIMIT $2`,
    [monitorId, limit]
  );
  return rows;
}

export async function getAppUptime(monitorId: string, hours = 24): Promise<number> {
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const { rows } = await getPool().query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) AS up_count
     FROM app_check_history
     WHERE monitor_id = $1 AND checked_at >= $2`,
    [monitorId, since]
  );
  const row = rows[0];
  if (!row || Number(row.total) === 0) return -1;
  return Math.round((Number(row.up_count) / Number(row.total)) * 100);
}
