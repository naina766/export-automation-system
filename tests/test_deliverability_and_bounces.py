"""
Comprehensive deliverability, bounce handling, and email validation test suite.
Covers the 14 mandatory test requirements:
- TEST 1: Valid email syntax passes.
- TEST 2: Malformed email fails.
- TEST 3: SMTP accepts recipient -> status SMTP_ACCEPTED.
- TEST 4: SMTP immediately rejects recipient -> FAILED/BOUNCED.
- TEST 5: 550 user unknown is handled.
- TEST 6: 553 mailbox unavailable/address rejected is handled.
- TEST 7: Known bounced email cannot be selected for another campaign.
- TEST 8: Editing bounced email resets delivery state.
- TEST 9: Real campaign uses actual contact name.
- TEST 10: Test User only appears in test mode.
- TEST 11: PDF attachment exists in MIME message.
- TEST 12: Missing PDF blocks send.
- TEST 13: Demo outreach remains blocked.
- TEST 14: Product isolation remains intact.
"""

import os
import smtplib
from pathlib import Path
from unittest.mock import patch, MagicMock
import pytest
import pandas as pd

from backend.validation.email_validator import EmailValidator, validate_email_address
from backend.outreach.gmail_sender import EmailSender, is_outreach_eligible
from backend.outreach.attachment_handler import AttachmentHandler
from backend.products.catalog import ProductCatalog
from backend.leads.lead_service import LeadService
import backend.config as config


def test_req_1_valid_email_syntax_passes():
    """TEST 1: Valid email syntax passes."""
    res = validate_email_address("procurement@soundtopia.com")
    assert res["valid"] is True
    assert res["syntax_valid"] is True
    assert res["deliverability_status"] == "DELIVERABILITY_UNKNOWN"
    assert "Syntax valid" in res["deliverability_note"]


def test_req_2_malformed_email_fails():
    """TEST 2: Malformed email fails syntax validation."""
    res_bad1 = validate_email_address("invalid-email-at-domain.com")
    assert res_bad1["valid"] is False
    assert res_bad1["syntax_valid"] is False

    res_bad2 = validate_email_address("user@")
    assert res_bad2["valid"] is False
    assert res_bad2["syntax_valid"] is False

    res_bad3 = validate_email_address("@domain.com")
    assert res_bad3["valid"] is False
    assert res_bad3["syntax_valid"] is False


def test_req_3_smtp_accepts_recipient_gives_smtp_accepted():
    """TEST 3: SMTP accepts recipient -> status SMTP_ACCEPTED, delivery unconfirmed."""
    with patch("backend.outreach.gmail_sender.load_settings") as mock_settings, \
         patch("smtplib.SMTP") as mock_smtp:
        mock_settings.return_value = {
            "GMAIL_SENDER_EMAIL": "test@gmail.com",
            "GMAIL_APP_PASSWORD": "valid_app_password"
        }
        smtp_instance = MagicMock()
        smtp_instance.send_message.return_value = {}
        mock_smtp.return_value = smtp_instance

        res = EmailSender.send_smtp_email(
            to_email="buyer@partner.com",
            subject="Test Inquiry",
            body_text="Hello Partner",
            require_attachment=False
        )

        assert res.success is True
        assert res.delivery_status == "SMTP_ACCEPTED"
        assert "not guaranteed" in res.delivery_note.lower() or "recipient delivery not yet confirmed" in res.delivery_note.lower()


