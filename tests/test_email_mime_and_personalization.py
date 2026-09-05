"""
Comprehensive regression tests for email personalization and MIME attachment verification.
Validates:
1. Real contact name rendering (e.g. 'John Smith', 'Rahul Sharma').
2. Missing contact name professional fallback (e.g. 'ABC Imports Team', 'Company Team' - no fake human names).
3. Test email flow test identity preservation.
4. Real MIME message generation with application/pdf.
5. Attachment filename presence.
6. Non-empty attachment payload.
7. Missing/unavailable PDF blocks send.
8. Invalid/non-PDF attachment blocks send.
9. Path traversal protection on catalog attachments.
10. Demo leads outreach blocking (DEMO_DATA_OUTREACH_BLOCKED).
11. Multi-product catalog isolation (Product A vs Product B catalogs).
12. Real campaign never falling back to 'Test User'.
"""
import pytest
from email.parser import BytesParser
from email.policy import default
from pathlib import Path
from unittest.mock import patch, MagicMock

from backend.outreach.gmail_sender import EmailSender, is_outreach_eligible
from backend.outreach.attachment_handler import AttachmentHandler
from backend.products.catalog import ProductCatalog

def test_1_real_contact_name_rendered():
    """Real contact name must appear in rendered subject and body, not Test User."""
    template = "Hello {{contact_name}},\n\nSupply of {{product_name}} for {{company_name}}."
    rendered = EmailSender.personalize_text(
        template,
        contact_name="John Smith",
        company_name="ABC Imports",
        product="Himalayan Sound Healing Bowls"
    )
    assert "John Smith" in rendered
    assert "Test User" not in rendered
    assert "Procurement Lead" not in rendered
    assert "ABC Imports" in rendered
    assert "Himalayan Sound Healing Bowls" in rendered

def test_2_missing_contact_name_uses_professional_fallback():
    """Missing contact name must use professional company team fallback without fabricating names."""
    template = "Dear {{contact_name}},\n\nReaching out to {{company_name}}."
    
    # When contact_name is None
    rendered_none = EmailSender.personalize_text(
        template,
        contact_name=None,
        company_name="Zen Healing Supplies",
        product="Himalayan Sound Healing Bowls"
    )
    assert "Zen Healing Supplies Team" in rendered_none
    assert "Test User" not in rendered_none
    assert "John Doe" not in rendered_none
    assert "Procurement Lead" not in rendered_none

    # When contact_name is empty string
    rendered_empty = EmailSender.personalize_text(
        template,
        contact_name="   ",
        company_name="Nordic Sound ApS",
        product="Tibetan Singing Bowls"
    )
    assert "Nordic Sound ApS Team" in rendered_empty
    assert "Test User" not in rendered_empty

def test_3_test_email_can_use_test_identity():
    """Explicit test email flow allows test identities when allow_test_names=True."""
    template = "Hello {{contact_name}},\n\nTest dispatch."
    rendered = EmailSender.personalize_text(
        template,
        contact_name="Test Recipient",
        company_name="Quality Assurance Lab",
        allow_test_names=True
    )
    assert "Test Recipient" in rendered

def test_4_5_6_mime_attachment_present_and_valid():
    """Build in-memory MIME email and verify application/pdf, filename, and non-empty payload."""
    pdf_path = "assets/himalayan_sound_healing_bowls_catalog.pdf"
    msg = EmailSender.build_mime_message(
        to_email="partner@abcimports.example",
        subject="Wholesale Sound Bowls Catalog",
        body_text="Hello John Smith,\n\nPlease find our catalog attached.",
        from_email="export@himalayanartisans.example",
        attachment_path=pdf_path,
        require_attachment=True
    )

    # Parse in-memory bytes using standard RFC email parser
    parsed = BytesParser(policy=default).parsebytes(msg.as_bytes())

    assert parsed["To"] == "partner@abcimports.example"
    assert parsed["Subject"] == "Wholesale Sound Bowls Catalog"

    pdf_parts = []
    for part in parsed.walk():
        if part.get_content_type() == "application/pdf":
            pdf_parts.append(part)

    assert len(pdf_parts) == 1, "Expected exactly 1 PDF attachment in MIME message"
    pdf_part = pdf_parts[0]

    # TEST 4: Content type
    assert pdf_part.get_content_type() == "application/pdf"

    # TEST 5: Filename
    filename = pdf_part.get_filename()
    assert filename == "himalayan_sound_healing_bowls_catalog.pdf"

    # TEST 6: Non-empty payload
    payload_bytes = pdf_part.get_payload(decode=True)
    assert payload_bytes is not None
    assert len(payload_bytes) > 0
    assert payload_bytes.startswith(b"%PDF")

