"""
EXPORT Automation System — FastAPI REST Backend
Live B2B lead discovery, contact validation, Gemini AI qualification, and personalized Gmail SMTP outreach.
"""
import os
import sys
import secrets
from pathlib import Path
from typing import Optional, Dict, Any, List, Union
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, Response, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
for p in [str(BACKEND_DIR), str(ROOT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from config import (
    BUYERS_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV,
    SENT_LOG_CSV,
    load_settings,
    save_settings,
    get_gemini_config,
    get_gmail_credentials,
    get_search_provider_config
)
from search.web_search_provider import (
    WebBuyerSearchProvider,
    SearchProviderNotConfiguredError,
    SearchProviderAPIError,
    UnsupportedSearchProviderError
)
from search.parser import extract_contact_from_public_website
import httpx
import re
from extraction.data_extractor import DataExtractor
from validation.email_validator import EmailValidator, validate_email_address
from classification.gemini_classifier import LeadClassifier
from outreach.attachment_handler import AttachmentHandler
from outreach.gmail_sender import (
    EmailSender,
    is_outreach_eligible,
    DEFAULT_SUBJECT,
    DEFAULT_BODY
)
from logging_module.activity_logger import ActivityLogger
from reports.report_generator import ReportGenerator
from products.catalog import ProductCatalog
from leads.lead_service import LeadService, LeadState


# Initialize FastAPI app
app = FastAPI(
    title="EXPORT Automation System API",
    description="Live B2B Export Automation Platform for Handcrafted Singing Bowls & Acoustic Instruments",
    version="2.0.0"
)

# Strict explicit CORS origin allowlist
frontend_env_url = os.getenv("FRONTEND_URL", "").strip()
allowed_origins = [
    "https://export-automation-system-two.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000"
]
if frontend_env_url and frontend_env_url not in allowed_origins:
    allowed_origins.append(frontend_env_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-API-Key", "Accept"],
    expose_headers=["Content-Disposition"]
)

ActivityLogger.ensure_log_file()


def require_api_key(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None)
) -> bool:
    """
    Enforces server-side API Key authentication for mutative and sensitive endpoints.
    Uses constant-time string comparison to prevent timing attacks.
    """
    expected_key = os.getenv("EXPORT_API_KEY", "").strip() or os.getenv("API_KEY", "").strip()
    # If no server API key is configured, pass through (e.g. unconfigured local dev)
    if not expected_key:
        return True

    provided_key = x_api_key
    if not provided_key and authorization and authorization.startswith("Bearer "):
        provided_key = authorization[7:].strip()

    if not provided_key or not secrets.compare_digest(provided_key, expected_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "ApiKey"}
        )

    return True


def _validate_safe_catalog_path(path_val: Optional[str]) -> Optional[str]:
    """Validates that a catalog path is a safe relative path to a PDF file."""
    if path_val:
        clean = str(path_val).strip()
        if Path(clean).is_absolute():
            raise ValueError("catalog_path must not be an absolute filesystem path")
        norm = clean.replace("\\", "/").split("/")
        if ".." in norm or "." in norm[:-1]:
            raise ValueError("catalog_path must not contain directory traversal")
        if not clean.lower().endswith(".pdf"):
            raise ValueError("catalog_path must point to a .pdf file")
    return path_val


# Pydantic Request Models
class ProductCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = ""
    keywords: Optional[Any] = None
    buyer_types: Optional[Any] = None
    target_countries: Optional[Any] = None
    email_subject_template: Optional[str] = None
    email_body_template: Optional[str] = None
    catalog_path: Optional[str] = "assets/company_presentation.pdf"
    active: Optional[bool] = False

    @field_validator("catalog_path")
    @classmethod
    def validate_catalog(cls, v):
        return _validate_safe_catalog_path(v)

class ProductUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    keywords: Optional[Any] = None
    buyer_types: Optional[Any] = None
    target_countries: Optional[Any] = None
    email_subject_template: Optional[str] = None
    email_body_template: Optional[str] = None
    catalog_path: Optional[str] = None
    active: Optional[bool] = None

    @field_validator("catalog_path")
    @classmethod
    def validate_catalog(cls, v):
        return _validate_safe_catalog_path(v)

class SearchRequest(BaseModel):
    product_id: Optional[str] = Field(default=None)
    product: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    buyer_type: Optional[str] = Field(default=None)
    keywords: Optional[Any] = Field(default=None)
    limit: Optional[int] = Field(default=25)
    auto_ingest: Optional[bool] = Field(default=True)

class EmailValidateRequest(BaseModel):
    email: Optional[str] = None

class SendCampaignRequest(BaseModel):
    product_id: Optional[str] = Field(default=None)
    lead_ids: Optional[List[str]] = Field(default=None)
    campaign_id: Optional[str] = Field(default=None)
    audience: str = Field(default="business")
    subject: Optional[str] = Field(default=None)
    body_template: Optional[str] = Field(default=None)
    attach_presentation: bool = Field(default=True)
    custom_email: Optional[str] = None
    custom_buyer_name: Optional[str] = None
    custom_company_name: Optional[str] = None
    custom_country: Optional[str] = None
    custom_buyer_type: Optional[str] = None

class TestEmailRequest(BaseModel):
    product_id: Optional[str] = None
    recipient_email: str
    recipient_name: Optional[str] = None
    company_name: Optional[str] = None
    country: Optional[str] = None
    buyer_type: Optional[str] = None
    subject: Optional[str] = None
    body_template: Optional[str] = None
    attach_presentation: bool = True

class SettingsUpdateRequest(BaseModel):
    SEARCH_KEYWORD: Optional[str] = "Himalayan Sound Healing Bowls"
    SEND_DELAY: Optional[int] = 1
    MAX_EMAILS_PER_RUN: Optional[int] = 25
    DAILY_SEND_LIMIT: Optional[int] = 100
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: Optional[int] = 587

