import Database from "better-sqlite3";
import path from "path";
import type { ScanRecord, ScanReport, BatchRecord, FindingStatusRecord, FindingStatusValue, ScheduleRecord, NotificationConfig, EnrichmentData, SSLMonitorRecord, SSLCheckHistoryRecord, SSLCheckResult, AppMonitorRecord, AppCheckHistoryRecord } from "./types";

const DB_PATH = path.join(process.cwd(), "data", "tupisec.db");

let _db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!_db) {
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("busy_timeout = 5000");

    _db.exec(`
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
        info_count INTEGER DEFAULT 0
      );
    `);

    // Migration: add risk_score column
    const cols = _db.prepare("PRAGMA table_info(scans)").all() as { name: string }[];
    if (!cols.some((c) => c.name === "risk_score")) {
      _db.exec("ALTER TABLE scans ADD COLUMN risk_score INTEGER DEFAULT NULL");
    }

    // Batches table
    _db.exec(`
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
    `);

    // Finding status table
    _db.exec(`
      CREATE TABLE IF NOT EXISTS finding_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scan_id TEXT NOT NULL,
        finding_index INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'open',
        note TEXT NOT NULL DEFAULT '',
        updated_at TEXT NOT NULL,
        UNIQUE(scan_id, finding_index)
      );
    `);

    // Schedules table
    _db.exec(`
      CREATE TABLE IF NOT EXISTS schedules (
        id TEXT PRIMARY KEY,
        target_url TEXT NOT NULL,
        interval TEXT NOT NULL,
        cron_expr TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        last_run TEXT,
        next_run TEXT
      );
    `);

    // Migration: add notify_email column to schedules
    const scheduleCols = _db.prepare("PRAGMA table_info(schedules)").all() as { name: string }[];
    if (!scheduleCols.some((c) => c.name === "notify_email")) {
      _db.exec("ALTER TABLE schedules ADD COLUMN notify_email TEXT");
    }

    // Notification configs table
    _db.exec(`
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
    `);

    // Settings table (key-value store)
    _db.exec(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Migration: add enrichment_json column to scans
    const scanCols = _db.prepare("PRAGMA table_info(scans)").all() as { name: string }[];
    if (!scanCols.some((c) => c.name === "enrichment_json")) {
      _db.exec("ALTER TABLE scans ADD COLUMN enrichment_json TEXT");
    }

    // SSL monitors table
    _db.exec(`
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
        notify_email TEXT
      );
    `);

    // Migration: add last_result_json column to ssl_monitors
    const sslCols = _db.prepare("PRAGMA table_info(ssl_monitors)").all() as { name: string }[];
    if (!sslCols.some((c) => c.name === "last_result_json")) {
      _db.exec("ALTER TABLE ssl_monitors ADD COLUMN last_result_json TEXT");
    }

    // SSL check history table
    _db.exec(`
      CREATE TABLE IF NOT EXISTS ssl_check_history (
        id TEXT PRIMARY KEY,
        monitor_id TEXT NOT NULL,
        checked_at TEXT NOT NULL,
        status TEXT NOT NULL,
        days_remaining INTEGER,
        result_json TEXT NOT NULL
      );
    `);

    // API tokens table
    _db.exec(`
      CREATE TABLE IF NOT EXISTS api_tokens (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        token_prefix TEXT NOT NULL,
        created_at TEXT NOT NULL,
        last_used TEXT
      );
    `);

    // App monitors table
    _db.exec(`
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
        notify_email TEXT
      );
    `);

    // App check history table
    _db.exec(`
      CREATE TABLE IF NOT EXISTS app_check_history (
        id TEXT PRIMARY KEY,
        monitor_id TEXT NOT NULL,
        checked_at TEXT NOT NULL,
        status TEXT NOT NULL,
        response_ms INTEGER,
        status_code INTEGER,
        error TEXT
      );
    `);
    // Migrations: app_monitors
    const appMonCols = _db.prepare("PRAGMA table_info(app_monitors)").all() as { name: string }[];
    if (!appMonCols.some((c) => c.name === "last_login_status")) {
      _db.exec("ALTER TABLE app_monitors ADD COLUMN last_login_status TEXT");
    }

    // Migrations: app_check_history
    const appHistCols = _db.prepare("PRAGMA table_info(app_check_history)").all() as { name: string }[];
    if (!appHistCols.some((c) => c.name === "check_type")) {
      _db.exec("ALTER TABLE app_check_history ADD COLUMN check_type TEXT NOT NULL DEFAULT 'login'");
    }
    if (!appHistCols.some((c) => c.name === "response_detail")) {
      _db.exec("ALTER TABLE app_check_history ADD COLUMN response_detail TEXT");
    }
  }
  return _db;
}

