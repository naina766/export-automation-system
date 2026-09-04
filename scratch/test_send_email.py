import os, sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
load_dotenv(ROOT / ".env")

from outreach.gmail_sender import EmailSender

sender_email, sender_pass = os.getenv("GMAIL_EMAIL"), os.getenv("GMAIL_APP_PASSWORD")
print("Sender:", sender_email)
print("Pass configured:", bool(sender_pass))

# Test send
to_email = sender_email # Send test email to self
subject = "Export Automation System — Test Outreach Verification"
body = "Hello,\n\nThis is a verification test email from the Export Automation System.\n\nBest regards,\nExport Sales Team"

success, error = EmailSender.send_smtp_email(
    to_email=to_email,
    subject=subject,
    body_text=body,
    attachment_path="assets/company_presentation.pdf"
)

print("\n--- Result ---")
print("Success:", success)
print("Error:", error)
