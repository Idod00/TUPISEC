"""Shared fixtures for scanner tests."""
import sys
import os

# Add project root to path so we can import scanner
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from scanner import Finding, TupiSecScanner, SECURITY_HEADERS, SQL_PAYLOADS, XSS_PAYLOADS, COMMON_PATHS
import pytest


@pytest.fixture
def sample_finding():
    """Create a sample Finding for testing."""
    return Finding(
        severity="HIGH",
        category="SQL Injection",
        title="Possible SQLi in field 'username'",
        detail="Payload: ' OR '1'='1",
        recommendation="Use parameterized queries.",
    )


@pytest.fixture
def scanner():
    """Create a TupiSecScanner instance without making network calls."""
    return TupiSecScanner("https://example.com", verbose=False)
