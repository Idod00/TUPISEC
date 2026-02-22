#!/usr/bin/env python3
"""
TupiSec Scanner - Web Security Analysis Framework
Designed for analyzing tupisa.com.py domains
Usage: python3 scanner.py <URL> [--full] [--output report.txt]
"""

import sys
import os
import re
import json
import ssl
import socket
import urllib.parse
from datetime import datetime
from collections import defaultdict

import requests
from bs4 import BeautifulSoup
from colorama import init, Fore, Style
import urllib3

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
init(autoreset=True)

# ─── Configuration ────────────────────────────────────────────────────
TIMEOUT = 15
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
COMMON_PATHS = [
    "admin/", "administrator/", "login.php", "admin.php", "panel/",
    "phpmyadmin/", "phpinfo.php", "wp-admin/", "wp-login.php",
    "config.php", "config.php.bak", "config.old", ".env", ".git/",
    ".git/config", ".htaccess", "robots.txt", "sitemap.xml",
    "backup/", "backups/", "db/", "database/", "sql/", "dump.sql",
    "test.php", "info.php", "debug.php", "server-status", "server-info",
    "web.config", ".DS_Store", "composer.json", "package.json",
    "README.md", "CHANGELOG.md", "LICENSE", ".svn/", ".svn/entries",
    "wp-config.php", "wp-config.php.bak", "xmlrpc.php",
    "api/", "api/v1/", "api/v2/", "swagger.json", "openapi.json",
    "cgi-bin/", "uploads/", "files/", "images/", "img/", "css/", "js/",
    "include/", "includes/", "inc/", "lib/", "libs/", "temp/", "tmp/",
    "log/", "logs/", "error.log", "access.log", "debug.log",
    ".well-known/", "crossdomain.xml", "clientaccesspolicy.xml",
]

SQL_PAYLOADS = [
    "' OR '1'='1", "' OR '1'='1' --", "' OR '1'='1' /*",
    "\" OR \"1\"=\"1", "1' OR 1=1--", "' UNION SELECT NULL--",
    "admin'--", "' OR 1=1#", "1; DROP TABLE users--",
    "' AND 1=CONVERT(int,(SELECT @@version))--",
]

XSS_PAYLOADS = [
    "<script>alert('XSS')</script>",
    "<img src=x onerror=alert('XSS')>",
    "'\"><script>alert('XSS')</script>",
    "<svg onload=alert('XSS')>",
    "javascript:alert('XSS')",
    "<body onload=alert('XSS')>",
]

SECURITY_HEADERS = [
    "Strict-Transport-Security",
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "X-XSS-Protection",
    "Referrer-Policy",
    "Permissions-Policy",
    "Cross-Origin-Embedder-Policy",
    "Cross-Origin-Opener-Policy",
    "Cross-Origin-Resource-Policy",
]


class Finding:
    """Represents a security finding."""
    def __init__(self, severity, category, title, detail, recommendation=""):
        self.severity = severity  # CRITICAL, HIGH, MEDIUM, LOW, INFO
        self.category = category
        self.title = title
        self.detail = detail
        self.recommendation = recommendation
        self.timestamp = datetime.now().isoformat()

    def __str__(self):
        colors = {
            "CRITICAL": Fore.RED + Style.BRIGHT,
            "HIGH": Fore.RED,
            "MEDIUM": Fore.YELLOW,
            "LOW": Fore.CYAN,
            "INFO": Fore.BLUE,
        }
        color = colors.get(self.severity, "")
        return f"{color}[{self.severity}] {self.category}: {self.title}{Style.RESET_ALL}\n  {self.detail}"

    def to_dict(self):
        return {
            "severity": self.severity,
            "category": self.category,
            "title": self.title,
            "detail": self.detail,
            "recommendation": self.recommendation,
            "timestamp": self.timestamp,
        }


