import path from "path";
import fs from "fs";
import cron from "node-cron";
import { backupDb, listBackups } from "./db";

const BACKUP_DIR = path.join(process.cwd(), "data", "backups");
const MAX_BACKUPS = 7;

export async function runBackup(): Promise<string> {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `tupisec-${timestamp}.db`;
  const destPath = path.join(BACKUP_DIR, filename);

  await backupDb(destPath);

  // Prune old backups, keep last MAX_BACKUPS
  const backups = listBackups();
  if (backups.length > MAX_BACKUPS) {
    const toDelete = backups.slice(MAX_BACKUPS);
    for (const b of toDelete) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, b.filename));
      } catch {
        // ignore
      }
    }
  }

  return filename;
}

export function initBackupScheduler(): void {
  // Run daily at 02:00
  cron.schedule("0 2 * * *", async () => {
    try {
      const filename = await runBackup();
      console.log(`[backup] Created backup: ${filename}`);
    } catch (err) {
      console.error("[backup] Backup failed:", err);
    }
  });
  console.log("[backup] Scheduler initialized (daily at 02:00)");
}
