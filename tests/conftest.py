import sys
from pathlib import Path
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

import config

AUTH_TEST_KEY = "test-auth-secret-key-12345"

@pytest.fixture(autouse=True)
def isolate_test_data(monkeypatch, tmp_path):
    """Ensure all automated tests run against temporary isolated data files and never modify production data."""
    monkeypatch.setenv("EXPORT_API_KEY", AUTH_TEST_KEY)
    test_data_dir = tmp_path / "data"
    test_data_dir.mkdir(parents=True, exist_ok=True)

    test_buyers = test_data_dir / "buyers.csv"
    test_biz = test_data_dir / "business_emails.csv"
    test_ind = test_data_dir / "individual_emails.csv"
    test_sent = test_data_dir / "sent_log.csv"

    headers = "id,company_name,buyer_name,email,phone,website,country,buyer_type,source_platform,source_url,validation_status,classification,priority,discovered_at,valid,reason,email_status,is_duplicate,already_contacted,confidence\n"
    test_buyers.write_text(headers, encoding="utf-8")
    test_biz.write_text(headers, encoding="utf-8")
    test_ind.write_text(headers, encoding="utf-8")

    sent_headers = "timestamp,buyer_name,company,email,classification,mode,status,error,campaign\n"
    test_sent.write_text(sent_headers, encoding="utf-8")

    monkeypatch.setattr(config, "DATA_DIR", test_data_dir)
    monkeypatch.setattr(config, "BUYERS_CSV", test_buyers)
    monkeypatch.setattr(config, "BUSINESS_EMAILS_CSV", test_biz)
    monkeypatch.setattr(config, "INDIVIDUAL_EMAILS_CSV", test_ind)
    monkeypatch.setattr(config, "SENT_LOG_CSV", test_sent)

    try:
        import main
        monkeypatch.setattr(main, "BUYERS_CSV", test_buyers)
        monkeypatch.setattr(main, "BUSINESS_EMAILS_CSV", test_biz)
        monkeypatch.setattr(main, "INDIVIDUAL_EMAILS_CSV", test_ind)
        monkeypatch.setattr(main, "SENT_LOG_CSV", test_sent)
    except Exception:
        pass

    try:
        import classification.gemini_classifier as gc
        monkeypatch.setattr(gc, "BUYERS_CSV", test_buyers)
        monkeypatch.setattr(gc, "BUSINESS_EMAILS_CSV", test_biz)
        monkeypatch.setattr(gc, "INDIVIDUAL_EMAILS_CSV", test_ind)
    except Exception:
        pass

    try:
        import reports.report_generator as rg
        monkeypatch.setattr(rg, "BUYERS_CSV", test_buyers)
        monkeypatch.setattr(rg, "BUSINESS_EMAILS_CSV", test_biz)
        monkeypatch.setattr(rg, "INDIVIDUAL_EMAILS_CSV", test_ind)
        monkeypatch.setattr(rg, "SENT_LOG_CSV", test_sent)
    except Exception:
        pass

    try:
        import outreach.gmail_sender as gs
        monkeypatch.setattr(gs, "BUYERS_CSV", test_buyers)
        monkeypatch.setattr(gs, "BUSINESS_EMAILS_CSV", test_biz)
        monkeypatch.setattr(gs, "INDIVIDUAL_EMAILS_CSV", test_ind)
    except Exception:
        pass

    try:
        import validation.email_validator as ev
        monkeypatch.setattr(ev, "SENT_LOG_CSV", test_sent)
    except Exception:
        pass

    try:
        import logging_module.activity_logger as al
        monkeypatch.setattr(al, "SENT_LOG_CSV", test_sent)
    except Exception:
        pass

    yield