def test_req_4_smtp_immediately_rejects_recipient():
    """TEST 4: SMTP immediately rejects recipient -> FAILED / BOUNCED."""
    with patch("backend.outreach.gmail_sender.load_settings") as mock_settings, \
         patch("smtplib.SMTP") as mock_smtp:
        mock_settings.return_value = {
            "GMAIL_SENDER_EMAIL": "test@gmail.com",
            "GMAIL_APP_PASSWORD": "valid_app_password"
        }
        smtp_instance = MagicMock()
        smtp_instance.send_message.side_effect = smtplib.SMTPRecipientsRefused({
            "procurement@soundtopia.com": (550, b"5.1.1 The email account that you tried to reach does not exist.")
        })
        mock_smtp.return_value = smtp_instance

        res = EmailSender.send_smtp_email(
            to_email="procurement@soundtopia.com",
            subject="Test Inquiry",
            body_text="Hello Partner",
            require_attachment=False
        )

        assert res.success is False
        assert res.delivery_status == "BOUNCED"
        assert "550" in res.message or "does not exist" in res.message.lower() or "rejected" in res.message.lower()


def test_req_5_smtp_550_user_unknown_is_handled():
    """TEST 5: 550 user unknown is handled gracefully."""
    with patch("backend.outreach.gmail_sender.load_settings") as mock_settings, \
         patch("smtplib.SMTP") as mock_smtp:
        mock_settings.return_value = {
            "GMAIL_SENDER_EMAIL": "test@gmail.com",
            "GMAIL_APP_PASSWORD": "valid_app_password"
        }
        smtp_instance = MagicMock()
        smtp_instance.send_message.side_effect = smtplib.SMTPDataError(550, b"5.1.1 User unknown")
        mock_smtp.return_value = smtp_instance

        res = EmailSender.send_smtp_email(
            to_email="unknown.user@company.de",
            subject="Inquiry",
            body_text="Hello",
            require_attachment=False
        )

        assert res.success is False
        assert res.delivery_status == "BOUNCED"
        assert "550" in res.message or "unknown" in res.message.lower()


def test_req_6_smtp_553_mailbox_unavailable_handled():
    """TEST 6: 553 mailbox unavailable / address rejected is handled."""
    with patch("backend.outreach.gmail_sender.load_settings") as mock_settings, \
         patch("smtplib.SMTP") as mock_smtp:
        mock_settings.return_value = {
            "GMAIL_SENDER_EMAIL": "test@gmail.com",
            "GMAIL_APP_PASSWORD": "valid_app_password"
        }
        smtp_instance = MagicMock()
        smtp_instance.send_message.side_effect = smtplib.SMTPResponseException(553, b"5.1.3 Mailbox name invalid or unavailable")
        mock_smtp.return_value = smtp_instance

        res = EmailSender.send_smtp_email(
            to_email="bad.mailbox@target.com",
            subject="Inquiry",
            body_text="Hello",
            require_attachment=False
        )

        assert res.success is False
        assert res.delivery_status == "BOUNCED"
        assert "553" in res.message or "unavailable" in res.message.lower()


def test_req_7_known_bounced_email_blocked_from_campaign():
    """TEST 7: Known bounced email cannot be selected for another campaign."""
    bounced_lead = {
        "lead_id": "bounced-lead-001",
        "company_name": "Soundtopia LLC",
        "email": "procurement@soundtopia.com",
        "classification": "retailer",
        "buyer_type": "Wholesale Buyer",
        "delivery_status": "BOUNCED",
        "bounce_reason": "550 Address not found",
        "already_contacted": "False",
        "product_id": "himalayan-sound-healing-bowls"
    }

    is_eligible, reason = is_outreach_eligible(bounced_lead, campaign_product_id="himalayan-sound-healing-bowls")
    assert is_eligible is False
    assert "bounced" in reason.lower()

    # Lead service eligibility check
    sendable, s_reason = LeadService.is_lead_sendable(bounced_lead)
    assert sendable is False
    assert "bounced" in s_reason.lower()


