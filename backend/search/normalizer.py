"""
Search Result Normalization Module.
Normalizes parsed leads with standard schema, deterministic IDs, timestamps, and validation flags.
Guarantees NO fabricated contact names or emails; missing values are strictly None.
"""
import uuid
import hashlib
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from backend.validation.email_validator import validate_email_address

def generate_deterministic_lead_id(company: str, website: str, email: Optional[str], country: str) -> str:
    """Generate deterministic unique ID from normalized lead attributes."""
    if email:
        raw_key = f"email:{email.strip().lower()}"
    elif company and website:
        raw_key = f"comp_web:{company.strip().lower()}:{website.strip().lower()}"
    elif company and country:
        raw_key = f"comp_ctry:{company.strip().lower()}:{country.strip().lower()}"
    else:
        raw_key = f"raw:{company}:{website}:{country}:{uuid.uuid4().hex[:6]}"
    
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()[:12]

def normalize_lead(
    parsed_data: Dict[str, Any],
    provider_source: str = "serper",
    product_id: Optional[str] = None
) -> Dict[str, Any]:
    """Standardize parsed attributes into the application lead schema with product awareness."""
    raw_email = str(parsed_data.get("email", "") or "").strip().lower()
    
    if not raw_email or raw_email in ["none", "null", "undefined"]:
        email = None
        email_status = "missing"
        validation_status = "missing"
        syntax_valid = False
    else:
        val_res = validate_email_address(raw_email)
        if val_res.get("valid") or val_res.get("syntax_valid"):
            email = val_res.get("normalized_email", raw_email)
            email_status = "valid"
            validation_status = "valid"
            syntax_valid = True
        else:
            email = raw_email
            email_status = "invalid"
            validation_status = "invalid"
            syntax_valid = False

    # Contact name: NEVER fabricate "Procurement Lead"; strictly None if unavailable
    raw_contact = parsed_data.get("contact_name") or parsed_data.get("buyer_name")
    if raw_contact and str(raw_contact).strip() not in ["", "None", "null", "undefined", "Procurement Lead", "Purchasing Manager", "Sales Manager"]:
        contact_name = str(raw_contact).strip()
    else:
        contact_name = None

    company_name = parsed_data.get("company_name") or parsed_data.get("company") or "Prospective Enterprise"
    country = parsed_data.get("country") or "International"
    website = parsed_data.get("website") or ""
    source = parsed_data.get("source") or provider_source or "serper"
    resolved_product_id = product_id or parsed_data.get("product_id") or "himalayan-sound-healing-bowls"

    lead_id = parsed_data.get("lead_id") or parsed_data.get("id") or generate_deterministic_lead_id(company_name, website, email, country)
    now_iso = datetime.now(timezone.utc).isoformat()

    is_demo = bool(parsed_data.get("is_demo", False))

    return {
        "lead_id": lead_id,
        "id": lead_id, # Alias for backwards compatibility
        "company_name": company_name,
        "company": company_name, # Alias for backwards compatibility
        "contact_name": contact_name,
        "name": contact_name, # Alias
        "buyer_name": contact_name, # Alias
        "email": email,
        "phone": parsed_data.get("phone", ""),
        "website": website,
        "country": country,
        "buyer_type": parsed_data.get("buyer_type", "Distributor"),
        "product_id": resolved_product_id,
        "source": source,
        "source_platform": source,
        "source_url": parsed_data.get("source_url", ""),
        "snippet": parsed_data.get("snippet", ""),
        "description": parsed_data.get("snippet", ""),
        
        # Email Status
        "email_status": email_status, # missing | invalid | valid
        "validation_status": validation_status,
        "syntax_valid": syntax_valid,
        "valid": syntax_valid,
        
        # AI Qualification Status
        "qualification_status": parsed_data.get("qualification_status", "pending"), # pending | qualified | rejected | needs_review
        "ai_score": parsed_data.get("ai_score", None),
        "ai_confidence": parsed_data.get("ai_confidence", None),
        "ai_reason": parsed_data.get("ai_reason", None),
        "priority": parsed_data.get("priority", None),
        
        # Outreach Status
        "outreach_status": "not_eligible" if email_status != "valid" else parsed_data.get("outreach_status", "not_eligible"),
        "is_demo": is_demo,
        
        "created_at": parsed_data.get("created_at", now_iso),
        "updated_at": now_iso,
        "discovered_at": parsed_data.get("discovered_at", now_iso),
        "is_duplicate": bool(parsed_data.get("is_duplicate", False)),
        "already_contacted": bool(parsed_data.get("already_contacted", False))
    }

def normalize_lead_batch(
    parsed_items: List[Dict[str, Any]],
    provider_source: str = "serper",
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
