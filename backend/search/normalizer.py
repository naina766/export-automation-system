"""
Search Result Normalization Module.
Normalizes parsed leads with standard schema, deterministic IDs, timestamps, and validation flags.
Guarantees NO fabricated emails; un-discovered emails are strictly set to None.
"""
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from validation.email_validator import validate_email_address

def generate_deterministic_lead_id(company: str, website: str, email: Optional[str], country: str) -> str:
    """Generate deterministic unique ID from normalized lead attributes."""
    if email:
        raw_key = f"email:{email.strip().lower()}"
    elif company and website:
        raw_key = f"comp_web:{company.strip().lower()}:{website.strip().lower()}"
    elif company and country:
        raw_key = f"comp_ctry:{company.strip().lower()}:{country.strip().lower()}"
    else:
        raw_key = f"raw:{company}:{website}:{country}"
    
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:12]

def normalize_lead(
    parsed_data: Dict[str, Any],
    provider_source: str = "google_cse",
    product_id: Optional[str] = None
) -> Dict[str, Any]:
    """Standardize parsed attributes into the application lead schema with product awareness."""
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
    country = parsed_data.get("country") or "International"
    website = parsed_data.get("website") or ""
    source = parsed_data.get("source") or provider_source or "google_cse"
    resolved_product_id = product_id or parsed_data.get("product_id") or "himalayan-sound-healing-bowls"

    lead_id = generate_deterministic_lead_id(company_name, website, email, country)

    return {
        "id": lead_id,
        "name": contact_name,
        "buyer_name": contact_name,
        "contact_name": contact_name,
        "company": company_name,
        "company_name": company_name,
        "email": email,
        "phone": parsed_data.get("phone", ""),
        "website": website,
        "country": country,
        "buyer_type": parsed_data.get("buyer_type", "Distributor"),
        "source": source,
        "source_platform": source,
        "source_url": parsed_data.get("source_url", ""),
        "product_id": resolved_product_id,
        "snippet": parsed_data.get("snippet", ""),
        "description": parsed_data.get("snippet", ""),
        "email_status": email_status,
        "validation_status": validation_status,
        "qualification_status": "pending",
        "qualification_score": parsed_data.get("qualification_score", None),
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

def normalize_lead_batch(
    parsed_items: List[Dict[str, Any]],
    provider_source: str = "google_cse",
    product_id: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Normalize a list of parsed search items and suppress in-batch duplicate domains or emails."""
    normalized = []
    seen_keys = set()

    for item in parsed_items:
        norm = normalize_lead(item, provider_source=provider_source, product_id=product_id)
        
        domain = norm.get("website", "").lower().strip()
        email = norm.get("email")
        comp = norm.get("company_name", "").lower().strip()

        # Prioritize domain deduplication, falling back to email or company
        key = domain if domain else (email if email else comp)
        if key and key in seen_keys:
            continue
        if key:
            seen_keys.add(key)
            
        normalized.append(norm)

    return normalized