def test_req_8_editing_bounced_email_resets_delivery_state(tmp_path, monkeypatch):
    """TEST 8: Editing a bounced email resets delivery_status and clears bounce state."""
    test_csv = tmp_path / "buyers.csv"
    test_df = pd.DataFrame([{
        "lead_id": "lead-bounce-edit",
        "company_name": "Soundtopia Imports",
        "contact_name": "Procurement Lead",
        "buyer_name": "Procurement Lead",
        "email": "procurement@soundtopia.com",
        "country": "USA",
        "buyer_type": "Wholesale Importer",
        "email_status": "invalid",
        "syntax_valid": "True",
        "valid": "True",
        "delivery_status": "BOUNCED",
        "bounce_reason": "Address not found",
        "already_contacted": "False",
        "outreach_status": "not_eligible"
    }])
    test_df.to_csv(test_csv, index=False)
    monkeypatch.setattr(config, "BUYERS_CSV", test_csv)

    # User corrects the email
    updated = LeadService.update_lead(
        lead_id="lead-bounce-edit",
        updates={
            "contact_name": "Sarah Miller",
            "company_name": "Soundtopia Imports",
            "email": "sarah.m@soundtopia.com",
            "country": "USA",
            "buyer_type": "Wholesale Importer"
        }
    )

    assert updated is not None
    assert updated["email"] == "sarah.m@soundtopia.com"
    assert updated["contact_name"] == "Sarah Miller"
    assert updated["delivery_status"] == "UNKNOWN"
    assert updated["bounce_reason"] == ""
    assert updated["email_status"] == "valid"
    assert updated["outreach_status"] == "eligible"


def test_req_9_real_campaign_uses_actual_contact_name():
    """TEST 9: Real campaign uses actual contact name (e.g. 'Rahul Sharma') and never leaks 'Test User'."""
    template = "Dear {{contact_name}},\n\nExclusive wholesale opportunity for {{company_name}}."
    personalized = EmailSender.personalize_text(
        template,
        contact_name="Rahul Sharma",
        company_name="ABC Global Imports",
        product="Himalayan Sound Healing Bowls",
        allow_test_names=False
    )
    assert "Rahul Sharma" in personalized
    assert "Test User" not in personalized
    assert "Procurement Lead" not in personalized


def test_req_10_test_user_only_in_test_mode():
    """TEST 10: Test User identity is strictly blocked unless allow_test_names=True."""
    template = "Hello {{contact_name}},\n\nExport proposal for {{company_name}}."
    
    # In live campaign context (allow_test_names=False)
    cleaned_live = EmailSender.personalize_text(
        template,
        contact_name="Test User",
        company_name="Apex Trading",
        product="Himalayan Sound Healing Bowls",
        allow_test_names=False
    )
    assert "Test User" not in cleaned_live
    assert "Apex Trading Team" in cleaned_live

    # In explicit test mode (allow_test_names=True)
    cleaned_test = EmailSender.personalize_text(
        template,
        contact_name="Test User",
        company_name="Apex Trading",
        product="Himalayan Sound Healing Bowls",
        allow_test_names=True
    )
    assert "Test User" in cleaned_test


def test_req_11_pdf_attachment_in_mime_message():
    """TEST 11: PDF attachment exists with application/pdf and non-empty payload in MIME message."""
    catalog_path = "assets/company_presentation.pdf"
    assert Path(catalog_path).exists()

    mime_msg = EmailSender.build_mime_message(
        to_email="buyer@target.de",
        from_email="exporter@brand.com",
        subject="Catalog Presentation",
        body_text="Please find our attached PDF catalog.",
        attachment_path=catalog_path
    )

    # Verify MIME parts
    pdf_parts = [
        part for part in mime_msg.walk()
        if part.get_content_type() == "application/pdf"
    ]
    assert len(pdf_parts) >= 1
    pdf_part = pdf_parts[0]
    assert len(pdf_part.get_payload(decode=True)) > 0
    assert "company_presentation.pdf" in pdf_part.get_filename()


def test_req_12_missing_pdf_blocks_send():
    """TEST 12: Missing PDF blocks send with error when require_attachment=True."""
    res = EmailSender.send_smtp_email(
        to_email="buyer@target.com",
        subject="Subject",
        body_text="Body",
        attachment_path="assets/non_existent_catalog.pdf",
        require_attachment=True
    )
    assert res.success is False
    assert "unavailable" in res.message.lower() or "not found" in res.message.lower()


