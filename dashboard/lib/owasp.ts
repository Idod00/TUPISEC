interface OwaspMapping {
  id: string;
  name: string;
  url: string;
}

const OWASP_MAP: Record<string, OwaspMapping> = {
  "SQL Injection": {
    id: "A03:2021",
    name: "Injection",
    url: "https://owasp.org/Top10/A03_2021-Injection/",
  },
  XSS: {
    id: "A03:2021",
    name: "Injection",
    url: "https://owasp.org/Top10/A03_2021-Injection/",
  },
  CSRF: {
    id: "A01:2021",
    name: "Broken Access Control",
    url: "https://owasp.org/Top10/A01_2021-Broken_Access_Control/",
  },
  "Missing Security Header": {
    id: "A05:2021",
    name: "Security Misconfiguration",
    url: "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
  },
  "SSL/TLS": {
    id: "A02:2021",
    name: "Cryptographic Failures",
    url: "https://owasp.org/Top10/A02_2021-Cryptographic_Failures/",
  },
  "Cookie Security": {
    id: "A05:2021",
    name: "Security Misconfiguration",
    url: "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
  },
  "Information Disclosure": {
    id: "A05:2021",
    name: "Security Misconfiguration",
    url: "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
  },
  "Sensitive File/Directory": {
    id: "A01:2021",
    name: "Broken Access Control",
    url: "https://owasp.org/Top10/A01_2021-Broken_Access_Control/",
  },
  "Directory Enumeration": {
    id: "A01:2021",
    name: "Broken Access Control",
    url: "https://owasp.org/Top10/A01_2021-Broken_Access_Control/",
  },
  "Form Security": {
    id: "A04:2021",
    name: "Insecure Design",
    url: "https://owasp.org/Top10/A04_2021-Insecure_Design/",
  },
  "CORS Misconfiguration": {
    id: "A05:2021",
    name: "Security Misconfiguration",
    url: "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
  },
  "HTTP Methods": {
    id: "A05:2021",
    name: "Security Misconfiguration",
    url: "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
  },
  "Open Port": {
    id: "A05:2021",
    name: "Security Misconfiguration",
    url: "https://owasp.org/Top10/A05_2021-Security_Misconfiguration/",
  },
};

export function getOwaspLink(category: string): OwaspMapping | null {
  return OWASP_MAP[category] || null;
}

export function getOwaspMap(): Record<string, OwaspMapping> {
  return OWASP_MAP;
}
