export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initDb } = await import("./lib/db");
    await initDb();

    const { initScheduler } = await import("./lib/scheduler");
    await initScheduler();
    const { initSSLScheduler } = await import("./lib/ssl-scheduler");
    await initSSLScheduler();
    const { initBackupScheduler } = await import("./lib/backup-scheduler");
    initBackupScheduler();
    const { initAppMonitorScheduler } = await import("./lib/app-monitor-scheduler");
    await initAppMonitorScheduler();
  }
}