def test_req_13_demo_outreach_remains_blocked():
    """TEST 13: Demo outreach remains strictly blocked."""
    demo_lead = {
        "lead_id": "demo-001",
        "company_name": "Singing Bowl Sanctuary (Demo)",
        "email": "procurement@soundtopia.com",
        "is_demo": True,
        "product_id": "himalayan-sound-healing-bowls"
    }
    is_eligible, reason = is_outreach_eligible(demo_lead, campaign_product_id="himalayan-sound-healing-bowls")
    assert is_eligible is False
    assert "demo" in reason.lower()


def test_req_14_product_isolation_remains_intact():
    """TEST 14: Product isolation ensures leads from Product A cannot be emailed in Product B campaign."""
    product_a_lead = {
        "lead_id": "tea-001",
        "company_name": "Berlin Herbal Imports",
        "email": "contact@berlin-herbal.de",
        "product_id": "organic-orthodox-tea",
        "already_contacted": "False"
    }
    # Trying to send within Himalayan Bowls campaign
    is_eligible, reason = is_outreach_eligible(product_a_lead, campaign_product_id="himalayan-sound-healing-bowls")
    assert is_eligible is False
    assert "isolated" in reason.lower() or "product mismatch" in reason.lower()


def test_req_15_smtp_sender_refused_handled():
    """TEST 15: SMTPSenderRefused handled gracefully with safe error."""
    with patch("backend.outreach.gmail_sender.load_settings") as mock_settings, \
         patch("smtplib.SMTP") as mock_smtp:
        mock_settings.return_value = {
            "GMAIL_SENDER_EMAIL": "test@gmail.com",
            "GMAIL_APP_PASSWORD": "valid_app_password"
        }
        smtp_instance = MagicMock()
        smtp_instance.send_message.side_effect = smtplib.SMTPSenderRefused(550, b"Sender address rejected", "test@gmail.com")
        mock_smtp.return_value = smtp_instance

        res = EmailSender.send_smtp_email(
            to_email="buyer@partner.com",
            subject="Inquiry",
            body_text="Hello",
            require_attachment=False
        )

        assert res.success is False
        assert res.delivery_status == "FAILED"
        assert "Sender address was rejected" in res.message or "rejected" in res.message


def test_req_16_smtp_authentication_failure_handled():
    """TEST 16: SMTPAuthenticationError returns clear configuration guidance."""
    with patch("backend.outreach.gmail_sender.load_settings") as mock_settings, \
         patch("smtplib.SMTP") as mock_smtp:
        mock_settings.return_value = {
            "GMAIL_SENDER_EMAIL": "test@gmail.com",
            "GMAIL_APP_PASSWORD": "invalid_password"
        }
        smtp_instance = MagicMock()
        smtp_instance.login.side_effect = smtplib.SMTPAuthenticationError(535, b"5.7.8 Username and Password not accepted")
        mock_smtp.return_value = smtp_instance

        res = EmailSender.send_smtp_email(
            to_email="buyer@partner.com",
            subject="Inquiry",
            body_text="Hello",
            require_attachment=False
        )

        assert res.success is False
        assert res.delivery_status == "FAILED"
        assert "App Password" in res.message


def test_req_17_smtp_connection_timeout_handled():
    """TEST 17: SMTP Connection/Timeout error handled without uncaught exceptions."""
    with patch("backend.outreach.gmail_sender.load_settings") as mock_settings, \
         patch("smtplib.SMTP") as mock_smtp:
        mock_settings.return_value = {
            "GMAIL_SENDER_EMAIL": "test@gmail.com",
            "GMAIL_APP_PASSWORD": "valid_app_password"
        }
        mock_smtp.side_effect = TimeoutError("Connection timed out")

        res = EmailSender.send_smtp_email(
            to_email="buyer@partner.com",
            subject="Inquiry",
            body_text="Hello",
            require_attachment=False
        )

        assert res.success is False
        assert res.delivery_status == "FAILED"
        assert "Unable to connect" in res.message or "timed out" in res.message.lower()


