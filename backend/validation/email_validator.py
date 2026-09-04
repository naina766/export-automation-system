"""
Email Validation & Duplicate Detection Module.
Provides syntax verification, normalization, in-memory deduplication, and suppression checks against sent_log.csv.
"""
import re
from typing import Dict, Any, List, Set, Tuple, Optional
import pandas as pd
from email_validator import validate_email as ext_validate_email, EmailNotValidError
from config import SENT_LOG_CSV

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

def validate_email_address(email: Optional[str]) -> Dict[str, Any]:
    """
    Validate and normalize email address syntax.
    Returns: {
        "email": Optional[str],
        "status": "missing" | "invalid" | "valid",
        "syntax_valid": bool,
        "normalized_email": str,
        "valid": bool, # For backwards compatibility
        "reason": str
    }
    """
    if not email or not str(email).strip() or str(email).strip().lower() in ["none", "null", "undefined"]:
        return {
            "email": None,
            "status": "missing",
            "syntax_valid": False,
            "valid": False,
            "normalized_email": "",
            "reason": "Missing email address"
        }
    
    cleaned = str(email).strip().lower()
    
    # Check syntax pattern
    if not EMAIL_REGEX.match(cleaned):
        return {
            "email": cleaned,
            "status": "invalid",
            "syntax_valid": False,
            "valid": False,
            "normalized_email": cleaned,
            "reason": "Malformed email format"
        }

    # Reject reserved RFC placeholder and test domains for live outreach
    domain = cleaned.split("@")[-1]
    if domain in ["example.com", "example.org", "example.net"] or domain.endswith((".example", ".test", ".invalid", ".localhost")):
        return {
            "email": cleaned,
            "status": "invalid",
            "syntax_valid": False,
            "valid": False,
            "normalized_email": cleaned,
            "reason": f"Reserved placeholder domain '@{domain}' is not an active production mailbox"
        }

    try:
        valid_res = ext_validate_email(cleaned, check_deliverability=False)
        norm = valid_res.normalized.lower()
        return {
            "email": norm,
            "status": "valid",
            "syntax_valid": True,
            "valid": True,
            "normalized_email": norm,
            "reason": "Syntax Valid"
        }
    except EmailNotValidError as e:
        return {
            "email": cleaned,
            "status": "invalid",
            "syntax_valid": False,
            "valid": False,
            "normalized_email": cleaned,
            "reason": str(e)
        }
    except Exception:
        if EMAIL_REGEX.match(cleaned):
            return {
                "email": cleaned,
                "status": "valid",
                "syntax_valid": True,
                "valid": True,
                "normalized_email": cleaned,
                "reason": "Syntax Valid"
            }
        return {
            "email": cleaned,
            "status": "invalid",
            "syntax_valid": False,
            "valid": False,
            "normalized_email": cleaned,
            "reason": "Invalid email format"
        }

class EmailValidator:
    """Batch validator and deduplicator for buyer datasets."""

    @classmethod
    def get_contacted_emails(cls) -> Set[str]:
        """Retrieve set of lowercase email addresses that have already been contacted."""
        if not SENT_LOG_CSV.exists():
            return set()
        try:
            df = pd.read_csv(SENT_LOG_CSV, dtype=str)
            if "email" in df.columns and "status" in df.columns:
                contacted = df[df["status"].isin(["SENT", "sent"])]["email"].dropna()
                return set(contacted.astype(str).str.strip().str.lower())
            elif "email_address" in df.columns and "status" in df.columns:
                contacted = df[df["status"].isin(["SENT", "sent"])]["email_address"].dropna()
                return set(contacted.astype(str).str.strip().str.lower())
            return set()
        except Exception:
            return set()

    @classmethod
    def process_and_deduplicate(cls, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
        """
        Processes dataframe:
        - Evaluates email validity
        - Deduplicates in the current batch (by normalized email, domain, and company)
        - Checks historical sent log for suppression
        """
        stats = {
            "total_records": len(df),
            "valid_records": 0,
            "invalid_records": 0,
            "missing_records": 0,
            "duplicates_removed": 0,
            "already_contacted": 0
        }

        if df.empty:
            df["valid"] = False
            df["email_status"] = "missing"
            df["is_duplicate"] = False
            df["already_contacted"] = False
            df["reason"] = "No records"
            return df, stats

        contacted_set = cls.get_contacted_emails()
        seen_keys: Set[str] = set()
        processed_rows = []

        for _, row in df.iterrows():
            row_dict = row.to_dict()
            raw_email = str(row_dict.get("email", "") or "").strip()

            val_result = validate_email_address(raw_email)
            norm_email = val_result["normalized_email"]
            is_valid = val_result["syntax_valid"]

            row_dict["email"] = norm_email if norm_email else (raw_email if raw_email else None)
            row_dict["email_status"] = val_result["status"]
            row_dict["syntax_valid"] = is_valid
            row_dict["valid"] = is_valid
            row_dict["reason"] = val_result["reason"]

            # Deduplication key combines normalized email or (domain + company)
            company = str(row_dict.get("company_name") or row_dict.get("company") or "").lower().strip()
            website = str(row_dict.get("website", "") or "").lower().strip()
            dedup_key = norm_email if norm_email else (f"{company}::{website}" if company else None)

            if is_valid:
                if dedup_key and dedup_key in seen_keys:
                    row_dict["is_duplicate"] = True
                    stats["duplicates_removed"] += 1
                else:
                    row_dict["is_duplicate"] = False
                    if dedup_key:
                        seen_keys.add(dedup_key)
                    stats["valid_records"] += 1

                if norm_email in contacted_set:
                    row_dict["already_contacted"] = True
                    stats["already_contacted"] += 1
                else:
                    row_dict["already_contacted"] = False
            else:
                if val_result["status"] == "missing":
                    stats["missing_records"] += 1
                else:
                    stats["invalid_records"] += 1
                
                if dedup_key and dedup_key in seen_keys:
                    row_dict["is_duplicate"] = True
                    stats["duplicates_removed"] += 1
                else:
                    row_dict["is_duplicate"] = False
                    if dedup_key:
                        seen_keys.add(dedup_key)

                row_dict["already_contacted"] = False

            processed_rows.append(row_dict)

        result_df = pd.DataFrame(processed_rows)
        return result_df, stats
