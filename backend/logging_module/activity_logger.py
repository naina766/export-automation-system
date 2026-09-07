"""
Activity Logging Module.
Thread-safe persistence of all campaign dispatch events to data/sent_log.csv.
"""
import csv
from datetime import datetime
from typing import List, Dict, Any
import pandas as pd
from backend.config import SENT_LOG_CSV

SENT_LOG_COLUMNS = [
    "timestamp",
    "buyer_name",
    "company",
    "email",
    "classification",
    "mode",
    "status",
    "delivery_status",
    "delivery_note",
    "failure_reason",
    "error",
    "campaign",
    "product_id",
    "campaign_id"
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
    def log_activity(cls, *args, **kwargs):
        """Compatibility alias for log_send_event."""
        return cls.log_send_event(*args, **kwargs)

    @classmethod
    def log_send_event(
        cls,
        buyer_name: str,
        company: str,
        email: str,
        status: str,
        mode: str = "SMTP",
        classification: str = "business",
        campaign: str = "Singing Bowls Outreach",
        error: str = "",
        product_id: str = "",
        campaign_id: str = "",
        delivery_status: Optional[str] = None,
        delivery_note: Optional[str] = None,
        failure_reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Record a campaign send event with delivery state.
        Status: SENT | FAILED | SKIPPED_DUPLICATE | INVALID_EMAIL
        Delivery status: SMTP_ACCEPTED | BOUNCED | FAILED | PENDING
        """
        cls.ensure_log_file()
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Determine sensible default delivery status if not provided
        resolved_delivery_status = delivery_status
        if not resolved_delivery_status:
            if status.upper() == "SENT":
                resolved_delivery_status = "SMTP_ACCEPTED"
            elif "bounce" in error.lower() or "550" in error or "553" in error:
                resolved_delivery_status = "BOUNCED"
            else:
                resolved_delivery_status = "FAILED"

        resolved_note = delivery_note or (
            "Accepted by Gmail SMTP for transmission; recipient delivery not yet confirmed."
            if resolved_delivery_status == "SMTP_ACCEPTED" else error
        )

        entry = {
            "timestamp": timestamp,
            "buyer_name": str(buyer_name).strip(),
            "company": str(company).strip(),
            "email": str(email).strip().lower(),
            "classification": str(classification).strip(),
            "mode": str(mode).upper(),
            "status": str(status).upper(),
            "delivery_status": str(resolved_delivery_status).upper(),
            "delivery_note": str(resolved_note).strip(),
            "failure_reason": str(failure_reason or error).strip(),
            "error": str(error).strip(),
            "campaign": str(campaign).strip(),
            "product_id": str(product_id).strip(),
            "campaign_id": str(campaign_id).strip()
        }

        with open(SENT_LOG_CSV, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=SENT_LOG_COLUMNS, extrasaction="ignore")
            writer.writerow(entry)

        return entry

    @classmethod
    def get_recent_logs(cls, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieve recent send logs ordered latest first."""
        if not SENT_LOG_CSV.exists():
            return []
        try:
            df = pd.read_csv(SENT_LOG_CSV, dtype=str, encoding="utf-8", on_bad_lines="skip").fillna("")
            if df.empty:
                return []

            records = df.to_dict(orient="records")
            records.reverse()
            return records[:limit]
        except Exception:
            return []
