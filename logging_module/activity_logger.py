"""
Activity Logger Module.
Persists campaign send activities and history to data/sent_log.csv.
"""
import csv
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
import pandas as pd
from config import SENT_LOG_CSV

SENT_LOG_COLUMNS = [
    "email_address",
    "buyer_name",
    "company_name",
    "timestamp",
    "status",
    "campaign",
    "error"
]

class ActivityLogger:
    """Thread-safe CSV activity logger."""

    @classmethod
    def ensure_log_file(cls):
        """Ensure sent_log.csv exists with header."""
        if not SENT_LOG_CSV.exists():
            SENT_LOG_CSV.parent.mkdir(parents=True, exist_ok=True)
            with open(SENT_LOG_CSV, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(SENT_LOG_COLUMNS)

    @classmethod
    def log_send_event(
        cls,
        email_address: str,
        buyer_name: str,
        company_name: str,
        status: str,
        campaign: str = "Singing Bowls Export Outreach",
        error: str = ""
    ) -> Dict[str, Any]:
        """
        Record a send event.
        Status: 'sent' | 'demo_sent' | 'failed' | 'skipped_duplicate'
        """
        cls.ensure_log_file()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        entry = {
            "email_address": str(email_address).strip().lower(),
            "buyer_name": str(buyer_name).strip(),
            "company_name": str(company_name).strip(),
            "timestamp": timestamp,
            "status": status,
            "campaign": campaign,
            "error": error
        }

        with open(SENT_LOG_CSV, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=SENT_LOG_COLUMNS)
            writer.writerow(entry)

        return entry

    @classmethod
    def get_recent_logs(cls, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieve recent send logs ordered from newest to oldest."""
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
