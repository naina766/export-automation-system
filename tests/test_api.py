import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

from fastapi.testclient import TestClient
import pytest
from main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "email_mode" in data

def test_dashboard_endpoint():
    response = client.get("/api/dashboard")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "system" in data

def test_load_demo_endpoint():
    response = client.post("/api/load-demo")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["stats"]["total_records"] > 0

def test_leads_endpoint():
    response = client.get("/api/leads")
    assert response.status_code == 200
    data = response.json()
    assert "leads" in data

def test_classify_endpoints():
    response = client.post("/api/classify")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "summary" in data

    response = client.get("/api/classification")
    assert response.status_code == 200
    data = response.json()
    assert "business_leads" in data
    assert "individual_leads" in data

def test_send_campaign_endpoint():
    payload = {
        "audience": "business",
        "subject": "Singing Bowls Wholesale Export Offer",
        "body_template": "Hello {{buyer_name}}, exploring partnership with {{company_name}} in {{country}}.",
        "attach_presentation": True
    }
    response = client.post("/api/send", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert data["results"]["mode"] in ["DEMO", "DEMO (FALLBACK)", "SMTP"]

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

def test_settings_endpoints():
    response = client.get("/api/settings")
    assert response.status_code == 200
    assert "settings" in response.json()

    update_payload = {
        "SEARCH_KEYWORD": "Himalayan Sound Healing Bowls",
        "EMAIL_MODE": "demo",
        "SEND_DELAY": 1,
        "MAX_EMAILS_PER_RUN": 25
    }
    response = client.post("/api/settings", json=update_payload)
    assert response.status_code == 200
    assert response.json()["success"] is True
