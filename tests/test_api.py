import sys
from pathlib import Path
from unittest.mock import patch, MagicMock
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from fastapi.testclient import TestClient
import pytest
from main import app
from search.web_search_provider import SearchProviderNotConfiguredError

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "gmail_configured" in data

def test_dashboard_endpoint():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "system" in data
    assert data["system"]["email_mode"] == "SMTP"

def test_search_provider_not_configured():
    with patch("search.web_search_provider.WebBuyerSearchProvider.search") as mock_search:
        mock_search.side_effect = SearchProviderNotConfiguredError("A real search provider API key has not been configured.")
        search_payload = {
            "product": "Himalayan Sound Healing Bowls",
            "country": "United States",
            "buyer_type": "Distributor",
            "keywords": "sound healing, meditation",
            "limit": 5
        }
        response = client.post("/api/search", json=search_payload)
        assert response.status_code == 422
        data = response.json()
        assert data["detail"]["error"] == "SEARCH_PROVIDER_NOT_CONFIGURED"

def test_search_endpoint_success_mocked():
    mock_results = [
        {
            "id": "lead-101",
            "company_name": "Artisan Sound Importers",
            "contact_name": "Marcus Chen",
            "email": "marcus@artisansound.com",
            "phone": "+1 415 555 0192",
            "website": "https://artisansound.com",
            "country": "United States",
            "buyer_type": "Distributor",
            "source": "web_search",
            "source_url": "https://artisansound.com/about",
            "validation_status": "valid",
            "classification": "business",
            "priority": "High Priority",
            "discovered_at": "2026-09-03T18:00:00Z"
        }
    ]
    with patch("search.web_search_provider.WebBuyerSearchProvider.search") as mock_search:
        mock_search.return_value = mock_results
        search_payload = {
            "product": "Himalayan Sound Healing Bowls",
            "country": "United States",
            "buyer_type": "Distributor",
            "keywords": "sound healing, meditation",
            "limit": 5
        }
        response = client.post("/api/search", json=search_payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["count"] == 1
        assert data["results"][0]["company_name"] == "Artisan Sound Importers"

def test_leads_endpoint():
    response = client.get("/api/leads")
    assert response.status_code == 200
    data = response.json()
    assert "leads" in data

def test_classify_endpoints_mocked():
    import config
    import pandas as pd
    test_df = pd.DataFrame([{
        "id": "lead-101",
        "company_name": "Artisan Sound Importers",
        "buyer_name": "Marcus Chen",
        "email": "marcus@artisansound.com",
        "phone": "+1 415 555 0192",
        "website": "https://artisansound.com",
        "country": "United States",
        "buyer_type": "Distributor",
        "source_platform": "web_search",
        "source_url": "https://artisansound.com/about",
        "validation_status": "valid",
        "classification": "",
        "priority": "",
        "discovered_at": "2026-09-03T18:00:00Z",
        "valid": True,
        "reason": "Valid syntax",
        "email_status": "valid",
        "is_duplicate": False,
        "already_contacted": False,
        "confidence": 0.0
    }])
    test_df.to_csv(config.BUYERS_CSV, index=False)

    mock_gemini_resp = [
        {
            "email": "marcus@artisansound.com",
            "classification": "business",
            "confidence": 0.95,
            "priority": "High Priority",
            "reason": "Wholesale wellness distributor in the US"
        }
    ]
    with patch("classification.gemini_classifier.get_gemini_config") as mock_cfg, \
         patch("classification.gemini_classifier.LeadClassifier.classify_batch_with_gemini") as mock_gem:
        mock_cfg.return_value = ("test-api-key", "gemini-1.5-flash")
        mock_gem.return_value = mock_gemini_resp
        
        response = client.post("/api/classify")
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    response = client.get("/api/classification")
    assert response.status_code == 200
    data = response.json()
    assert "business_leads" in data
    assert "individual_leads" in data

def test_send_custom_recipient_mocked_smtp():
    with patch("outreach.gmail_sender.get_gmail_credentials") as mock_creds, \
         patch("outreach.gmail_sender.EmailSender._send_smtp_with_retry") as mock_smtp:
        mock_creds.return_value = ("test@gmail.com", "app-password")
        mock_smtp.return_value = (True, "SENT")

        payload = {
            "audience": "custom",
            "custom_email": "test.direct@soundhealinguk.com",
            "custom_buyer_name": "Direct Test Partner",
            "custom_company_name": "Sound Healing UK",
            "custom_country": "UK",
            "subject": "Direct Wholesale Inquiries for {{company_name}}",
            "body_template": "Hello {{contact_name}}, special export prices for {{country}}.",
            "attach_presentation": False
        }
        response = client.post("/api/send", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert data["results"]["audience"] == "custom"
        assert data["results"]["sent_count"] == 1

def test_reports_and_activity_endpoints():
    response = client.get("/api/activity")
    assert response.status_code == 200
    assert "logs" in response.json()

    response = client.get("/api/report")
    assert response.status_code == 200
    assert "metrics" in response.json()

    response = client.get("/api/report/download")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")

def test_settings_security_no_secret_leak():
    response = client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "GMAIL_APP_PASSWORD" not in str(data)
    assert "GMAIL_APP_PASSWORD" not in data.get("settings", {})
    assert "GEMINI_API_KEY" not in data.get("settings", {})
    assert "SEARCH_API_KEY" not in data.get("settings", {})
    assert "gmail_account_masked" in data

def test_test_smtp_connection_endpoint():
    with patch("smtplib.SMTP") as mock_smtp:
        mock_instance = mock_smtp.return_value
        response = client.post("/api/settings/test-smtp")
        # Returns 200 on success or 400 if credentials missing in env
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            assert response.json()["success"] is True

def test_catalog_endpoint():
    response = client.get("/api/catalog")
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"

def test_invalid_leads_endpoint():
    response = client.get("/api/leads/invalid")
    assert response.status_code == 200
    data = response.json()
    assert "invalid_leads" in data
    assert "total" in data

def test_test_gemini_connection_endpoint():
    with patch("google.generativeai.GenerativeModel") as mock_model:
        mock_instance = mock_model.return_value
        mock_instance.generate_content.return_value.text = "OK"
        response = client.post("/api/settings/test-gemini")
        assert response.status_code in [200, 400]
        if response.status_code == 200:
            assert response.json()["success"] is True

def test_test_search_connection_endpoint():
    response = client.post("/api/settings/test-search")
    assert response.status_code in [200, 400]
    if response.status_code == 200:
        assert response.json()["success"] is True

def test_sample_buyers_endpoint():
    response = client.get("/api/sample-buyers")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["is_demo"] is True
    assert len(data["buyers"]) > 0
    for b in data["buyers"]:
        assert b["is_demo"] is True

def test_demo_outreach_blocked():
    response = client.post("/api/send", json={
        "audience": "demo",
        "subject": "Test",
        "body": "Hello"
    })
    assert response.status_code == 422
    assert "DEMO_DATA_OUTREACH_BLOCKED" in str(response.json())

    response_custom_demo = client.post("/api/send", json={
        "audience": "custom",
        "custom_email": "test@partner-demo.com",
        "subject": "Test",
        "body": "Hello"
    })
    assert response_custom_demo.status_code == 422
    assert "DEMO_DATA_OUTREACH_BLOCKED" in str(response_custom_demo.json())

def test_lead_update_endpoint():
    response = client.post("/api/leads/update", json={
        "original_company": "Test Nonexistent Company",
        "company_name": "Acme Global Imports",
        "buyer_name": "Jane Doe",
        "email": "jane@acme-global-test.com",
        "website": "https://acme-global-test.com",
        "country": "Germany",
        "buyer_type": "Wholesaler"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["message"] == "Buyer information updated."

def test_lead_update_invalid_email():
    response = client.post("/api/leads/update", json={
        "company_name": "Acme",
        "buyer_name": "Jane",
        "email": "not-an-email",
        "country": "Germany"
    })
    assert response.status_code == 422

