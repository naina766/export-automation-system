"""
Unit Tests for Live Buyer Discovery Engine.
Verifies query construction, search parsing, normalizer contracts, duplicate suppression,
unconfigured search error handling, search failure handling, and Gmail retry/dedup.
"""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
for p in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import pytest
import asyncio
import smtplib
from unittest.mock import AsyncMock, patch, MagicMock
from email.mime.multipart import MIMEMultipart
from search.web_search_provider import (
    WebBuyerSearchProvider,
    SearchProviderNotConfiguredError,
    SearchProviderAPIError
)
from search.parser import clean_company_name, parse_search_item
from search.normalizer import normalize_lead, normalize_lead_batch
from outreach.gmail_sender import EmailSender

def test_query_construction_with_parameters():
    provider = WebBuyerSearchProvider()
    query = provider.build_search_query(
        product="Himalayan Singing Bowls",
        country="United States",
        buyer_type="Distributor",
        keywords=["sound healing", "wellness"]
    )
    assert "Himalayan Singing Bowls" in query
    assert "United States" in query
    assert "Distributor" in query
    assert "sound healing" in query
    assert "wellness" in query

def test_query_construction_with_string_keywords():
    provider = WebBuyerSearchProvider()
    query = provider.build_search_query(
        product="Singing Bowls",
        country="Germany",
        buyer_type="Wholesale Importer",
        keywords="meditation yoga studios"
    )
    assert "Singing Bowls" in query
    assert "Germany" in query
    assert "Wholesale Importer" in query
    assert "meditation yoga studios" in query

def test_clean_company_name():
    assert clean_company_name("Sound Healing LLC - Official Wholesale Store", "soundhealing.com") == "Sound Healing LLC"
    assert clean_company_name("Welcome to Bodhi Singing Bowls | Shop Online", "bodhibowls.com") == "Bodhi Singing Bowls"

def test_parse_search_item_extracts_domain_and_country():
    item = {
        "title": "Zen Acoustics Inc | Sound Therapy",
        "link": "https://www.zenacoustics.com/wholesale",
        "snippet": "Premium meditation bowls and gongs imported for therapy studios across the United States. Contact wholesale@zenacoustics.com."
    }
    parsed = parse_search_item(item, query_country="United States", query_buyer_type="Distributor")
    assert parsed["company_name"] == "Zen Acoustics Inc"
    assert parsed["website"] == "https://zenacoustics.com"
    assert parsed["country"] == "United States"
    assert parsed["buyer_type"] == "Distributor"
    assert parsed["email"] == "wholesale@zenacoustics.com"
    assert parsed["source_url"] == "https://www.zenacoustics.com/wholesale"

def test_normalize_lead_never_fabricates_missing_emails():
    # Item without email in snippet
    parsed = {
        "company_name": "Alpine Meditations",
        "website": "https://alpinemeditations.ch",
        "country": "Switzerland",
        "buyer_type": "Distributor",
        "email": "",
        "source_url": "https://alpinemeditations.ch/contact"
    }
    norm = normalize_lead(parsed, provider_source="google_cse")
    assert norm["email"] is None
    assert norm["email_status"] == "missing"
    assert norm["valid"] is False
    assert norm["company"] == "Alpine Meditations"
    assert norm["source"] == "google_cse"
    assert norm["qualification_status"] == "pending"

def test_normalize_lead_batch_removes_duplicate_domains():
    items = [
        {"company_name": "Zen 1", "website": "https://zen.com/1", "email": "a@zen.com", "source_url": "https://zen.com/1"},
        {"company_name": "Zen 2", "website": "https://zen.com/1", "email": "b@zen.com", "source_url": "https://zen.com/2"},
        {"company_name": "Lotus", "website": "https://lotus.com", "email": "c@lotus.com", "source_url": "https://lotus.com"}
    ]
    batch = normalize_lead_batch(items, provider_source="google_cse")
    assert len(batch) == 2
    domains = [b["website"] for b in batch]
    assert "https://zen.com/1" in domains
    assert "https://lotus.com" in domains

def test_unconfigured_search_raises_specific_error():
    with patch("search.web_search_provider.get_search_provider_config", return_value={"provider": "google_cse", "api_key": "", "engine_id": ""}):
        provider = WebBuyerSearchProvider()
        assert provider.is_configured() is False
        with pytest.raises(SearchProviderNotConfiguredError) as exc_info:
            asyncio.run(provider.search())
        assert "Search provider is not configured. Add SEARCH_API_KEY and SEARCH_ENGINE_ID in the backend environment." in str(exc_info.value)

def test_unconfigured_serper_raises_specific_error():
    with patch("search.web_search_provider.get_search_provider_config", return_value={"provider": "serper", "api_key": "", "engine_id": ""}):
        provider = WebBuyerSearchProvider()
        assert provider.is_configured() is False
        with pytest.raises(SearchProviderNotConfiguredError) as exc_info:
            asyncio.run(provider.search())
        assert "Search provider 'serper' is not configured. Add a valid SEARCH_API_KEY in the backend environment." in str(exc_info.value)

def test_placeholder_key_detected_as_unconfigured():
    with patch("search.web_search_provider.get_search_provider_config", return_value={"provider": "serper", "api_key": "your_search_api_key_here", "engine_id": ""}):
        provider = WebBuyerSearchProvider()
        assert provider.is_configured() is False

