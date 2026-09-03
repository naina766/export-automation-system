"""
Outreach Dispatch Module.
Handles email personalization, safe Demo Mode simulation, and Gmail SMTP transport.
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

DEFAULT_SUBJECT = "Wholesale Singing Bowls Catalog & Export Partnership"
DEFAULT_BODY = """Hello {{buyer_name}},

We are an export company specializing in authentic, handcrafted Himalayan Singing Bowls and sound healing instruments.

We would be pleased to explore a potential export partnership with {{company_name}}.

Please find our product catalog and export specifications attached.

Best regards,
Export Sales Team
Himalayan Artisans Export Ltd."""

class EmailSender:
    """Outreach campaign sender supporting Demo simulation and Gmail SMTP."""

    @staticmethod
    def personalize_text(template: str, buyer_name: str, company_name: str) -> str:
        """Replace {{buyer_name}} and {{company_name}} placeholders."""
        clean_name = buyer_name.strip() if buyer_name.strip() else "Valued Partner"
        clean_company = company_name.strip() if company_name.strip() else "your organization"
        
        text = template.replace("{{buyer_name}}", clean_name)
        text = text.replace("{{company_name}}", clean_company)
        return text

    @classmethod
    def get_recipients_by_audience(cls, audience: str) -> List[Dict[str, Any]]:
        """
        Fetch qualified recipients based on selected audience:
        'business' | 'individual' | 'all'
        """
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

            # Filter valid emails, non-duplicates
            filtered = df[
                (df.get("email_status", "valid") == "valid") & 
                (df.get("is_duplicate", "False").astype(str).str.lower() != "true")
            ]

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
        audience: str,
        subject: str,
        body_template: str,
        attach_presentation: bool = True
    ) -> Dict[str, Any]:
        """
        Executes campaign outreach.
        In demo mode: Simulates send, generates previews, logs to sent_log.csv as 'demo_sent'.
        In smtp mode: Authenticates with Gmail SMTP, sends email, logs as 'sent' or 'failed'.
        """
        settings = load_settings()
        email_mode = get_email_mode()
        daily_limit = int(settings.get("DAILY_SEND_LIMIT", 10))
        send_delay = float(settings.get("SEND_DELAY", 2))

        recipients = cls.get_recipients_by_audience(audience)
        contacted_set = EmailValidator.get_contacted_emails()

        results = {
            "mode": email_mode,
            "audience": audience,
            "total_targeted": len(recipients),
            "sent_count": 0,
            "failed_count": 0,
            "skipped_duplicates": 0,
            "previews": [],
            "messages": []
        }

        if not recipients:
            results["messages"].append("No valid recipients found for the selected audience.")
            return results

        # Enforce daily limit
        recipients_to_send = recipients[:daily_limit]
        if len(recipients) > daily_limit:
            results["messages"].append(f"Daily send limit applied: sending {daily_limit} of {len(recipients)} leads.")

        # Check SMTP credentials if in SMTP mode
        smtp_user, smtp_pass = "", ""
        if email_mode == "smtp":
            smtp_user, smtp_pass = get_gmail_credentials()
            if not smtp_user or not smtp_pass:
                results["mode"] = "demo (fallback)"
                email_mode = "demo"
                results["messages"].append("Gmail credentials missing in .env. Switched safely to Demo Mode.")

        for idx, buyer in enumerate(recipients_to_send):
            raw_email = str(buyer.get("email", "")).strip().lower()
            buyer_name = str(buyer.get("buyer_name", "")).strip()
            company_name = str(buyer.get("company_name", "")).strip()

            # Duplicate / Already contacted check
            if raw_email in contacted_set:
                ActivityLogger.log_send_event(
                    email_address=raw_email,
                    buyer_name=buyer_name,
                    company_name=company_name,
                    status="skipped_duplicate",
                    error="Already contacted in a previous campaign"
                )
                results["skipped_duplicates"] += 1
                continue

            # Personalize content
            personalized_subject = cls.personalize_text(subject, buyer_name, company_name)
            personalized_body = cls.personalize_text(body_template, buyer_name, company_name)

            if email_mode == "demo":
                # Simulated dispatch
                time.sleep(min(send_delay, 0.5)) # Slight UI feel without blocking too long
                status = "demo_sent"
                ActivityLogger.log_send_event(
                    email_address=raw_email,
                    buyer_name=buyer_name,
                    company_name=company_name,
                    status=status
                )
                results["sent_count"] += 1
                results["previews"].append({
                    "recipient": raw_email,
                    "buyer_name": buyer_name,
                    "company_name": company_name,
                    "subject": personalized_subject,
                    "body": personalized_body,
                    "attachment": "company_presentation.pdf" if attach_presentation else "None",
                    "status": "Simulated Delivery (Demo)"
                })
                # Add to contacted set for this session
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

                    # Send through Gmail SMTP
                    server = smtplib.SMTP("smtp.gmail.com", 587, timeout=10)
                    server.starttls()
                    server.login(smtp_user, smtp_pass)
                    server.send_message(msg)
                    server.quit()

                    ActivityLogger.log_send_event(
                        email_address=raw_email,
                        buyer_name=buyer_name,
                        company_name=company_name,
                        status="sent"
                    )
                    results["sent_count"] += 1
                    contacted_set.add(raw_email)

                    if send_delay > 0 and idx < len(recipients_to_send) - 1:
                        time.sleep(send_delay)

                except Exception as e:
                    error_msg = f"SMTP error: {str(e)}"
                    ActivityLogger.log_send_event(
                        email_address=raw_email,
                        buyer_name=buyer_name,
                        company_name=company_name,
                        status="failed",
                        error=error_msg
                    )
                    results["failed_count"] += 1

        return results
