export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { initScheduler } = await import("./lib/scheduler");
    const { initSSLScheduler } = await import("./lib/ssl-scheduler");
    initScheduler();
    initSSLScheduler();
  }
}
