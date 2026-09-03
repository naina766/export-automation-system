"""
Report Generator & Analytics Module.
Calculates lead discovery, validation, classification, and campaign outreach performance metrics.
"""
from typing import Dict, Any, List
import pandas as pd
from config import (
    BUYERS_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV,
    SENT_LOG_CSV
)

class ReportGenerator:
    """Generates analytics summaries and exportable CSV reports."""

    @classmethod
    def get_campaign_metrics(cls) -> Dict[str, Any]:
        """Calculates comprehensive campaign metrics."""
        metrics = {
            "total_leads": 0,
            "valid_emails": 0,
            "invalid_emails": 0,
            "duplicates": 0,
            "business_leads": 0,
            "individual_leads": 0,
            "emails_attempted": 0,
            "successful_sends": 0,
            "failed_sends": 0,
            "skipped_leads": 0,
            "success_rate": 0.0,
            "recent_activity": []
        }

        # Analyze buyers.csv
        if BUYERS_CSV.exists():
            try:
                df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
                metrics["total_leads"] = len(df)
                if "email_status" in df.columns:
                    metrics["valid_emails"] = int((df["email_status"] == "valid").sum())
                    metrics["invalid_emails"] = int((df["email_status"] == "invalid").sum()) + int((df["email_status"] == "missing").sum())
                if "is_duplicate" in df.columns:
                    metrics["duplicates"] = int((df["is_duplicate"].astype(str).str.lower() == "true").sum())
            except Exception as e:
                print(f"Error analyzing buyers.csv: {e}")

        # Analyze business & individual counts
        if BUSINESS_EMAILS_CSV.exists():
            try:
                biz_df = pd.read_csv(BUSINESS_EMAILS_CSV, dtype=str)
                metrics["business_leads"] = len(biz_df)
            except Exception:
                pass

        if INDIVIDUAL_EMAILS_CSV.exists():
            try:
                ind_df = pd.read_csv(INDIVIDUAL_EMAILS_CSV, dtype=str)
                metrics["individual_leads"] = len(ind_df)
            except Exception:
                pass

        # Analyze sent_log.csv
        if SENT_LOG_CSV.exists():
            try:
                sent_df = pd.read_csv(SENT_LOG_CSV, dtype=str).fillna("")
                if not sent_df.empty:
                    statuses = sent_df["status"].astype(str).str.upper().tolist()
                    successful = sum(1 for s in statuses if s in ["SENT", "DEMO_SENT"])
                    failed = sum(1 for s in statuses if s == "FAILED")
                    skipped = sum(1 for s in statuses if s in ["SKIPPED_DUPLICATE", "INVALID_EMAIL"])

                    attempted = successful + failed
                    metrics["emails_attempted"] = attempted
                    metrics["successful_sends"] = successful
                    metrics["failed_sends"] = failed
                    metrics["skipped_leads"] = skipped

                    if attempted > 0:
                        metrics["success_rate"] = round((successful / attempted) * 100, 2)
                    else:
                        metrics["success_rate"] = 0.0

                    recent = sent_df.to_dict(orient="records")
                    recent.reverse()
                    metrics["recent_activity"] = recent[:50]
            except Exception as e:
                print(f"Error reading sent_log.csv: {e}")

        return metrics

    @classmethod
    def generate_csv_report_string(cls) -> str:
        """Export combined metrics and send log as downloadable CSV text."""
        metrics = cls.get_campaign_metrics()

        output_lines = [
            "# EXPORT AUTOMATION SYSTEM — CAMPAIGN PERFORMANCE REPORT",
            f"Generated At,{pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "# KPI SUMMARY",
            "Metric,Value",
            f"Total Leads Ingested,{metrics['total_leads']}",
            f"Valid Emails,{metrics['valid_emails']}",
            f"Invalid Emails,{metrics['invalid_emails']}",
            f"Duplicates Removed,{metrics['duplicates']}",
            f"B2B Business Leads,{metrics['business_leads']}",
            f"Individual Leads,{metrics['individual_leads']}",
            f"Emails Attempted,{metrics['emails_attempted']}",
            f"Successful Sends (Live & Demo),{metrics['successful_sends']}",
            f"Failed Sends,{metrics['failed_sends']}",
            f"Skipped Leads,{metrics['skipped_leads']}",
            f"Delivery Success Rate,{metrics['success_rate']}%",
            "",
            "# OUTREACH ACTIVITY LOG",
            "timestamp,buyer_name,company,email,classification,mode,status,error,campaign"
        ]

        if SENT_LOG_CSV.exists():
            try:
                df = pd.read_csv(SENT_LOG_CSV, dtype=str).fillna("")
                for _, row in df.iterrows():
                    line = f'"{row.get("timestamp","")}","{row.get("buyer_name","")}","{row.get("company","")}","{row.get("email","")}","{row.get("classification","")}","{row.get("mode","")}","{row.get("status","")}","{row.get("error","")}","{row.get("campaign","")}"'
                    output_lines.append(line)
            except Exception:
                pass

        return "\n".join(output_lines)
