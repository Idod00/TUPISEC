import { getScan, updateScanEnrichment } from "./db";
import { getSecureSetting } from "./secure-settings";
import type { VirusTotalData, ShodanData, EnrichmentData } from "./types";

async function resolveIp(hostname: string): Promise<string | null> {
  try {
    const dns = await import("dns").then((m) => m.promises);
    const result = await dns.lookup(hostname);
    return result.address;
  } catch {
    return null;
  }
}

async function fetchVirusTotal(domain: string, apiKey: string): Promise<VirusTotalData> {
  const res = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}`, {
    headers: { "x-apikey": apiKey },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`VirusTotal API error: ${res.status}`);
  const data = await res.json();
  const attrs = data.data?.attributes || {};
  const stats = attrs.last_analysis_stats || {};
  const rawCats = attrs.categories || {};

  return {
    malicious: stats.malicious || 0,
    suspicious: stats.suspicious || 0,
    harmless: stats.harmless || 0,
    undetected: stats.undetected || 0,
    categories: Object.values(rawCats as Record<string, string>).slice(0, 5),
    reputation: attrs.reputation || 0,
    last_analysis_date: attrs.last_analysis_date
      ? new Date(attrs.last_analysis_date * 1000).toISOString()
      : new Date().toISOString(),
  };
}

async function fetchShodan(ip: string, apiKey: string): Promise<ShodanData> {
  const res = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Shodan API error: ${res.status}`);
  const data = await res.json();

  const services = (data.data || []).map((item: Record<string, unknown>) => ({
    port: item.port as number,
    transport: (item.transport as string) || "tcp",
    product: item.product as string | undefined,
  }));

  return {
    ip,
    org: data.org || "",
    country: data.country_name || "",
    open_ports: data.ports || [],
    vulns: Object.keys(data.vulns || {}),
    services,
  };
}

export async function enrichScan(scanId: string): Promise<EnrichmentData | null> {
  const scan = await getScan(scanId);
  if (!scan) return null;

  const vtKey = await getSecureSetting("virustotal_api_key");
  const shodanKey = await getSecureSetting("shodan_api_key");

  if (!vtKey && !shodanKey) return null;

  let hostname: string;
  try {
    hostname = new URL(scan.target_url).hostname;
  } catch {
    return null;
  }

  const result: EnrichmentData = { fetched_at: new Date().toISOString() };

  const tasks: Promise<void>[] = [];

  if (vtKey) {
    tasks.push(
      fetchVirusTotal(hostname, vtKey)
        .then((vt) => { result.virustotal = vt; })
        .catch((err) => { console.error("[enrichment] VirusTotal error:", err); })
    );
  }

  if (shodanKey) {
    tasks.push(
      resolveIp(hostname)
        .then((ip) => {
          if (!ip) return;
          return fetchShodan(ip, shodanKey)
            .then((shodan) => { result.shodan = shodan; })
            .catch((err) => { console.error("[enrichment] Shodan error:", err); });
        })
    );
  }

  await Promise.allSettled(tasks);

  if (result.virustotal || result.shodan) {
    await updateScanEnrichment(scanId, result);
    return result;
  }

  return null;
}
