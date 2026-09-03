"""
Data Extraction & Normalization Module.
Standardizes uploaded CSV buyer files, mappings, and field sanitization.
"""
import io
from typing import Tuple, List, Dict
import pandas as pd

REQUIRED_COLUMNS = ["name", "company", "email", "website", "country", "source"]

COLUMN_ALIASES = {
    "buyer_name": "name",
    "name": "name",
    "contact_name": "name",
    "full_name": "name",
    "buyer": "name",
    
    "company_name": "company",
    "company": "company",
    "organization": "company",
    "business_name": "company",
    "business": "company",
    
    "mail": "email",
    "email": "email",
    "email_address": "email",
    
    "web": "website",
    "url": "website",
    "website": "website",
    
    "nation": "country",
    "country_name": "country",
    "country": "country",
    "location": "country",
    
    "source": "source",
    "source_platform": "source",
    "platform": "source"
}

class DataExtractor:
    """Extracts and normalizes buyer records from CSV bytes or paths."""

    @staticmethod
    def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
        """Strip spaces, lowercase headers, and map aliases to standard schema."""
        clean_cols = {}
        for col in df.columns:
            normalized = str(col).strip().lower().replace(" ", "_")
            clean_cols[col] = COLUMN_ALIASES.get(normalized, normalized)
        
        df = df.rename(columns=clean_cols)
        
        # Ensure all standard columns exist
        for req_col in REQUIRED_COLUMNS:
            if req_col not in df.columns:
                df[req_col] = ""

        # Fill NaNs and strip whitespace
        df = df.fillna("")
        for col in REQUIRED_COLUMNS:
            df[col] = df[col].astype(str).str.strip()

        return df[REQUIRED_COLUMNS]

    @classmethod
    def process_csv_file(cls, file_content: bytes) -> Tuple[pd.DataFrame, str]:
        """Parse raw CSV bytes into normalized DataFrame."""
        try:
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
