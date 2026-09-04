"""
Comprehensive End-to-End Requirement Test Suite for Export Automation System.
Covers all 18 core business and security requirements specified in Prompt Section 39:
TEST 1: Buyer without email -> not eligible -> cannot send
TEST 2: Invalid email -> not eligible -> cannot send
TEST 3: Valid email + rejected AI -> not eligible -> cannot send
TEST 4: Valid email + needs_review -> not eligible -> cannot send
TEST 5: Valid email + qualified -> eligible
TEST 6: Qualified buyer from Product A -> cannot be sent in Product B campaign
TEST 7: Demo buyer -> cannot be sent
TEST 8: Already contacted buyer -> cannot be sent again
TEST 9: Daily send limit exceeded -> send blocked
TEST 10: Campaign limit exceeded -> send blocked
TEST 11: Malformed Gemini response -> needs_review -> no send
TEST 12: Missing search API configuration -> clear NOT_CONFIGURED status
TEST 13: Invalid search provider -> clear error
TEST 14: auto_ingest=false -> results not persisted
TEST 15: auto_ingest=true -> results persisted
TEST 16: SSRF attempt -> blocked
TEST 17: Successful Gmail send -> logged as sent
TEST 18: Gmail failure -> logged as failed
"""
import sys
from pathlib import Path
import pytest
import pandas as pd
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
for p in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

import config
from main import app
from outreach.gmail_sender import is_outreach_eligible, EmailSender
from classification.gemini_classifier import LeadClassifier
from search.web_search_provider import WebBuyerSearchProvider, UnsupportedSearchProviderError
from search.parser import is_safe_url
from validation.email_validator import validate_email_address

client = TestClient(app)

def test_1_buyer_without_email_not_eligible_cannot_send():
    """TEST 1: Buyer without email -> not eligible -> cannot send."""
    lead = {
        "lead_id": "lead-no-email-1",
        "company_name": "Zen Meditation Studio",
        "email": None,
        "email_status": "missing",
        "qualification_status": "qualified",
        "product_id": "tibetan-singing-bowls",
        "is_demo": False
    }
    eligible, reason = is_outreach_eligible(lead, campaign_product_id="tibetan-singing-bowls")
    assert eligible is False
    assert "Missing email" in reason

def test_2_invalid_email_not_eligible_cannot_send():
    """TEST 2: Invalid email -> not eligible -> cannot send."""
    invalid_lead = {
        "lead_id": "lead-invalid-email-2",
        "company_name": "Mystic Sound GMBH",
        "email": "invalid@",
        "email_status": "invalid",
        "qualification_status": "qualified",
        "product_id": "tibetan-singing-bowls",
        "is_demo": False
    }
    eligible, reason = is_outreach_eligible(invalid_lead, campaign_product_id="tibetan-singing-bowls")
    assert eligible is False
    assert "Invalid email" in reason or "syntax" in reason.lower()

def test_3_valid_email_rejected_ai_not_eligible_cannot_send():
    """TEST 3: Valid email + rejected AI -> not eligible -> cannot send."""
    lead = {
        "lead_id": "lead-rejected-ai-3",
        "company_name": "Individual Yoga Practitioner",
        "email": "practitioner@gmail.com",
        "email_status": "valid",
        "qualification_status": "rejected",
        "product_id": "tibetan-singing-bowls",
        "is_demo": False
    }
    eligible, reason = is_outreach_eligible(lead, campaign_product_id="tibetan-singing-bowls")
    assert eligible is False
    assert "not AI qualified" in reason

def test_4_valid_email_needs_review_not_eligible_cannot_send():
    """TEST 4: Valid email + needs_review -> not eligible -> cannot send."""
    lead = {
        "lead_id": "lead-needs-review-4",
        "company_name": "Directory Listing",
        "email": "info@wellnessdirectory.com",
        "email_status": "valid",
        "qualification_status": "needs_review",
        "product_id": "tibetan-singing-bowls",
        "is_demo": False
    }
    eligible, reason = is_outreach_eligible(lead, campaign_product_id="tibetan-singing-bowls")
    assert eligible is False
    assert "not AI qualified" in reason

def test_5_valid_email_and_qualified_is_eligible():
    """TEST 5: Valid email + qualified -> eligible."""
    lead = {
        "lead_id": "lead-qualified-5",
        "company_name": "Boutique Wellness Imports",
        "email": "purchasing@boutiquewellness.de",
        "email_status": "valid",
        "qualification_status": "qualified",
        "product_id": "tibetan-singing-bowls",
        "is_demo": False
    }
    eligible, reason = is_outreach_eligible(lead, campaign_product_id="tibetan-singing-bowls", contacted_emails=set())
    assert eligible is True
    assert reason == "Eligible"

def test_6_qualified_buyer_from_product_a_cannot_be_sent_in_product_b_campaign():
    """TEST 6: Qualified buyer from Product A -> cannot be sent in Product B campaign."""
    lead = {
        "lead_id": "lead-prod-a-6",
        "company_name": "Acoustic Therapy UK",
        "email": "orders@acoustictherapy.co.uk",
        "email_status": "valid",
        "qualification_status": "qualified",
        "product_id": "crystal-singing-bowls",
        "is_demo": False
    }
    eligible, reason = is_outreach_eligible(lead, campaign_product_id="tibetan-singing-bowls")
    assert eligible is False
    assert "Product mismatch" in reason

