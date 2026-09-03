"""
Search Result Normalization Module.
Normalizes parsed leads with standard schema, timestamps, and validation flags.
Guarantees NO fabricated emails; un-discovered emails are strictly set to None.
"""
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from validation.email_validator import validate_email_address

def normalize_lead(parsed_data: Dict[str, Any], provider_source: str = "google_cse") -> Dict[str, Any]:
    """Standardize parsed attributes into the application lead schema."""
    raw_email = str(parsed_data.get("email", "") or "").strip().lower()
    
    if not raw_email or raw_email in ["none", "null", "undefined"]:
        email = None
        email_status = "not_found"
        validation_status = "missing"
    else:
        val_res = validate_email_address(raw_email)
        if val_res["valid"]:
            email = val_res.get("normalized_email", raw_email)
            email_status = "valid"
            validation_status = "valid"
        else:
            email = raw_email
            email_status = "invalid"
            validation_status = "invalid"

    contact_name = parsed_data.get("contact_name") or "Procurement Lead"
    company_name = parsed_data.get("company_name") or "Prospective Enterprise"
    source = parsed_data.get("source") or provider_source or "google_cse"

    return {
        "id": str(uuid.uuid4())[:8],
        "name": contact_name,
        "buyer_name": contact_name,
        "contact_name": contact_name,
        "company": company_name,
        "company_name": company_name,
        "email": email,
        "phone": parsed_data.get("phone", ""),
        "website": parsed_data.get("website", ""),
        "country": parsed_data.get("country", "International"),
        "buyer_type": parsed_data.get("buyer_type", "Distributor"),
        "source": source,
        "source_platform": source,
        "source_url": parsed_data.get("source_url", ""),
        "snippet": parsed_data.get("snippet", ""),
        "description": parsed_data.get("snippet", ""),
        "email_status": email_status,
        "validation_status": validation_status,
        "qualification_status": "pending",
        "ai_score": parsed_data.get("ai_score", None),
        "ai_category": parsed_data.get("ai_category", None),
        "classification": "pending",
        "priority": "High Priority",
        "valid": validation_status == "valid",
        "reason": f"Email {email_status}",
        "is_duplicate": False,
        "already_contacted": False,
        "confidence": None,
        "discovered_at": datetime.now(timezone.utc).isoformat()
    }

def normalize_lead_batch(parsed_items: List[Dict[str, Any]], provider_source: str = "google_cse") -> List[Dict[str, Any]]:
    """Normalize a list of parsed search items and suppress in-batch duplicate domains."""
    normalized = []
    seen_domains = set()

    for item in parsed_items:
        norm = normalize_lead(item, provider_source=provider_source)
        domain = norm.get("website", "").lower()
        if domain and domain in seen_domains:
            continue
        if domain:
            seen_domains.add(domain)
        normalized.append(norm)

    return normalized
