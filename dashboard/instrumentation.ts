export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initScheduler } = await import("./lib/scheduler");
    const { initSSLScheduler } = await import("./lib/ssl-scheduler");
    const { initBackupScheduler } = await import("./lib/backup-scheduler");
    const { initAppMonitorScheduler } = await import("./lib/app-monitor-scheduler");
    initScheduler();
    initSSLScheduler();
    initBackupScheduler();
    initAppMonitorScheduler();
  }
}
