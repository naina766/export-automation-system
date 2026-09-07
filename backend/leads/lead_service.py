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

from backend import config

class LeadState(str, Enum):
    DISCOVERED = "discovered"
    EXTRACTED = "extracted"
    VALID = "valid"
    AI_QUALIFIED = "ai_qualified"
    CAMPAIGN_READY = "campaign_ready"
    SENT = "sent"
    BOUNCED = "bounced"
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
        config.DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not config.BUYERS_CSV.exists():
            df = pd.DataFrame(columns=[
                "lead_id", "id", "product_id", "company_name", "company", "contact_name", "buyer_name",
                "email", "phone", "website", "country", "buyer_type", "source", "source_url",
                "email_status", "syntax_valid", "valid", "is_duplicate", "qualification_status",
                "ai_score", "ai_confidence", "ai_reason", "priority", "outreach_status",
                "delivery_status", "delivery_note", "bounce_reason", "failure_reason",
                "state", "is_demo", "discovered_at"
            ])
            df.to_csv(config.BUYERS_CSV, index=False, encoding="utf-8")

    @classmethod
    def list_leads(cls, product_id: Optional[str] = None, state: Optional[str] = None) -> List[Dict[str, Any]]:
        cls.ensure_storage()
        try:
            df = pd.read_csv(config.BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
            if product_id and "product_id" in df.columns:
                df = df[df["product_id"] == product_id]
            if state and "state" in df.columns:
                df = df[df["state"] == state]
            records = df.to_dict(orient="records")
            # Normalize fields
            for r in records:
                if "contact_name" not in r or str(r.get("contact_name", "")).strip() in ["", "None", "null", "undefined", "Procurement Lead", "Purchasing Manager"]:
                    r["contact_name"] = None
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
    def save_lead(cls, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        cls.ensure_storage()
        if "lead_id" not in lead_data or not lead_data["lead_id"]:
            lead_data["lead_id"] = str(uuid.uuid4())[:8]
        if "id" not in lead_data:
            lead_data["id"] = lead_data["lead_id"]

        # Ensure contact name clean
        c_name = lead_data.get("contact_name") or lead_data.get("buyer_name")
        if c_name and str(c_name).strip() in ["None", "null", "undefined", "Procurement Lead", "Purchasing Manager"]:
            lead_data["contact_name"] = ""
            lead_data["buyer_name"] = ""

        # Default deliverability fields
        if "delivery_status" not in lead_data:
            lead_data["delivery_status"] = "UNKNOWN"
        if "delivery_note" not in lead_data:
            lead_data["delivery_note"] = ""
        if "bounce_reason" not in lead_data:
            lead_data["bounce_reason"] = ""
        if "failure_reason" not in lead_data:
            lead_data["failure_reason"] = ""

        state = cls.compute_lead_state(lead_data)
        lead_data["state"] = state.value

        df = pd.read_csv(config.BUYERS_CSV, dtype=str, encoding="utf-8").fillna("") if config.BUYERS_CSV.exists() else pd.DataFrame()
        new_row = pd.DataFrame([lead_data])
        combined_df = pd.concat([df, new_row], ignore_index=True)
        combined_df.to_csv(config.BUYERS_CSV, index=False, encoding="utf-8")
        return lead_data

    @classmethod
    def create_lead(cls, lead_data: Dict[str, Any]) -> Dict[str, Any]:
        """Alias for save_lead to support REST endpoint creation."""
        return cls.save_lead(lead_data)

    @classmethod
    def update_lead(cls, lead_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        cls.ensure_storage()
        try:
            df = pd.read_csv(config.BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
            matched_idx = None
            for idx, row in df.iterrows():
                if row.get("lead_id") == lead_id or row.get("id") == lead_id:
                    matched_idx = idx
                    break
            
            if matched_idx is None:
                return None

            existing_row = df.iloc[matched_idx].to_dict()

            # If email is modified or corrected, reset prior bounce status and suppression
            new_email = updates.get("email")
            old_email = existing_row.get("email")
            if new_email and str(new_email).strip().lower() != str(old_email).strip().lower():
                from backend.validation.email_validator import validate_email_address
                val_res = validate_email_address(str(new_email).strip())
                is_syntax_valid = bool(val_res.get("syntax_valid"))
                updates["email_status"] = "valid" if is_syntax_valid else "invalid"
                updates["syntax_valid"] = "True" if is_syntax_valid else "False"
                updates["valid"] = "True" if is_syntax_valid else "False"
                updates["delivery_status"] = "UNKNOWN"
                updates["bounce_reason"] = ""
                updates["failure_reason"] = ""
                updates["already_contacted"] = "False"
                # Restore campaign eligibility if valid and not unqualified
                if str(existing_row.get("qualification_status", "")).lower() != "unqualified" and is_syntax_valid:
                    updates["outreach_status"] = "eligible"

            for k, v in updates.items():
                if k not in df.columns:
                    df[k] = ""
                df.at[matched_idx, k] = "" if v is None else str(v)

            # Recompute state
            updated_lead = df.iloc[matched_idx].to_dict()
            new_state = cls.compute_lead_state(updated_lead)
            if "state" not in df.columns:
                df["state"] = ""
            df.at[matched_idx, "state"] = new_state.value
            updated_lead["state"] = new_state.value

            df.to_csv(config.BUYERS_CSV, index=False, encoding="utf-8")
            return updated_lead
        except Exception:
            return None

    @classmethod
    def delete_lead(cls, lead_id: str) -> bool:
        cls.ensure_storage()
        try:
            df = pd.read_csv(config.BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
            initial_len = len(df)
            df = df[(df["lead_id"] != lead_id) & (df["id"] != lead_id)]
            if len(df) < initial_len:
                df.to_csv(config.BUYERS_CSV, index=False, encoding="utf-8")
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
        delivery_status = str(lead.get("delivery_status") or "").upper()
        qual_status = str(lead.get("qualification_status") or "").lower()

        if delivery_status == "BOUNCED" or outreach_status == "bounced":
            return LeadState.BOUNCED
        if outreach_status == "sent" or delivery_status == "SMTP_ACCEPTED":
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

        # Bounce check
        delivery_st = str(lead.get("delivery_status") or "").upper().strip()
        outreach_st = str(lead.get("outreach_status") or "").lower().strip()
        state_st = str(lead.get("state") or "").lower().strip()
        if delivery_st == "BOUNCED" or outreach_st == "bounced" or state_st == "bounced":
            return False, "Email bounced — update recipient address before sending again."

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