class TupiSecScanner:
    """Main scanner class."""

    def __init__(self, target_url, verbose=True, cookies=None):
        self.target_url = target_url.rstrip("/")
        self.parsed = urllib.parse.urlparse(self.target_url)
        self.base_url = f"{self.parsed.scheme}://{self.parsed.netloc}"
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": USER_AGENT})
        self.session.verify = False
        self.findings = []
        self.verbose = verbose
        self.discovered_urls = set()
        self.discovered_forms = []
        self.tech_stack = {}
        self.dns_records = []
        self.whois_info = {}
        self.cve_data = []
        self.subdomains = []
        self.open_redirect_results = []
        if cookies:
            for pair in cookies.split(";"):
                pair = pair.strip()
                if "=" in pair:
                    name, _, value = pair.partition("=")
                    self.session.cookies.set(name.strip(), value.strip())

    def log(self, msg, color=Fore.WHITE):
        if self.verbose:
            print(f"{color}{msg}{Style.RESET_ALL}")

    def add_finding(self, severity, category, title, detail, recommendation=""):
        f = Finding(severity, category, title, detail, recommendation)
        self.findings.append(f)
        if self.verbose:
            print(f"  {f}")

    # ─── Module 1: HTTP Headers Analysis ──────────────────────────────
    def scan_headers(self):
        self.log("\n[*] Analyzing HTTP Headers...", Fore.GREEN)
        try:
            resp = self.session.get(self.target_url, timeout=TIMEOUT, allow_redirects=True)
            headers = resp.headers

            # Server disclosure
            server = headers.get("Server", "")
            if server:
                self.add_finding("LOW", "Information Disclosure", "Server header exposed",
                    f"Server: {server}",
                    "Remove or obfuscate the Server header.")
                self.tech_stack["server"] = server

            # X-Powered-By
            powered = headers.get("X-Powered-By", "")
            if powered:
                self.add_finding("LOW", "Information Disclosure", "X-Powered-By header exposed",
                    f"X-Powered-By: {powered}",
                    "Remove the X-Powered-By header in production.")
                self.tech_stack["powered_by"] = powered

            # Missing security headers
            for header in SECURITY_HEADERS:
                if header not in headers:
                    severity = "HIGH" if header in ("Content-Security-Policy", "Strict-Transport-Security") else "MEDIUM"
                    self.add_finding(severity, "Missing Security Header",
                        f"Missing: {header}",
                        f"The response does not include the {header} header.",
                        f"Add the {header} header to all responses.")

            # Cookie analysis
            for cookie in resp.cookies:
                issues = []
                if not cookie.secure:
                    issues.append("Missing Secure flag")
                if not cookie.has_nonstandard_attr("HttpOnly") and "httponly" not in str(cookie).lower():
                    issues.append("Missing HttpOnly flag")
                if "samesite" not in str(cookie).lower():
                    issues.append("Missing SameSite attribute")
                if issues:
                    self.add_finding("MEDIUM", "Cookie Security",
                        f"Insecure cookie: {cookie.name}",
                        f"Issues: {', '.join(issues)}",
                        "Set Secure, HttpOnly, and SameSite attributes on all cookies.")

            # Check for CORS misconfiguration
            cors = headers.get("Access-Control-Allow-Origin", "")
            if cors == "*":
                self.add_finding("HIGH", "CORS Misconfiguration",
                    "Wildcard CORS origin",
                    "Access-Control-Allow-Origin is set to *",
                    "Restrict CORS to specific trusted origins.")

            return resp
        except Exception as e:
            self.log(f"  [!] Error scanning headers: {e}", Fore.RED)
            return None

    # ─── Module 2: SSL/TLS Analysis ───────────────────────────────────
    def scan_ssl(self):
        if self.parsed.scheme != "https":
            self.add_finding("HIGH", "SSL/TLS", "No HTTPS",
                f"The site uses HTTP instead of HTTPS: {self.target_url}",
                "Enable HTTPS with a valid TLS certificate.")
            return

        self.log("\n[*] Analyzing SSL/TLS...", Fore.GREEN)
        hostname = self.parsed.hostname
        port = self.parsed.port or 443

        try:
            context = ssl.create_default_context()
            with socket.create_connection((hostname, port), timeout=TIMEOUT) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    protocol = ssock.version()
                    cipher = ssock.cipher()

                    self.log(f"  Protocol: {protocol}", Fore.CYAN)
                    self.log(f"  Cipher: {cipher[0]}", Fore.CYAN)

                    # Check certificate expiry
                    not_after = cert.get("notAfter", "")
                    if not_after:
                        from datetime import datetime as dt
                        expiry = dt.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
                        days_left = (expiry - dt.now()).days
                        if days_left < 0:
                            self.add_finding("CRITICAL", "SSL/TLS", "Certificate expired",
                                f"Certificate expired {abs(days_left)} days ago.",
                                "Renew the SSL certificate immediately.")
                        elif days_left < 30:
                            self.add_finding("MEDIUM", "SSL/TLS", "Certificate expiring soon",
                                f"Certificate expires in {days_left} days.",
                                "Renew the SSL certificate soon.")

                    # Weak protocols
                    if protocol in ("TLSv1", "TLSv1.1", "SSLv3", "SSLv2"):
                        self.add_finding("HIGH", "SSL/TLS", f"Weak protocol: {protocol}",
                            f"Server supports {protocol} which is deprecated.",
                            "Disable TLS 1.0, TLS 1.1, and all SSL versions.")

        except ssl.SSLCertVerificationError as e:
            self.add_finding("HIGH", "SSL/TLS", "Certificate verification failed",
                str(e), "Fix the SSL certificate configuration.")
        except Exception as e:
            self.log(f"  [!] SSL scan error: {e}", Fore.RED)

    # ─── Module 3: Form & Input Analysis ──────────────────────────────
    def scan_forms(self, html_content=None):
        self.log("\n[*] Analyzing Forms & Inputs...", Fore.GREEN)
        try:
            if not html_content:
                resp = self.session.get(self.target_url, timeout=TIMEOUT)
                html_content = resp.text

            soup = BeautifulSoup(html_content, "html.parser")
            forms = soup.find_all("form")

            if not forms:
                self.log("  No forms found on this page.", Fore.YELLOW)
                return

            for i, form in enumerate(forms):
                action = form.get("action", "")
                method = form.get("method", "GET").upper()
                autocomplete = form.get("autocomplete", "")

                self.log(f"\n  Form #{i+1}: action='{action}' method='{method}'", Fore.CYAN)

                # No CSRF token
                csrf_found = False
                for inp in form.find_all("input", {"type": "hidden"}):
                    name = (inp.get("name") or "").lower()
                    if any(t in name for t in ["csrf", "token", "_token", "nonce", "authenticity"]):
                        csrf_found = True
                        break

                if not csrf_found:
                    self.add_finding("HIGH", "CSRF", "No CSRF token detected",
                        f"Form #{i+1} (action='{action}') has no CSRF protection.",
                        "Implement CSRF tokens in all forms.")

                # Password field without autocomplete=off
                pwd_fields = form.find_all("input", {"type": "password"})
                for pwd in pwd_fields:
                    if pwd.get("autocomplete", "") != "off" and autocomplete != "off":
                        self.add_finding("LOW", "Form Security",
                            "Password autocomplete enabled",
                            f"Form #{i+1} has password field without autocomplete='off'.",
                            "Set autocomplete='off' on password fields.")

                # GET method for sensitive forms
                if method == "GET" and pwd_fields:
                    self.add_finding("HIGH", "Form Security",
                        "Login form uses GET method",
                        "Credentials may appear in URL, browser history, and server logs.",
                        "Change the form method to POST.")

                # Action URL analysis
                if action and not action.startswith("https"):
                    if action.startswith("http:"):
                        self.add_finding("HIGH", "Form Security",
                            "Form submits over HTTP",
                            f"Form action '{action}' uses unencrypted HTTP.",
                            "Change form action to HTTPS.")

                # Collect form data for further testing
                fields = {}
                for inp in form.find_all(["input", "textarea", "select"]):
                    name = inp.get("name", inp.get("id", ""))
                    itype = inp.get("type", "text")
                    if name:
                        fields[name] = {"type": itype, "value": inp.get("value", "")}

                self.discovered_forms.append({
                    "action": action,
                    "method": method,
                    "fields": fields,
                    "url": self.target_url,
                })

        except Exception as e:
            self.log(f"  [!] Form scan error: {e}", Fore.RED)

    # ─── Module 4: SQL Injection Testing ──────────────────────────────
    def scan_sqli(self):
        self.log("\n[*] Testing for SQL Injection...", Fore.GREEN)
        if not self.discovered_forms:
            self.log("  No forms to test.", Fore.YELLOW)
            return

        sql_errors = [
            "sql syntax", "mysql_fetch", "mysql_num_rows", "mysqli_",
            "pg_query", "pg_exec", "sqlite3", "ORA-", "oracle",
            "microsoft ole db", "odbc", "sql server", "syntax error",
            "unclosed quotation", "unterminated string", "warning:",
            "mysql_", "postgresql", "sqlstate", "division by zero",
            "supplied argument is not a valid", "mssql_query",
        ]

        for form_data in self.discovered_forms:
            action = form_data["action"]
            method = form_data["method"]
            fields = form_data["fields"]

            if not action:
                action = self.target_url
            elif not action.startswith("http"):
                action = urllib.parse.urljoin(self.target_url, action)

            for field_name, field_info in fields.items():
                if field_info["type"] in ("hidden", "submit", "button", "image"):
                    continue

                for payload in SQL_PAYLOADS[:5]:  # Test first 5 payloads
                    test_data = {}
                    for fn, fi in fields.items():
                        if fn == field_name:
                            test_data[fn] = payload
                        else:
                            test_data[fn] = fi.get("value", "test")

                    try:
                        if method == "POST":
                            resp = self.session.post(action, data=test_data, timeout=TIMEOUT, allow_redirects=True)
                        else:
                            resp = self.session.get(action, params=test_data, timeout=TIMEOUT, allow_redirects=True)

                        body = resp.text.lower()
                        for error in sql_errors:
                            if error.lower() in body:
                                self.add_finding("CRITICAL", "SQL Injection",
                                    f"Possible SQLi in field '{field_name}'",
                                    f"Payload: {payload}\nSQL error pattern found: '{error}'",
                                    "Use parameterized queries / prepared statements.")
                                return  # One finding per form is enough
                    except:
                        pass

    # ─── Module 5: XSS Testing ────────────────────────────────────────
    def scan_xss(self):
        self.log("\n[*] Testing for Cross-Site Scripting (XSS)...", Fore.GREEN)
        if not self.discovered_forms:
            self.log("  No forms to test.", Fore.YELLOW)
            return

        for form_data in self.discovered_forms:
            action = form_data["action"]
            method = form_data["method"]
            fields = form_data["fields"]

            if not action:
                action = self.target_url
            elif not action.startswith("http"):
                action = urllib.parse.urljoin(self.target_url, action)

            for field_name, field_info in fields.items():
                if field_info["type"] in ("hidden", "submit", "button", "image"):
                    continue

                for payload in XSS_PAYLOADS[:3]:
                    test_data = {}
                    for fn, fi in fields.items():
                        if fn == field_name:
                            test_data[fn] = payload
                        else:
                            test_data[fn] = fi.get("value", "test")

                    try:
                        if method == "POST":
                            resp = self.session.post(action, data=test_data, timeout=TIMEOUT, allow_redirects=True)
                        else:
                            resp = self.session.get(action, params=test_data, timeout=TIMEOUT, allow_redirects=True)

                        if payload in resp.text:
                            self.add_finding("HIGH", "XSS",
                                f"Reflected XSS in field '{field_name}'",
                                f"Payload reflected without encoding: {payload}",
                                "Sanitize and encode all user inputs before rendering.")
                            break
                    except:
                        pass

    # ─── Module 6: Directory/File Enumeration ─────────────────────────
    def scan_directories(self):
        self.log("\n[*] Enumerating directories & sensitive files...", Fore.GREEN)
        interesting = []

        for path in COMMON_PATHS:
            url = f"{self.base_url}/{path}"
            try:
                resp = self.session.get(url, timeout=8, allow_redirects=False)
                status = resp.status_code
                length = len(resp.content)

                if status == 200:
                    severity = "MEDIUM"
                    # Bump severity for really sensitive files
                    if any(s in path for s in [".env", ".git", "config", "backup", "dump", "sql", "phpinfo", ".bak"]):
                        severity = "CRITICAL" if any(s in path for s in [".env", ".git/config", "dump.sql", "phpinfo"]) else "HIGH"

                    self.add_finding(severity, "Sensitive File/Directory",
                        f"Accessible: {path}",
                        f"URL: {url} (Status: {status}, Size: {length} bytes)",
                        "Restrict access to sensitive files and directories.")
                    interesting.append((path, status, length))

                elif status in (301, 302, 303, 307, 308):
                    location = resp.headers.get("Location", "")
                    if path.rstrip("/") in location.lower():
                        interesting.append((path, status, f"-> {location}"))

                elif status == 403:
                    self.add_finding("INFO", "Directory Enumeration",
                        f"Forbidden but exists: {path}",
                        f"URL: {url} returned 403 Forbidden.",
                        "Ensure 403 responses don't leak information.")

            except:
                pass

        # Also enumerate paths under the /newsys/ directory
        newsys_paths = [
            "config.php", "db.php", "database.php", "conn.php", "conexion.php",
            "includes/", "include/", "class/", "classes/", "api/",
            "upload/", "uploads/", "archivos/", "documentos/",
            "admin/", "panel/", "dashboard.php", "menu.php",
            "logout.php", "registro.php", "register.php",
            "usuarios.php", "users.php", "reportes/", "reports/",
            "acc_admin.php", "acc_usuario.php", "acc_login.php",
            "test.php", "prueba.php", "phpinfo.php",
        ]

        self.log("\n[*] Enumerating /newsys/ subdirectory...", Fore.GREEN)
        for path in newsys_paths:
            url = f"{self.base_url}/newsys/{path}"
            try:
                resp = self.session.get(url, timeout=8, allow_redirects=False)
                status = resp.status_code
                length = len(resp.content)

                if status == 200 and length > 0:
                    severity = "HIGH" if any(s in path for s in ["config", "db", "conn", "conexion", "admin", "phpinfo"]) else "MEDIUM"
                    self.add_finding(severity, "Sensitive File/Directory",
                        f"Accessible in /newsys/: {path}",
                        f"URL: {url} (Status: {status}, Size: {length} bytes)",
                        "Restrict access to non-public files.")

                elif status == 403:
                    self.add_finding("INFO", "Directory Enumeration",
                        f"Exists in /newsys/: {path}",
                        f"URL: {url} returned 403 Forbidden.")
            except:
                pass

    # ─── Module 7: Technology Fingerprinting ──────────────────────────
    def scan_tech(self):
        self.log("\n[*] Fingerprinting technology stack...", Fore.GREEN)
        try:
            resp = self.session.get(self.target_url, timeout=TIMEOUT)
            headers = resp.headers
            body = resp.text

            # PHP detection
            if ".php" in self.target_url or "X-Powered-By" in headers:
                php_ver = headers.get("X-Powered-By", "unknown version")
                self.tech_stack["language"] = f"PHP ({php_ver})"

            # Web server
            server = headers.get("Server", "")
            if server:
                self.tech_stack["web_server"] = server

            # Check for common frameworks in HTML
            soup = BeautifulSoup(body, "html.parser")
            scripts = [s.get("src", "") for s in soup.find_all("script") if s.get("src")]
            links = [l.get("href", "") for l in soup.find_all("link") if l.get("href")]

            for src in scripts + links:
                if "jquery" in src.lower():
                    self.tech_stack["jquery"] = src
                if "bootstrap" in src.lower():
                    self.tech_stack["bootstrap"] = src
                if "angular" in src.lower():
                    self.tech_stack["angular"] = src
                if "react" in src.lower():
                    self.tech_stack["react"] = src
                if "vue" in src.lower():
                    self.tech_stack["vue"] = src

            # Generator meta tag
            gen = soup.find("meta", {"name": "generator"})
            if gen:
                self.tech_stack["generator"] = gen.get("content", "")

            if self.tech_stack:
                self.log(f"  Detected: {json.dumps(self.tech_stack, indent=2)}", Fore.CYAN)

        except Exception as e:
            self.log(f"  [!] Tech scan error: {e}", Fore.RED)

    # ─── Module 7b: DNS & WHOIS ────────────────────────────────────────
    def scan_dns_whois(self):
        self.log("\n[*] Collecting DNS records & WHOIS info...", Fore.GREEN)
        hostname = self.parsed.hostname or self.parsed.netloc

        # DNS records
        try:
            import dns.resolver
            record_types = ["A", "AAAA", "MX", "NS", "TXT"]
            for rtype in record_types:
                try:
                    answers = dns.resolver.resolve(hostname, rtype, lifetime=10)
                    for rdata in answers:
                        self.dns_records.append({"type": rtype, "value": rdata.to_text()})
                except Exception:
                    pass
            self.log(f"  Found {len(self.dns_records)} DNS records", Fore.CYAN)
        except ImportError:
            self.log("  [!] dnspython not installed, skipping DNS lookup", Fore.YELLOW)
        except Exception as e:
            self.log(f"  [!] DNS lookup error: {e}", Fore.RED)

        # WHOIS info
        try:
            import whois
            try:
                w = whois.whois(hostname)
                if w:
                    def _str(val):
                        if val is None:
                            return ""
                        if isinstance(val, list):
                            val = val[0]
                        return str(val)

                    self.whois_info = {
                        k: _str(v)
                        for k, v in {
                            "registrar": w.registrar,
                            "creation_date": w.creation_date,
                            "expiration_date": w.expiration_date,
                            "name_servers": w.name_servers,
                            "country": w.country,
                            "emails": w.emails,
                        }.items()
                        if v
                    }
                    self.log(f"  WHOIS: {self.whois_info.get('registrar', 'unknown registrar')}", Fore.CYAN)
            except Exception as e:
                self.log(f"  [!] WHOIS lookup error: {e}", Fore.RED)
        except ImportError:
            self.log("  [!] python-whois not installed, skipping WHOIS", Fore.YELLOW)

    # ─── Module 7c: CVE Lookup ─────────────────────────────────────────
    def scan_cves(self):
        self.log("\n[*] Looking up CVEs for detected technologies...", Fore.GREEN)
        if not self.tech_stack:
            self.log("  No tech stack detected, skipping CVE lookup.", Fore.YELLOW)
            return

        import time

        # Build (product, version) pairs from tech_stack values
        # e.g. "nginx/1.18.0", "PHP/5.6.24", "Apache/2.4.51"
        products = []
        ver_pattern = re.compile(r"([a-zA-Z][a-zA-Z0-9\-_\.]+)[/\s]+([\d]+\.[\d]+(?:\.[\d]+)?)")
        for key, val in self.tech_stack.items():
            m = ver_pattern.search(val)
            if m:
                products.append((m.group(1), m.group(2)))
            else:
                # Just use the value as keyword if short enough
                if len(val) < 50:
                    products.append((val, ""))

        if not products:
            self.log("  No versioned products found in tech stack.", Fore.YELLOW)
            return

        for idx, (product, version) in enumerate(products[:5]):  # cap at 5 queries
            keyword = f"{product} {version}".strip()
            self.log(f"  Querying NVD for: {keyword}", Fore.CYAN)
            try:
                url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
                resp = requests.get(url, params={"keywordSearch": keyword, "resultsPerPage": 5}, timeout=15)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("vulnerabilities", [])
                    for item in items:
                        cve_id = item.get("cve", {}).get("id", "")
                        metrics = item.get("cve", {}).get("metrics", {})
                        # Try CVSS v3.1 then v3.0 then v2
                        score = None
                        for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
                            metric_list = metrics.get(key, [])
                            if metric_list:
                                score = metric_list[0].get("cvssData", {}).get("baseScore")
                                break
                        if score is None:
                            continue
                        score = float(score)
                        if score < 7.0:
                            continue

                        if score >= 9.0:
                            severity = "CRITICAL"
                        elif score >= 7.0:
                            severity = "HIGH"
                        else:
                            severity = "MEDIUM"

                        descriptions = item.get("cve", {}).get("descriptions", [])
                        desc_text = next((d["value"] for d in descriptions if d.get("lang") == "en"), "")
                        self.cve_data.append({
                            "cve_id": cve_id,
                            "product": product,
                            "version": version,
                            "cvss_score": score,
                            "severity": severity,
                            "description": desc_text[:300],
                        })
                        self.add_finding(
                            severity, "CVE",
                            f"{cve_id} affects {product} {version}",
                            f"CVSS {score}: {desc_text[:200]}",
                            f"Update {product} to a patched version.",
                        )
                elif resp.status_code == 429:
                    self.log("  [!] NVD rate limit hit, pausing...", Fore.YELLOW)
                    time.sleep(10)
            except Exception as e:
                self.log(f"  [!] CVE lookup error for {keyword}: {e}", Fore.RED)

            # Rate limiting: max 5 requests per 10 seconds for unauthenticated NVD
            if idx < len(products) - 1:
                time.sleep(2)

        self.log(f"  Found {len(self.cve_data)} high/critical CVEs", Fore.CYAN)

    # ─── Module 11: Open Redirect Testing ─────────────────────────────
    def scan_open_redirect(self):
        self.log("\n[*] Testing for Open Redirects...", Fore.GREEN)
        self.open_redirect_results = []
        redirect_params = {"url", "redirect", "next", "return", "to", "dest",
                           "destination", "location", "goto", "forward", "redir", "target"}
        evil_url = "https://evil.tupisec-test.io"
        tested = set()

        all_urls = list(self.discovered_urls) + [self.target_url]
        for page_url in all_urls:
            parsed = urllib.parse.urlparse(page_url)
            if not parsed.query:
                continue
            params = dict(urllib.parse.parse_qsl(parsed.query))
            for param in list(params.keys()):
                if param.lower() not in redirect_params:
                    continue
                key = (urllib.parse.urlunparse(parsed._replace(query="")), param)
                if key in tested:
                    continue
                tested.add(key)
                q = dict(params)
                q[param] = evil_url
                test_url = urllib.parse.urlunparse(
                    parsed._replace(query=urllib.parse.urlencode(q))
                )
                try:
                    resp = self.session.get(test_url, timeout=8, allow_redirects=False)
                    location = resp.headers.get("Location", "")
                    if location and "tupisec-test.io" in location:
                        self.open_redirect_results.append({
                            "url": page_url, "param": param, "redirect_to": location
                        })
                        self.add_finding(
                            "HIGH", "Open Redirect",
                            f"Open Redirect via parameter '{param}'",
                            f"URL: {page_url}\nPayload: {param}={evil_url}\nRedirects to: {location}",
                            "Validate redirect URLs against a whitelist. Never allow arbitrary external redirects."
                        )
                except Exception:
                    pass

        if not self.open_redirect_results:
            self.log("  No open redirects detected.", Fore.CYAN)

    # ─── Module 12: SSRF Testing ───────────────────────────────────────
    def scan_ssrf(self):
        self.log("\n[*] Testing for Server-Side Request Forgery (SSRF)...", Fore.GREEN)
        ssrf_payloads = [
            "http://127.0.0.1/",
            "http://localhost/",
            "http://169.254.169.254/latest/meta-data/",
            "http://[::1]/",
        ]
        ssrf_indicators = [
            "ami-id", "instance-id", "local-ipv4", "iam/security-credentials",
            "hostname", "instance-type", "meta-data",
        ]

        def check_ssrf_response(resp_text, payload, context):
            for indicator in ssrf_indicators:
                if indicator.lower() in resp_text.lower():
                    self.add_finding(
                        "CRITICAL", "SSRF",
                        "Cloud Metadata Endpoint Accessible via SSRF",
                        f"Context: {context}\nPayload: {payload}\nCloud metadata indicator: '{indicator}'",
                        "Block outbound requests to internal/cloud metadata addresses. Use outbound allowlists."
                    )
                    return True
            return False

        # Test form fields
        for form_data in self.discovered_forms:
            action = form_data.get("action", "") or self.target_url
            if not action.startswith("http"):
                action = urllib.parse.urljoin(self.target_url, action)
            method = form_data.get("method", "GET").upper()
            fields = form_data.get("fields", {})
            for field_name, field_info in fields.items():
                if field_info.get("type") in ("hidden", "submit", "button", "image"):
                    continue
                for payload in ssrf_payloads:
                    test_data = {fn: (payload if fn == field_name else fi.get("value", "test"))
                                 for fn, fi in fields.items()}
                    try:
                        if method == "POST":
                            resp = self.session.post(action, data=test_data, timeout=8, allow_redirects=True)
                        else:
                            resp = self.session.get(action, params=test_data, timeout=8, allow_redirects=True)
                        if check_ssrf_response(resp.text, payload, f"Form field '{field_name}' at {action}"):
                            break
                    except Exception:
                        pass

        # Test URL parameters
        for page_url in list(self.discovered_urls)[:15]:
            parsed = urllib.parse.urlparse(page_url)
            if not parsed.query:
                continue
            params = dict(urllib.parse.parse_qsl(parsed.query))
            for param in list(params.keys()):
                for payload in ssrf_payloads[:2]:
                    q = dict(params)
                    q[param] = payload
                    test_url = urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(q)))
                    try:
                        resp = self.session.get(test_url, timeout=8, allow_redirects=True)
                        if check_ssrf_response(resp.text, payload, f"URL param '{param}' at {page_url}"):
                            break
                    except Exception:
                        pass

    # ─── Module 13: SSTI Testing ───────────────────────────────────────
    def scan_ssti(self):
        self.log("\n[*] Testing for Server-Side Template Injection (SSTI)...", Fore.GREEN)
        payloads = [
            ("{{7*7}}", "49"),
            ("${7*7}", "49"),
            ("#{7*7}", "49"),
            ("<%= 7*7 %>", "49"),
            ("*{7*7}", "49"),
            ("{{7*'7'}}", "7777777"),
        ]

        def check_ssti(resp_text, payload, expected, context):
            if expected in resp_text:
                self.add_finding(
                    "CRITICAL", "SSTI",
                    f"Server-Side Template Injection — {context}",
                    f"Payload: {payload}\nResult '{expected}' found in response. RCE may be possible.",
                    "Never render user input through template engines. Use safe rendering or sandboxing."
                )
                return True
            return False

        # Test form fields
        for form_data in self.discovered_forms:
            action = form_data.get("action", "") or self.target_url
            if not action.startswith("http"):
                action = urllib.parse.urljoin(self.target_url, action)
            method = form_data.get("method", "GET").upper()
            fields = form_data.get("fields", {})
            for field_name, field_info in fields.items():
                if field_info.get("type") in ("hidden", "submit", "button", "image", "password"):
                    continue
                for payload, expected in payloads:
                    test_data = {fn: (payload if fn == field_name else fi.get("value", "test"))
                                 for fn, fi in fields.items()}
                    try:
                        if method == "POST":
                            resp = self.session.post(action, data=test_data, timeout=TIMEOUT, allow_redirects=True)
                        else:
                            resp = self.session.get(action, params=test_data, timeout=TIMEOUT, allow_redirects=True)
                        if check_ssti(resp.text, payload, expected, f"field '{field_name}' at {action}"):
                            break
                    except Exception:
                        pass

        # Test URL parameters
        for page_url in list(self.discovered_urls)[:15]:
            parsed = urllib.parse.urlparse(page_url)
            if not parsed.query:
                continue
            params = dict(urllib.parse.parse_qsl(parsed.query))
            for param in list(params.keys()):
                for payload, expected in payloads:
                    q = dict(params)
                    q[param] = payload
                    test_url = urllib.parse.urlunparse(parsed._replace(query=urllib.parse.urlencode(q)))
                    try:
                        resp = self.session.get(test_url, timeout=TIMEOUT, allow_redirects=True)
                        if check_ssti(resp.text, payload, expected, f"param '{param}' at {page_url}"):
                            break
                    except Exception:
                        pass

    # ─── Module 14: Advanced CORS Testing ─────────────────────────────
    def scan_cors_advanced(self):
        self.log("\n[*] Advanced CORS testing...", Fore.GREEN)
        evil_origin = "https://evil.tupisec-test.io"
        urls_to_test = [self.target_url] + list(self.discovered_urls)[:5]

        for test_url in urls_to_test:
            try:
                resp = self.session.get(
                    test_url,
                    timeout=TIMEOUT,
                    headers={"Origin": evil_origin},
                    allow_redirects=True,
                )
                acao = resp.headers.get("Access-Control-Allow-Origin", "")
                acac = resp.headers.get("Access-Control-Allow-Credentials", "").lower().strip()

                if acao == evil_origin and acac == "true":
                    self.add_finding(
                        "CRITICAL", "CORS Misconfiguration",
                        "CORS: Arbitrary Origin Reflected with Credentials",
                        f"URL: {test_url}\nAccess-Control-Allow-Origin: {acao}\n"
                        f"Access-Control-Allow-Credentials: {acac}\n"
                        "Attackers can make authenticated cross-origin requests.",
                        "Validate Origin against a strict allowlist. Never combine reflected origins with credentials."
                    )
                    return  # One critical finding is enough
                elif acao == evil_origin:
                    self.add_finding(
                        "HIGH", "CORS Misconfiguration",
                        "CORS: Arbitrary Origin Reflected",
                        f"URL: {test_url}\nAccess-Control-Allow-Origin: {acao}\n"
                        "Server reflects any Origin header, enabling cross-origin data access.",
                        "Validate Origin against a strict allowlist."
                    )
                elif acao.lower() == "null" and acac == "true":
                    self.add_finding(
                        "HIGH", "CORS Misconfiguration",
                        "CORS: Null Origin Accepted with Credentials",
                        f"URL: {test_url}\nAccess-Control-Allow-Origin: null\n"
                        f"Access-Control-Allow-Credentials: {acac}\n"
                        "Null origin can be sent from sandboxed iframes.",
                        "Do not trust the null origin. Validate Origin strictly."
                    )
            except Exception:
                pass

    # ─── Module 15: Subdomain Enumeration ─────────────────────────────
    def scan_subdomains(self):
        self.log("\n[*] Enumerating subdomains...", Fore.GREEN)
        self.subdomains = []

        hostname = self.parsed.hostname or self.parsed.netloc
        parts = hostname.split(".")
        apex = ".".join(parts[-2:]) if len(parts) >= 2 else hostname

        wordlist = [
            "www", "api", "admin", "dev", "staging", "mail", "ftp", "app", "portal",
            "vpn", "auth", "dashboard", "panel", "beta", "shop", "blog", "help",
            "status", "cdn", "docs", "git", "jenkins", "jira", "smtp", "ns1", "ns2",
            "db", "backup", "monitor", "metrics", "grafana", "kibana", "test", "qa",
            "uat", "prod", "internal", "remote", "support", "demo", "login", "webmail",
            "m", "mobile", "static", "assets", "img", "images", "media", "upload",
            "files", "download", "secure", "dev2", "stage", "sandbox", "preview",
            "api2", "v2", "legacy", "old", "new", "infra", "ops", "cloud",
            "proxy", "lb", "waf", "gitlab", "wiki", "confluence", "vault",
            "elastic", "logstash", "prom", "alerts", "logs", "search", "sso", "id",
            "account", "accounts", "billing", "payment", "store", "forum",
            "community", "partner", "careers",
        ]

        takeover_patterns = [
            ("github.io", "there isn't a github pages site here"),
            ("herokucdn.com", "no such app"),
            ("heroku", "no such app"),
            ("netlify.app", "not found"),
            ("amazonaws.com", "nosuchbucket"),
            ("vercel.app", "the deployment could not be found"),
            ("surge.sh", "project not found"),
            ("fastly.net", "fastly error: unknown domain"),
        ]

        try:
            import dns.resolver
        except ImportError:
            self.log("  [!] dnspython not available, skipping subdomain enumeration", Fore.YELLOW)
            return

        self.log(f"  Testing {len(wordlist)} candidates for {apex}...", Fore.CYAN)

        for sub in wordlist:
            fqdn = f"{sub}.{apex}"
            try:
                answers = dns.resolver.resolve(fqdn, "A", lifetime=3)
                ips = [r.to_text() for r in answers]
                ip = ips[0] if ips else ""

                status_code = 0
                takeover_risk = False
                resp_body = ""

                for scheme in ("https", "http"):
                    try:
                        resp = self.session.get(f"{scheme}://{fqdn}", timeout=5, allow_redirects=True)
                        status_code = resp.status_code
                        resp_body = resp.text.lower()
                        break
                    except Exception:
                        pass

                # Check for takeover via CNAME
                try:
                    cname_answers = dns.resolver.resolve(fqdn, "CNAME", lifetime=3)
                    cname_target = str(cname_answers[0].target).lower()
                    for svc_domain, svc_pattern in takeover_patterns:
                        if svc_domain in cname_target and svc_pattern in resp_body:
                            takeover_risk = True
                            self.add_finding(
                                "CRITICAL", "Subdomain Takeover",
                                f"Subdomain takeover risk: {fqdn}",
                                f"CNAME → {cname_target}\nUnclaimed service pattern: '{svc_pattern}'",
                                f"Claim the {svc_domain} resource or remove the CNAME record."
                            )
                            break
                except Exception:
                    # No CNAME — check body directly
                    for svc_domain, svc_pattern in takeover_patterns:
                        if svc_pattern in resp_body:
                            takeover_risk = True
                            self.add_finding(
                                "CRITICAL", "Subdomain Takeover",
                                f"Subdomain takeover risk: {fqdn}",
                                f"Pattern '{svc_pattern}' found in HTTP response.",
                                "Remove the DNS record or claim the service resource."
                            )
                            break

                entry = {"subdomain": fqdn, "ip": ip, "status": status_code, "takeover_risk": takeover_risk}
                self.subdomains.append(entry)
                self.add_finding(
                    "INFO", "Subdomain Discovery",
                    f"Subdomain found: {fqdn}",
                    f"IP: {ip}, HTTP Status: {status_code}",
                    "Review all discovered subdomains for unnecessary exposure."
                )
                self.log(f"  [+] {fqdn} → {ip} (HTTP {status_code})", Fore.CYAN)

            except Exception:
                pass

        self.log(f"  Discovered {len(self.subdomains)} subdomains", Fore.CYAN)

    # ─── Module 8: Port Scanning (via nmap) ───────────────────────────
    def scan_ports(self):
        self.log("\n[*] Scanning common ports...", Fore.GREEN)
        try:
            import nmap
            nm = nmap.PortScanner()
            hostname = self.parsed.hostname
            nm.scan(hostname, arguments="-T4 -F --top-ports 100")

            for host in nm.all_hosts():
                for proto in nm[host].all_protocols():
                    ports = nm[host][proto].keys()
                    for port in sorted(ports):
                        state = nm[host][proto][port]["state"]
                        service = nm[host][proto][port].get("name", "")
                        version = nm[host][proto][port].get("version", "")
                        if state == "open":
                            self.log(f"  Port {port}/{proto}: {service} {version}", Fore.CYAN)
                            if port not in (80, 443):
                                self.add_finding("INFO", "Open Port",
                                    f"Port {port}/{proto} open: {service}",
                                    f"Service: {service} {version}",
                                    "Ensure only necessary ports are exposed.")
        except ImportError:
            self.log("  [!] python-nmap not available, using socket scan", Fore.YELLOW)
            self._socket_port_scan()
        except Exception as e:
            self.log(f"  [!] Port scan error: {e}", Fore.RED)
            self._socket_port_scan()

    def _socket_port_scan(self):
        """Fallback port scan using sockets."""
        common_ports = [21, 22, 23, 25, 53, 80, 110, 143, 443, 445, 993, 995,
                        1433, 1521, 3306, 3389, 5432, 5900, 6379, 8080, 8443, 8888, 9090, 27017]
        hostname = self.parsed.hostname
        for port in common_ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                result = sock.connect_ex((hostname, port))
                if result == 0:
                    self.log(f"  Port {port}: OPEN", Fore.CYAN)
                    if port not in (80, 443):
                        self.add_finding("INFO", "Open Port",
                            f"Port {port} is open",
                            f"Host: {hostname}:{port}",
                            "Ensure only necessary ports are exposed.")
                sock.close()
            except:
                pass

    # ─── Module 9: HTTP Methods Testing ───────────────────────────────
    def scan_methods(self):
        self.log("\n[*] Testing HTTP methods...", Fore.GREEN)
        dangerous_methods = ["PUT", "DELETE", "TRACE", "CONNECT", "PATCH"]
        try:
            resp = self.session.options(self.target_url, timeout=TIMEOUT)
            allow = resp.headers.get("Allow", "")
            if allow:
                self.log(f"  Allowed methods: {allow}", Fore.CYAN)
                for method in dangerous_methods:
                    if method in allow.upper():
                        self.add_finding("MEDIUM", "HTTP Methods",
                            f"Dangerous method enabled: {method}",
                            f"The server allows {method} requests.",
                            f"Disable {method} unless explicitly needed.")

            # Test TRACE specifically
            try:
                resp = self.session.request("TRACE", self.target_url, timeout=TIMEOUT)
                if resp.status_code == 200 and "TRACE" in resp.text:
                    self.add_finding("MEDIUM", "HTTP Methods",
                        "TRACE method enabled",
                        "TRACE can be used for Cross-Site Tracing (XST) attacks.",
                        "Disable the TRACE HTTP method.")
            except:
                pass

        except Exception as e:
            self.log(f"  [!] Methods scan error: {e}", Fore.RED)

    # ─── Module 10: Crawl & Discover ──────────────────────────────────
    def crawl(self, depth=2):
        self.log("\n[*] Crawling for additional pages...", Fore.GREEN)
        visited = set()
        to_visit = {self.target_url}

        for d in range(depth):
            next_visit = set()
            for url in to_visit:
                if url in visited:
                    continue
                visited.add(url)
                try:
                    resp = self.session.get(url, timeout=TIMEOUT)
                    soup = BeautifulSoup(resp.text, "html.parser")

                    for tag in soup.find_all(["a", "form", "script", "link", "img", "iframe"]):
                        href = tag.get("href") or tag.get("src") or tag.get("action") or ""
                        if href and not href.startswith(("#", "javascript:", "mailto:", "tel:")):
                            full_url = urllib.parse.urljoin(url, href)
                            parsed = urllib.parse.urlparse(full_url)
                            # Only follow links on same domain
                            if parsed.netloc == self.parsed.netloc:
                                self.discovered_urls.add(full_url)
                                if full_url not in visited:
                                    next_visit.add(full_url)
                except:
                    pass
            to_visit = next_visit

        self.log(f"  Discovered {len(self.discovered_urls)} URLs", Fore.CYAN)
        for url in sorted(self.discovered_urls):
            self.log(f"    {url}", Fore.BLUE)

    # ─── Report Generation ────────────────────────────────────────────
    def generate_report(self, output_file=None):
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
        sorted_findings = sorted(self.findings, key=lambda f: severity_order.get(f.severity, 5))

        counts = defaultdict(int)
        for f in self.findings:
            counts[f.severity] += 1

        report = []
        report.append("=" * 70)
        report.append("  TUPISEC - Web Security Analysis Report")
        report.append("=" * 70)
        report.append(f"  Target:    {self.target_url}")
        report.append(f"  Base URL:  {self.base_url}")
        report.append(f"  Date:      {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"  Scanner:   TupiSec v1.0.0")
        report.append("=" * 70)
        report.append("")
        report.append("  SUMMARY")
        report.append("  " + "-" * 40)
        report.append(f"  CRITICAL:  {counts.get('CRITICAL', 0)}")
        report.append(f"  HIGH:      {counts.get('HIGH', 0)}")
        report.append(f"  MEDIUM:    {counts.get('MEDIUM', 0)}")
        report.append(f"  LOW:       {counts.get('LOW', 0)}")
        report.append(f"  INFO:      {counts.get('INFO', 0)}")
        report.append(f"  TOTAL:     {len(self.findings)}")
        report.append("")

        if self.tech_stack:
            report.append("  TECHNOLOGY STACK")
            report.append("  " + "-" * 40)
            for k, v in self.tech_stack.items():
                report.append(f"  {k}: {v}")
            report.append("")

        if self.discovered_urls:
            report.append("  DISCOVERED URLs")
            report.append("  " + "-" * 40)
            for url in sorted(self.discovered_urls):
                report.append(f"  {url}")
            report.append("")

        report.append("  DETAILED FINDINGS")
        report.append("  " + "-" * 40)

        for i, f in enumerate(sorted_findings, 1):
            report.append(f"\n  [{f.severity}] #{i}: {f.title}")
            report.append(f"  Category: {f.category}")
            report.append(f"  Detail:   {f.detail}")
            if f.recommendation:
                report.append(f"  Fix:      {f.recommendation}")

        report.append("\n" + "=" * 70)
        report.append("  END OF REPORT")
        report.append("=" * 70)

        report_text = "\n".join(report)

        if output_file:
            with open(output_file, "w") as fh:
                fh.write(report_text)
            # Also save JSON version
            json_file = output_file.rsplit(".", 1)[0] + ".json"
            with open(json_file, "w") as fh:
                json.dump({
                    "target": self.target_url,
                    "base_url": self.base_url,
                    "scan_date": datetime.now().isoformat(),
                    "summary": dict(counts),
                    "tech_stack": self.tech_stack,
                    "discovered_urls": list(self.discovered_urls),
                    "findings": [f.to_dict() for f in sorted_findings],
                }, fh, indent=2)
            self.log(f"\n[+] Report saved to {output_file}", Fore.GREEN)
            self.log(f"[+] JSON report saved to {json_file}", Fore.GREEN)

        return report_text

    # ─── Full Scan ────────────────────────────────────────────────────
    def run_full_scan(self, emit_progress=False):
        self.log(f"\n{'='*70}", Fore.GREEN)
        self.log(f"  TupiSec Scanner v1.0.0 - Starting Full Scan", Fore.GREEN)
        self.log(f"  Target: {self.target_url}", Fore.GREEN)
        self.log(f"  Time:   {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", Fore.GREEN)
        self.log(f"{'='*70}\n", Fore.GREEN)

        phases = [
            ("headers", "Analyzing HTTP headers", lambda: self.scan_headers()),
            ("ssl", "Analyzing SSL/TLS", lambda: self.scan_ssl()),
            ("tech", "Fingerprinting technology", lambda: self.scan_tech()),
            ("dns", "Collecting DNS & WHOIS", lambda: self.scan_dns_whois()),
            ("cves", "Looking up CVEs", lambda: self.scan_cves()),
            ("methods", "Testing HTTP methods", lambda: self.scan_methods()),
            ("forms", "Analyzing forms", lambda: None),  # handled specially
            ("crawl", "Crawling site", lambda: self.crawl()),
            ("sqli", "Testing SQL injection", lambda: self.scan_sqli()),
            ("xss", "Testing XSS", lambda: self.scan_xss()),
            ("directories", "Enumerating directories", lambda: self.scan_directories()),
            ("ports", "Scanning ports", lambda: self.scan_ports()),
            ("open_redirect", "Testing for open redirects", lambda: self.scan_open_redirect()),
            ("ssrf", "Testing for SSRF", lambda: self.scan_ssrf()),
            ("ssti", "Testing for template injection", lambda: self.scan_ssti()),
            ("cors", "Advanced CORS testing", lambda: self.scan_cors_advanced()),
            ("subdomains", "Enumerating subdomains", lambda: self.scan_subdomains()),
        ]

        total = len(phases)
        resp = None
        for i, (phase_id, phase_msg, phase_fn) in enumerate(phases):
            if emit_progress:
                progress = json.dumps({"phase": phase_id, "step": i + 1, "total": total, "message": phase_msg})
                print(f"PROGRESS:{progress}", flush=True)

            if phase_id == "headers":
                resp = phase_fn()
            elif phase_id == "forms":
                self.scan_forms(resp.text if resp else None)
            else:
                phase_fn()

        if emit_progress:
            progress = json.dumps({"phase": "done", "step": total, "total": total, "message": "Scan complete"})
            print(f"PROGRESS:{progress}", flush=True)

        return self.generate_report()


def main():
    import argparse
    parser = argparse.ArgumentParser(description="TupiSec - Web Security Scanner")
    parser.add_argument("url", help="Target URL to scan")
    parser.add_argument("--full", action="store_true", help="Run full scan (default)")
    parser.add_argument("--output", "-o", help="Output report file", default=None)
    parser.add_argument("--quiet", "-q", action="store_true", help="Quiet mode")
    parser.add_argument("--json-stdout", action="store_true", help="Output JSON report to stdout")
    parser.add_argument("--progress", action="store_true", help="Emit progress lines to stdout")
    parser.add_argument("--cookies", help="Cookie header string (e.g. 'session=abc; token=xyz')")
    args = parser.parse_args()

    scanner = TupiSecScanner(args.url, verbose=not args.quiet, cookies=args.cookies)

    scanner.run_full_scan(emit_progress=args.progress)

    if args.json_stdout:
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
        sorted_findings = sorted(scanner.findings, key=lambda f: severity_order.get(f.severity, 5))
        counts = defaultdict(int)
        for f in scanner.findings:
            counts[f.severity] += 1
        report_data = {
            "target": scanner.target_url,
            "base_url": scanner.base_url,
            "scan_date": datetime.now().isoformat(),
            "summary": dict(counts),
            "tech_stack": scanner.tech_stack,
            "discovered_urls": list(scanner.discovered_urls),
            "findings": [f.to_dict() for f in sorted_findings],
            "dns_records": scanner.dns_records,
            "whois_info": scanner.whois_info,
            "cve_data": scanner.cve_data,
            "subdomains": getattr(scanner, "subdomains", []),
        }
        print(json.dumps(report_data))
    else:
        output = args.output
        if not output:
            domain = urllib.parse.urlparse(args.url).netloc.replace(":", "_")
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output = f"reports/{domain}_{timestamp}.txt"
        scanner.generate_report(output)


if __name__ == "__main__":
    main()
