export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface Finding {
  severity: Severity;
  category: string;
  title: string;
  detail: string;
  recommendation: string;
  timestamp: string;
}

export interface DnsRecord {
  type: string;
  value: string;
}

export interface CveRecord {
  cve_id: string;
  product: string;
  version: string;
  cvss_score: number;
  severity: Severity;
  description: string;
}

export interface ScanReport {
  target: string;
  base_url: string;
  scan_date: string;
  summary: Record<Severity, number>;
  tech_stack: Record<string, string>;
  discovered_urls: string[];
  findings: Finding[];
  dns_records?: DnsRecord[];
  whois_info?: Record<string, string>;
  cve_data?: CveRecord[];
}

export interface ScanRecord {
  id: string;
  target_url: string;
  status: "running" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
  report_json: string | null;
  finding_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
  risk_score: number | null;
}

export interface ScanProgress {
  phase: string;
  step: number;
  total: number;
  message?: string;
}

export interface BatchRecord {
  id: string;
  status: "running" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
  total_urls: number;
  completed_urls: number;
  failed_urls: number;
  urls_json: string;
  scan_ids_json: string;
}

export interface ScheduleRecord {
  id: string;
  target_url: string;
  interval: "daily" | "weekly" | "monthly";
  cron_expr: string;
  enabled: number;
  created_at: string;
  last_run: string | null;
  next_run: string | null;
}

export type FindingStatusValue = "open" | "in_progress" | "accepted" | "resolved";

export interface FindingStatusRecord {
  id: number;
  scan_id: string;
  finding_index: number;
  status: FindingStatusValue;
  note: string;
  updated_at: string;
}
