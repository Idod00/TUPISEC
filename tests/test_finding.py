"""Tests for the Finding class."""
from scanner import Finding


class TestFinding:
    def test_init_stores_attributes(self):
        f = Finding("CRITICAL", "XSS", "Reflected XSS", "Found in param q", "Sanitize input")
        assert f.severity == "CRITICAL"
        assert f.category == "XSS"
        assert f.title == "Reflected XSS"
        assert f.detail == "Found in param q"
        assert f.recommendation == "Sanitize input"

    def test_init_default_recommendation(self):
        f = Finding("INFO", "Tech", "Server header", "nginx/1.25")
        assert f.recommendation == ""

    def test_timestamp_is_set(self):
        f = Finding("LOW", "Info", "Test", "Detail")
        assert f.timestamp is not None
        assert "T" in f.timestamp  # ISO format

    def test_to_dict_keys(self):
        f = Finding("HIGH", "CSRF", "No token", "Form #1", "Add CSRF token")
        d = f.to_dict()
        assert set(d.keys()) == {"severity", "category", "title", "detail", "recommendation", "timestamp"}

    def test_to_dict_values(self):
        f = Finding("MEDIUM", "Headers", "Missing CSP", "No CSP header")
        d = f.to_dict()
        assert d["severity"] == "MEDIUM"
        assert d["category"] == "Headers"
        assert d["title"] == "Missing CSP"

    def test_str_contains_severity_and_title(self):
        f = Finding("CRITICAL", "SQLi", "Injection found", "Details here")
        s = str(f)
        assert "CRITICAL" in s
        assert "Injection found" in s
