"""
Email Validation & Duplicate Detection Module.
Provides syntax verification, normalization, in-memory deduplication, and suppression checks against sent_log.csv.
"""
import re
from typing import Dict, Any, List, Set, Tuple
import pandas as pd
from email_validator import validate_email as ext_validate_email, EmailNotValidError
from config import SENT_LOG_CSV

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

def validate_email_address(email: str) -> Dict[str, Any]:
    """
    Validate and normalize email address.
    Returns: {"valid": bool, "normalized_email": str, "reason": str}
    """
    if not email or not str(email).strip():
        return {
            "valid": False,
            "normalized_email": "",
            "reason": "Missing or empty email address"
        }
    
    cleaned = str(email).strip().lower()
    
    # Check syntax pattern
    if not EMAIL_REGEX.match(cleaned):
        return {
            "valid": False,
            "normalized_email": cleaned,
            "reason": "Malformed email format"
        }

    # Reject reserved RFC placeholder and test domains
    domain = cleaned.split("@")[-1]
    if domain in ["example.com", "example.org", "example.net"] or domain.endswith((".example", ".test", ".invalid", ".localhost")):
        return {
            "valid": False,
            "normalized_email": cleaned,
            "reason": f"Reserved placeholder domain '@{domain}' is not an active production contact"
        }

    try:
        valid_res = ext_validate_email(cleaned, check_deliverability=False)
        return {
            "valid": True,
            "normalized_email": valid_res.normalized.lower(),
            "reason": "Valid syntax"
        }
    except EmailNotValidError as e:
        return {
            "valid": False,
            "normalized_email": cleaned,
            "reason": str(e)
        }
    except Exception:
        if EMAIL_REGEX.match(cleaned):
            return {
                "valid": True,
                "normalized_email": cleaned,
                "reason": "Valid pattern"
            }
        return {
            "valid": False,
            "normalized_email": cleaned,
            "reason": "Invalid email"
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
        - Deduplicates in the current batch
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
        seen_emails: Set[str] = set()
        processed_rows = []

        for _, row in df.iterrows():
            row_dict = row.to_dict()
            raw_email = str(row_dict.get("email", "")).strip()

            val_result = validate_email_address(raw_email)
            norm_email = val_result["normalized_email"]
            is_valid = val_result["valid"]

            row_dict["email"] = norm_email if norm_email else raw_email
            row_dict["valid"] = is_valid
            row_dict["reason"] = val_result["reason"]

            if is_valid:
                row_dict["email_status"] = "valid"
                if norm_email in seen_emails:
                    row_dict["is_duplicate"] = True
                    stats["duplicates_removed"] += 1
                else:
                    row_dict["is_duplicate"] = False
                    seen_emails.add(norm_email)
                    stats["valid_records"] += 1

                if norm_email in contacted_set:
                    row_dict["already_contacted"] = True
                    stats["already_contacted"] += 1
                else:
                    row_dict["already_contacted"] = False
            else:
                if not raw_email:
                    row_dict["email_status"] = "missing"
                    stats["missing_records"] += 1
                else:
                    row_dict["email_status"] = "invalid"
                    stats["invalid_records"] += 1
                row_dict["is_duplicate"] = False
                row_dict["already_contacted"] = False

            processed_rows.append(row_dict)

        result_df = pd.DataFrame(processed_rows)
        return result_df, stats
