"""
EXPORT Automation System — FastAPI REST Backend
Live B2B lead discovery, contact validation, Gemini AI qualification, and personalized Gmail SMTP outreach.
"""
import sys
from pathlib import Path
from typing import Optional, Dict, Any, List
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

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
    SearchProviderAPIError
)
from search.parser import extract_contact_from_public_website
import httpx
import re
from extraction.data_extractor import DataExtractor
from validation.email_validator import EmailValidator, validate_email_address
from classification.gemini_classifier import LeadClassifier
from outreach.attachment_handler import AttachmentHandler
from outreach.gmail_sender import EmailSender, DEFAULT_SUBJECT, DEFAULT_BODY
from logging_module.activity_logger import ActivityLogger
from reports.report_generator import ReportGenerator

# Initialize FastAPI app
app = FastAPI(
    title="EXPORT Automation System API",
    description="Live B2B Export Automation Platform for Himalayan Singing Bowls",
    version="2.0.0"
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from products.catalog import ProductCatalog

ActivityLogger.ensure_log_file()

# Pydantic Models
class ProductCreateRequest(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = ""
    keywords: Optional[Any] = None # List[str] or str
    buyer_types: Optional[Any] = None # List[str] or str
    target_countries: Optional[Any] = None # List[str] or str
    email_subject_template: Optional[str] = None
    email_body_template: Optional[str] = None
    catalog_path: Optional[str] = "assets/company_presentation.pdf"
    active: Optional[bool] = False

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

class SearchRequest(BaseModel):
    product_id: Optional[str] = Field(default=None)
    product: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    buyer_type: Optional[str] = Field(default=None)
    keywords: Optional[Any] = Field(default=None) # str or List[str]
    limit: Optional[int] = Field(default=25)
    auto_ingest: Optional[bool] = Field(default=True)

class SendCampaignRequest(BaseModel):
    product_id: Optional[str] = Field(default=None)
    campaign_id: Optional[str] = Field(default=None)
    audience: str = Field(default="business") # business | individual | all | custom
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
    buyer_name: str
    email: str
    website: Optional[str] = None
    country: Optional[str] = None
    buyer_type: Optional[str] = None


# ==========================================
# 1. HEALTH & SYSTEM STATUS
# ==========================================
@app.get("/api/health")
async def health_check():
    search_cfg = get_search_provider_config()
    gemini_key, _ = get_gemini_config()
    gmail_user, gmail_pass = get_gmail_credentials()

    return {
        "status": "healthy",
        "service": "EXPORT Automation System",
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

@app.post("/api/products", status_code=status.HTTP_201_CREATED)
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

@app.put("/api/products/{product_id}")
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

@app.delete("/api/products/{product_id}")
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

@app.post("/api/products/{product_id}/activate")
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
            "search_provider": search_cfg.get("provider", "google_cse"),
            "search_configured": bool(search_cfg.get("api_key")),
            "gemini_configured": bool(gemini_key),
            "gemini_model": gemini_model,
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
        df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
        if product_id and "product_id" in df.columns:
            df = df[df["product_id"] == product_id]
        records = df.to_dict(orient="records")
        return {"total": len(records), "leads": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read buyers: {str(e)}")

@app.get("/api/sample-buyers")
async def get_sample_workflow_buyers(product_id: Optional[str] = None):
    """
    Returns explicitly labeled demonstration buyers for the sample workflow.
    Every record is marked with is_demo=True and cannot enter production outreach.
    """
    prod = ProductCatalog.get_product(product_id) if product_id else ProductCatalog.get_active_product()
    prod_name = prod.get("name", "Himalayan Sound Healing Bowls") if prod else "Himalayan Sound Healing Bowls"
    
    sample_records = [
        {
            "buyer_name": "Marcus Vance",
            "company_name": "Vance Sound Sanctuary LLC",
            "email": "partnerships@soundsanctuary-demo.com",
            "country": "United States",
            "buyer_type": "Wellness Studio & Distributor",
            "website": "https://soundsanctuary-demo.com",
            "phone": "+1 415-555-0192",
            "source": "Sample Workflow Directory",
            "email_status": "valid",
            "is_duplicate": "False",
            "product_id": prod.get("id") if prod else "himalayan-sound-healing-bowls",
            "is_demo": True
        },
        {
            "buyer_name": "Elena Rostova",
            "company_name": "Nordic Mind & Body GmbH",
            "email": "procurement@nordicmindbody-demo.de",
            "country": "Germany",
            "buyer_type": "Wholesale Importer",
            "website": "https://nordicmindbody-demo.de",
            "phone": "+49 30 1234567",
            "source": "Sample Workflow Directory",
            "email_status": "valid",
            "is_duplicate": "False",
            "product_id": prod.get("id") if prod else "himalayan-sound-healing-bowls",
            "is_demo": True
        },
        {
            "buyer_name": "Alistair Campbell",
            "company_name": "Highland Holistic Healing Ltd",
            "email": "contact@highlandholistic-demo.co.uk",
            "country": "United Kingdom",
            "buyer_type": "Specialty Retailer & Distributor",
            "website": "https://highlandholistic-demo.co.uk",
            "phone": "+44 131 555 0148",
            "source": "Sample Workflow Directory",
            "email_status": "valid",
            "is_duplicate": "False",
            "product_id": prod.get("id") if prod else "himalayan-sound-healing-bowls",
            "is_demo": True
        },
        {
            "buyer_name": "Claire Dubois",
            "company_name": "Zenith Sound Therapy SARL",
            "email": "import@zeniththerapy-demo.fr",
            "country": "France",
            "buyer_type": "Sound Bath Studio",
            "website": "https://zeniththerapy-demo.fr",
            "phone": "+33 1 42 68 00 00",
            "source": "Sample Workflow Directory",
            "email_status": "valid",
            "is_duplicate": "False",
            "product_id": prod.get("id") if prod else "himalayan-sound-healing-bowls",
            "is_demo": True
        },
        {
            "buyer_name": "David Tanaka",
            "company_name": "Tanaka Lifestyle Imports Co.",
            "email": "inquiry@tanakalifestyle-demo.jp",
            "country": "Japan",
            "buyer_type": "Wholesale Importer",
            "website": "https://tanakalifestyle-demo.jp",
            "phone": "+81 3 5555 0188",
            "source": "Sample Workflow Directory",
            "email_status": "valid",
            "is_duplicate": "False",
            "product_id": prod.get("id") if prod else "himalayan-sound-healing-bowls",
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

@app.post("/api/leads/enrich")
async def retry_lead_enrichment(payload: EnrichLeadRequest):
    """
    Re-attempts email extraction from a buyer's company website or domain.
    Never fabricates emails; returns not found if unavailable.
    """
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
        if val_res.get("valid") is True:
            try:
                if BUYERS_CSV.exists():
                    df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
                    matched = False
                    for idx, row in df.iterrows():
                        if (payload.company and row.get("company_name", "").strip().lower() == payload.company.strip().lower()) or \
                           (payload.website and row.get("website", "").strip().lower() == payload.website.strip().lower()):
                            df.at[idx, "email"] = found_email
                            df.at[idx, "email_status"] = "valid"
                            df.at[idx, "valid"] = "True"
                            matched = True
                            break
                    if matched:
                        df.to_csv(BUYERS_CSV, index=False)
            except Exception as e:
                print(f"Error updating buyer email in CSV: {e}")

            return {
                "success": True,
                "email": found_email,
                "status": "valid",
                "message": "Email found"
            }

    return {
        "success": False,
        "message": "Email could not be found. You can add it manually."
    }

@app.post("/api/leads/update")
async def update_lead_endpoint(payload: UpdateLeadRequest):
    """
    Manually updates a buyer's contact details and re-validates email format.
    """
    val_res = validate_email_address(payload.email.strip())
    if not val_res.get("valid"):
        raise HTTPException(
            status_code=422,
            detail="Please enter a valid email address."
        )

    try:
        if not BUYERS_CSV.exists():
            raise HTTPException(status_code=404, detail="Lead store is empty.")

        df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
        matched = False
        target_idx = None

        for idx, row in df.iterrows():
            if (payload.original_company and row.get("company_name", "").strip().lower() == payload.original_company.strip().lower()) or \
               (payload.original_email and row.get("email", "").strip().lower() == payload.original_email.strip().lower()) or \
               (row.get("company_name", "").strip().lower() == payload.company_name.strip().lower()):
                target_idx = idx
                matched = True
                break

        if matched and target_idx is not None:
            df.at[target_idx, "buyer_name"] = payload.buyer_name.strip()
            df.at[target_idx, "company_name"] = payload.company_name.strip()
            df.at[target_idx, "email"] = payload.email.strip()
            if payload.website:
                df.at[target_idx, "website"] = payload.website.strip()
            if payload.country:
                df.at[target_idx, "country"] = payload.country.strip()
            if payload.buyer_type:
                df.at[target_idx, "buyer_type"] = payload.buyer_type.strip()
            df.at[target_idx, "email_status"] = "valid"
            df.at[target_idx, "valid"] = "True"
            df.to_csv(BUYERS_CSV, index=False)
            
            updated_lead = df.iloc[target_idx].to_dict()
            return {
                "success": True,
                "message": "Buyer information updated.",
                "lead": updated_lead
            }
        else:
            new_row = {
                "buyer_name": payload.buyer_name.strip(),
                "company_name": payload.company_name.strip(),
                "email": payload.email.strip(),
                "website": payload.website or "",
                "country": payload.country or "International",
                "buyer_type": payload.buyer_type or "Distributor",
                "email_status": "valid",
                "valid": "True",
                "is_duplicate": "False",
                "source": "Manual Entry"
            }
            df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
            df.to_csv(BUYERS_CSV, index=False)
            return {
                "success": True,
                "message": "Buyer information updated.",
                "lead": new_row
            }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update buyer: {str(e)}")


@app.post("/api/search")
async def discover_buyers_endpoint(payload: SearchRequest):
    """
    Discovers international export buyers using live web search API.
    Resolves product context from ProductCatalog and validates contacts in real-time.
    """
    # Resolve product from catalog
    target_product = None
    if payload.product_id:
        target_product = ProductCatalog.get_product(payload.product_id)
    if not target_product:
        target_product = ProductCatalog.get_active_product()

    product_name = payload.product or target_product.get("name") or "Himalayan Sound Healing Bowls"
    product_id = target_product.get("id") or "himalayan-sound-healing-bowls"
    keywords = payload.keywords or target_product.get("keywords")
    buyer_type = payload.buyer_type or (target_product.get("buyer_types")[0] if target_product.get("buyer_types") else "Distributor")

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

    # Ingest discovered leads to pipeline store
    if leads:
        try:
            leads_df = pd.DataFrame(leads)
            rename_map = {
                "contact_name": "buyer_name",
                "company_name": "company_name",
                "source": "source_platform"
            }
            mapped_df = leads_df.rename(columns=rename_map)
            
            if BUYERS_CSV.exists() and BUYERS_CSV.stat().st_size > 100:
                try:
                    existing_df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
                    combined_df = pd.concat([existing_df, mapped_df], ignore_index=True)
                except Exception:
                    combined_df = mapped_df
            else:
                combined_df = mapped_df

            processed_df, stats = EmailValidator.process_and_deduplicate(combined_df)
            processed_df.to_csv(BUYERS_CSV, index=False)
        except Exception as e:
            print(f"Error ingesting search leads: {e}")

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
        "total_found": len(leads),
        "count": len(leads),
        "buyers": leads,
        "results": leads,
        "query_details": {
            "product_id": product_id,
            "product": product_name,
            "country": payload.country,
            "buyer_type": buyer_type,
            "keywords": keywords,
            "limit": payload.limit
        }
    }


# ==========================================
# 4. UPLOAD & INGESTION
# ==========================================
@app.post("/api/upload")
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
        processed_df.to_csv(BUYERS_CSV, index=False)

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

@app.post("/api/validate")
async def validate_single_email_endpoint(email: str = Form(...)):
    result = validate_email_address(email)
    return result


# ==========================================
# 5. AI CLASSIFICATION
# ==========================================
@app.get("/api/classification")
async def get_classification_data(product_id: Optional[str] = None):
    biz_leads, ind_leads = [], []
    if BUSINESS_EMAILS_CSV.exists():
        try:
            df_biz = pd.read_csv(BUSINESS_EMAILS_CSV, dtype=str).fillna("")
            if product_id and "product_id" in df_biz.columns:
                df_biz = df_biz[df_biz["product_id"] == product_id]
            biz_leads = df_biz.to_dict(orient="records")
        except Exception:
            pass

    if INDIVIDUAL_EMAILS_CSV.exists():
        try:
            df_ind = pd.read_csv(INDIVIDUAL_EMAILS_CSV, dtype=str).fillna("")
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

class ClassifyRequest(BaseModel):
    product_id: Optional[str] = None
    product_name: Optional[str] = None

@app.post("/api/classify")
async def run_classification(payload: Optional[ClassifyRequest] = None):
    pid = payload.product_id if payload else None
    pname = payload.product_name if payload else None
    success, status_code, msg, summary = LeadClassifier.execute_classification(
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
# 6. CAMPAIGN DISPATCH
# ==========================================
@app.post("/api/send")
async def send_campaign(payload: SendCampaignRequest):
    # Block demo data from receiving live outreach
    if payload.audience.lower() == "demo" or (payload.custom_email and "-demo." in payload.custom_email.lower()):
        raise HTTPException(
            status_code=422,
            detail={
                "error": "DEMO_DATA_OUTREACH_BLOCKED",
                "message": "Demo data cannot be sent live outreach."
            }
        )

    custom_recipient = None
    if payload.audience.lower() == "custom":
        if not payload.custom_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Custom recipient requires a valid email address."
            )
        custom_recipient = {
            "email": payload.custom_email.strip(),
            "name": (payload.custom_buyer_name or "").strip(),
            "company": (payload.custom_company_name or "").strip(),
            "country": (payload.custom_country or "").strip(),
            "buyer_type": (payload.custom_buyer_type or "").strip()
        }

    # Resolve product templates if not custom provided
    target_prod = ProductCatalog.get_product(payload.product_id) if payload.product_id else ProductCatalog.get_active_product()
    subj = payload.subject or (target_prod.get("email_subject_template") if target_prod else DEFAULT_SUBJECT)
    body = payload.body_template or (target_prod.get("email_body_template") if target_prod else DEFAULT_BODY)
    prod_id = target_prod.get("id") if target_prod else payload.product_id
    prod_name = target_prod.get("name") if target_prod else None

    results = EmailSender.send_campaign(
        audience=payload.audience,
        subject=subj,
        body_template=body,
        attach_presentation=payload.attach_presentation,
        custom_recipient=custom_recipient,
        product_id=prod_id,
        campaign_id=payload.campaign_id,
        product_name=prod_name
    )

    return {
        "success": results["sent_count"] > 0 or (results["total_targeted"] == 0 and results["skipped_duplicates"] > 0),
        "results": results
    }

@app.post("/api/send/test")
async def send_test_email(payload: TestEmailRequest):
    """Dispatches a real single test email via Gmail SMTP for verification."""
    target_prod = ProductCatalog.get_product(payload.product_id) if payload.product_id else ProductCatalog.get_active_product()
    subj = payload.subject or (target_prod.get("email_subject_template") if target_prod else DEFAULT_SUBJECT)
    body = payload.body_template or (target_prod.get("email_body_template") if target_prod else DEFAULT_BODY)

    custom_recipient = {
        "email": payload.recipient_email.strip(),
        "name": (payload.recipient_name or "").strip() or "Test Recipient",
        "company": (payload.company_name or "").strip() or "Sample Export Partner",
        "country": (payload.country or "").strip() or "United States",
        "buyer_type": (payload.buyer_type or "").strip() or "Distributor"
    }

    results = EmailSender.send_campaign(
        audience="custom",
        subject=subj,
        body_template=body,
        attach_presentation=payload.attach_presentation,
        custom_recipient=custom_recipient,
        product_id=target_prod.get("id") if target_prod else None,
        product_name=target_prod.get("name") if target_prod else None
    )

    return {
        "success": results["sent_count"] > 0,
        "results": results
    }


# ==========================================
# 7. LOGGING & REPORTS
# ==========================================
@app.get("/api/activity")
async def get_recent_activity(limit: int = 100):
    logs = ActivityLogger.get_recent_logs(limit=limit)
    return {"total": len(logs), "logs": logs}

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
# 8. SETTINGS
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

    return {
        "target_product": settings.get("SEARCH_KEYWORD", "Himalayan Sound Healing Bowls"),
        "send_delay": int(settings.get("SEND_DELAY", 1)),
        "max_emails_per_run": int(settings.get("MAX_EMAILS_PER_RUN", 25)),
        "daily_send_limit": int(settings.get("DAILY_SEND_LIMIT", 100)),
        "smtp_host": settings.get("SMTP_HOST", "smtp.gmail.com"),
        "smtp_port": int(settings.get("SMTP_PORT", 587)),
        "search_configured": bool(search_cfg.get("api_key")),
        "search_provider": search_cfg.get("provider", "google_cse"),
        "gemini_configured": bool(gemini_key),
        "gemini_model": gemini_model,
        "gmail_configured": bool(gmail_user and gmail_pass),
        "gmail_account_masked": masked_gmail,
        "status": "operational",
        "settings": settings
    }

@app.post("/api/settings")
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

@app.post("/api/settings/test-smtp")
async def test_smtp_connection():
    """Performs live SMTP handshake and authentication with Gmail without dispatching emails."""
    import smtplib
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
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SMTP Connection Failed: {str(e)}"
        )

@app.post("/api/settings/test-gemini")
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

@app.post("/api/settings/test-search")
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
        df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
        invalid_mask = (df.get("email_status", "valid") != "valid") | (df.get("is_duplicate", "False").astype(str).str.lower() == "true")
        invalid_df = df[invalid_mask]
        return {
            "total": len(invalid_df),
            "invalid_leads": invalid_df.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read invalid leads: {str(e)}")

