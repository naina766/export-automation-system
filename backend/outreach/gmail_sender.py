"""
Outreach Dispatch & Eligibility Module.
Enforces authoritative outreach eligibility rules, product isolation, personalization,
cumulative daily send limits, duplicate suppression, and resilient Gmail SMTP dispatch.
"""
import re
import time
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional, Set
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import (
    load_settings,
    get_gmail_credentials,
    BUYERS_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV,
    SENT_LOG_CSV
)
from outreach.attachment_handler import AttachmentHandler
from logging_module.activity_logger import ActivityLogger
from validation.email_validator import EmailValidator, validate_email_address

DEFAULT_SUBJECT = "Export Supply Partnership: {{product_name}} for {{company_name}}"
DEFAULT_BODY = """Hello {{contact_name}},

I am reaching out regarding {{company_name}} in {{country}}.

As an established exporter of authentic, hand-crafted {{product_name}}, we would be delighted to explore a wholesale supply partnership with your organization.

Please find our product catalog and export specifications attached.

Best regards,
Export Sales Team"""

def is_outreach_eligible(
    lead: Dict[str, Any],
    campaign_product_id: Optional[str] = None,
    contacted_emails: Optional[Set[str]] = None
) -> Tuple[bool, str]:
    """
    Authoritative backend eligibility check.
    A lead is eligible for outreach ONLY if ALL conditions are satisfied:
    1. Lead exists and has a valid identifier
    2. product_id matches campaign product_id (Product Isolation)
    3. Email exists and email_status == 'valid'
    4. qualification_status == 'qualified'
    5. is_demo is False
    6. Not already contacted in historical sent_log
    """
    if not lead:
        return False, "Lead record is empty or missing"

    lead_id = lead.get("lead_id") or lead.get("id")
    if not lead_id:
        return False, "Missing valid lead identifier"

    # 1. Demo Data Safety Barrier
    raw_demo = lead.get("is_demo", False)
    is_demo = (raw_demo is True) or (str(raw_demo).lower().strip() in ["true", "1", "yes"])
    if is_demo:
        return False, "Demo buyer cannot enter live email outreach"

    # 2. Product Isolation
    if campaign_product_id:
        lead_product_id = lead.get("product_id") or "himalayan-sound-healing-bowls"
        if lead_product_id != campaign_product_id:
            return False, f"Product mismatch: lead belongs to '{lead_product_id}', campaign is for '{campaign_product_id}'"

    # 3. Email Availability & Syntax Validation
    raw_email = str(lead.get("email", "") or "").strip()
    if not raw_email or raw_email in ["none", "null", "undefined"]:
        return False, "Missing email address"

    email_status = str(lead.get("email_status", "")).lower().strip()
    if email_status != "valid":
        val_res = validate_email_address(raw_email)
        if not val_res.get("syntax_valid"):
            return False, f"Invalid email syntax: {val_res.get('reason', 'invalid')}"

    # 4. AI Qualification Status
    qual_status = str(lead.get("qualification_status", "")).lower().strip()
    if qual_status != "qualified":
        return False, f"Lead is not AI qualified (status: '{qual_status or 'pending'}')"

    # 5. In-batch duplicate check
    raw_dup = lead.get("is_duplicate", False)
    if (raw_dup is True) or (str(raw_dup).lower().strip() in ["true", "1", "yes"]):
        return False, "Duplicate lead record"

    # 6. Historical Duplicate Outreach Suppression
    if contacted_emails is None:
        contacted_emails = EmailValidator.get_contacted_emails()
    
    clean_email = raw_email.lower()
    raw_contacted = lead.get("already_contacted", False)
    is_contacted = (raw_contacted is True) or (str(raw_contacted).lower().strip() in ["true", "1", "yes"])
    if clean_email in contacted_emails or is_contacted:
        return False, "Already contacted in a previous campaign"

    return True, "Eligible"

