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

export interface FuzzResult {
  url: string;
  param: string;
  value: string;
  baseline_status: number;
  fuzz_status: number;
  size_diff: number;
  error_pattern: string | null;
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
  subdomains?: SubdomainEntry[];
  fuzz_results?: FuzzResult[];
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
  notify_email: string | null;
}

export type FindingStatusValue = "open" | "in_progress" | "accepted" | "resolved" | "false_positive";

export interface FindingStatusRecord {
  id: number;
  scan_id: string;
  finding_index: number;
  status: FindingStatusValue;
  note: string;
  updated_at: string;
}

export interface NotificationConfig {
  id: string;
  name: string;
  type: "slack" | "webhook" | "discord" | "telegram";
  url: string;
  enabled: number;
  notify_on_complete: number;
  notify_on_critical: number;
  min_risk_score: number;
  created_at: string;
}

export interface VirusTotalData {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  categories: string[];
  reputation: number;
  last_analysis_date: string;
}

export interface ShodanData {
  ip: string;
  org: string;
  country: string;
  open_ports: number[];
  vulns: string[];
  services: { port: number; transport: string; product?: string }[];
}

export interface EnrichmentData {
  virustotal?: VirusTotalData;
  shodan?: ShodanData;
  fetched_at: string;
}

export interface SubdomainEntry {
  subdomain: string;
  ip: string;
  status: number;
  takeover_risk: boolean;
}

export interface SSLCheckResult {
  domain: string;
  checked_at: string;
  valid: boolean;
  days_remaining: number | null;
  valid_from: string;
  valid_to: string;
  issuer: { CN?: string; O?: string; C?: string };
  subject: { CN?: string; O?: string; C?: string };
  sans: string[];
  serial_number: string;
  fingerprint: string;
  protocol: string;
  cipher: string;
  chain_valid: boolean;
  error?: string;
}

export interface SSLMonitorRecord {
  id: string;
  domain: string;
  port: number;
  interval: "daily" | "weekly" | "monthly";
  cron_expr: string;
  enabled: number;
  created_at: string;
  last_check: string | null;
  next_check: string | null;
  last_status: "ok" | "warning" | "error" | null;
  last_days_remaining: number | null;
  last_result_json: string | null;
  notify_days_before: number;
  notify_email: string | null;
}

export interface SSLCheckHistoryRecord {
  id: string;
  monitor_id: string;
  checked_at: string;
  status: "ok" | "warning" | "error";
  days_remaining: number | null;
  result_json: string;
}

export type AppMonitorInterval = "5min" | "15min" | "30min" | "1h" | "6h" | "1d";

export interface AppMonitorRecord {
  id: string;
  name: string;
  url: string;
  username: string;
  password_enc: string;
  interval: AppMonitorInterval;
  cron_expr: string;
  enabled: number;
  created_at: string;
  last_check: string | null;
  next_check: string | null;
  last_status: "up" | "down" | null;
  last_login_status: "up" | "down" | null;
  last_response_ms: number | null;
  notify_email: string | null;
}

export interface AppCheckResult {
  url: string;
  checked_at: string;
  status: "up" | "down";
  response_ms: number;
  status_code: number | null;
  error?: string;
  response_detail?: string;
}

export interface AppCheckHistoryRecord {
  id: string;
  monitor_id: string;
  checked_at: string;
  status: "up" | "down";
  response_ms: number | null;
  status_code: number | null;
  error: string | null;
  check_type: "availability" | "login";
  response_detail: string | null;
}
