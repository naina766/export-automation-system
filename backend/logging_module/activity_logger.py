"""
Activity Logging Module.
Thread-safe persistence of all campaign dispatch events to data/sent_log.csv.
"""
import csv
from datetime import datetime
from typing import List, Dict, Any
import pandas as pd
from config import SENT_LOG_CSV

SENT_LOG_COLUMNS = [
    "timestamp",
    "buyer_name",
    "company",
    "email",
    "classification",
    "mode",
    "status",
    "error",
    "campaign"
]

class ActivityLogger:
    """Thread-safe CSV activity logger."""

    @classmethod
    def ensure_log_file(cls):
        """Ensure sent_log.csv exists with schema headers."""
        if not SENT_LOG_CSV.exists():
            SENT_LOG_CSV.parent.mkdir(parents=True, exist_ok=True)
            with open(SENT_LOG_CSV, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(SENT_LOG_COLUMNS)

    @classmethod
    def log_send_event(
        cls,
        buyer_name: str,
        company: str,
        email: str,
        status: str,
        mode: str = "demo",
        classification: str = "business",
        campaign: str = "Singing Bowls Outreach",
        error: str = ""
    ) -> Dict[str, Any]:
        """
        Record a campaign send event.
        Allowed status: DEMO_SENT | SENT | FAILED | SKIPPED_DUPLICATE | INVALID_EMAIL
        """
        cls.ensure_log_file()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = {
            "timestamp": timestamp,
            "buyer_name": str(buyer_name).strip(),
            "company": str(company).strip(),
            "email": str(email).strip().lower(),
            "classification": str(classification).strip(),
            "mode": str(mode).upper(),
            "status": str(status).upper(),
            "error": str(error).strip(),
            "campaign": str(campaign).strip()
        }

        with open(SENT_LOG_CSV, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=SENT_LOG_COLUMNS)
            writer.writerow(entry)

        return entry

    @classmethod
    def get_recent_logs(cls, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve recent send logs ordered latest first."""
        if not SENT_LOG_CSV.exists():
            return []
        try:
            df = pd.read_csv(SENT_LOG_CSV, dtype=str).fillna("")
            if df.empty:
                return []
            records = df.to_dict(orient="records")
            records.reverse()
            return records[:limit]
        except Exception:
            return []