def test_req_18_send_test_email_endpoint_success(monkeypatch):
    """TEST 18: /api/send/test endpoint successfully dispatches test email."""
    from fastapi.testclient import TestClient
    from backend.main import app

    monkeypatch.setenv("EXPORT_API_KEY", "test_key_123")
    client = TestClient(app)
    with patch("backend.outreach.gmail_sender.EmailSender.send_smtp_email") as mock_send:
        from backend.outreach.gmail_sender import SendResult
        mock_send.return_value = SendResult(
            success=True,
            message="SENT",
            delivery_status="SMTP_ACCEPTED",
            delivery_note="Accepted by Gmail SMTP for transmission; recipient delivery not yet confirmed."
        )

        response = client.post(
            "/api/send/test",
            json={
                "recipient_email": "tester@controlled-domain.com",
                "recipient_name": "QA Specialist",
                "company_name": "Quality Assurance Lab",
                "country": "Germany",
                "buyer_type": "Distributor",
                "subject": "Controlled Test Email",
                "body_template": "Hello {{contact_name}},\n\nTest message.",
                "attach_presentation": True
            },
            headers={"X-API-Key": "test_key_123"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["dispatched"] == 1
        assert data["delivery_status"] == "SMTP_ACCEPTED"
        assert data["recipient"] == "tester@controlled-domain.com"
        assert data["contact_name"] == "QA Specialist"


def test_req_19_send_test_email_requires_auth(monkeypatch):
    """TEST 19: /api/send/test enforces API key authentication."""
    from fastapi.testclient import TestClient
    from backend.main import app

    monkeypatch.setenv("EXPORT_API_KEY", "secret_key_123")
    client = TestClient(app)
    response = client.post(
        "/api/send/test",
        json={"recipient_email": "test@domain.com"}
    )
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_req_20_send_test_email_invalid_syntax_rejected(monkeypatch):
    """TEST 20: /api/send/test rejects invalid email format before SMTP."""
    from fastapi.testclient import TestClient
    from backend.main import app

    monkeypatch.setenv("EXPORT_API_KEY", "test_key_123")
    client = TestClient(app)
    response = client.post(
        "/api/send/test",
        json={"recipient_email": "invalid-email-format"},
        headers={"X-API-Key": "test_key_123"}
    )
    assert response.status_code == 422
    assert "syntax" in str(response.json()).lower()


def test_add_buyer_email_is_used_by_campaign(tmp_path, monkeypatch):
    """
    CRITICAL REGRESSION TEST:
    Verifies that when a buyer is added via Add Buyer, the exact same email:
    1. Is stored in persistence
    2. Is retrieved by get_lead / list_leads
    3. Is selected by lead_id in campaign
    4. Is passed to SMTP sendmail / build_mime_message (NOT sender, NOT test user, NOT old buyer)
    5. Works even if a test send to that same email occurred previously
    """
    fake_buyers_csv = tmp_path / "buyers.csv"
    fake_sent_log_csv = tmp_path / "sent_log.csv"
    monkeypatch.setattr(config, "BUYERS_CSV", fake_buyers_csv)
    monkeypatch.setattr(config, "SENT_LOG_CSV", fake_sent_log_csv)

    import backend.leads.lead_service as ls_mod
    import backend.validation.email_validator as ev_mod
    monkeypatch.setattr(ls_mod.config, "BUYERS_CSV", fake_buyers_csv)
    monkeypatch.setattr(ev_mod, "SENT_LOG_CSV", fake_sent_log_csv)

    # 1. Simulate previous test mode email to the same address
    from backend.logging_module.activity_logger import ActivityLogger
    import backend.logging_module.activity_logger as al_mod
    monkeypatch.setattr(al_mod, "SENT_LOG_CSV", fake_sent_log_csv)
    ActivityLogger.log_send_event(
        buyer_name="QA Specialist",
        company="QA Org",
        email="controlled@example.com",
        classification="custom",
        mode="SMTP_TEST",
        status="SENT",
        delivery_status="SMTP_ACCEPTED",
        delivery_note="Accepted by Gmail SMTP for transmission; recipient delivery not yet confirmed."
    )

    # 2. Add Buyer with controlled email
    created = LeadService.save_lead({
        "lead_id": "lead-controlled-123",
        "id": "lead-controlled-123",
        "company_name": "Controlled BioWellness GmbH",
        "company": "Controlled BioWellness GmbH",
        "contact_name": "Dr. Sarah Miller",
        "buyer_name": "Dr. Sarah Miller",
        "email": "controlled@example.com",
        "country": "Germany",
        "buyer_type": "Wholesale Importer",
        "product_id": "himalayan-sound-healing-bowls",
        "email_status": "valid",
        "syntax_valid": "True",
        "valid": "True",
        "is_duplicate": "False",
        "already_contacted": "False",
        "qualification_status": "qualified",
        "ai_score": "95",
        "priority": "high",
        "outreach_status": "eligible",
        "is_demo": "False"
    })

    assert created["email"] == "controlled@example.com"

    # 3. Retrieve lead from storage
    retrieved = LeadService.get_lead("lead-controlled-123")
    assert retrieved is not None
    assert retrieved["email"] == "controlled@example.com"
    assert retrieved["contact_name"] == "Dr. Sarah Miller"

    # 4. Dispatch campaign for this specific lead_id
    with patch("backend.outreach.gmail_sender.get_gmail_credentials", return_value=("sender@gmail.com", "app_password_123")), \
         patch("backend.outreach.gmail_sender.load_settings") as mock_settings, \
         patch("smtplib.SMTP") as mock_smtp, \
         patch("backend.outreach.attachment_handler.AttachmentHandler.get_attachment_path") as mock_att:
        
        mock_settings.return_value = {
            "GMAIL_SENDER_EMAIL": "sender@gmail.com",
            "GMAIL_APP_PASSWORD": "app_password_123",
            "DAILY_SEND_LIMIT": 100,
            "MAX_EMAILS_PER_RUN": 25,
            "SEND_DELAY": 0.0
        }
        mock_att.return_value = Path("assets/company_presentation.pdf")

        smtp_instance = MagicMock()
        smtp_instance.sendmail.return_value = {}
        mock_smtp.return_value = smtp_instance

        res = EmailSender.execute_campaign(
            product_id="himalayan-sound-healing-bowls",
            lead_ids=["lead-controlled-123"],
            subject_template="Exclusive Himalayan Singing Bowls for {{company_name}}",
            body_template="Dear {{contact_name}},\n\nWe would like to introduce our export catalog.",
            attach_presentation=False
        )

        assert res["success"] is True
        assert res["attempted"] == 1
        assert res["smtp_accepted"] == 1
        assert res["failed"] == 0
        assert len(res["results"]) == 1
        assert res["results"][0]["recipient"] == "controlled@example.com"
        assert res["results"][0]["contact_name"] == "Dr. Sarah Miller"
        assert res["results"][0]["delivery_status"] == "SMTP_ACCEPTED"

        # Verify SMTP sendmail was called with the EXACT controlled email
        assert smtp_instance.sendmail.called
        call_args = smtp_instance.sendmail.call_args[0]
        from_arg, to_arg, raw_msg = call_args[0], call_args[1], call_args[2]

        assert from_arg == "sender@gmail.com"
        assert to_arg == ["controlled@example.com"]
        assert "To: controlled@example.com" in raw_msg

        import email as email_lib
        email_msg = email_lib.message_from_string(raw_msg)
        body_part = email_msg.get_payload(0)
        decoded_body = body_part.get_payload(decode=True).decode('utf-8') if hasattr(body_part, 'get_payload') else str(raw_msg)
        assert "Dr. Sarah Miller" in decoded_body
        assert "Test User" not in decoded_body


