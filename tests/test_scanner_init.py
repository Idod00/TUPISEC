"""Tests for TupiSecScanner initialization and utility methods."""
from scanner import TupiSecScanner


class TestScannerInit:
    def test_target_url_trailing_slash_stripped(self):
        s = TupiSecScanner("https://example.com/", verbose=False)
        assert s.target_url == "https://example.com"

    def test_base_url_extracted(self):
        s = TupiSecScanner("https://example.com/path/page", verbose=False)
        assert s.base_url == "https://example.com"

    def test_parsed_url_scheme(self):
        s = TupiSecScanner("https://example.com", verbose=False)
        assert s.parsed.scheme == "https"

    def test_parsed_url_hostname(self):
        s = TupiSecScanner("https://example.com:8443/path", verbose=False)
        assert s.parsed.hostname == "example.com"

    def test_findings_starts_empty(self):
        s = TupiSecScanner("https://example.com", verbose=False)
        assert s.findings == []

    def test_cookies_parsed(self):
        s = TupiSecScanner("https://example.com", verbose=False, cookies="session=abc123; csrf=xyz")
        assert s.session.cookies.get("session") == "abc123"
        assert s.session.cookies.get("csrf") == "xyz"

    def test_add_finding_appends(self):
        s = TupiSecScanner("https://example.com", verbose=False)
        s.add_finding("HIGH", "Test", "Title", "Detail", "Fix it")
        assert len(s.findings) == 1
        assert s.findings[0].severity == "HIGH"


class TestApexDomain:
    def test_simple_domain(self):
        s = TupiSecScanner("https://example.com", verbose=False)
        assert s._get_apex_domain("www.example.com") == "example.com"

    def test_ccsld_com_py(self):
        s = TupiSecScanner("https://example.com", verbose=False)
        assert s._get_apex_domain("www.tupisa.com.py") == "tupisa.com.py"

    def test_ccsld_co_uk(self):
        s = TupiSecScanner("https://example.com", verbose=False)
        assert s._get_apex_domain("app.example.co.uk") == "example.co.uk"

    def test_ccsld_com_ar(self):
        s = TupiSecScanner("https://example.com", verbose=False)
        assert s._get_apex_domain("sub.domain.com.ar") == "domain.com.ar"

    def test_bare_domain(self):
        s = TupiSecScanner("https://example.com", verbose=False)
        assert s._get_apex_domain("example.com") == "example.com"
