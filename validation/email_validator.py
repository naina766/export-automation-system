"""
Email Validation & Duplicate Prevention Module.
Validates email addresses syntax, identifies duplicates, and flags previously contacted leads.
"""
import re
from typing import Dict, Any, List, Set, Tuple
import pandas as pd
from email_validator import validate_email as ext_validate_email, EmailNotValidError
from config import SENT_LOG_CSV

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

class EmailValidator:
    """Handles syntax validation and duplicate verification."""

    @staticmethod
    def validate_single_email(email: str) -> Tuple[str, str]:
        """
        Validate single email address.
        Returns: (status, normalized_email)
        status: 'valid' | 'invalid' | 'missing'
        """
        if not email or not str(email).strip():
            return "missing", ""
        
        cleaned = str(email).strip().lower()
        
        # Check basic syntax
        if not EMAIL_REGEX.match(cleaned):
            return "invalid", cleaned

        # Additional parsing check
        try:
            # check_deliverability=False avoids blocking DNS queries
            valid = ext_validate_email(cleaned, check_deliverability=False)
            return "valid", valid.normalized.lower()
        except EmailNotValidError:
            return "invalid", cleaned
        except Exception:
            # Fallback regex
            if EMAIL_REGEX.match(cleaned):
                return "valid", cleaned
            return "invalid", cleaned

    @classmethod
    def get_contacted_emails(cls) -> Set[str]:
        """Retrieve set of lowercase email addresses that have already been contacted."""
        if not SENT_LOG_CSV.exists():
            return set()
        try:
            df = pd.read_csv(SENT_LOG_CSV, dtype=str)
            if "email_address" in df.columns and "status" in df.columns:
                # Include emails marked as sent or demo_sent
                contacted = df[df["status"].isin(["sent", "demo_sent"])]["email_address"].dropna()
                return set(contacted.astype(str).str.strip().str.lower())
            return set()
        except Exception:
            return set()

    @classmethod
    def process_and_deduplicate(cls, df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int]]:
        """
        Processes dataframe:
        - Validates email status (valid, invalid, missing)
        - Removes duplicates in the current batch
        - Checks previously sent log for already_contacted
        """
        stats = {
            "total_records": len(df),
            "valid_emails": 0,
            "invalid_emails": 0,
            "missing_emails": 0,
            "duplicates_removed": 0,
            "already_contacted": 0
        }

        if df.empty:
            df["email_status"] = ""
            df["is_duplicate"] = False
            df["already_contacted"] = False
            return df, stats

        contacted_set = cls.get_contacted_emails()
        seen_emails: Set[str] = set()

        processed_rows = []
        
        for _, row in df.iterrows():
            row_dict = row.to_dict()
            raw_email = str(row_dict.get("email", "")).strip()
            
            status, normalized = cls.validate_single_email(raw_email)
            row_dict["email"] = normalized if normalized else raw_email
            row_dict["email_status"] = status
            
            if status == "valid":
                if normalized in seen_emails:
                    row_dict["is_duplicate"] = True
                    stats["duplicates_removed"] += 1
                else:
                    row_dict["is_duplicate"] = False
                    seen_emails.add(normalized)
                    stats["valid_emails"] += 1

                if normalized in contacted_set:
                    row_dict["already_contacted"] = True
                    stats["already_contacted"] += 1
                else:
                    row_dict["already_contacted"] = False
            elif status == "invalid":
                stats["invalid_emails"] += 1
                row_dict["is_duplicate"] = False
                row_dict["already_contacted"] = False
            else: # missing
                stats["missing_emails"] += 1
                row_dict["is_duplicate"] = False
                row_dict["already_contacted"] = False

            processed_rows.append(row_dict)

        result_df = pd.DataFrame(processed_rows)
        return result_df, stats