def test_valid_search_request_with_mocked_serper_api():
    mock_items = [
        {
            "title": "Zen Imports LLC - Singing Bowls",
            "link": "https://zenimports.com",
            "snippet": "Wholesale singing bowls for meditation studios. Contact: contact@zenimports.com"
        }
    ]
    with patch("search.web_search_provider.get_search_provider_config", return_value={"provider": "serper", "api_key": "real_serper_key", "engine_id": ""}):
        provider = WebBuyerSearchProvider()
        assert provider.is_configured() is True
        with patch.object(provider, "_search_serper", new_callable=AsyncMock) as mock_search:
            mock_search.return_value = mock_items
            results = asyncio.run(provider.search(product="Tibetan Singing Bowls", country="United States", buyer_type="Wholesaler"))
            assert len(results) == 1
            lead = results[0]
            assert lead["company"] == "Zen Imports LLC"
            assert lead["email"] == "contact@zenimports.com"
            assert lead["source"] == "web_search"

def test_valid_search_request_with_mocked_cse_api():
    mock_items = [
        {
            "title": "Himalayan Sound Co - Wholesale",
            "link": "https://himalayansound.com",
            "snippet": "Distributor of singing bowls in California. Inquiries: sales@himalayansound.com"
        }
    ]
    with patch("search.web_search_provider.get_search_provider_config", return_value={"provider": "google_cse", "api_key": "test_key", "engine_id": "test_cx"}):
        provider = WebBuyerSearchProvider()
        with patch.object(provider, "_search_google_cse", new_callable=AsyncMock) as mock_search:
            mock_search.return_value = mock_items
            results = asyncio.run(provider.search(product="Singing Bowls", country="United States", buyer_type="Distributor"))
            assert len(results) == 1
            lead = results[0]
            assert lead["company"] == "Himalayan Sound Co"
            assert lead["email"] == "sales@himalayansound.com"
            assert lead["email_status"] == "valid"

def test_search_api_failure_raises_search_provider_api_error():
    with patch("search.web_search_provider.get_search_provider_config", return_value={"provider": "google_cse", "api_key": "test_key", "engine_id": "test_cx"}):
        provider = WebBuyerSearchProvider()
        with patch.object(provider, "_search_google_cse", new_callable=AsyncMock) as mock_search:
            mock_search.side_effect = Exception("500 Internal Server Error from Google")
            with pytest.raises(SearchProviderAPIError) as exc_info:
                asyncio.run(provider.search())
            assert "Failed to query live search provider" in str(exc_info.value)

def test_gmail_retry_mechanism_retries_transient_error():
    msg = MIMEMultipart()
    with patch("smtplib.SMTP") as mock_smtp_cls:
        # First attempt raises transient SMTPServerDisconnected, second attempt succeeds
        mock_server_1 = MagicMock()
        mock_server_1.send_message.side_effect = smtplib.SMTPServerDisconnected("Connection lost")
        
        mock_server_2 = MagicMock()
        mock_server_2.send_message.return_value = {}

        mock_smtp_cls.side_effect = [mock_server_1, mock_server_2]

        with patch("time.sleep", return_value=None):
            success, status = EmailSender._send_smtp_with_retry(
                smtp_host="smtp.gmail.com",
                smtp_port=587,
                smtp_user="test@gmail.com",
                smtp_pass="app_password",
                msg=msg,
                max_retries=2
            )
            assert success is True
            assert status == "SENT"
            assert mock_smtp_cls.call_count == 2

def test_discovery_pipeline_summary_and_valid_buyer_filtering():
    from fastapi.testclient import TestClient
    from main import app
    client = TestClient(app)

    mock_leads = [
        {
            "lead_id": "lead-1",
            "company_name": "Valid Sound Buyer",
            "company": "Valid Sound Buyer",
            "email": "buyer@validsound.com",
            "email_status": "valid",
            "syntax_valid": True,
            "is_duplicate": False,
            "qualification_status": "qualified",
            "outreach_status": "eligible"
        },
        {
            "lead_id": "lead-2",
            "company_name": "No Email Studio",
            "company": "No Email Studio",
            "email": None,
            "email_status": "missing",
            "syntax_valid": False,
            "is_duplicate": False,
            "qualification_status": "needs_review",
            "outreach_status": "not_eligible"
        },
        {
            "lead_id": "lead-3",
            "company_name": "Malformed Email Co",
            "company": "Malformed Email Co",
            "email": "invalid@@co",
            "email_status": "invalid",
            "syntax_valid": False,
            "is_duplicate": False,
            "qualification_status": "needs_review",
            "outreach_status": "not_eligible"
        },
        {
            "lead_id": "lead-4",
            "company_name": "Duplicate Lead",
            "company": "Duplicate Lead",
            "email": "buyer@validsound.com",
            "email_status": "valid",
            "syntax_valid": True,
            "is_duplicate": True,
            "qualification_status": "needs_review",
            "outreach_status": "not_eligible"
        }
    ]

    with patch("search.web_search_provider.WebBuyerSearchProvider.search", return_value=mock_leads):
        res = client.post("/api/discovery", json={"product": "Singing Bowls", "limit": 10, "auto_ingest": False})
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        summary = data["pipeline_summary"]
        assert summary["total_discovered"] == 4
        assert summary["valid_emails"] == 1
        assert summary["missing_emails"] == 1
        assert summary["invalid_emails"] == 1
        assert summary["duplicates"] == 1
        assert len(data["valid_buyers"]) == 1
        assert data["valid_buyers"][0]["company_name"] == "Valid Sound Buyer"
        assert len(data["excluded_buyers"]) == 3

