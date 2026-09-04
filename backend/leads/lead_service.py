"""
Lead Management Service & Persistence Layer.
Encapsulates lead lifecycle states, CRUD, deduplication, and product isolation.
"""
from enum import Enum
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple
import pandas as pd
import uuid
import re
from urllib.parse import urlparse

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
BUYERS_CSV = DATA_DIR / "buyers.csv"

class LeadState(str, Enum):
    DISCOVERED = "discovered"
    EXTRACTED = "extracted"
    VALID = "valid"
    AI_QUALIFIED = "ai_qualified"
    CAMPAIGN_READY = "campaign_ready"
    SENT = "sent"
    # Terminal / Ineligible States
    INVALID_EMAIL = "invalid_email"
    MISSING_EMAIL = "missing_email"
    DUPLICATE = "duplicate"
    AI_UNQUALIFIED = "ai_unqualified"
    AI_REVIEW = "ai_review"
    SEND_FAILED = "send_failed"

class LeadService:
    """Repository and lifecycle manager for B2B buyer leads."""

    @staticmethod
    def ensure_storage():
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not BUYERS_CSV.exists():
            df = pd.DataFrame(columns=[
                "lead_id", "id", "product_id", "company_name", "company", "contact_name", "buyer_name",
                "email", "phone", "website", "country", "buyer_type", "source", "source_url",
                "email_status", "syntax_valid", "valid", "is_duplicate", "qualification_status",
                "ai_score", "ai_confidence", "ai_reason", "priority", "outreach_status",
                "state", "is_demo", "discovered_at"
            ])
            df.to_csv(BUYERS_CSV, index=False, encoding="utf-8")

    @classmethod
    def list_leads(cls, product_id: Optional[str] = None, state: Optional[str] = None) -> List[Dict[str, Any]]:
        cls.ensure_storage()
        try:
            df = pd.read_csv(BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
            if product_id and "product_id" in df.columns:
                df = df[df["product_id"] == product_id]
            if state and "state" in df.columns:
                df = df[df["state"] == state]
            records = df.to_dict(orient="records")
            # Normalize fields
            for r in records:
                if "contact_name" not in r or str(r.get("contact_name", "")).strip() in ["", "None", "null", "undefined", "Procurement Lead", "Purchasing Manager"]:
                    r["contact_name"] = None
                if not r.get("lead_id"):
                    r["lead_id"] = r.get("id") or str(uuid.uuid4())
            return records
        except Exception:
            return []

    @classmethod
    def get_lead(cls, lead_id: str) -> Optional[Dict[str, Any]]:
        leads = cls.list_leads()
        for l in leads:
            if l.get("lead_id") == lead_id or l.get("id") == lead_id:
                return l
        return None

    @classmethod
    def create_lead(cls, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        cls.ensure_storage()
        lead_id = lead_data.get("lead_id") or lead_data.get("id") or f"lead-{uuid.uuid4().hex[:10]}"
        lead_data["lead_id"] = lead_id
        lead_data["id"] = lead_id
        
        # Determine initial state
        state = cls.compute_lead_state(lead_data)
        lead_data["state"] = state.value

        df = pd.read_csv(BUYERS_CSV, dtype=str, encoding="utf-8").fillna("") if BUYERS_CSV.exists() else pd.DataFrame()
        new_row = pd.DataFrame([lead_data])
        combined_df = pd.concat([df, new_row], ignore_index=True)
        combined_df.to_csv(BUYERS_CSV, index=False, encoding="utf-8")
        return lead_data

    @classmethod
    def update_lead(cls, lead_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        cls.ensure_storage()
        try:
            df = pd.read_csv(BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
            matched_idx = None
            for idx, row in df.iterrows():
                if row.get("lead_id") == lead_id or row.get("id") == lead_id:
                    matched_idx = idx
                    break
            
            if matched_idx is None:
                return None

            for k, v in updates.items():
                df.at[matched_idx, k] = "" if v is None else str(v)

            # Recompute state
            updated_lead = df.iloc[matched_idx].to_dict()
            new_state = cls.compute_lead_state(updated_lead)
            df.at[matched_idx, "state"] = new_state.value
            updated_lead["state"] = new_state.value

            df.to_csv(BUYERS_CSV, index=False, encoding="utf-8")
            return updated_lead
        except Exception:
            return None

    @classmethod
    def delete_lead(cls, lead_id: str) -> bool:
        cls.ensure_storage()
        try:
            df = pd.read_csv(BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
            initial_len = len(df)
            df = df[(df["lead_id"] != lead_id) & (df["id"] != lead_id)]
            if len(df) < initial_len:
                df.to_csv(BUYERS_CSV, index=False, encoding="utf-8")
                return True
            return False
        except Exception:
            return False

    @staticmethod
    def compute_lead_state(lead: Dict[str, Any]) -> LeadState:
        """Determines the authoritative state of a lead based on validation & qualification."""
        email = str(lead.get("email") or "").strip()
        email_status = str(lead.get("email_status") or "").lower()
        syntax_valid = lead.get("syntax_valid") in [True, "True", "true", 1, "1"]
        is_dup = lead.get("is_duplicate") in [True, "True", "true", 1, "1"]
        outreach_status = str(lead.get("outreach_status") or "").lower()
        qual_status = str(lead.get("qualification_status") or "").lower()

        if outreach_status == "sent":
            return LeadState.SENT
        if is_dup:
            return LeadState.DUPLICATE
        if not email or email_status == "missing" or email.lower() in ["none", "null", ""]:
            return LeadState.MISSING_EMAIL
        if email_status == "invalid" or not syntax_valid:
            return LeadState.INVALID_EMAIL
        if qual_status == "unqualified":
            return LeadState.AI_UNQUALIFIED
        if qual_status == "needs_review" or qual_status == "review":
            return LeadState.AI_REVIEW
        if qual_status == "qualified":
            return LeadState.CAMPAIGN_READY
        return LeadState.VALID

    @classmethod
    def is_lead_sendable(cls, lead: Dict[str, Any], campaign_product_id: Optional[str] = None) -> Tuple[bool, str]:
        """Hard Gate checking if a lead is strictly eligible for Gmail outreach."""
        if not lead:
            return False, "Lead record not found"
        
        # Demo check
        if lead.get("is_demo") in [True, "True", "true", 1, "1"]:
            return False, "Demo data is not eligible for production outreach"

        # Email check
        email = str(lead.get("email") or "").strip()
        if not email or email.lower() in ["none", "null", ""]:
            return False, "Lead missing valid email address"
        
        syntax_valid = lead.get("syntax_valid") in [True, "True", "true", 1, "1"] or lead.get("email_status") == "valid"
        if not syntax_valid:
            return False, "Email failed syntax validation"

        # Duplicate check
        if lead.get("is_duplicate") in [True, "True", "true", 1, "1"]:
            return False, "Lead is marked as duplicate"

        # AI Qualification check
        qual = str(lead.get("qualification_status") or "").lower()
        if qual != "qualified":
            return False, f"AI qualification is '{qual}', must be 'qualified'"

        # Product check
        if campaign_product_id:
            lead_prod = str(lead.get("product_id") or "").strip()
            if lead_prod and lead_prod != campaign_product_id:
                return False, f"Lead belongs to product '{lead_prod}', does not match campaign product '{campaign_product_id}'"

        return True, "Lead is eligible for outreach"