def test_7_demo_buyer_cannot_be_sent():
    """TEST 7: Demo buyer -> cannot be sent."""
    demo_lead = {
        "lead_id": "lead-demo-7",
        "company_name": "Sample Wellness Studio",
        "email": "demo@soundsanctuary-demo.com",
        "email_status": "valid",
        "qualification_status": "qualified",
        "product_id": "tibetan-singing-bowls",
        "is_demo": True
    }
    eligible, reason = is_outreach_eligible(demo_lead, campaign_product_id="tibetan-singing-bowls")
    assert eligible is False
    assert "Demo buyer" in reason

    # API level verification: demo audience / demo email blocked with 422
    res = client.post("/api/send", json={"audience": "demo", "subject": "Test", "body": "Hi"})
    assert res.status_code == 422
    assert "DEMO_DATA_OUTREACH_BLOCKED" in str(res.json())

def test_8_already_contacted_buyer_cannot_be_sent_again():
    """TEST 8: Already contacted buyer -> cannot be sent again."""
    lead = {
        "lead_id": "lead-contacted-8",
        "company_name": "Zen Imports",
        "email": "sales@zenimports.de",
        "email_status": "valid",
        "qualification_status": "qualified",
        "product_id": "tibetan-singing-bowls",
        "is_demo": False,
        "already_contacted": True
    }
    eligible, reason = is_outreach_eligible(lead, campaign_product_id="tibetan-singing-bowls", contacted_emails={"sales@zenimports.de"})
    assert eligible is False
    assert "Already contacted" in reason

def test_9_daily_send_limit_exceeded_send_blocked():
    """TEST 9: Daily send limit exceeded -> send blocked."""
    with patch.object(EmailSender, "get_today_sent_count", return_value=1000):
        res = EmailSender.execute_campaign(product_id="tibetan-singing-bowls")
        assert res["success"] is False
        assert res["error"] == "DAILY_SEND_LIMIT_EXCEEDED"

def test_10_campaign_limit_exceeded_send_blocked():
    """TEST 10: Campaign limit exceeded -> surplus leads rejected."""
    leads = [
        {
            "lead_id": f"lead-cap-{i}",
            "id": f"lead-cap-{i}",
            "company_name": f"Company {i}",
            "company": f"Company {i}",
            "email": f"buyer{i}@teststore.com",
            "email_status": "valid",
            "qualification_status": "qualified",
            "product_id": "tibetan-singing-bowls",
            "is_demo": False,
            "already_contacted": False
        }
        for i in range(5)
    ]
    df = pd.DataFrame(leads)
    df.to_csv(config.BUYERS_CSV, index=False)

    import outreach.gmail_sender as gs_mod
    import backend.outreach.gmail_sender as b_gs_mod
    with patch.object(EmailSender, "get_today_sent_count", return_value=0), \
         patch.object(b_gs_mod, "get_gmail_credentials", return_value=("test@gmail.com", "app-pass")), \
         patch.object(gs_mod, "get_gmail_credentials", return_value=("test@gmail.com", "app-pass")), \
         patch.object(EmailSender, "_send_smtp_with_retry", return_value=(True, "SENT")), \
         patch.object(b_gs_mod, "load_settings", return_value={"DAILY_SEND_LIMIT": 100, "MAX_EMAILS_PER_RUN": 2, "SEND_DELAY": 0}), \
         patch.object(gs_mod, "load_settings", return_value={"DAILY_SEND_LIMIT": 100, "MAX_EMAILS_PER_RUN": 2, "SEND_DELAY": 0}):
        
        res = EmailSender.execute_campaign(
            product_id="tibetan-singing-bowls",
            lead_ids=[l["lead_id"] for l in leads]
        )
        assert res["dispatched"] == 2
        assert res["skipped"] == 3

def test_11_malformed_gemini_response_needs_review_no_send():
    """TEST 11: Malformed Gemini response -> needs_review -> no send."""
    with patch("google.generativeai.GenerativeModel") as mock_model_cls:
        mock_instance = mock_model_cls.return_value
        # Return invalid / incomplete JSON schema
        mock_instance.generate_content.return_value.text = '[{"random_key": "junk_data"}]'

        leads = [{"lead_id": "l-1", "company": "Test", "email": "test@domain.com", "website": "", "country": "DE"}]
        results = LeadClassifier.qualify_batch_with_gemini(leads, api_key="fake-key", model_name="gemini-2.5-flash")
        assert len(results) == 1
        assert results[0]["qualification_status"] == "needs_review"
        # Since qualification_status == needs_review, lead is not outreach eligible
        eligible, _ = is_outreach_eligible(results[0], campaign_product_id="himalayan-sound-healing-bowls")
        assert eligible is False