class EmailSender:
    """Outreach campaign sender executing live Gmail SMTP with limit enforcement and retry resilience."""

    @staticmethod
    def personalize_text(
        template: str,
        contact_name: Optional[str] = None,
        company_name: Optional[str] = None,
        country: Optional[str] = None,
        buyer_type: Optional[str] = None,
        product: Optional[str] = None,
        buyer_name: Optional[str] = None
    ) -> str:
        """
        Safely replaces placeholders:
        {{company_name}}, {{contact_name}}, {{buyer_name}}, {{country}}, {{buyer_type}}, {{product_name}}, {{product}}
        If contact_name is null/empty -> uses 'Company Team' (never 'undefined', 'null', 'Procurement Lead').
        """
        clean_company = str(company_name).strip() if company_name and str(company_name).strip() not in ["", "None", "null"] else ""
        raw_contact = contact_name or buyer_name
        if raw_contact and str(raw_contact).strip() not in ["", "None", "null", "undefined", "Procurement Lead", "Purchasing Manager"]:
            clean_name = str(raw_contact).strip()
        else:
            clean_name = f"{clean_company} Team" if clean_company else "Company Team"

        clean_company_display = clean_company if clean_company else "your organization"
        clean_country = str(country).strip() if country and str(country).strip() not in ["", "None", "null"] else "your region"
        clean_type = str(buyer_type).strip() if buyer_type and str(buyer_type).strip() not in ["", "None", "null"] else "partner"
        clean_product = str(product).strip() if product and str(product).strip() not in ["", "None", "null"] else "Himalayan Sound Healing Bowls"

        text = template
        text = text.replace("{{contact_name}}", clean_name)
        text = text.replace("{{buyer_name}}", clean_name)
        text = text.replace("{{company_name}}", clean_company_display)

        text = text.replace("{{country}}", clean_country)
        text = text.replace("{{buyer_type}}", clean_type)
        text = text.replace("{{product_name}}", clean_product)
        text = text.replace("{{product}}", clean_product)

        # Sanitize any stray unresolved double-brace tags
        text = re.sub(r"\{\{[a-zA-Z0-9_]+\}\}", "", text)
        return text

    @classmethod
    def get_today_sent_count(cls) -> int:
        """Calculate total successful email sends across all campaigns today."""
        if not SENT_LOG_CSV.exists():
            return 0
        try:
            df = pd.read_csv(SENT_LOG_CSV, dtype=str)
            if df.empty or "timestamp" not in df.columns or "status" not in df.columns:
                return 0
            
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            # Filter rows from today with status == 'SENT'
            sent_today = df[
                (df["status"].astype(str).str.upper() == "SENT") &
                (df["timestamp"].astype(str).str.startswith(today_str))
            ]
            return len(sent_today)
        except Exception:
            return 0

    @classmethod
    def _send_smtp_with_retry(
        cls,
        smtp_host: str,
        smtp_port: int,
        smtp_user: str,
        smtp_pass: str,
        msg: MIMEMultipart,
        max_retries: int = 2
    ) -> Tuple[bool, str]:
        """Core SMTP sending function with retry logic."""
        last_error = ""
        for attempt in range(1, max_retries + 1):
            try:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
                server.quit()
                return True, "SENT"
            except smtplib.SMTPAuthenticationError as e:
                return False, f"SMTP Authentication failed: Check your Gmail App Password. ({str(e)})"
            except Exception as e:
                last_error = str(e)
                if attempt < max_retries:
                    time.sleep(1.0)
        return False, f"SMTP dispatch failed after {max_retries} attempts: {last_error}"

    @classmethod
    def send_smtp_email(
        cls,
        to_email: str,
        subject: str,
        body_text: str,
        attachment_path: Optional[str] = None,
        max_retries: int = 2
    ) -> Tuple[bool, str]:
        """Send email via Gmail SMTP with STARTTLS and retry resilience."""
        gmail_user, gmail_pass = get_gmail_credentials()
        settings = load_settings()
        smtp_host = settings.get("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(settings.get("SMTP_PORT", 587))

        if not gmail_user or not gmail_pass:
            return False, "GMAIL_CREDENTIALS_MISSING: Please configure GMAIL_EMAIL and GMAIL_APP_PASSWORD in backend .env"

        msg = MIMEMultipart()
        msg["From"] = f"Export Outreach <{gmail_user}>"
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body_text, "plain", "utf-8"))

        if attachment_path:
            p = Path(attachment_path)
            if p.exists() and p.is_file():
                att = AttachmentHandler.get_mime_attachment(p)
                if att:
                    msg.attach(att)

        success, status = cls._send_smtp_with_retry(
            smtp_host=smtp_host,
            smtp_port=smtp_port,
            smtp_user=gmail_user,
            smtp_pass=gmail_pass,
            msg=msg,
            max_retries=max_retries
        )
        return success, status

    @classmethod
    def execute_campaign(
        cls,
        product_id: str,
        lead_ids: Optional[List[str]] = None,
        subject_template: Optional[str] = None,
        body_template: Optional[str] = None,
        attach_presentation: bool = True,
        catalog_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Execute campaign outreach for selected lead_ids.
        Runs final backend validation on every recipient and enforces limits.
        """
        settings = load_settings()
        daily_limit = int(settings.get("DAILY_SEND_LIMIT", 100))
        max_per_run = int(settings.get("MAX_EMAILS_PER_RUN", 25))
        send_delay = float(settings.get("SEND_DELAY", 1.0))

        # Check daily cumulative send count
        already_sent_today = cls.get_today_sent_count()
        remaining_today = max(0, daily_limit - already_sent_today)
        if remaining_today <= 0:
            return {
                "success": False,
                "error": "DAILY_SEND_LIMIT_EXCEEDED",
                "message": f"Daily email limit of {daily_limit} has been reached ({already_sent_today} sent today).",
                "sent_today": already_sent_today,
                "daily_limit": daily_limit,
                "results": []
            }

        # Load buyers store
        if not BUYERS_CSV.exists():
            return {
                "success": False,
                "error": "NO_LEADS",
                "message": "No buyer leads available in store.",
                "results": []
            }

        try:
            df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
        except Exception as e:
            return {
                "success": False,
                "error": "STORE_READ_ERROR",
                "message": f"Failed to read buyers store: {str(e)}",
                "results": []
            }

        # Filter by lead_ids if provided, otherwise filter all eligible leads for this product
        if lead_ids:
            target_df = df[df["lead_id"].isin(lead_ids) | df["id"].isin(lead_ids)].copy()
        else:
            target_df = df[df["product_id"] == product_id].copy()

        if target_df.empty:
            return {
                "success": False,
                "error": "NO_MATCHING_LEADS",
                "message": "No matching leads found for this campaign.",
                "results": []
            }

        # Resolve active product details
        try:
            from products.catalog import ProductCatalog
            prod = ProductCatalog.get_product(product_id) or ProductCatalog.get_active_product()
            prod_name = prod.get("name", "Himalayan Sound Healing Bowls")
            pdf_path = catalog_path or prod.get("catalog_path")
        except Exception:
            prod_name = "Himalayan Sound Healing Bowls"
            pdf_path = catalog_path

        attachment_file = pdf_path if attach_presentation else None
        subject_tpl = subject_template or DEFAULT_SUBJECT
        body_tpl = body_template or DEFAULT_BODY

        contacted_set = EmailValidator.get_contacted_emails()
        results = []
        successful_sends = 0
        skipped_count = 0
        failed_count = 0

        for _, row in target_df.iterrows():
            lead_dict = row.to_dict()
            lead_id = lead_dict.get("lead_id") or lead_dict.get("id")
            recipient_email = lead_dict.get("email")

            # Final authoritative eligibility check
            is_eligible, reason = is_outreach_eligible(
                lead=lead_dict,
                campaign_product_id=product_id,
                contacted_emails=contacted_set
            )

            if not is_eligible:
                results.append({
                    "lead_id": lead_id,
                    "company_name": lead_dict.get("company_name", lead_dict.get("company", "")),
                    "recipient": recipient_email,
                    "status": "rejected",
                    "reason": reason
                })
                skipped_count += 1
                continue

            # Check run and daily limits
            if successful_sends >= max_per_run:
                results.append({
                    "lead_id": lead_id,
                    "company_name": lead_dict.get("company_name", lead_dict.get("company", "")),
                    "recipient": recipient_email,
                    "status": "rejected",
                    "reason": f"Campaign max per run limit ({max_per_run}) reached"
                })
                skipped_count += 1
                continue

            if (already_sent_today + successful_sends) >= daily_limit:
                results.append({
                    "lead_id": lead_id,
                    "company_name": lead_dict.get("company_name", lead_dict.get("company", "")),
                    "recipient": recipient_email,
                    "status": "rejected",
                    "reason": f"Daily send limit ({daily_limit}) reached"
                })
                skipped_count += 1
                continue

            # Personalize content
            sub = cls.personalize_text(
                subject_tpl,
                contact_name=lead_dict.get("contact_name"),
                buyer_name=lead_dict.get("buyer_name"),
                company_name=lead_dict.get("company_name", lead_dict.get("company")),
                country=lead_dict.get("country"),
                buyer_type=lead_dict.get("buyer_type"),
                product=prod_name
            )

            body = cls.personalize_text(
                body_tpl,
                contact_name=lead_dict.get("contact_name"),
                buyer_name=lead_dict.get("buyer_name"),
                company_name=lead_dict.get("company_name", lead_dict.get("company")),
                country=lead_dict.get("country"),
                buyer_type=lead_dict.get("buyer_type"),
                product=prod_name
            )

            # Execute Gmail SMTP Send
            success, error_msg = cls.send_smtp_email(
                to_email=recipient_email,
                subject=sub,
                body_text=body,
                attachment_path=attachment_file
            )

            status_str = "SENT" if success else "FAILED"
            now_iso = datetime.now(timezone.utc).isoformat()

            ActivityLogger.log_activity(
                buyer_name=lead_dict.get("contact_name") or "Company Team",
                company=lead_dict.get("company_name", lead_dict.get("company", "")),
                email=recipient_email,
                classification=lead_dict.get("buyer_type", "Distributor"),
                mode="SMTP",
                status=status_str,
                error=error_msg if not success else "",
                campaign=prod_name
            )

            if success:
                successful_sends += 1
                contacted_set.add(recipient_email.lower())
                # Update buyers store to mark already_contacted
                for idx, r_row in df.iterrows():
                    if (r_row.get("lead_id") == lead_id) or (r_row.get("id") == lead_id) or (r_row.get("email") == recipient_email):
                        df.at[idx, "already_contacted"] = "True"
                        df.at[idx, "outreach_status"] = "sent"
                        break
            else:
                failed_count += 1
                for idx, r_row in df.iterrows():
                    if (r_row.get("lead_id") == lead_id) or (r_row.get("id") == lead_id) or (r_row.get("email") == recipient_email):
                        df.at[idx, "outreach_status"] = "failed"
                        break

            results.append({
                "lead_id": lead_id,
                "company_name": lead_dict.get("company_name", lead_dict.get("company", "")),
                "recipient": recipient_email,
                "status": "sent" if success else "failed",
                "error": error_msg if not success else None,
                "timestamp": now_iso
            })

            if send_delay > 0:
                time.sleep(send_delay)

        df.to_csv(BUYERS_CSV, index=False)

        return {
            "success": True,
            "total_targeted": len(target_df),
            "dispatched": successful_sends,
            "failed": failed_count,
            "skipped": skipped_count,
            "results": results
        }