// ─── Scans ─────────────────────────────────────────────────────────

export function createScan(id: string, targetUrl: string): ScanRecord {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO scans (id, target_url, status, created_at) VALUES (?, ?, 'running', ?)`
  ).run(id, targetUrl, now);
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

export function completeScan(id: string, report: ScanReport, riskScore: number): void {
  const db = getDb();
  const now = new Date().toISOString();
  const summary = report.summary || {};
  db.prepare(
    `UPDATE scans SET
      status = 'completed',
      completed_at = ?,
      report_json = ?,
      finding_count = ?,
      critical_count = ?,
      high_count = ?,
      medium_count = ?,
      low_count = ?,
      info_count = ?,
      risk_score = ?
    WHERE id = ?`
  ).run(
    now,
    JSON.stringify(report),
    report.findings.length,
    summary.CRITICAL || 0,
    summary.HIGH || 0,
    summary.MEDIUM || 0,
    summary.LOW || 0,
    summary.INFO || 0,
    riskScore,
    id
  );
}

export function failScan(id: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE scans SET status = 'failed', completed_at = ? WHERE id = ?`
  ).run(now, id);
}

export function getScan(id: string): ScanRecord | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM scans WHERE id = ?`).get(id) as
    | ScanRecord
    | undefined;
}

export function listScans(): Omit<ScanRecord, "report_json">[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT id, target_url, status, created_at, completed_at,
              finding_count, critical_count, high_count, medium_count, low_count, info_count,
              risk_score
       FROM scans ORDER BY created_at DESC`
    )
    .all() as Omit<ScanRecord, "report_json">[];
}

export function deleteScan(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM scans WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM finding_status WHERE scan_id = ?`).run(id);
  return result.changes > 0;
}

// ─── Batches ───────────────────────────────────────────────────────

export function createBatch(id: string, urls: string[]): BatchRecord {
  const db = getDb();
  const now = new Date().toISOString();
  const urlsJson = JSON.stringify(urls);
  db.prepare(
    `INSERT INTO batches (id, status, created_at, total_urls, urls_json, scan_ids_json) VALUES (?, 'running', ?, ?, ?, '[]')`
  ).run(id, now, urls.length, urlsJson);
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

export function getBatch(id: string): BatchRecord | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM batches WHERE id = ?`).get(id) as BatchRecord | undefined;
}

export function updateBatchProgress(id: string, scanIds: string[], completedUrls: number, failedUrls: number): void {
  const db = getDb();
  db.prepare(
    `UPDATE batches SET scan_ids_json = ?, completed_urls = ?, failed_urls = ? WHERE id = ?`
  ).run(JSON.stringify(scanIds), completedUrls, failedUrls, id);
}

export function completeBatch(id: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE batches SET status = 'completed', completed_at = ? WHERE id = ?`
  ).run(now, id);
}

export function listBatches(): BatchRecord[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM batches ORDER BY created_at DESC`).all() as BatchRecord[];
}

export function deleteBatch(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM batches WHERE id = ?`).run(id);
  return result.changes > 0;
}

// ─── Finding Status ────────────────────────────────────────────────

export function getFindingStatuses(scanId: string): FindingStatusRecord[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM finding_status WHERE scan_id = ?`).all(scanId) as FindingStatusRecord[];
}