class EnrichLeadRequest(BaseModel):
    company: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    buyer_name: Optional[str] = None

class UpdateLeadRequest(BaseModel):
    original_company: Optional[str] = None
    original_email: Optional[str] = None
    company_name: str
    buyer_name: Optional[str] = None
    contact_name: Optional[str] = None
    email: str
    website: Optional[str] = None
    country: Optional[str] = None
    buyer_type: Optional[str] = None

class ClassifyRequest(BaseModel):
    product_id: Optional[str] = None
    product_name: Optional[str] = None


# ==========================================
# 1. HEALTH & SYSTEM STATUS
# ==========================================
@app.get("/api/health")
async def health_check():
    search_cfg = get_search_provider_config()
    gemini_key, _ = get_gemini_config()
    gmail_user, gmail_pass = get_gmail_credentials()

    search_status = "READY" if search_cfg.get("api_key") else "NOT_CONFIGURED"
    gemini_status = "READY" if gemini_key else "NOT_CONFIGURED"
    gmail_status = "READY" if (gmail_user and gmail_pass) else "NOT_CONFIGURED"

    return {
        "status": "healthy",
        "service": "EXPORT Automation System",
        "search_status": search_status,
        "gemini_status": gemini_status,
        "gmail_status": gmail_status,
        "search_configured": bool(search_cfg.get("api_key")),
        "gemini_configured": bool(gemini_key),
        "gmail_configured": bool(gmail_user and gmail_pass)
    }


# ==========================================
# 2. PRODUCT CATALOG MANAGEMENT
# ==========================================
@app.get("/api/products")
async def list_products():
    """List all available products in catalog and current active product."""
    products = ProductCatalog.list_products()
    active_prod = ProductCatalog.get_active_product()
    return {
        "products": products,
        "active_product": active_prod,
        "total": len(products)
    }

