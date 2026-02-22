import tls from "tls";
import type { SSLCheckResult } from "./types";

function parseDN(dn: string | undefined): { CN?: string; O?: string; C?: string } {
  if (!dn) return {};
  const result: Record<string, string> = {};
  // tls PeerCertificate gives subject/issuer as object already
  return result;
}

function parseSANs(subjectaltname: string | undefined): string[] {
  if (!subjectaltname) return [];
  return subjectaltname
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.startsWith("DNS:"))
    .map((s) => s.replace("DNS:", "").trim());
}

export async function checkSSL(domain: string, port = 443): Promise<SSLCheckResult> {
  const now = new Date().toISOString();

  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: domain,
        port,
        servername: domain,
        rejectUnauthorized: false, // capture even invalid certs
        timeout: 10000,
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true);
          const protocol = socket.getProtocol() ?? "unknown";
          const cipherInfo = socket.getCipher();
          const cipher = cipherInfo?.name ?? "unknown";
          const chainValid = socket.authorized;

          if (!cert || !cert.subject) {
            socket.destroy();
            resolve({
              domain,
              checked_at: now,
              valid: false,
              days_remaining: null,
              valid_from: "",
              valid_to: "",
              issuer: {},
              subject: {},
              sans: [],
              serial_number: "",
              fingerprint: "",
              protocol,
              cipher,
              chain_valid: false,
              error: "No certificate returned",
            });
            return;
          }

          const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
          const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
          const daysRemaining = validTo
            ? Math.floor((validTo.getTime() - Date.now()) / 86400000)
            : null;

          const issuer = {
            CN: cert.issuer?.CN,
            O: cert.issuer?.O,
            C: cert.issuer?.C,
          };
          const subject = {
            CN: cert.subject?.CN,
            O: cert.subject?.O,
            C: cert.subject?.C,
          };
          const sans = parseSANs(cert.subjectaltname);
          const serialNumber = cert.serialNumber ?? "";
          const fingerprint = cert.fingerprint ?? "";

          socket.destroy();
          resolve({
            domain,
            checked_at: now,
            valid: daysRemaining !== null && daysRemaining >= 0,
            days_remaining: daysRemaining,
            valid_from: validFrom?.toISOString() ?? "",
            valid_to: validTo?.toISOString() ?? "",
            issuer,
            subject,
            sans,
            serial_number: serialNumber,
            fingerprint,
            protocol,
            cipher,
            chain_valid: chainValid,
          });
        } catch (err) {
          socket.destroy();
          resolve({
            domain,
            checked_at: now,
            valid: false,
            days_remaining: null,
            valid_from: "",
            valid_to: "",
            issuer: {},
            subject: {},
            sans: [],
            serial_number: "",
            fingerprint: "",
            protocol: "unknown",
            cipher: "unknown",
            chain_valid: false,
            error: String(err),
          });
        }
      }
    );

    socket.on("error", (err) => {
      socket.destroy();
      resolve({
        domain,
        checked_at: now,
        valid: false,
        days_remaining: null,
        valid_from: "",
        valid_to: "",
        issuer: {},
        subject: {},
        sans: [],
        serial_number: "",
        fingerprint: "",
        protocol: "unknown",
        cipher: "unknown",
        chain_valid: false,
        error: err.message,
      });
    });

    socket.setTimeout(10000, () => {
      socket.destroy();
      resolve({
        domain,
        checked_at: now,
        valid: false,
        days_remaining: null,
        valid_from: "",
        valid_to: "",
        issuer: {},
        subject: {},
        sans: [],
        serial_number: "",
        fingerprint: "",
        protocol: "unknown",
        cipher: "unknown",
        chain_valid: false,
        error: "Connection timed out",
      });
    });
  });
}

export function getSSLStatus(
  result: SSLCheckResult,
  alertDays: number
): "ok" | "warning" | "error" {
  if (!result.valid || result.error) return "error";
  if (result.days_remaining !== null && result.days_remaining < 0) return "error";
  if (result.days_remaining !== null && result.days_remaining <= alertDays) return "warning";
  return "ok";
}
