"""
Outreach Dispatch Module.
Handles variable personalization, MIME attachment handling, and Gmail SMTP transport with retry resilience.
"""
import re
import time
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import sys
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from config import (
    load_settings,
    get_gmail_credentials,
    BUYERS_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV
)
from outreach.attachment_handler import AttachmentHandler
from logging_module.activity_logger import ActivityLogger
from validation.email_validator import EmailValidator, validate_email_address

DEFAULT_SUBJECT = "Export Partnership: Himalayan Singing Bowls for {{company_name}}"
DEFAULT_BODY = """Hello {{contact_name}},

I am reaching out regarding {{company_name}} in {{country}}.

As an established exporter of authentic, hand-hammered {{product}}, we would be delighted to explore a wholesale supply partnership with your organization.

Please find our product catalog and export specifications attached.

Best regards,
Export Sales Team
Himalayan Artisans Export Ltd."""

class EmailSender:
    """Outreach campaign sender executing live Gmail SMTP with backoff retry resilience."""

    @staticmethod
    def personalize_text(
        template: str,
        buyer_name: str = "",
        company_name: str = "",
        country: str = "",
        buyer_type: str = "",
        product: str = ""
    ) -> str:
        """
        Safely replace {{company_name}}, {{contact_name}}, {{buyer_name}}, {{country}},
        {{buyer_type}}, {{product}} placeholders with clean fallbacks.
        Ensures unresolved tags or undefined/null are sanitized.
        """
        clean_name = str(buyer_name).strip() if buyer_name and str(buyer_name).strip() else "Valued Partner"
        clean_company = str(company_name).strip() if company_name and str(company_name).strip() else "your organization"
        clean_country = str(country).strip() if country and str(country).strip() else "your region"
        clean_type = str(buyer_type).strip() if buyer_type and str(buyer_type).strip() else "partner"
        clean_product = str(product).strip() if product and str(product).strip() else "Himalayan Sound Healing Bowls"

        text = template
        text = text.replace("{{buyer_name}}", clean_name)
        text = text.replace("{{contact_name}}", clean_name)
        text = text.replace("{{company_name}}", clean_company)
        text = text.replace("{{country}}", clean_country)
        text = text.replace("{{buyer_type}}", clean_type)
        text = text.replace("{{product}}", clean_product)

        # Clean any stray unresolved double-brace tags
        text = re.sub(r"\{\{[a-zA-Z0-9_]+\}\}", "", text)
        return text

    @classmethod
    def get_recipients_by_audience(
        cls,
        audience: str,
        custom_recipient: Optional[Dict[str, str]] = None
    ) -> List[Dict[str, Any]]:
        """Fetch qualified recipients based on selected audience (business | individual | all | custom)."""
        audience_lower = audience.lower()

        # Handle direct custom recipient (Send Test Email)
        if audience_lower == "custom":
            if not custom_recipient:
                return []
            email = str(custom_recipient.get("email", "")).strip()
            if not email:
                return []
            return [{
                "name": str(custom_recipient.get("name", "")).strip() or "Valued Partner",
                "company": str(custom_recipient.get("company", "")).strip() or "Partner Organization",
                "email": email,
                "country": str(custom_recipient.get("country", "")).strip() or "International",
                "buyer_type": str(custom_recipient.get("buyer_type", "")).strip() or "Distributor",
                "classification": "custom",
                "email_status": "valid",
                "is_duplicate": "False"
            }]

        target_csv = None
        if audience_lower == "business" and BUSINESS_EMAILS_CSV.exists():
            target_csv = BUSINESS_EMAILS_CSV
        elif audience_lower == "individual" and INDIVIDUAL_EMAILS_CSV.exists():
            target_csv = INDIVIDUAL_EMAILS_CSV
        elif BUYERS_CSV.exists():
            target_csv = BUYERS_CSV

        if not target_csv or not target_csv.exists():
            return []

        try:
            df = pd.read_csv(target_csv, dtype=str).fillna("")
            if df.empty:
                return []

            # Filter valid, non-duplicate emails
            valid_mask = (df.get("email_status", "valid") == "valid") & \
                         (df.get("is_duplicate", "False").astype(str).str.lower() != "true")

            filtered = df[valid_mask]

            if audience_lower == "business" and "classification" in filtered.columns:
                filtered = filtered[filtered["classification"] == "business"]
            elif audience_lower == "individual" and "classification" in filtered.columns:
                filtered = filtered[filtered["classification"] == "individual"]

            return filtered.to_dict(orient="records")
        except Exception as e:
            print(f"Error fetching recipients: {e}")
            return []

    @classmethod
    def _send_smtp_with_retry(
        cls,
        smtp_host: str,
        smtp_port: int,
        smtp_user: str,
        smtp_pass: str,
        msg: MIMEMultipart,
        max_retries: int = 3
    ) -> Tuple[bool, str]:
        """
        Connects and dispatches email via Gmail SMTP with exponential backoff retries.
        Retries on transient network/connection failures (delays: 1s, 2s, 4s).
        """
        last_error = ""
        for attempt in range(1, max_retries + 1):
            server = None
            try:
                server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.send_message(msg)
                server.quit()
                return True, "SENT"
            except (smtplib.SMTPConnectError, smtplib.SMTPServerDisconnected, TimeoutError, OSError) as transient_err:
                last_error = f"Transient connection error: {str(transient_err)}"
                if attempt < max_retries:
                    backoff_delay = 1 * (2 ** (attempt - 1)) # 1s, 2s, 4s
                    time.sleep(backoff_delay)
                else:
                    last_error = f"Failed after {max_retries} attempts: {last_error}"
            except (smtplib.SMTPAuthenticationError, smtplib.SMTPRecipientsRefused, smtplib.SMTPDataError) as permanent_err:
                last_error = f"SMTP client error: {str(permanent_err)}"
                break
            except Exception as e:
                last_error = f"Unexpected SMTP error: {str(e)}"
                break
            finally:
                if server:
                    try:
                        server.close()
                    except Exception:
                        pass
        return False, last_error

    @classmethod
    def send_campaign(
        cls,
        audience: str = "business",
        subject: str = DEFAULT_SUBJECT,
        body_template: str = DEFAULT_BODY,
        attach_presentation: bool = True,
        custom_recipient: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Executes campaign outreach via Gmail SMTP with retry resilience."""
        settings = load_settings()
        max_emails = int(settings.get("MAX_EMAILS_PER_RUN", 25))
        send_delay = float(settings.get("SEND_DELAY", 1))
        smtp_host = settings.get("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(settings.get("SMTP_PORT", 587))

        recipients = cls.get_recipients_by_audience(audience, custom_recipient)
        contacted_set = EmailValidator.get_contacted_emails()

        results = {
            "mode": "SMTP",
            "audience": audience,
            "total_targeted": len(recipients),
            "sent_count": 0,
            "failed_count": 0,
            "skipped_duplicates": 0,
            "previews": [],
            "messages": []
        }

        if not recipients:
            results["messages"].append(f"No qualified recipients found for target '{audience}'.")
            return results

        # Check Gmail SMTP credentials
        smtp_user, smtp_pass = get_gmail_credentials()
        if not smtp_user or not smtp_pass:
            err_msg = "Gmail credentials not configured. Please set GMAIL_EMAIL and GMAIL_APP_PASSWORD in the backend environment."
            results["messages"].append(err_msg)
            results["failed_count"] = len(recipients)
            return results

        # Verify attachment if enabled
        if attach_presentation:
            exists, fname, size = AttachmentHandler.get_presentation_status()
            if not exists:
                err_msg = f"Attachment required but presentation PDF is missing from assets/ ({fname})."
                results["messages"].append(err_msg)
                results["failed_count"] = len(recipients)
                return results

        # Enforce batch limit (only for bulk audience pools, custom is single)
        recipients_to_send = recipients[:max_emails] if audience != "custom" else recipients
        if len(recipients) > max_emails and audience != "custom":
            results["messages"].append(f"Batch limit applied: dispatching {max_emails} of {len(recipients)} leads.")

        for idx, buyer in enumerate(recipients_to_send):
            raw_email = str(buyer.get("email", "")).strip().lower()
            buyer_name = str(buyer.get("name", "")).strip() or "Valued Partner"
            company_name = str(buyer.get("company", "")).strip() or "Partner Organization"
            country_val = str(buyer.get("country", "")).strip() or "International"
            classification = str(buyer.get("classification", audience)).strip()

            is_test_send = (audience.lower() == "custom")
            dispatch_mode = "SMTP_TEST" if is_test_send else "SMTP"
            campaign_name = "SMTP Test" if is_test_send else "Singing Bowls Outreach"

            # Syntax validation check for single/custom
            if audience == "custom":
                val_res = validate_email_address(raw_email)
                if not val_res.get("valid", False):
                    err_msg = f"Invalid email syntax/domain: {val_res.get('reason', 'Failed validation')}"
                    ActivityLogger.log_send_event(
                        buyer_name=buyer_name,
                        company=company_name,
                        email=raw_email,
                        status="INVALID_EMAIL",
                        mode=dispatch_mode,
                        classification="custom",
                        campaign=campaign_name,
                        error=err_msg
                    )
                    results["failed_count"] += 1
                    results["messages"].append(err_msg)
                    continue

            # Duplicate / Already contacted check (only for bulk campaigns, not single custom test dispatch)
            if audience != "custom" and raw_email in contacted_set:
                ActivityLogger.log_send_event(
                    buyer_name=buyer_name,
                    company=company_name,
                    email=raw_email,
                    status="SKIPPED_DUPLICATE",
                    mode=dispatch_mode,
                    classification=classification,
                    campaign=campaign_name,
                    error="Already contacted in a previous campaign"
                )
                results["skipped_duplicates"] += 1
                continue

            buyer_type = str(buyer.get("buyer_type", buyer.get("category", "Distributor"))).strip()
            product_kw = str(settings.get("SEARCH_KEYWORD", "Himalayan Sound Healing Bowls")).strip()

            # Personalize subject & body with fallbacks
            personalized_subject = cls.personalize_text(
                subject, buyer_name=buyer_name, company_name=company_name, country=country_val, buyer_type=buyer_type, product=product_kw
            )
            personalized_body = cls.personalize_text(
                body_template, buyer_name=buyer_name, company_name=company_name, country=country_val, buyer_type=buyer_type, product=product_kw
            )

            try:
                msg = MIMEMultipart()
                msg["From"] = smtp_user
                msg["To"] = raw_email
                msg["Subject"] = personalized_subject
                msg.attach(MIMEText(personalized_body, "plain", "utf-8"))

                if attach_presentation:
                    part = AttachmentHandler.create_mime_attachment()
                    if part:
                        msg.attach(part)

                success, smtp_msg = cls._send_smtp_with_retry(
                    smtp_host=smtp_host,
                    smtp_port=smtp_port,
                    smtp_user=smtp_user,
                    smtp_pass=smtp_pass,
                    msg=msg,
                    max_retries=3
                )

                if success:
                    ActivityLogger.log_send_event(
                        buyer_name=buyer_name,
                        company=company_name,
                        email=raw_email,
                        status="SENT",
                        mode=dispatch_mode,
                        classification=classification,
                        campaign=campaign_name
                    )
                    results["sent_count"] += 1
                    results["previews"].append({
                        "email": raw_email,
                        "buyer_name": buyer_name,
                        "company": company_name,
                        "country": country_val,
                        "subject": personalized_subject,
                        "body": personalized_body,
                        "attachment": "company_presentation.pdf" if attach_presentation else "None",
                        "status": "SENT"
                    })
                    contacted_set.add(raw_email)
                else:
                    ActivityLogger.log_send_event(
                        buyer_name=buyer_name,
                        company=company_name,
                        email=raw_email,
                        status="FAILED",
                        mode=dispatch_mode,
                        classification=classification,
                        campaign=campaign_name,
                        error=smtp_msg
                    )
                    results["failed_count"] += 1

                if send_delay > 0 and idx < len(recipients_to_send) - 1:
                    time.sleep(send_delay)

            except Exception as e:
                error_msg = f"Unexpected error during send: {str(e)}"
                ActivityLogger.log_send_event(
                    buyer_name=buyer_name,
                    company=company_name,
                    email=raw_email,
                    status="FAILED",
                    mode="SMTP",
                    classification=classification,
                    error=error_msg
                )
                results["failed_count"] += 1

        return results
