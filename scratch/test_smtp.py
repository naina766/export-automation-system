import os, sys, smtplib
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
load_dotenv(ROOT / ".env")

gmail_email = os.getenv("GMAIL_EMAIL")
gmail_pass = os.getenv("GMAIL_APP_PASSWORD")
smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
smtp_port = int(os.getenv("SMTP_PORT", 587))

print(f"Testing SMTP for: {gmail_email}")
print(f"Host: {smtp_host}:{smtp_port}")
print(f"Pass length: {len(gmail_pass) if gmail_pass else 0}")

try:
    server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
    server.starttls()
    # Note: App password might have spaces or not
    clean_pass = gmail_pass.replace(" ", "") if gmail_pass else ""
    server.login(gmail_email, clean_pass)
    print("SMTP LOGIN SUCCESSFUL! Authenticated with clean_pass.")
    server.quit()
except Exception as e1:
    print(f"Failed with clean_pass ({clean_pass}): {e1}")
    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(gmail_email, gmail_pass)
        print("SMTP LOGIN SUCCESSFUL with original raw pass!")
        server.quit()
    except Exception as e2:
        print(f"Failed with raw pass: {e2}")
