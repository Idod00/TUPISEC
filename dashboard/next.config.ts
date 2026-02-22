import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "puppeteer-core", "node-cron"],
};

export default nextConfig;
