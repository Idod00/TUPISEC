import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pg", "puppeteer-core", "node-cron", "nodemailer"],
};

export default nextConfig;
