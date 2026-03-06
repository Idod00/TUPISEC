"""Tests for scanner constants and payload lists."""
from scanner import SQL_PAYLOADS, XSS_PAYLOADS, SECURITY_HEADERS, COMMON_PATHS


class TestPayloads:
    def test_sql_payloads_not_empty(self):
        assert len(SQL_PAYLOADS) >= 5

    def test_sql_payloads_are_strings(self):
        for p in SQL_PAYLOADS:
            assert isinstance(p, str)
            assert len(p) > 0

    def test_sql_payloads_contain_injection_chars(self):
        """All SQL payloads should contain at least one SQL-relevant character."""
        sql_chars = {"'", '"', "-", ";", "#", "/", "="}
        for p in SQL_PAYLOADS:
            assert any(c in p for c in sql_chars), f"Payload missing SQL chars: {p}"

    def test_xss_payloads_not_empty(self):
        assert len(XSS_PAYLOADS) >= 3

    def test_xss_payloads_contain_html_or_js(self):
        for p in XSS_PAYLOADS:
            assert "<" in p or "javascript:" in p, f"XSS payload missing markers: {p}"

    def test_security_headers_includes_critical(self):
        assert "Content-Security-Policy" in SECURITY_HEADERS
        assert "Strict-Transport-Security" in SECURITY_HEADERS
        assert "X-Frame-Options" in SECURITY_HEADERS

    def test_common_paths_not_empty(self):
        assert len(COMMON_PATHS) >= 30

    def test_common_paths_include_sensitive(self):
        assert ".env" in COMMON_PATHS
        assert ".git/" in COMMON_PATHS
        assert "robots.txt" in COMMON_PATHS
