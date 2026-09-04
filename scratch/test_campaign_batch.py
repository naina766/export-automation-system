import os, sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
load_dotenv(ROOT / ".env")

from outreach.gmail_sender import EmailSender

# Let's check eligibility of all leads currently in buyers.csv
import pandas as pd
from config import BUYERS_CSV

df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
print(f"Total leads in buyers.csv: {len(df)}")
for _, row in df.iterrows():
    lead_dict = row.to_dict()
    eligible, reason = EmailSender._check_lead_eligibility(lead_dict) if hasattr(EmailSender, "_check_lead_eligibility") else (True, "ok")
    from outreach.gmail_sender import is_outreach_eligible
    el, r = is_outreach_eligible(lead_dict)
    print(f"- {lead_dict.get('company_name') or lead_dict.get('company')}: eligible={el}, reason='{r}'")
