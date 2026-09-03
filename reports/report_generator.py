"""
Report Generator Module.
Aggregates lead discovery, validation, classification, and email outreach statistics.
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
            "total_buyers": 0,
            "valid_emails": 0,
            "invalid_emails": 0,
            "missing_emails": 0,
            "business_contacts": 0,
            "individual_contacts": 0,
            "already_contacted": 0,
            "total_campaign_recipients": 0,
            "successful_sends": 0,
            "failed_sends": 0,
            "duplicates_skipped": 0,
            "success_rate": 0.0,
            "recent_logs": []
        }

        # Analyze buyers.csv
        if BUYERS_CSV.exists():
            try:
                buyers_df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
                metrics["total_buyers"] = len(buyers_df)
                if "email_status" in buyers_df.columns:
                    metrics["valid_emails"] = len(buyers_df[buyers_df["email_status"] == "valid"])
                    metrics["invalid_emails"] = len(buyers_df[buyers_df["email_status"] == "invalid"])
                    metrics["missing_emails"] = len(buyers_df[buyers_df["email_status"] == "missing"])
                if "already_contacted" in buyers_df.columns:
                    metrics["already_contacted"] = len(buyers_df[buyers_df["already_contacted"].astype(str).str.lower() == "true"])
            except Exception as e:
                print(f"Error reading buyers.csv for metrics: {e}")

        # Analyze business & individual counts
        if BUSINESS_EMAILS_CSV.exists():
            try:
                biz_df = pd.read_csv(BUSINESS_EMAILS_CSV, dtype=str)
                metrics["business_contacts"] = len(biz_df)
            except Exception:
                pass

        if INDIVIDUAL_EMAILS_CSV.exists():
            try:
                ind_df = pd.read_csv(INDIVIDUAL_EMAILS_CSV, dtype=str)
                metrics["individual_contacts"] = len(ind_df)
            except Exception:
                pass

        # Analyze sent_log.csv
        if SENT_LOG_CSV.exists():
            try:
                sent_df = pd.read_csv(SENT_LOG_CSV, dtype=str).fillna("")
                if not sent_df.empty:
                    statuses = sent_df["status"].tolist()
                    successful = sum(1 for s in statuses if s in ["sent", "demo_sent"])
                    failed = sum(1 for s in statuses if s == "failed")
                    skipped = sum(1 for s in statuses if s == "skipped_duplicate")

                    metrics["successful_sends"] = successful
                    metrics["failed_sends"] = failed
                    metrics["duplicates_skipped"] = skipped
                    metrics["total_campaign_recipients"] = len(sent_df)

                    attempted = successful + failed
                    if attempted > 0:
                        metrics["success_rate"] = round((successful / attempted) * 100, 1)
                    else:
                        metrics["success_rate"] = 0.0

                    recent = sent_df.to_dict(orient="records")
                    recent.reverse()
                    metrics["recent_logs"] = recent[:50]
            except Exception as e:
                print(f"Error reading sent_log.csv for metrics: {e}")

        return metrics

    @classmethod
    def generate_csv_report_string(cls) -> str:
        """Export combined metrics and send log as downloadable CSV text."""
        metrics = cls.get_campaign_metrics()
        
        output_lines = [
            "# EXPORT AUTOMATION SYSTEM - CAMPAIGN REPORT",
            f"Generated At,{pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "# METRIC SUMMARY",
            "Metric,Value",
            f"Total Buyers Imported,{metrics['total_buyers']}",
            f"Valid Emails,{metrics['valid_emails']}",
            f"Invalid Emails,{metrics['invalid_emails']}",
            f"Missing Emails,{metrics['missing_emails']}",
            f"Business Contacts Segmented,{metrics['business_contacts']}",
            f"Individual Contacts Segmented,{metrics['individual_contacts']}",
            f"Successful Sends (Live & Demo),{metrics['successful_sends']}",
            f"Failed Sends,{metrics['failed_sends']}",
            f"Duplicate Sends Skipped,{metrics['duplicates_skipped']}",
            f"Campaign Success Rate,{metrics['success_rate']}%",
            "",
            "# OUTREACH ACTIVITY LOG",
            "email_address,buyer_name,company_name,timestamp,status,campaign,error"
        ]

        if SENT_LOG_CSV.exists():
            try:
                df = pd.read_csv(SENT_LOG_CSV, dtype=str).fillna("")
                for _, row in df.iterrows():
                    line = f'"{row.get("email_address","")}","{row.get("buyer_name","")}","{row.get("company_name","")}","{row.get("timestamp","")}","{row.get("status","")}","{row.get("campaign","")}","{row.get("error","")}"'
                    output_lines.append(line)
            except Exception:
                pass

        return "\n".join(output_lines)
