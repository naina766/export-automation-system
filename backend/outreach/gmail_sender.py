"""
Outreach Dispatch Module.
Handles variable personalization, safe Demo Mode simulation, and Gmail SMTP transport.
"""
import time
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Dict, Any, Tuple
import pandas as pd
from config import (
    load_settings,
    get_gmail_credentials,
    get_email_mode,
    BUYERS_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV
)
from outreach.attachment_handler import AttachmentHandler
from logging_module.activity_logger import ActivityLogger
from validation.email_validator import EmailValidator

DEFAULT_SUBJECT = "Singing Bowls from Himalayan Craft Suppliers"
DEFAULT_BODY = """Hello {{buyer_name}},

I’m reaching out regarding {{company_name}} in {{country}}.

We supply authentic handcrafted Himalayan Singing Bowls and meditation instruments suitable for wellness stores, distributors, retailers, and importers.

Please find our product catalog and export specifications attached.

Regards,
Export Sales Team
Himalayan Artisans Export Ltd."""

class EmailSender:
    """Outreach campaign sender supporting Demo simulation and Gmail SMTP."""

    @staticmethod
    def personalize_text(template: str, buyer_name: str, company_name: str, country: str = "") -> str:
        """Replace {{buyer_name}}, {{company_name}}, and {{country}} placeholders."""
        clean_name = buyer_name.strip() if buyer_name.strip() else "Valued Partner"
        clean_company = company_name.strip() if company_name.strip() else "your organization"
        clean_country = country.strip() if country.strip() else "your region"

        text = template.replace("{{buyer_name}}", clean_name)
        text = text.replace("{{company_name}}", clean_company)
        text = text.replace("{{country}}", clean_country)
        return text

    @classmethod
    def get_recipients_by_audience(cls, audience: str) -> List[Dict[str, Any]]:
        """Fetch qualified recipients based on selected audience (business | individual | all)."""
        target_csv = None
        audience_lower = audience.lower()

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
    def send_campaign(
        cls,
        audience: str = "business",
        subject: str = DEFAULT_SUBJECT,
        body_template: str = DEFAULT_BODY,
        attach_presentation: bool = True
    ) -> Dict[str, Any]:
        """Executes campaign outreach safely in Demo mode or via SMTP."""
        settings = load_settings()
        email_mode = get_email_mode()
        max_emails = int(settings.get("MAX_EMAILS_PER_RUN", 50))
        send_delay = float(settings.get("SEND_DELAY", 2))
        smtp_host = settings.get("SMTP_HOST", "smtp.gmail.com")
        smtp_port = int(settings.get("SMTP_PORT", 587))

        recipients = cls.get_recipients_by_audience(audience)
        contacted_set = EmailValidator.get_contacted_emails()

        results = {
            "mode": email_mode.upper(),
            "audience": audience,
            "total_targeted": len(recipients),
            "sent_count": 0,
            "failed_count": 0,
            "skipped_duplicates": 0,
            "previews": [],
            "messages": []
        }

        if not recipients:
            results["messages"].append(f"No qualified recipients found in audience '{audience}'.")
            return results

        # Enforce batch limit
        recipients_to_send = recipients[:max_emails]
        if len(recipients) > max_emails:
            results["messages"].append(f"Batch limit applied: dispatching {max_emails} of {len(recipients)} leads.")

        # Check SMTP credentials if in SMTP mode
        smtp_user, smtp_pass = "", ""
        if email_mode == "smtp":
            smtp_user, smtp_pass = get_gmail_credentials()
            if not smtp_user or not smtp_pass:
                email_mode = "demo"
                results["mode"] = "DEMO (Fallback)"
                results["messages"].append("Gmail credentials not configured in .env. Switched safely to Demo Mode.")

        for idx, buyer in enumerate(recipients_to_send):
            raw_email = str(buyer.get("email", "")).strip().lower()
            buyer_name = str(buyer.get("name", "")).strip()
            company_name = str(buyer.get("company", "")).strip()
            country_val = str(buyer.get("country", "")).strip()
            classification = str(buyer.get("classification", audience)).strip()

            # Duplicate / Already contacted check
            if raw_email in contacted_set:
                ActivityLogger.log_send_event(
                    buyer_name=buyer_name,
                    company=company_name,
                    email=raw_email,
                    status="SKIPPED_DUPLICATE",
                    mode=email_mode,
                    classification=classification,
                    error="Already contacted in a previous run"
                )
                results["skipped_duplicates"] += 1
                continue

            # Personalize subject & body
            personalized_subject = cls.personalize_text(subject, buyer_name, company_name, country_val)
            personalized_body = cls.personalize_text(body_template, buyer_name, company_name, country_val)

            if email_mode == "demo":
                # Simulated dispatch (Zero network connection)
                time.sleep(min(send_delay, 0.2))
                status = "DEMO_SENT"
                ActivityLogger.log_send_event(
                    buyer_name=buyer_name,
                    company=company_name,
                    email=raw_email,
                    status=status,
                    mode="DEMO",
                    classification=classification
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
                    "status": "DEMO_SENT"
                })
                contacted_set.add(raw_email)

            elif email_mode == "smtp":
                try:
                    msg = MIMEMultipart()
                    msg["From"] = smtp_user
                    msg["To"] = raw_email
                    msg["Subject"] = personalized_subject
                    msg.attach(MIMEText(personalized_body, "plain"))

                    if attach_presentation:
                        part = AttachmentHandler.create_mime_attachment()
                        if part:
                            msg.attach(part)

                    server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
                    server.quit()

                    ActivityLogger.log_send_event(
                        buyer_name=buyer_name,
                        company=company_name,
                        email=raw_email,
                        status="SENT",
                        mode="SMTP",
                        classification=classification
                    )
                    results["sent_count"] += 1
                    contacted_set.add(raw_email)

                    if send_delay > 0 and idx < len(recipients_to_send) - 1:
                        time.sleep(send_delay)

                except Exception as e:
                    error_msg = f"SMTP error: {str(e)}"
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
