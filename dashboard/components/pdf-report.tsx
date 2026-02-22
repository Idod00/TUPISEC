"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";
import type { ScanReport, Finding, Severity, DnsRecord } from "@/lib/types";
import { getGrade, getGradeColor } from "@/lib/scoring";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#e2e8f0",
    backgroundColor: "#0f172a",
  },
  cover: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#4ade80",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#94a3b8",
    marginBottom: 24,
  },
  target: {
    fontSize: 12,
    fontFamily: "Courier",
    color: "#e2e8f0",
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    color: "#64748b",
  },
  scoreBox: {
    marginTop: 20,
    padding: 12,
    borderRadius: 6,
    alignItems: "center",
  },
  scoreText: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
  },
  gradeText: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#4ade80",
    marginBottom: 8,
    marginTop: 16,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  rowAlt: {
    backgroundColor: "#1e293b",
  },
  label: {
    color: "#94a3b8",
    width: 80,
  },
  value: {
    fontFamily: "Courier",
    flex: 1,
    textAlign: "right" as const,
  },
  findingBox: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: "#1e293b",
    borderRadius: 4,
  },
  findingHeader: {
    flexDirection: "row",
    marginBottom: 4,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    marginRight: 6,
  },
  findingTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    flex: 1,
  },
  findingDetail: {
    fontSize: 9,
    color: "#94a3b8",
    fontFamily: "Courier",
    marginTop: 4,
  },
  findingRec: {
    fontSize: 9,
    color: "#4ade80",
    marginTop: 4,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#475569",
  },
  screenshotImage: {
    width: "100%",
    maxHeight: 400,
    objectFit: "contain" as const,
    borderRadius: 4,
    marginTop: 8,
  },
});

const severityColors: Record<Severity, { bg: string; text: string }> = {
  CRITICAL: { bg: "#7f1d1d", text: "#fca5a5" },
  HIGH: { bg: "#7c2d12", text: "#fdba74" },
  MEDIUM: { bg: "#713f12", text: "#fde047" },
  LOW: { bg: "#164e63", text: "#67e8f9" },
  INFO: { bg: "#1e3a5f", text: "#93c5fd" },
};

interface PdfReportProps {
  report: ScanReport;
  riskScore?: number | null;
  screenshotBase64?: string | null;
}

export function PdfReport({ report, riskScore, screenshotBase64 }: PdfReportProps) {
  const severities: Severity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
  const grade = riskScore != null ? getGrade(riskScore) : null;
  const gradeColor = grade ? getGradeColor(grade) : "#94a3b8";

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.title}>TupiSec</Text>
          <Text style={styles.subtitle}>Web Security Analysis Report</Text>
          <Text style={styles.target}>{report.target}</Text>
          <Text style={styles.date}>
            {new Date(report.scan_date).toLocaleString()}
          </Text>
          {riskScore != null && grade && (
            <View style={[styles.scoreBox, { backgroundColor: "#1e293b" }]}>
              <Text style={[styles.scoreText, { color: gradeColor }]}>{riskScore}</Text>
              <Text style={[styles.gradeText, { color: gradeColor }]}>Grade {grade}</Text>
            </View>
          )}
        </View>
        <View style={styles.footer}>
          <Text>TupiSec Scanner v1.0.0</Text>
          <Text>Confidential</Text>
        </View>
      </Page>

      {/* Summary Page */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        {severities.map((s, i) => (
          <View key={s} style={[styles.row, i % 2 === 0 ? styles.rowAlt : {}]}>
            <Text style={styles.label}>{s}</Text>
            <Text style={styles.value}>{report.summary[s] || 0}</Text>
          </View>
        ))}
        <View style={[styles.row, { marginTop: 4, borderTopWidth: 1, borderTopColor: "#334155" }]}>
          <Text style={[styles.label, { fontFamily: "Helvetica-Bold" }]}>TOTAL</Text>
          <Text style={[styles.value, { fontFamily: "Helvetica-Bold" }]}>
            {report.findings.length}
          </Text>
        </View>

        {Object.keys(report.tech_stack).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Technology Stack</Text>
            {Object.entries(report.tech_stack).map(([key, val], i) => (
              <View key={key} style={[styles.row, i % 2 === 0 ? styles.rowAlt : {}]}>
                <Text style={styles.label}>{key.replace(/_/g, " ")}</Text>
                <Text style={styles.value}>{val}</Text>
              </View>
            ))}
          </>
        )}

        {/* DNS Records */}
        {report.dns_records && report.dns_records.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>DNS Records</Text>
            {report.dns_records.map((r: DnsRecord, i: number) => (
              <View key={i} style={[styles.row, i % 2 === 0 ? styles.rowAlt : {}]}>
                <Text style={[styles.label, { width: 50, fontFamily: "Helvetica-Bold" }]}>{r.type}</Text>
                <Text style={[styles.value, { textAlign: "left" as const }]}>{r.value}</Text>
              </View>
            ))}
          </>
        )}

        {/* WHOIS Info */}
        {report.whois_info && Object.keys(report.whois_info).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>WHOIS Information</Text>
            {Object.entries(report.whois_info).map(([key, val], i) => (
              <View key={key} style={[styles.row, i % 2 === 0 ? styles.rowAlt : {}]}>
                <Text style={[styles.label, { width: 120 }]}>{key.replace(/_/g, " ")}</Text>
                <Text style={[styles.value, { textAlign: "left" as const }]}>{val}</Text>
              </View>
            ))}
          </>
        )}

        <View style={styles.footer}>
          <Text>TupiSec Scanner v1.0.0</Text>
          <Text>Page 2</Text>
        </View>
      </Page>

      {/* Screenshot Page */}
      {screenshotBase64 && (
        <Page size="A4" style={styles.page}>
          <Text style={styles.sectionTitle}>Website Screenshot</Text>
          <Image src={screenshotBase64} style={styles.screenshotImage} />
          <View style={styles.footer}>
            <Text>TupiSec Scanner v1.0.0</Text>
            <Text render={({ pageNumber }) => `Page ${pageNumber}`} />
          </View>
        </Page>
      )}

      {/* Findings Pages */}
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.sectionTitle}>Detailed Findings</Text>
        {report.findings.map((f: Finding, i: number) => {
          const sc = severityColors[f.severity];
          return (
            <View key={i} style={styles.findingBox} wrap={false}>
              <View style={styles.findingHeader}>
                <Text
                  style={[
                    styles.severityBadge,
                    { backgroundColor: sc.bg, color: sc.text },
                  ]}
                >
                  {f.severity}
                </Text>
                <Text style={styles.findingTitle}>
                  #{i + 1} {f.title}
                </Text>
              </View>
              <Text style={{ fontSize: 8, color: "#64748b" }}>
                Category: {f.category}
              </Text>
              <Text style={styles.findingDetail}>{f.detail}</Text>
              {f.recommendation && (
                <Text style={styles.findingRec}>Fix: {f.recommendation}</Text>
              )}
            </View>
          );
        })}
        <View style={styles.footer} fixed>
          <Text>TupiSec Scanner v1.0.0</Text>
          <Text render={({ pageNumber }) => `Page ${pageNumber}`} />
        </View>
      </Page>
    </Document>
  );
}