export function upsertFindingStatus(scanId: string, findingIndex: number, status: FindingStatusValue, note: string): FindingStatusRecord {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO finding_status (scan_id, finding_index, status, note, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(scan_id, finding_index) DO UPDATE SET status = excluded.status, note = excluded.note, updated_at = excluded.updated_at`
  ).run(scanId, findingIndex, status, note, now);
  return db.prepare(
    `SELECT * FROM finding_status WHERE scan_id = ? AND finding_index = ?`
  ).get(scanId, findingIndex) as FindingStatusRecord;
}

// ─── Schedules ─────────────────────────────────────────────────────

export function createSchedule(
  id: string,
  targetUrl: string,
  interval: ScheduleRecord["interval"],
  cronExpr: string,
  nextRun: string,
  notifyEmail?: string
): ScheduleRecord {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO schedules (id, target_url, interval, cron_expr, enabled, created_at, next_run, notify_email)
     VALUES (?, ?, ?, ?, 1, ?, ?, ?)`
  ).run(id, targetUrl, interval, cronExpr, now, nextRun, notifyEmail ?? null);
  return db.prepare(`SELECT * FROM schedules WHERE id = ?`).get(id) as ScheduleRecord;
}

export function listSchedules(): ScheduleRecord[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM schedules ORDER BY created_at DESC`).all() as ScheduleRecord[];
}

export function getSchedule(id: string): ScheduleRecord | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM schedules WHERE id = ?`).get(id) as ScheduleRecord | undefined;
}

export function deleteSchedule(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM schedules WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function updateScheduleRun(id: string, lastRun: string, nextRun: string): void {
  const db = getDb();
  db.prepare(`UPDATE schedules SET last_run = ?, next_run = ? WHERE id = ?`).run(lastRun, nextRun, id);
}

// ─── Notification Configs ───────────────────────────────────────────

export function listNotificationConfigs(): NotificationConfig[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM notification_configs ORDER BY created_at DESC`).all() as NotificationConfig[];
}

export function getNotificationConfig(id: string): NotificationConfig | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM notification_configs WHERE id = ?`).get(id) as NotificationConfig | undefined;
}

export function createNotificationConfig(config: Omit<NotificationConfig, "created_at">): NotificationConfig {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO notification_configs (id, name, type, url, enabled, notify_on_complete, notify_on_critical, min_risk_score, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(config.id, config.name, config.type, config.url, config.enabled ? 1 : 0,
        config.notify_on_complete ? 1 : 0, config.notify_on_critical ? 1 : 0,
        config.min_risk_score, now);
  return db.prepare(`SELECT * FROM notification_configs WHERE id = ?`).get(config.id) as NotificationConfig;
}

export function deleteNotificationConfig(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM notification_configs WHERE id = ?`).run(id);
  return result.changes > 0;
}

// ─── Settings ──────────────────────────────────────────────────────

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare(`SELECT value FROM settings WHERE key = ?`).get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
  ).run(key, value, now);
}

export function listSettings(): { key: string; value: string; updated_at: string }[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM settings`).all() as { key: string; value: string; updated_at: string }[];
}

// ─── Enrichment ────────────────────────────────────────────────────

export function updateScanEnrichment(id: string, enrichment: EnrichmentData): void {
  const db = getDb();
  db.prepare(`UPDATE scans SET enrichment_json = ? WHERE id = ?`).run(JSON.stringify(enrichment), id);
}

export function getScanEnrichment(id: string): EnrichmentData | null {
  const db = getDb();
  const row = db.prepare(`SELECT enrichment_json FROM scans WHERE id = ?`).get(id) as { enrichment_json: string | null } | undefined;
  if (!row || !row.enrichment_json) return null;
  try {
    return JSON.parse(row.enrichment_json) as EnrichmentData;
  } catch {
    return null;
  }
}

// ─── SSL Monitors ──────────────────────────────────────────────────

