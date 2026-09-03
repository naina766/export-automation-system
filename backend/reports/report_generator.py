"""
Report Generator & Analytics Module.
Calculates executive business metrics, pipeline conversion stages, segment breakdowns, and data hygiene statistics.
"""
from typing import Dict, Any, List, Optional
from pathlib import Path
import pandas as pd
from config import (
    BUYERS_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV,
    SENT_LOG_CSV
)

class ReportGenerator:
    """Generates executive analytics summaries and exportable CSV reports."""

    @classmethod
    def get_campaign_metrics(cls, product_id: Optional[str] = None) -> Dict[str, Any]:
        """Calculates comprehensive executive campaign metrics from real data with optional product filter."""
        metrics: Dict[str, Any] = {
            "product_id": product_id,
            "total_leads": 0,
            "valid_emails": 0,
            "invalid_emails": 0,
            "missing_emails": 0,
            "duplicates": 0,
            "business_leads": 0,
            "individual_leads": 0,
            "qualified_buyers": 0,
            "campaign_ready": 0,
            "emails_attempted": 0,
            "successful_sends": 0,
            "failed_sends": 0,
            "test_sends": 0,
            "test_attempts": 0,
            "skipped_leads": 0,
            "success_rate": None,  # None indicates no campaigns have been run yet
            "campaigns_count": 0,
            "countries": [],
            "countries_count": 0,
            "countries_covered": 0,
            "buyer_segments": [],
            "products_summary": [],
            "data_hygiene": {
                "valid_contacts": 0,
                "invalid_emails": 0,
                "missing_emails": 0,
                "duplicates_removed": 0
            },
            "pipeline_stages": {
                "discovery": 0,
                "validation": 0,
                "qualification": 0,
                "campaign_ready": 0,
                "outreach": 0
            },
            "recent_activity": []
        }

        # Products breakdown summary
        try:
            from products.catalog import ProductCatalog
            all_prods = ProductCatalog.list_products()
            metrics["products_summary"] = [
                {"id": p.get("id"), "name": p.get("name"), "active": p.get("active", False)}
                for p in all_prods
            ]
        except Exception:
            metrics["products_summary"] = []

        # 1. Analyze buyers.csv
        if BUYERS_CSV.exists():
            try:
                df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
                if product_id and "product_id" in df.columns:
                    df = df[df["product_id"] == product_id]
                total_count = len(df)
                metrics["total_leads"] = total_count

                if "email_status" in df.columns:
                    valid_mask = df["email_status"] == "valid"
                    invalid_mask = df["email_status"] == "invalid"
                    missing_mask = df["email_status"] == "missing"
                    
                    v_count = int(valid_mask.sum())
                    inv_count = int(invalid_mask.sum())
                    miss_count = int(missing_mask.sum())
                    
                    metrics["valid_emails"] = v_count
                    metrics["invalid_emails"] = inv_count
                    metrics["missing_emails"] = miss_count
                    metrics["data_hygiene"]["valid_contacts"] = v_count
                    metrics["data_hygiene"]["invalid_emails"] = inv_count
                    metrics["data_hygiene"]["missing_emails"] = miss_count

                if "is_duplicate" in df.columns:
                    dup_count = int((df["is_duplicate"].astype(str).str.lower() == "true").sum())
                    metrics["duplicates"] = dup_count
                    metrics["data_hygiene"]["duplicates_removed"] = dup_count

                if "country" in df.columns:
                    valid_countries = [c.strip() for c in df["country"].dropna() if c.strip()]
                    unique_countries = list(set(valid_countries))
                    metrics["countries"] = unique_countries
                    metrics["countries_count"] = len(unique_countries)
                    metrics["countries_covered"] = len(unique_countries)

                # Buyer segment breakdown
                segment_col = None
                if "buyer_type" in df.columns and df["buyer_type"].replace("", None).dropna().any():
                    segment_col = "buyer_type"
                elif "classification" in df.columns and df["classification"].replace("", None).dropna().any():
                    segment_col = "classification"

                if segment_col:
                    valid_segments = df[df[segment_col].str.strip() != ""][segment_col].value_counts()
                    seg_total = valid_segments.sum()
                    segments_list = []
                    for name, count in valid_segments.items():
                        pct = float(round((count / seg_total) * 100, 1)) if seg_total > 0 else 0.0
                        segments_list.append({
                            "name": str(name).strip().title() if len(str(name)) > 3 else str(name).upper(),
                            "count": int(count),
                            "percentage": pct
                        })
                    metrics["buyer_segments"] = segments_list

            except Exception as e:
                print(f"Error analyzing buyers.csv: {e}")

        # 2. Analyze business & individual classification datasets
        if BUSINESS_EMAILS_CSV.exists():
            try:
                biz_df = pd.read_csv(BUSINESS_EMAILS_CSV, dtype=str).fillna("")
                metrics["business_leads"] = len(biz_df)
                metrics["qualified_buyers"] = len(biz_df)

                # Campaign ready: valid email & not duplicate & not already contacted
                if not biz_df.empty:
                    ready_mask = (biz_df.get("email_status", "valid") == "valid") & \
                                 (biz_df.get("is_duplicate", "False").astype(str).str.lower() != "true") & \
                                 (biz_df.get("already_contacted", "False").astype(str).str.lower() != "true")
                    metrics["campaign_ready"] = int(ready_mask.sum())
            except Exception:
                pass

        if INDIVIDUAL_EMAILS_CSV.exists():
            try:
                ind_df = pd.read_csv(INDIVIDUAL_EMAILS_CSV, dtype=str).fillna("")
                metrics["individual_leads"] = len(ind_df)
            except Exception:
                pass

        # 3. Analyze sent_log.csv
        if SENT_LOG_CSV.exists():
            try:
                sent_df = pd.read_csv(SENT_LOG_CSV, dtype=str).fillna("")
                if product_id and "product_id" in sent_df.columns:
                    sent_df = sent_df[sent_df["product_id"] == product_id]
                if not sent_df.empty:
                    prod_successful = 0
                    prod_failed = 0
                    prod_skipped = 0
                    test_sends = 0
                    test_attempts = 0
                    prod_campaigns = set()
                    annotated_logs = []

                    for _, row in sent_df.iterrows():
                        status = str(row.get("status", "")).strip().upper()
                        mode = str(row.get("mode", "")).strip().upper()
                        classification = str(row.get("classification", "")).strip().lower()
                        campaign = str(row.get("campaign", "")).strip()
                        email = str(row.get("email", "")).strip().lower()

                        is_test = (
                            mode in ["SMTP_TEST", "TEST"]
                            or classification == "custom"
                            or "test" in campaign.lower()
                            or email.endswith(".example")
                        )

                        rec = row.to_dict()
                        rec["is_test"] = is_test
                        rec["event_type"] = "TEST" if is_test else "CAMPAIGN"
                        annotated_logs.append(rec)

                        if is_test:
                            if status == "SENT":
                                test_sends += 1
                            test_attempts += 1
                        else:
                            if status == "SENT":
                                prod_successful += 1
                                if campaign:
                                    prod_campaigns.add(campaign)
                            elif status == "FAILED":
                                prod_failed += 1
                                if campaign:
                                    prod_campaigns.add(campaign)
                            elif status in ["SKIPPED_DUPLICATE", "INVALID_EMAIL"]:
                                prod_skipped += 1

                    prod_attempted = prod_successful + prod_failed
                    metrics["emails_attempted"] = prod_attempted
                    metrics["successful_sends"] = prod_successful
                    metrics["failed_sends"] = prod_failed
                    metrics["skipped_leads"] = prod_skipped
                    metrics["test_sends"] = test_sends
                    metrics["test_attempts"] = test_attempts
                    metrics["campaigns_count"] = len(prod_campaigns)

                    annotated_logs.reverse()
                    metrics["recent_activity"] = annotated_logs[:40]
            except Exception as e:
                print(f"Error reading sent_log.csv: {e}")

        # Calculate conversion rates
        if metrics["total_leads"] > 0:
            metrics["validation_rate"] = float(round((metrics["valid_emails"] / metrics["total_leads"]) * 100, 1))

        if metrics["emails_attempted"] > 0:
            metrics["success_rate"] = float(round((metrics["successful_sends"] / metrics["emails_attempted"]) * 100, 1))
        else:
            metrics["success_rate"] = None

        # Aliases for real discovery-first dashboard workflow
        metrics["total_buyers_discovered"] = metrics["total_leads"]
        metrics["valid_contact_emails"] = metrics["valid_emails"]
        metrics["ai_qualified_buyers"] = metrics.get("qualified_buyers", metrics["business_leads"])
        metrics["emails_sent"] = metrics["successful_sends"]
        metrics["emails_failed"] = metrics["failed_sends"]
        metrics["duplicates_skipped"] = metrics["duplicates"]
        metrics["countries_covered"] = metrics["countries_count"]

        # 4. Synthesize pipeline stages based strictly on production data
        metrics["pipeline_stages"] = {
            "discovery": metrics["total_leads"],
            "validation": metrics["valid_emails"],
            "qualification": metrics["qualified_buyers"],
            "campaign_ready": metrics["campaign_ready"],
            "outreach": metrics["successful_sends"]
        }

        return metrics

    @classmethod
    def generate_csv_report_string(cls) -> str:
        """Export combined metrics and send log as downloadable CSV text."""
        metrics = cls.get_campaign_metrics()

        rate_display = f"{metrics['success_rate']}%" if metrics['success_rate'] is not None else "No campaigns yet"

        output_lines = [
            "# EXPORT AUTOMATION SYSTEM — CAMPAIGN PERFORMANCE REPORT",
            f"Generated At,{pd.Timestamp.now().strftime('%Y-%m-%d %H:%M:%S')}",
            "",
            "# EXECUTIVE KPI SUMMARY",
            "Metric,Value",
            f"Total Leads Discovered,{metrics['total_leads']}",
            f"Valid Contacts (Syntax & Domain),{metrics['valid_emails']}",
            f"Invalid Contacts,{metrics['invalid_emails']}",
            f"Missing Contacts,{metrics['missing_emails']}",
            f"Duplicates Removed,{metrics['duplicates']}",
            f"Qualified B2B Buyers,{metrics['qualified_buyers']}",
            f"Campaign Ready Pool,{metrics['campaign_ready']}",
            f"Emails Attempted,{metrics['emails_attempted']}",
            f"Successful Sends (SMTP),{metrics['successful_sends']}",
            f"Test Dispatches (Verified),{metrics.get('test_sends', 0)}",
            f"Failed Sends,{metrics['failed_sends']}",
            f"Delivery Success Rate,{rate_display}",
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