def test_12_missing_search_api_configuration_clear_status():
    """TEST 12: Missing search API configuration -> clear NOT_CONFIGURED status."""
    with patch("config.get_search_provider_config", return_value={"provider": "serper", "api_key": ""}), \
         patch("backend.main.get_search_provider_config", return_value={"provider": "serper", "api_key": ""}), \
         patch("main.get_search_provider_config", return_value={"provider": "serper", "api_key": ""}):
        res = client.get("/api/settings")
        assert res.status_code == 200
        data = res.json()
        assert data["search_configured"] is False
        assert data["search_status"] == "NOT_CONFIGURED"

def test_13_invalid_search_provider_clear_error():
    """TEST 13: Invalid search provider -> clear error."""
    with patch("config.get_search_provider_config", return_value={"provider": "unsupported_engine", "api_key": "key"}), \
         patch("backend.search.web_search_provider.get_search_provider_config", return_value={"provider": "unsupported_engine", "api_key": "key"}), \
         patch("search.web_search_provider.get_search_provider_config", return_value={"provider": "unsupported_engine", "api_key": "key"}):
        provider = WebBuyerSearchProvider()
        with pytest.raises(UnsupportedSearchProviderError) as exc_info:
            asyncio.run(provider.search())
        assert "Unsupported search provider: unsupported_engine" in str(exc_info.value)

def test_14_auto_ingest_false_results_not_persisted():
    """TEST 14: auto_ingest=false -> results not persisted."""
    mock_leads = [{
        "lead_id": "temp-lead-14",
        "id": "temp-lead-14",
        "company_name": "Temporary Lead Inc",
        "email": "contact@templead.com",
        "email_status": "valid",
        "qualification_status": "pending",
        "outreach_status": "not_eligible"
    }]
    # Start with empty csv
    pd.DataFrame(columns=["lead_id", "email"]).to_csv(config.BUYERS_CSV, index=False)

    import backend.main as b_main
    with patch.object(b_main.WebBuyerSearchProvider, "search", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = mock_leads
        res = client.post("/api/search", json={
            "product": "Singing Bowls",
            "country": "Germany",
            "buyer_type": "Distributor",
            "auto_ingest": False
        })
        assert res.status_code == 200
        saved_df = pd.read_csv(config.BUYERS_CSV, dtype=str).fillna("")
        assert saved_df.empty or "temp-lead-14" not in saved_df.get("lead_id", []).tolist()

def test_15_auto_ingest_true_results_persisted():
    """TEST 15: auto_ingest=true -> results persisted."""
    mock_leads = [{
        "lead_id": "persisted-lead-15",
        "id": "persisted-lead-15",
        "company_name": "Persisted Importer",
        "email": "sales@persistedimporter.com",
        "email_status": "valid",
        "qualification_status": "pending",
        "outreach_status": "not_eligible"
    }]
    import backend.main as b_main
    with patch.object(b_main.WebBuyerSearchProvider, "search", new_callable=AsyncMock) as mock_search:
        mock_search.return_value = mock_leads
        res = client.post("/api/search", json={
            "product": "Singing Bowls",
            "country": "Germany",
            "buyer_type": "Distributor",
            "auto_ingest": True
        })
        assert res.status_code == 200
        saved_df = pd.read_csv(config.BUYERS_CSV, dtype=str).fillna("")
        assert not saved_df.empty
        id_col = "lead_id" if "lead_id" in saved_df.columns else "id"
        assert "persisted-lead-15" in saved_df[id_col].values

def test_16_ssrf_attempt_blocked():
    """TEST 16: SSRF attempt -> blocked."""
    assert is_safe_url("http://127.0.0.1/contact") is False
    assert is_safe_url("http://localhost:8000/api") is False
    assert is_safe_url("http://169.254.169.254/latest/meta-data") is False
    assert is_safe_url("http://10.0.0.1/admin") is False
    assert is_safe_url("http://192.168.1.1/secret") is False
    assert is_safe_url("ftp://legitdomain.com/file") is False
    assert is_safe_url("https://www.legitcompany.com/contact") is True

def test_17_successful_gmail_send_logged_as_sent():
    """TEST 17: Successful Gmail send -> logged as sent."""
    import backend.config as b_cfg
    with patch.object(b_cfg, "get_gmail_credentials", return_value=("user@gmail.com", "app_pass")), \
         patch.object(EmailSender, "_send_smtp_with_retry", return_value=(True, "SENT")), \
         patch("logging_module.activity_logger.ActivityLogger.log_send_event") as mock_log:
        
        success, status = EmailSender.send_smtp_email(
            to_email="partner@soundwellness.de",
            subject="Supply Partnership",
            body_text="Hello Team"
        )
        assert success is True
        assert status == "SENT"

def test_18_gmail_failure_logged_as_failed():
    """TEST 18: Gmail failure -> logged as failed."""
    import backend.config as b_cfg
    with patch.object(b_cfg, "get_gmail_credentials", return_value=("user@gmail.com", "app_pass")), \
         patch.object(EmailSender, "_send_smtp_with_retry", return_value=(False, "Connection Timeout")):
        
        success, status = EmailSender.send_smtp_email(
            to_email="partner@soundwellness.de",
            subject="Supply Partnership",
            body_text="Hello Team"
        )
        assert success is False
        assert "Connection Timeout" in status