export function createSSLMonitor(monitor: Omit<SSLMonitorRecord, "last_check" | "next_check" | "last_status" | "last_days_remaining" | "last_result_json">): SSLMonitorRecord {
  const db = getDb();
  db.prepare(
    `INSERT INTO ssl_monitors (id, domain, port, interval, cron_expr, enabled, created_at, notify_days_before, notify_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(monitor.id, monitor.domain, monitor.port, monitor.interval, monitor.cron_expr,
        monitor.enabled, monitor.created_at, monitor.notify_days_before, monitor.notify_email ?? null);
  return db.prepare(`SELECT * FROM ssl_monitors WHERE id = ?`).get(monitor.id) as SSLMonitorRecord;
}

export function listSSLMonitors(): SSLMonitorRecord[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM ssl_monitors ORDER BY created_at DESC`).all() as SSLMonitorRecord[];
}

export function getSSLMonitor(id: string): SSLMonitorRecord | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM ssl_monitors WHERE id = ?`).get(id) as SSLMonitorRecord | undefined;
}

export function deleteSSLMonitor(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM ssl_monitors WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM ssl_check_history WHERE monitor_id = ?`).run(id);
  return result.changes > 0;
}

export function updateSSLMonitor(
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
): SSLMonitorRecord | undefined {
  const db = getDb();
  const sets = Object.entries(fields)
    .map(([k]) => `${k} = ?`)
    .join(", ");
  const values = Object.values(fields);
  db.prepare(`UPDATE ssl_monitors SET ${sets} WHERE id = ?`).run(...values, id);
  return db.prepare(`SELECT * FROM ssl_monitors WHERE id = ?`).get(id) as SSLMonitorRecord | undefined;
}

export function updateSSLMonitorAfterCheck(
  id: string,
  status: string,
  daysRemaining: number | null,
  lastCheck: string,
  nextCheck: string,
  result?: SSLCheckResult
): void {
  const db = getDb();
  db.prepare(
    `UPDATE ssl_monitors SET last_status = ?, last_days_remaining = ?, last_check = ?, next_check = ?, last_result_json = ? WHERE id = ?`
  ).run(status, daysRemaining, lastCheck, nextCheck, result ? JSON.stringify(result) : null, id);
}

// ─── SSL Check History ─────────────────────────────────────────────

export function saveSSLCheckHistory(
  id: string,
  monitorId: string,
  status: string,
  daysRemaining: number | null,
  result: SSLCheckResult
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO ssl_check_history (id, monitor_id, checked_at, status, days_remaining, result_json)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, monitorId, result.checked_at, status, daysRemaining, JSON.stringify(result));
}

export function getSSLCheckHistory(monitorId: string, limit = 20): SSLCheckHistoryRecord[] {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM ssl_check_history WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT ?`
  ).all(monitorId, limit) as SSLCheckHistoryRecord[];
}

// ─── Backup ────────────────────────────────────────────────────────

export async function backupDb(destPath: string): Promise<void> {
  const db = getDb();
  await db.backup(destPath);
}

export function listBackups(): { filename: string; size: number; created_at: string }[] {
  const fs = require("fs") as typeof import("fs");
  const backupDir = path.join(process.cwd(), "data", "backups");
  if (!fs.existsSync(backupDir)) return [];
  return fs
    .readdirSync(backupDir)
    .filter((f: string) => f.endsWith(".db"))
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

export function createApiToken(id: string, name: string, tokenPrefix: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO api_tokens (id, name, token_prefix, created_at) VALUES (?, ?, ?, ?)`
  ).run(id, name, tokenPrefix, now);
}

