#!/usr/bin/env node
/**
 * One-time migration: SQLite → PostgreSQL
 *
 * Usage:
 *   DATABASE_URL=postgresql://tupisec:changeme123@localhost:5432/tupisec \
 *     node scripts/migrate-sqlite-to-pg.js
 *
 * Requirements:
 *   npm install better-sqlite3 pg   (in project root or dashboard/)
 */

const path = require("path");
const { Pool } = require("pg");

const DB_PATH = path.join(__dirname, "../dashboard/data/tupisec.db");

// Tables to migrate in order (to respect FK-like dependencies)
const TABLES = [
  "scans",
  "batches",
  "finding_status",
  "schedules",
  "notification_configs",
  "settings",
  "ssl_monitors",
  "ssl_check_history",
  "api_tokens",
  "app_monitors",
  "app_check_history",
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  let Database;
  try {
    Database = require("better-sqlite3");
  } catch {
    console.error("ERROR: better-sqlite3 not found. Run: npm install better-sqlite3");
    process.exit(1);
  }

  const fs = require("fs");
  if (!fs.existsSync(DB_PATH)) {
    console.error(`ERROR: SQLite DB not found at ${DB_PATH}`);
    process.exit(1);
  }

  console.log(`Opening SQLite: ${DB_PATH}`);
  const sqlite = new Database(DB_PATH, { readonly: true });

  console.log(`Connecting to PostgreSQL: ${process.env.DATABASE_URL}`);
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Verify PG connection
    await pool.query("SELECT 1");
    console.log("PostgreSQL connection OK\n");

    for (const table of TABLES) {
      // Check if table exists in SQLite
      const exists = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
        .get(table);
      if (!exists) {
        console.log(`  [${table}] Not found in SQLite — skipping`);
        continue;
      }

      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      if (rows.length === 0) {
        console.log(`  [${table}] 0 rows — skipping`);
        continue;
      }

      // Build INSERT from first row keys
      const cols = Object.keys(rows[0]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;

      let inserted = 0;
      let skipped = 0;
      for (const row of rows) {
        const values = cols.map((c) => row[c] ?? null);
        try {
          const result = await pool.query(sql, values);
          if ((result.rowCount ?? 0) > 0) inserted++;
          else skipped++;
        } catch (err) {
          console.error(`  [${table}] Row insert failed:`, err.message, row);
          skipped++;
        }
      }

      console.log(`  [${table}] ${rows.length} rows → inserted: ${inserted}, skipped/conflict: ${skipped}`);
    }

    console.log("\nMigration complete.");
  } finally {
    sqlite.close();
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