def test_7_missing_pdf_blocks_campaign_send():
    """If required attachment does not exist, send is safely blocked."""
    with pytest.raises(ValueError, match="Campaign attachment is unavailable"):
        EmailSender.build_mime_message(
            to_email="partner@example.com",
            subject="Catalog",
            body_text="Catalog inquiry",
            attachment_path="assets/non_existent_brochure.pdf",
            require_attachment=True
        )

def test_8_invalid_non_pdf_attachment_blocks_campaign_send():
    """Non-PDF attachment cannot be attached or sent."""
    with pytest.raises(ValueError, match="Campaign attachment is unavailable"):
        EmailSender.build_mime_message(
            to_email="partner@example.com",
            subject="Catalog",
            body_text="Catalog inquiry",
            attachment_path="assets/generate_pdf.py",
            require_attachment=True
        )

def test_9_path_traversal_cannot_select_arbitrary_files():
    """Path traversal is blocked by AttachmentHandler."""
    assert AttachmentHandler.get_attachment_path("../secret.pdf") is None
    assert AttachmentHandler.get_attachment_path("..\\..\\windows\\win.ini") is None
    assert AttachmentHandler.get_attachment_path("/etc/passwd.pdf") is None

def test_10_demo_leads_cannot_be_sent():
    """Demo leads are blocked by authoritative backend eligibility check."""
    demo_lead = {
        "lead_id": "demo-lead-123",
        "company_name": "Demo Wellness Center",
        "contact_name": "Demo Buyer",
        "email": "buyer@wellness-demo.example",
        "email_status": "valid",
        "qualification_status": "qualified",
        "is_demo": True
    }
    eligible, reason = is_outreach_eligible(demo_lead, campaign_product_id="himalayan-sound-healing-bowls")
    assert eligible is False
    assert "Demo buyer cannot enter live email outreach" in reason

def test_11_product_catalogs_are_isolated():
    """Product A's catalog is distinct from Product B's catalog."""
    prod_a = ProductCatalog.get_product("himalayan-sound-healing-bowls")
    prod_b = ProductCatalog.get_product("tibetan-singing-bowls")
    prod_c = ProductCatalog.get_product("crystal-singing-bowls")

    assert prod_a["catalog_path"] != prod_b["catalog_path"]
    assert prod_b["catalog_path"] != prod_c["catalog_path"]

    path_a = AttachmentHandler.get_attachment_path(prod_a["catalog_path"])
    path_b = AttachmentHandler.get_attachment_path(prod_b["catalog_path"])

    assert path_a is not None and path_a.exists()
    assert path_b is not None and path_b.exists()
    assert path_a.name != path_b.name

def test_12_real_campaign_never_falls_back_to_test_user():
    """Real campaign personalization with missing contact never outputs 'Test User'."""
    lead = {
        "company_name": "Alps Sound Studio",
        "contact_name": "", # empty
        "country": "Switzerland"
    }
    body = EmailSender.personalize_text(
        "Hello {{contact_name}}, regarding {{company_name}} in {{country}}.",
        contact_name=lead["contact_name"],
        company_name=lead["company_name"],
        country=lead["country"],
        allow_test_names=False
    )
    assert "Test User" not in body
    assert "Alps Sound Studio Team" in body
    assert "Switzerland" in body