export function listApiTokens(): { id: string; name: string; token_prefix: string; created_at: string; last_used: string | null }[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM api_tokens ORDER BY created_at DESC`).all() as { id: string; name: string; token_prefix: string; created_at: string; last_used: string | null }[];
}

export function deleteApiToken(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM api_tokens WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function touchApiToken(id: string): void {
  const db = getDb();
  db.prepare(`UPDATE api_tokens SET last_used = ? WHERE id = ?`).run(new Date().toISOString(), id);
}

// ─── App Monitors ──────────────────────────────────────────────────

export function createAppMonitor(monitor: Omit<AppMonitorRecord, "last_check" | "next_check" | "last_status" | "last_login_status" | "last_response_ms">): AppMonitorRecord {
  const db = getDb();
  db.prepare(
    `INSERT INTO app_monitors (id, name, url, username, password_enc, interval, cron_expr, enabled, created_at, notify_email)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(monitor.id, monitor.name, monitor.url, monitor.username, monitor.password_enc,
        monitor.interval, monitor.cron_expr, monitor.enabled, monitor.created_at, monitor.notify_email ?? null);
  return db.prepare(`SELECT * FROM app_monitors WHERE id = ?`).get(monitor.id) as AppMonitorRecord;
}

export function listAppMonitors(): AppMonitorRecord[] {
  const db = getDb();
  return db.prepare(`SELECT * FROM app_monitors ORDER BY created_at DESC`).all() as AppMonitorRecord[];
}

export function getAppMonitor(id: string): AppMonitorRecord | undefined {
  const db = getDb();
  return db.prepare(`SELECT * FROM app_monitors WHERE id = ?`).get(id) as AppMonitorRecord | undefined;
}

export function deleteAppMonitor(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM app_monitors WHERE id = ?`).run(id);
  db.prepare(`DELETE FROM app_check_history WHERE monitor_id = ?`).run(id);
  return result.changes > 0;
}

export function updateAppMonitor(
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
): AppMonitorRecord | undefined {
  const db = getDb();
  const sets = Object.entries(fields).map(([k]) => `${k} = ?`).join(", ");
  const values = Object.values(fields);
  db.prepare(`UPDATE app_monitors SET ${sets} WHERE id = ?`).run(...values, id);
  return db.prepare(`SELECT * FROM app_monitors WHERE id = ?`).get(id) as AppMonitorRecord | undefined;
}

export function updateAppMonitorAfterCheck(
  id: string,
  status: "up" | "down",
  responseMs: number,
  lastCheck: string,
  nextCheck: string,
  loginStatus?: "up" | "down" | null
): void {
  const db = getDb();
  db.prepare(
    `UPDATE app_monitors SET last_status = ?, last_response_ms = ?, last_check = ?, next_check = ?, last_login_status = ? WHERE id = ?`
  ).run(status, responseMs, lastCheck, nextCheck, loginStatus ?? null, id);
}

// ─── App Check History ─────────────────────────────────────────────

export function saveAppCheckHistory(
  id: string,
  monitorId: string,
  checkedAt: string,
  status: "up" | "down",
  responseMs: number | null,
  statusCode: number | null,
  error: string | null,
  checkType: "availability" | "login" = "login",
  responseDetail: string | null = null
): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO app_check_history (id, monitor_id, checked_at, status, response_ms, status_code, error, check_type, response_detail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, monitorId, checkedAt, status, responseMs, statusCode, error ?? null, checkType, responseDetail);
}

export function getAppCheckHistory(monitorId: string, limit = 50): AppCheckHistoryRecord[] {
  const db = getDb();
  return db.prepare(
    `SELECT * FROM app_check_history WHERE monitor_id = ? ORDER BY checked_at DESC LIMIT ?`
  ).all(monitorId, limit) as AppCheckHistoryRecord[];
}

export function getAppUptime(monitorId: string, hours = 24): number {
  const db = getDb();
  const since = new Date(Date.now() - hours * 3600000).toISOString();
  const row = db.prepare(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'up' THEN 1 ELSE 0 END) AS up_count
     FROM app_check_history
     WHERE monitor_id = ? AND checked_at >= ?`
  ).get(monitorId, since) as { total: number; up_count: number };
  if (!row || row.total === 0) return -1;
  return Math.round((row.up_count / row.total) * 100);
}
