import os, sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
load_dotenv(ROOT / ".env")

from classification.gemini_classifier import LeadClassifier

success, status_code, msg, summary = LeadClassifier.execute_qualification()
print("Success:", success)
print("Status:", status_code)
print("Message:", msg)
print("Summary:", summary)
