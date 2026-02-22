import Database from "better-sqlite3";
import path from "path";
import type { ScanRecord, ScanReport, BatchRecord, FindingStatusRecord, FindingStatusValue, ScheduleRecord } from "./types";

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
  nextRun: string
): ScheduleRecord {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO schedules (id, target_url, interval, cron_expr, enabled, created_at, next_run)
     VALUES (?, ?, ?, ?, 1, ?, ?)`
  ).run(id, targetUrl, interval, cronExpr, now, nextRun);
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
