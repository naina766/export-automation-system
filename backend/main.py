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

ActivityLogger.ensure_log_file()

# Pydantic Models
class SearchRequest(BaseModel):
    product: Optional[str] = Field(default="Himalayan Sound Healing Bowls")
    country: Optional[str] = Field(default=None)
    buyer_type: Optional[str] = Field(default=None)
    keywords: Optional[Any] = Field(default=None) # str or List[str]
    limit: Optional[int] = Field(default=10)
    auto_ingest: Optional[bool] = Field(default=True)

class SendCampaignRequest(BaseModel):
    audience: str = Field(default="business") # business | individual | all | custom
    subject: str = Field(default=DEFAULT_SUBJECT)
    body_template: str = Field(default=DEFAULT_BODY)
    attach_presentation: bool = Field(default=True)
    custom_email: Optional[str] = None
    custom_buyer_name: Optional[str] = None
    custom_company_name: Optional[str] = None
    custom_country: Optional[str] = None
    custom_buyer_type: Optional[str] = None

class SettingsUpdateRequest(BaseModel):
    SEARCH_KEYWORD: Optional[str] = "Himalayan Sound Healing Bowls"
    SEND_DELAY: Optional[int] = 1
    MAX_EMAILS_PER_RUN: Optional[int] = 25
    DAILY_SEND_LIMIT: Optional[int] = 100
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: Optional[int] = 587


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
# 2. DASHBOARD KPI & OVERVIEW
# ==========================================
@app.get("/api/dashboard")
async def get_dashboard_data():
    metrics = ReportGenerator.get_campaign_metrics()
    settings = load_settings()
    search_cfg = get_search_provider_config()
    gemini_key, gemini_model = get_gemini_config()
    gmail_user, gmail_pass = get_gmail_credentials()

    return {
        "metrics": metrics,
        "system": {
            "search_keyword": settings.get("SEARCH_KEYWORD", "Himalayan Sound Healing Bowls"),
            "search_provider": search_cfg.get("provider", "google_cse"),
            "search_configured": bool(search_cfg.get("api_key")),
            "gemini_configured": bool(gemini_key),
            "gemini_model": gemini_model,
            "gmail_configured": bool(gmail_user and gmail_pass),
            "email_mode": "SMTP"
        }
    }


# ==========================================
# 3. LIVE BUYER DISCOVERY & LEADS
# ==========================================
@app.get("/api/leads")
async def get_all_leads():
    if not BUYERS_CSV.exists():
        return {"total": 0, "leads": []}

    try:
        df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
        records = df.to_dict(orient="records")
        return {"total": len(records), "leads": records}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read buyers: {str(e)}")

@app.post("/api/search")
async def discover_buyers_endpoint(payload: SearchRequest):
    """
    Discovers international export buyers using live web search API.
    Extracts business metadata, source URLs, and validates contacts in real-time.
    """
    provider = WebBuyerSearchProvider()

    try:
        leads = await provider.search(
            product=payload.product or "Himalayan Sound Healing Bowls",
            country=payload.country,
            buyer_type=payload.buyer_type,
            keywords=payload.keywords,
            limit=payload.limit or 10
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
        product=payload.product or "Himalayan Sound Healing Bowls",
        country=payload.country,
        buyer_type=payload.buyer_type,
        keywords=payload.keywords
    )

    from datetime import datetime, timezone
    searched_at = datetime.now(timezone.utc).isoformat()

    return {
        "success": True,
        "query": query_str,
        "source": provider.provider,
        "searched_at": searched_at,
        "total_found": len(leads),
        "count": len(leads),
        "buyers": leads,
        "results": leads,
        "query_details": {
            "product": payload.product,
            "country": payload.country,
            "buyer_type": payload.buyer_type,
            "keywords": payload.keywords,
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
async def get_classification_data():
    biz_leads, ind_leads = [], []
    if BUSINESS_EMAILS_CSV.exists():
        try:
            biz_leads = pd.read_csv(BUSINESS_EMAILS_CSV, dtype=str).fillna("").to_dict(orient="records")
        except Exception:
            pass

    if INDIVIDUAL_EMAILS_CSV.exists():
        try:
            ind_leads = pd.read_csv(INDIVIDUAL_EMAILS_CSV, dtype=str).fillna("").to_dict(orient="records")
        except Exception:
            pass

    gemini_key, gemini_model = get_gemini_config()

    return {
        "has_gemini_key": bool(gemini_key),
        "gemini_model": gemini_model,
        "business_count": len(biz_leads),
        "individual_count": len(ind_leads),
        "business_leads": biz_leads,
        "individual_leads": ind_leads
    }

@app.post("/api/classify")
async def run_classification():
    success, status_code, msg, summary = LeadClassifier.execute_classification()
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

    results = EmailSender.send_campaign(
        audience=payload.audience,
        subject=payload.subject,
        body_template=payload.body_template,
        attach_presentation=payload.attach_presentation,
        custom_recipient=custom_recipient
    )

    return {
        "success": results["sent_count"] > 0 or (results["total_targeted"] == 0 and results["skipped_duplicates"] > 0),
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
async def get_campaign_report():
    metrics = ReportGenerator.get_campaign_metrics()
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
        model = genai.GenerativeModel(gemini_model)
        # Fast health test query
        res = model.generate_content("Respond with exactly: OK")
        return {
            "success": True,
            "message": f"Gemini AI operational! Connected to {gemini_model}."
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
    provider = search_cfg.get("provider", "google_cse")
    api_key = search_cfg.get("api_key", "")
    cx_id = search_cfg.get("cx_id", "")

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Search API key is not configured for provider '{provider}'."
        )
    if provider == "google_cse" and not cx_id:
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

