"""
Data Extraction & Normalization Module.
Standardizes uploaded CSV buyer files, mappings, and field sanitization.
"""
import io
from typing import Tuple, List, Dict
import pandas as pd

REQUIRED_COLUMNS = ["buyer_name", "company_name", "email", "website", "country", "source_platform"]

COLUMN_ALIASES = {
    "name": "buyer_name",
    "contact_name": "buyer_name",
    "full_name": "buyer_name",
    "company": "company_name",
    "organization": "company_name",
    "business_name": "company_name",
    "mail": "email",
    "email_address": "email",
    "web": "website",
    "url": "website",
    "nation": "country",
    "location": "country",
    "source": "source_platform",
    "platform": "source_platform"
}

class DataExtractor:
    """Extracts and normalizes buyer records from CSV bytes, file objects, or paths."""

    @staticmethod
    def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
        """Strip spaces, lowercase column headers, and map known aliases."""
        clean_cols = {}
        for col in df.columns:
            normalized = str(col).strip().lower().replace(" ", "_")
            # Map alias if present
            clean_cols[col] = COLUMN_ALIASES.get(normalized, normalized)
        
        df = df.rename(columns=clean_cols)
        
        # Ensure all standard columns exist even if empty in source
        for req_col in REQUIRED_COLUMNS:
            if req_col not in df.columns:
                df[req_col] = ""

        # Fill NaNs with empty string and stringify
        df = df.fillna("")
        for col in df.columns:
            df[col] = df[col].astype(str).str.strip()

        return df[REQUIRED_COLUMNS]

    @classmethod
    def process_csv_file(cls, file_content: bytes) -> Tuple[pd.DataFrame, str]:
        """Parse raw CSV bytes into normalized DataFrame."""
        try:
            # Try utf-8 first, fallback to latin-1
            try:
                df = pd.read_csv(io.BytesIO(file_content), encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(io.BytesIO(file_content), encoding="latin-1")
            
            if df.empty:
                return pd.DataFrame(columns=REQUIRED_COLUMNS), "Uploaded CSV is empty."

            normalized_df = cls.normalize_columns(df)
            return normalized_df, ""
        except Exception as e:
            return pd.DataFrame(columns=REQUIRED_COLUMNS), f"Failed to parse CSV: {str(e)}"

    @classmethod
    def process_csv_path(cls, file_path: str) -> Tuple[pd.DataFrame, str]:
        """Parse CSV from disk path."""
        try:
            df = pd.read_csv(file_path, encoding="utf-8", dtype=str)
            normalized_df = cls.normalize_columns(df)
            return normalized_df, ""
        except Exception as e:
            return pd.DataFrame(columns=REQUIRED_COLUMNS), f"Failed to load CSV: {str(e)}"