@app.post("/api/products", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_api_key)])
async def create_product(payload: ProductCreateRequest):
    """Add a new product to the export catalog."""
    try:
        new_prod = ProductCatalog.add_product(payload.model_dump())
        return {
            "success": True,
            "message": f"Product '{new_prod['name']}' created successfully.",
            "product": new_prod
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create product: {str(e)}")

@app.put("/api/products/{product_id}", dependencies=[Depends(require_api_key)])
async def update_product_endpoint(product_id: str, payload: ProductUpdateRequest):
    """Update an existing product configuration."""
    updated = ProductCatalog.update_product(product_id, payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail=f"Product with id '{product_id}' not found.")
    return {
        "success": True,
        "message": f"Product '{updated['name']}' updated successfully.",
        "product": updated
    }

@app.delete("/api/products/{product_id}", dependencies=[Depends(require_api_key)])
async def delete_product_endpoint(product_id: str):
    """Delete a product from catalog."""
    deleted = ProductCatalog.delete_product(product_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Product with id '{product_id}' not found.")
    return {
        "success": True,
        "message": "Product removed successfully.",
        "active_product": ProductCatalog.get_active_product()
    }

@app.post("/api/products/{product_id}/activate", dependencies=[Depends(require_api_key)])
async def activate_product_endpoint(product_id: str):
    """Set the specified product as globally active."""
    activated = ProductCatalog.set_active_product(product_id)
    if not activated:
        raise HTTPException(status_code=404, detail=f"Product with id '{product_id}' not found.")
    return {
        "success": True,
        "message": f"'{activated['name']}' is now the active export product.",
        "product": activated
    }


# ==========================================
# 3. DASHBOARD KPI & OVERVIEW
# ==========================================
@app.get("/api/dashboard")
async def get_dashboard_data(product_id: Optional[str] = None):
    active_prod = None
    if product_id:
        active_prod = ProductCatalog.get_product(product_id)
    if not active_prod:
        active_prod = ProductCatalog.get_active_product()

    effective_product_id = active_prod.get("id") if active_prod else None
    metrics = ReportGenerator.get_campaign_metrics(product_id=effective_product_id)
    settings = load_settings()
    search_cfg = get_search_provider_config()
    gemini_key, gemini_model = get_gemini_config()
    gmail_user, gmail_pass = get_gmail_credentials()

    return {
        "metrics": metrics,
        "active_product": active_prod,
        "products": ProductCatalog.list_products(),
        "system": {
            "search_keyword": active_prod.get("name") if active_prod else settings.get("SEARCH_KEYWORD", "Himalayan Sound Healing Bowls"),
            "search_provider": search_cfg.get("provider", "serper"),
            "search_status": "READY" if search_cfg.get("api_key") else "NOT_CONFIGURED",
            "search_configured": bool(search_cfg.get("api_key")),
            "gemini_status": "READY" if gemini_key else "NOT_CONFIGURED",
            "gemini_configured": bool(gemini_key),
            "gemini_model": gemini_model,
            "gmail_status": "READY" if (gmail_user and gmail_pass) else "NOT_CONFIGURED",
            "gmail_configured": bool(gmail_user and gmail_pass),
            "email_mode": "SMTP"
        }
    }


# ==========================================
# 4. LIVE BUYER DISCOVERY & LEADS
# ==========================================
@app.get("/api/leads")
async def get_all_leads(product_id: Optional[str] = None):
    if not BUYERS_CSV.exists():
        return {"total": 0, "leads": []}

    try:
        df = pd.read_csv(BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
        if product_id and "product_id" in df.columns:
            df = df[df["product_id"] == product_id]
        
        contacted_set = EmailValidator.get_contacted_emails()
        records = df.to_dict(orient="records")

        # Ensure authoritative outreach_status and clean contact_name on each lead
        for r in records:
            if "contact_name" not in r or str(r.get("contact_name", "")).strip() in ["", "None", "null", "undefined", "Procurement Lead", "Purchasing Manager"]:
                r["contact_name"] = None

            eligible, _ = is_outreach_eligible(
                lead=r,
                campaign_product_id=product_id or r.get("product_id"),
                contacted_emails=contacted_set
            )
            r["outreach_status"] = "eligible" if eligible else "not_eligible"

        return {"total": len(records), "leads": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read buyers: {str(e)}")

@app.get("/api/leads/invalid")
async def get_invalid_leads_endpoint():
    """Returns leads that have invalid or missing emails or failed syntax check."""
    if not BUYERS_CSV.exists():
        return {"total": 0, "invalid_leads": []}
    try:
        df = pd.read_csv(BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
        records = df.to_dict(orient="records")
        invalid_list = [
            r for r in records
            if not r.get("email") or
               r.get("email_status") in ["invalid", "missing"] or
               str(r.get("syntax_valid", "")).lower() == "false" or
               r.get("syntax_valid") is False
        ]
        return {"total": len(invalid_list), "invalid_leads": invalid_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read invalid leads: {str(e)}")

@app.get("/api/sample-buyers")

async def get_sample_workflow_buyers(product_id: Optional[str] = None):
    """
    Returns explicitly labeled demonstration buyers for the sample workflow.
    Every record is marked with is_demo=True and CANNOT enter production outreach.
    """
    prod = ProductCatalog.get_product(product_id) if product_id else ProductCatalog.get_active_product()
    prod_name = prod.get("name", "Himalayan Sound Healing Bowls") if prod else "Himalayan Sound Healing Bowls"
    p_id = prod.get("id") if prod else "himalayan-sound-healing-bowls"
    
    sample_records = [
        {
            "lead_id": "demo-vance-sound",
            "id": "demo-vance-sound",
            "company_name": "Vance Sound Sanctuary LLC",
            "company": "Vance Sound Sanctuary LLC",
            "contact_name": None,
            "buyer_name": None,
            "email": "partnerships@soundsanctuary-demo.com",
            "country": "United States",
            "buyer_type": "Wellness Studio & Distributor",
            "website": "https://soundsanctuary-demo.com",
            "phone": "+1 415-555-0192",
            "source": "Sample Workflow Directory",
            "email_status": "valid",
            "syntax_valid": True,
            "qualification_status": "qualified",
            "ai_score": 92,
            "ai_confidence": 0.95,
            "ai_reason": "Established wellness studio with multi-location sound bath facilities and retail shop.",
            "priority": "high",
            "outreach_status": "not_eligible",
            "is_duplicate": False,
            "product_id": p_id,
            "is_demo": True
        },
        {
            "lead_id": "demo-nordic-mind",
            "id": "demo-nordic-mind",
            "company_name": "Nordic Mind & Body GmbH",
            "company": "Nordic Mind & Body GmbH",
            "contact_name": None,
            "buyer_name": None,
            "email": "procurement@nordicmindbody-demo.de",
            "country": "Germany",
            "buyer_type": "Wholesale Importer",
            "website": "https://nordicmindbody-demo.de",
            "phone": "+49 30 1234567",
            "source": "Sample Workflow Directory",
            "email_status": "valid",
            "syntax_valid": True,
            "qualification_status": "qualified",
            "ai_score": 88,
            "ai_confidence": 0.91,
            "ai_reason": "Major European importer and B2B distributor of meditation accessories.",
            "priority": "high",
            "outreach_status": "not_eligible",
            "is_duplicate": False,
            "product_id": p_id,
            "is_demo": True
        },
        {
            "lead_id": "demo-highland-holistic",
            "id": "demo-highland-holistic",
            "company_name": "Highland Holistic Healing Ltd",
            "company": "Highland Holistic Healing Ltd",
            "contact_name": None,
            "buyer_name": None,
            "email": "contact@highlandholistic-demo.co.uk",
            "country": "United Kingdom",
            "buyer_type": "Specialty Retailer & Distributor",
            "website": "https://highlandholistic-demo.co.uk",
            "phone": "+44 131 555 0148",
            "source": "Sample Workflow Directory",
            "email_status": "valid",
            "syntax_valid": True,
            "qualification_status": "qualified",
            "ai_score": 84,
            "ai_confidence": 0.89,
            "ai_reason": "Specialty holistic retailer with wholesale distribution network across UK.",
            "priority": "medium",
            "outreach_status": "not_eligible",
            "is_duplicate": False,
            "product_id": p_id,
            "is_demo": True
        },
        {
            "lead_id": "demo-zenith-therapy",
            "id": "demo-zenith-therapy",
            "company_name": "Zenith Sound Therapy SARL",
            "company": "Zenith Sound Therapy SARL",
            "contact_name": None,
            "buyer_name": None,
            "email": None,
            "country": "France",
            "buyer_type": "Sound Bath Studio",
            "website": "https://zeniththerapy-demo.fr",
            "phone": "+33 1 42 68 00 00",
            "source": "Sample Workflow Directory",
            "email_status": "missing",
            "syntax_valid": False,
            "qualification_status": "needs_review",
            "ai_score": 60,
            "ai_confidence": 0.70,
            "ai_reason": "Sound therapy center but no email address discovered.",
            "priority": "low",
            "outreach_status": "not_eligible",
            "is_duplicate": False,
            "product_id": p_id,
            "is_demo": True
        }
    ]
    return {
        "success": True,
        "is_demo": True,
        "product_name": prod_name,
        "total_found": len(sample_records),
        "count": len(sample_records),
        "buyers": sample_records,
        "results": sample_records
    }

@app.post("/api/extraction", dependencies=[Depends(require_api_key)])
@app.post("/api/leads/enrich", dependencies=[Depends(require_api_key)])
async def retry_lead_enrichment(payload: EnrichLeadRequest):
    """Re-attempts email extraction from a buyer's company website with SSRF protection."""
    target_website = (payload.website or "").strip()
    if not target_website and payload.company:
        clean_comp = re.sub(r"[^\w\s]", "", payload.company).strip().replace(" ", "").lower()
        target_website = f"https://www.{clean_comp}.com"

    found_email = None
    if target_website.startswith("http"):
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                contact = await extract_contact_from_public_website(target_website, client)
                found_email = contact.get("email")
        except Exception:
            found_email = None

    if found_email:
        val_res = validate_email_address(found_email)
        if val_res.get("syntax_valid") is True:
            try:
                if BUYERS_CSV.exists():
                    df = pd.read_csv(BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
                    matched = False
                    for idx, row in df.iterrows():
                        if (payload.company and row.get("company_name", "").strip().lower() == payload.company.strip().lower()) or \
                           (payload.website and row.get("website", "").strip().lower() == payload.website.strip().lower()):
                            df.at[idx, "email"] = found_email
                            df.at[idx, "email_status"] = "valid"
                            df.at[idx, "syntax_valid"] = "True"
                            df.at[idx, "valid"] = "True"
                            matched = True
                            break
                    if matched:
                        df.to_csv(BUYERS_CSV, index=False, encoding="utf-8")
            except Exception as e:
                print(f"Error updating buyer email in CSV: {e}")

            return {
                "success": True,
                "email": found_email,
                "status": "valid",
                "message": "Email found on public website"
            }

    return {
        "success": False,
        "message": "Email could not be found on public website. You can enter it manually."
    }

@app.post("/api/leads/update", dependencies=[Depends(require_api_key)])
async def update_lead_endpoint(payload: UpdateLeadRequest):
    """Manually updates a buyer's contact details and re-validates email format."""
    val_res = validate_email_address(payload.email.strip())
    if not val_res.get("syntax_valid"):
        raise HTTPException(
            status_code=422,
            detail="Please enter a valid email address with correct syntax."
        )

    try:
        if not BUYERS_CSV.exists():
            raise HTTPException(status_code=404, detail="Lead store is empty.")

        df = pd.read_csv(BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
        matched = False
        target_idx = None

        contact_val = (payload.contact_name or payload.buyer_name or "").strip()
        clean_contact = contact_val if contact_val not in ["", "None", "null", "undefined", "Procurement Lead"] else None

        for idx, row in df.iterrows():
            if (payload.original_company and row.get("company_name", "").strip().lower() == payload.original_company.strip().lower()) or \
               (payload.original_email and row.get("email", "").strip().lower() == payload.original_email.strip().lower()) or \
               (row.get("company_name", "").strip().lower() == payload.company_name.strip().lower()):
                target_idx = idx
                matched = True
                break

        if matched and target_idx is not None:
            df.at[target_idx, "contact_name"] = clean_contact or ""
            df.at[target_idx, "buyer_name"] = clean_contact or ""
            df.at[target_idx, "company_name"] = payload.company_name.strip()
            df.at[target_idx, "email"] = payload.email.strip()
            if payload.website:
                df.at[target_idx, "website"] = payload.website.strip()
            if payload.country:
                df.at[target_idx, "country"] = payload.country.strip()
            if payload.buyer_type:
                df.at[target_idx, "buyer_type"] = payload.buyer_type.strip()
            df.at[target_idx, "email_status"] = "valid"
            df.at[target_idx, "syntax_valid"] = "True"
            df.at[target_idx, "valid"] = "True"
            df.to_csv(BUYERS_CSV, index=False, encoding="utf-8")
            
            updated_lead = df.iloc[target_idx].to_dict()
            return {
                "success": True,
                "message": "Buyer contact details updated.",
                "lead": updated_lead
            }
        else:
            lead_id = f"manual-{re.sub(r'[^a-zA-Z0-9]', '', payload.company_name)[:10].lower()}"
            new_row = {
                "lead_id": lead_id,
                "id": lead_id,
                "contact_name": clean_contact or "",
                "buyer_name": clean_contact or "",
                "company_name": payload.company_name.strip(),
                "company": payload.company_name.strip(),
                "email": payload.email.strip(),
                "website": payload.website or "",
                "country": payload.country or "International",
                "buyer_type": payload.buyer_type or "Distributor",
                "email_status": "valid",
                "syntax_valid": "True",
                "valid": "True",
                "qualification_status": "pending",
                "outreach_status": "not_eligible",
                "is_duplicate": "False",
                "source": "Manual Entry"
            }
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
            df.to_csv(BUYERS_CSV, index=False, encoding="utf-8")
            return {
                "success": True,
                "message": "Buyer information updated.",
                "lead": new_row
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update buyer: {str(e)}")

@app.get("/api/leads/{lead_id}")
async def get_single_lead_endpoint(lead_id: str):
    """Retrieve details for a specific buyer lead."""
    lead = LeadService.get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail=f"Lead with id '{lead_id}' not found.")
    return {"success": True, "lead": lead}

@app.patch("/api/leads/{lead_id}", dependencies=[Depends(require_api_key)])
async def patch_single_lead_endpoint(lead_id: str, payload: Dict[str, Any]):
    """Partially update lead attributes and recalculate validation state."""
    # If email is modified, revalidate
    if "email" in payload and payload["email"]:
        val_res = validate_email_address(payload["email"].strip())
        if not val_res.get("syntax_valid"):
            raise HTTPException(status_code=422, detail="Provided email failed syntax validation.")
        payload["email_status"] = "valid"
        payload["syntax_valid"] = "True"
        payload["valid"] = "True"

    updated = LeadService.update_lead(lead_id, payload)
    if not updated:
        raise HTTPException(status_code=404, detail=f"Lead with id '{lead_id}' not found.")
    return {"success": True, "message": "Lead updated successfully.", "lead": updated}

@app.delete("/api/leads/{lead_id}", dependencies=[Depends(require_api_key)])
async def delete_single_lead_endpoint(lead_id: str):
    """Remove a buyer lead from storage."""
    deleted = LeadService.delete_lead(lead_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Lead with id '{lead_id}' not found.")
    return {"success": True, "message": "Lead deleted successfully."}


@app.post("/api/discovery", dependencies=[Depends(require_api_key)])
@app.post("/api/search", dependencies=[Depends(require_api_key)])
async def discover_buyers_endpoint(payload: SearchRequest):

    """
    Discovers international export buyers through configured search API provider.
    Converts search results into structured buyer records without fake names.
    Respects auto_ingest flag and provides pipeline summary counters.
    """
    target_product = None
    if payload.product_id:
        target_product = ProductCatalog.get_product(payload.product_id)
    if not target_product:
        target_product = ProductCatalog.get_active_product()

    product_name = payload.product or (target_product.get("name") if target_product else "Himalayan Sound Healing Bowls")
    product_id = (target_product.get("id") if target_product else None) or payload.product_id or "himalayan-sound-healing-bowls"
    keywords = payload.keywords or (target_product.get("keywords") if target_product else None)
    buyer_type = payload.buyer_type or (target_product.get("buyer_types")[0] if target_product and target_product.get("buyer_types") else "Distributor")

    provider = WebBuyerSearchProvider()

    try:
        leads = await provider.search(
            product=product_name,
            country=payload.country,
            buyer_type=buyer_type,
            keywords=keywords,
            limit=payload.limit or 25,
            product_id=product_id
        )
    except UnsupportedSearchProviderError as e:
        raise HTTPException(
            status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
            detail={
                "error": "UNSUPPORTED_SEARCH_PROVIDER",
                "message": str(e)
            }
        )
    except SearchProviderNotConfiguredError as e:
        raise HTTPException(
            status_code=getattr(status, "HTTP_422_UNPROCESSABLE_CONTENT", 422),
            detail={
                "error": "SEARCH_PROVIDER_NOT_CONFIGURED",
                "message": str(e)
            }
        )
    except SearchProviderAPIError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail={
                "error": "SEARCH_PROVIDER_ERROR",
                "message": str(e)
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "SEARCH_EXECUTION_FAILED",
                "message": f"Unexpected error during live search: {str(e)}"
            }
        )

    # Ingest discovered leads if auto_ingest is enabled
    if payload.auto_ingest and leads:
        try:
            leads_df = pd.DataFrame(leads)
            if BUYERS_CSV.exists() and BUYERS_CSV.stat().st_size > 50:
                try:
                    existing_df = pd.read_csv(BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
                    combined_df = pd.concat([existing_df, leads_df], ignore_index=True)
                except Exception:
                    combined_df = leads_df
            else:
                combined_df = leads_df

            processed_df, _ = EmailValidator.process_and_deduplicate(combined_df)
            processed_df.to_csv(BUYERS_CSV, index=False, encoding="utf-8")
        except Exception as e:
            print(f"Error ingesting search leads: {e}")

    # Compute pipeline summary metrics
    total_found = len(leads)
    extracted_count = len([l for l in leads if l.get("company_name") or l.get("company")])
    valid_email_leads = [
        l for l in leads 
        if l.get("email") and 
        (l.get("email_status") == "valid" or str(l.get("syntax_valid", "")).lower() == "true" or l.get("syntax_valid") is True) and 
        not (l.get("is_duplicate") is True or str(l.get("is_duplicate", "")).lower() == "true")
    ]
    valid_email_count = len(valid_email_leads)
    missing_email_count = len([l for l in leads if not l.get("email") or l.get("email_status") == "missing"])
    invalid_email_count = len([l for l in leads if l.get("email") and (l.get("email_status") == "invalid" or str(l.get("syntax_valid", "")).lower() == "false" or l.get("syntax_valid") is False)])
    duplicate_count = len([l for l in leads if l.get("is_duplicate") is True or str(l.get("is_duplicate", "")).lower() == "true"])
    ai_qualified_count = len([l for l in leads if l.get("qualification_status") == "qualified"])
    outreach_eligible_count = len([l for l in leads if l.get("outreach_status") == "eligible"])
    excluded_leads = [l for l in leads if l not in valid_email_leads]
    excluded_count = len(excluded_leads)

    query_str = provider.build_search_query(
        product=product_name,
        country=payload.country,
        buyer_type=buyer_type,
        keywords=keywords
    )

    from datetime import datetime, timezone
    searched_at = datetime.now(timezone.utc).isoformat()

    return {
        "success": True,
        "query": query_str,
        "source": provider.provider,
        "searched_at": searched_at,
        "product_id": product_id,
        "product_name": product_name,
        "total_found": total_found,
        "count": total_found,
        "pipeline_summary": {
            "total_discovered": total_found,
            "extracted": extracted_count,
            "valid_emails": valid_email_count,
            "missing_emails": missing_email_count,
            "invalid_emails": invalid_email_count,
            "duplicates": duplicate_count,
            "with_email": total_found - missing_email_count,
            "ai_qualified": ai_qualified_count,
            "outreach_eligible": outreach_eligible_count,
            "excluded": excluded_count
        },
        "valid_buyers": valid_email_leads,
        "excluded_buyers": excluded_leads,
        "buyers": leads,
        "results": leads
    }


# ==========================================
# 5. UPLOAD & INGESTION
# ==========================================
@app.post("/api/upload", dependencies=[Depends(require_api_key)])
async def upload_leads_csv(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Please upload a valid .csv file."
        )

    try:
        content = await file.read()
        df, err = DataExtractor.process_csv_file(content)
        if err:
            raise HTTPException(status_code=400, detail=err)

        processed_df, stats = EmailValidator.process_and_deduplicate(df)
        processed_df.to_csv(BUYERS_CSV, index=False, encoding="utf-8")

        return {
            "success": True,
            "message": f"Successfully ingested {stats['total_records']} buyer records.",
            "stats": stats,
            "leads": processed_df.to_dict(orient="records")
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")

@app.post("/api/leads/validate", dependencies=[Depends(require_api_key)])
@app.post("/api/validation", dependencies=[Depends(require_api_key)])
@app.post("/api/validate", dependencies=[Depends(require_api_key)])
async def validate_single_email_endpoint(
    payload: Optional[EmailValidateRequest] = None,
    email: Optional[str] = Form(default=None)
):
    target_email = payload.email if payload and payload.email is not None else email
    result = validate_email_address(target_email)
    return {
        "email": result.get("email"),
        "status": result.get("status"),
        "syntax_valid": result.get("syntax_valid", False),
        "valid": result.get("valid", False),
        "reason": result.get("reason", "")
    }


# ==========================================
# 6. AI QUALIFICATION
# ==========================================
@app.get("/api/classification")
async def get_classification_data(product_id: Optional[str] = None):
    biz_leads, ind_leads = [], []
    if BUSINESS_EMAILS_CSV.exists():
        try:
            df_biz = pd.read_csv(BUSINESS_EMAILS_CSV, dtype=str, encoding="utf-8").fillna("")
            if product_id and "product_id" in df_biz.columns:
                df_biz = df_biz[df_biz["product_id"] == product_id]
            biz_leads = df_biz.to_dict(orient="records")
        except Exception:
            pass

    if INDIVIDUAL_EMAILS_CSV.exists():
        try:
            df_ind = pd.read_csv(INDIVIDUAL_EMAILS_CSV, dtype=str, encoding="utf-8").fillna("")
            if product_id and "product_id" in df_ind.columns:
                df_ind = df_ind[df_ind["product_id"] == product_id]
            ind_leads = df_ind.to_dict(orient="records")
        except Exception:
            pass

    gemini_key, gemini_model = get_gemini_config()
    active_prod = ProductCatalog.get_product(product_id) if product_id else ProductCatalog.get_active_product()

    return {
        "has_gemini_key": bool(gemini_key),
        "gemini_model": gemini_model,
        "product": active_prod,
        "business_count": len(biz_leads),
        "individual_count": len(ind_leads),
        "business_leads": biz_leads,
        "individual_leads": ind_leads
    }

@app.post("/api/leads/classify", dependencies=[Depends(require_api_key)])
@app.post("/api/classify", dependencies=[Depends(require_api_key)])
async def run_classification(payload: Optional[ClassifyRequest] = None):

    pid = payload.product_id if payload else None
    pname = payload.product_name if payload else None
    success, status_code, msg, summary = LeadClassifier.execute_qualification(
        product_id=pid,
        product_name=pname
    )
    if not success:
        raise HTTPException(status_code=400, detail={"error": status_code, "message": msg})

    return {
        "success": True,
        "status": status_code,
        "message": msg,
        "summary": summary
    }


# ==========================================
# 7. CAMPAIGN DISPATCH
# ==========================================
@app.get("/api/campaigns")
async def list_campaigns_endpoint(product_id: Optional[str] = None):
    """List campaign statistics and activity history for active or selected product."""
    metrics = ReportGenerator.get_campaign_metrics(product_id=product_id)
    return {"success": True, "campaigns": metrics}

@app.post("/api/campaigns", dependencies=[Depends(require_api_key)])
@app.post("/api/campaign", dependencies=[Depends(require_api_key)])
@app.post("/api/send", dependencies=[Depends(require_api_key)])
async def send_campaign(payload: SendCampaignRequest):

    # 1. Block demo data from entering live outreach
    if payload.audience.lower() == "demo" or (payload.custom_email and "-demo." in payload.custom_email.lower()):
        raise HTTPException(
            status_code=422,
            detail={
                "error": "DEMO_DATA_OUTREACH_BLOCKED",
                "message": "Demo buyers cannot be targeted for live outreach."
            }
        )

    # 2. Custom Single Email Send (Test Email)
    if payload.audience.lower() == "custom" or payload.custom_email:
        if not payload.custom_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom recipient requires a valid email address."
            )
        
        val_res = validate_email_address(payload.custom_email)
        if not val_res.get("syntax_valid"):
            raise HTTPException(
                status_code=422,
                detail="Recipient email address is invalid."
            )

        target_prod = ProductCatalog.get_product(payload.product_id) if payload.product_id else ProductCatalog.get_active_product()
        subj = payload.subject or (target_prod.get("email_subject_template") if target_prod else DEFAULT_SUBJECT)
        body = payload.body_template or (target_prod.get("email_body_template") if target_prod else DEFAULT_BODY)
        prod_name = target_prod.get("name") if target_prod else "Himalayan Sound Healing Bowls"

        clean_sub = EmailSender.personalize_text(
            subj,
            contact_name=payload.custom_buyer_name,
            company_name=payload.custom_company_name,
            country=payload.custom_country,
            buyer_type=payload.custom_buyer_type,
            product=prod_name
        )
        clean_body = EmailSender.personalize_text(
            body,
            contact_name=payload.custom_buyer_name,
            company_name=payload.custom_company_name,
            country=payload.custom_country,
            buyer_type=payload.custom_buyer_type,
            product=prod_name
        )

        pdf_att = "assets/company_presentation.pdf" if payload.attach_presentation else None
        success, error_msg = EmailSender.send_smtp_email(
            to_email=payload.custom_email.strip(),
            subject=clean_sub,
            body_text=clean_body,
            attachment_path=pdf_att
        )

        status_str = "SENT" if success else "FAILED"
        ActivityLogger.log_activity(
            buyer_name=payload.custom_buyer_name or "Test Recipient",
            company=payload.custom_company_name or "Custom Test",
            email=payload.custom_email.strip(),
            classification="custom",
            mode="SMTP",
            status=status_str,
            error=error_msg if not success else "",
            campaign=prod_name
        )

        return {
            "success": success,
            "dispatched": 1 if success else 0,
            "failed": 0 if success else 1,
            "results": {
                "audience": "custom",
                "sent_count": 1 if success else 0,
                "failed_count": 0 if success else 1,
                "results": [{
                    "recipient": payload.custom_email.strip(),
                    "status": "sent" if success else "failed",
                    "error": error_msg if not success else None
                }]
            }
        }

    # 3. Batch Campaign Dispatch with Authoritative Eligibility
    target_prod = ProductCatalog.get_product(payload.product_id) if payload.product_id else ProductCatalog.get_active_product()
    prod_id = target_prod.get("id") if target_prod else (payload.product_id or "himalayan-sound-healing-bowls")
    subj = payload.subject or (target_prod.get("email_subject_template") if target_prod else DEFAULT_SUBJECT)
    body = payload.body_template or (target_prod.get("email_body_template") if target_prod else DEFAULT_BODY)
    pdf_path = target_prod.get("catalog_path") if target_prod else "assets/company_presentation.pdf"

    results = EmailSender.execute_campaign(
        product_id=prod_id,
        lead_ids=payload.lead_ids,
        subject_template=subj,
        body_template=body,
        attach_presentation=payload.attach_presentation,
        catalog_path=pdf_path
    )

    if not results.get("success") and results.get("error") == "DAILY_SEND_LIMIT_EXCEEDED":
        raise HTTPException(
            status_code=422,
            detail=results
        )

    return {
        "success": results.get("dispatched", 0) > 0 or (results.get("total_targeted", 0) == 0 and results.get("skipped", 0) > 0),
        "results": results
    }

@app.post("/api/send/test", dependencies=[Depends(require_api_key)])
async def send_test_email(payload: TestEmailRequest):
    """Dispatches a real single test email via Gmail SMTP for verification."""
    val_res = validate_email_address(payload.recipient_email)
    if not val_res.get("syntax_valid"):
        raise HTTPException(
            status_code=422,
            detail="Recipient email address has invalid syntax."
        )

    target_prod = ProductCatalog.get_product(payload.product_id) if payload.product_id else ProductCatalog.get_active_product()
    subj = payload.subject or (target_prod.get("email_subject_template") if target_prod else DEFAULT_SUBJECT)
    body = payload.body_template or (target_prod.get("email_body_template") if target_prod else DEFAULT_BODY)
    prod_name = target_prod.get("name") if target_prod else "Himalayan Sound Healing Bowls"

    clean_sub = EmailSender.personalize_text(
        subj,
        contact_name=payload.recipient_name,
        company_name=payload.company_name,
        country=payload.country,
        buyer_type=payload.buyer_type,
        product=prod_name
    )
    clean_body = EmailSender.personalize_text(
        body,
        contact_name=payload.recipient_name,
        company_name=payload.company_name,
        country=payload.country,
        buyer_type=payload.buyer_type,
        product=prod_name
    )

    pdf_att = "assets/company_presentation.pdf" if payload.attach_presentation else None
    success, error_msg = EmailSender.send_smtp_email(
        to_email=payload.recipient_email.strip(),
        subject=clean_sub,
        body_text=clean_body,
        attachment_path=pdf_att
    )

    status_str = "SENT" if success else "FAILED"
    ActivityLogger.log_activity(
        buyer_name=payload.recipient_name or "Test Recipient",
        company=payload.company_name or "Test Organization",
        email=payload.recipient_email.strip(),
        classification="custom",
        mode="SMTP_TEST",
        status=status_str,
        error=error_msg if not success else "",
        campaign=f"[TEST] {prod_name}"
    )

    return {
        "success": success,
        "dispatched": 1 if success else 0,
        "error": error_msg if not success else None
    }


# ==========================================
# 8. LOGGING & REPORTS
# ==========================================
@app.get("/api/activity")
async def get_recent_activity(limit: int = 100):
    logs = ActivityLogger.get_recent_logs(limit=limit)
    return {"total": len(logs), "logs": logs}

@app.get("/api/reports")
@app.get("/api/report")
async def get_campaign_report(product_id: Optional[str] = None):
    metrics = ReportGenerator.get_campaign_metrics(product_id=product_id)
    return {"metrics": metrics}

@app.get("/api/report/download")
async def download_campaign_report():
    report_csv = ReportGenerator.generate_csv_report_string()
    return Response(
        content=report_csv,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=singing_bowls_export_report.csv"}
    )


# ==========================================
# 9. SETTINGS & DIAGNOSTICS
# ==========================================
@app.get("/api/settings")
async def get_settings():
    settings = load_settings()
    search_cfg = get_search_provider_config()
    gemini_key, gemini_model = get_gemini_config()
    gmail_user, gmail_pass = get_gmail_credentials()
    
    masked_gmail = ""
    if "@" in gmail_user:
        parts = gmail_user.split("@")
        username = parts[0]
        domain = parts[1]
        masked_user = username[:3] + "***" if len(username) >= 3 else username + "***"
        masked_gmail = f"{masked_user}@{domain}"

    search_status = "READY" if search_cfg.get("api_key") else "NOT_CONFIGURED"
    gemini_status = "READY" if gemini_key else "NOT_CONFIGURED"
    gmail_status = "READY" if (gmail_user and gmail_pass) else "NOT_CONFIGURED"

    return {
        "target_product": settings.get("SEARCH_KEYWORD", "Himalayan Sound Healing Bowls"),
        "send_delay": int(settings.get("SEND_DELAY", 1)),
        "max_emails_per_run": int(settings.get("MAX_EMAILS_PER_RUN", 25)),
        "daily_send_limit": int(settings.get("DAILY_SEND_LIMIT", 100)),
        "smtp_host": settings.get("SMTP_HOST", "smtp.gmail.com"),
        "smtp_port": int(settings.get("SMTP_PORT", 587)),
        "search_configured": bool(search_cfg.get("api_key")),
        "search_status": search_status,
        "search_provider": search_cfg.get("provider", "serper"),
        "gemini_configured": bool(gemini_key),
        "gemini_status": gemini_status,
        "gemini_model": gemini_model,
        "gmail_configured": bool(gmail_user and gmail_pass),
        "gmail_status": gmail_status,
        "gmail_account_masked": masked_gmail,
        "settings": settings
    }

@app.post("/api/settings", dependencies=[Depends(require_api_key)])
async def update_settings(payload: SettingsUpdateRequest):
    current = load_settings()
    
    if payload.SEARCH_KEYWORD is not None:
        current["SEARCH_KEYWORD"] = payload.SEARCH_KEYWORD.strip()
    if payload.SEND_DELAY is not None:
        current["SEND_DELAY"] = max(0, payload.SEND_DELAY)
    if payload.MAX_EMAILS_PER_RUN is not None:
        current["MAX_EMAILS_PER_RUN"] = max(1, payload.MAX_EMAILS_PER_RUN)
    if payload.DAILY_SEND_LIMIT is not None:
        current["DAILY_SEND_LIMIT"] = max(1, payload.DAILY_SEND_LIMIT)
    if payload.SMTP_HOST is not None:
        current["SMTP_HOST"] = payload.SMTP_HOST.strip()
    if payload.SMTP_PORT is not None:
        current["SMTP_PORT"] = payload.SMTP_PORT

    save_settings(current)
    return {
        "success": True,
        "message": "Settings updated successfully.",
        "settings": current
    }

@app.post("/api/settings/test-smtp", dependencies=[Depends(require_api_key)])
async def test_smtp_connection():
    """Performs live SMTP handshake and authentication with Gmail without dispatching emails."""
    settings = load_settings()
    smtp_host = settings.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(settings.get("SMTP_PORT", 587))
    smtp_user, smtp_pass = get_gmail_credentials()

    if not smtp_user or not smtp_pass:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gmail credentials are not configured in backend environment."
        )

    try:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.quit()
        return {
            "success": True,
            "message": f"SMTP Handshake Successful! Authenticated as {smtp_user} via {smtp_host}:{smtp_port} with STARTTLS encryption."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SMTP Connection Failed: {str(e)}"
        )

@app.post("/api/settings/test-gemini", dependencies=[Depends(require_api_key)])
async def test_gemini_connection():
    """Validates Gemini AI connection and model readiness."""
    gemini_key, gemini_model = get_gemini_config()
    if not gemini_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini API key is not configured in backend environment."
        )
    try:
        import google.generativeai as genai
        genai.configure(api_key=gemini_key)
        active_model = gemini_model
        try:
            model = genai.GenerativeModel(active_model)
            res = model.generate_content("Respond with exactly: OK")
        except Exception as initial_err:
            if "not found" in str(initial_err).lower() or "404" in str(initial_err) or "not supported" in str(initial_err).lower():
                active_model = "gemini-2.5-flash"
                model = genai.GenerativeModel(active_model)
                res = model.generate_content("Respond with exactly: OK")
            else:
                raise initial_err

        return {
            "success": True,
            "message": f"Gemini AI operational! Connected to {active_model}."
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini API connection error: {str(e)}"
        )

@app.post("/api/settings/test-search", dependencies=[Depends(require_api_key)])
async def test_search_connection():
    """Validates Search Provider configuration."""
    search_cfg = get_search_provider_config()
    provider = search_cfg.get("provider", "serper")
    api_key = search_cfg.get("api_key", "")
    engine_id = search_cfg.get("engine_id", "") or search_cfg.get("cx_id", "")

    if not api_key or api_key.lower().startswith("your_") or api_key.lower() in ["placeholder", "none", "null"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Search API key is not configured for provider '{provider}'. Please configure SEARCH_API_KEY in .env."
        )
    if provider == "google_cse" and (not engine_id or engine_id.lower().startswith("your_")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Custom Search Engine CX ID (SEARCH_ENGINE_ID) is required for google_cse."
        )
    return {
        "success": True,
        "message": f"Search provider '{provider}' credentials verified and ready for live discovery."
    }

@app.get("/api/catalog")
async def get_catalog_file():
    """Serves the product catalog presentation PDF for in-browser preview or download."""
    from fastapi.responses import FileResponse
    from config import COMPANY_PRESENTATION_PDF
    if not COMPANY_PRESENTATION_PDF.exists():
        raise HTTPException(status_code=404, detail="Company presentation PDF not found.")
    return FileResponse(
        path=str(COMPANY_PRESENTATION_PDF),
        filename="Himalayan_Singing_Bowls_Export_Catalog.pdf",
        media_type="application/pdf"
    )

@app.get("/api/leads/invalid")
async def get_invalid_leads():
    """Returns invalid/missing leads with exclusion reasons to ensure transparency."""
    if not BUYERS_CSV.exists():
        return {"total": 0, "invalid_leads": []}

    try:
        df = pd.read_csv(BUYERS_CSV, dtype=str, encoding="utf-8").fillna("")
        invalid_mask = (df.get("email_status", "valid") != "valid") | (df.get("is_duplicate", "False").astype(str).str.lower() == "true")
        invalid_df = df[invalid_mask]
        return {
            "total": len(invalid_df),
            "invalid_leads": invalid_df.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read invalid leads: {str(e)}")

# ==========================================
# 11. FRONTEND STATIC SERVING & SPA FALLBACK
# ==========================================
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

FRONTEND_DIST = ROOT_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists() and (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="static_assets")

@app.get("/")
async def root_endpoint():
    frontend_index = FRONTEND_DIST / "index.html"
    if frontend_index.exists():
        return FileResponse(str(frontend_index))
    return {
        "service": "EXPORT Automation System API",
        "status": "online",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "message": "FastAPI Backend is online and operational."
    }

@app.get("/{full_path:path}")
async def serve_spa_catchall(full_path: str):
    """Fallback handler to serve React SPA client routes on Render."""
    if full_path.startswith("api/") or full_path.startswith("docs") or full_path.startswith("openapi.json"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    frontend_index = FRONTEND_DIST / "index.html"
    if frontend_index.exists():
        return FileResponse(str(frontend_index))
    raise HTTPException(status_code=404, detail=f"Path '/{full_path}' not found on backend.")

