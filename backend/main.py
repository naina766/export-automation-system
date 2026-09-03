"""
EXPORT Automation System — FastAPI REST Backend
AI-assisted B2B lead discovery, validation, classification, and outreach platform for Singing Bowls exporters.
"""
from typing import Optional, Dict, Any, List
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import (
    BUYERS_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV,
    SENT_LOG_CSV,
    DEMO_BUYERS_CSV,
    load_settings,
    save_settings,
    get_gemini_api_key,
    get_gmail_credentials,
    get_email_mode
)
from search.demo_search import LeadSearchManager
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
    description="Singing Bowls B2B Export Automation Platform API",
    version="1.0.0"
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
class SendCampaignRequest(BaseModel):
    audience: str = Field(default="business") # business | individual | all
    subject: str = Field(default=DEFAULT_SUBJECT)
    body_template: str = Field(default=DEFAULT_BODY)
    attach_presentation: bool = Field(default=True)

class SettingsUpdateRequest(BaseModel):
    SEARCH_KEYWORD: Optional[str] = "Singing Bowls"
    EMAIL_MODE: Optional[str] = "demo"
    SEND_DELAY: Optional[int] = 2
    MAX_EMAILS_PER_RUN: Optional[int] = 50
    SMTP_HOST: Optional[str] = "smtp.gmail.com"
    SMTP_PORT: Optional[int] = 587


# ==========================================
# 1. HEALTH & SYSTEM STATUS
# ==========================================
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "EXPORT Automation System",
        "email_mode": get_email_mode(),
        "gemini_active": bool(get_gemini_api_key())
    }


# ==========================================
# 2. DASHBOARD KPI & OVERVIEW
# ==========================================
@app.get("/api/dashboard")
async def get_dashboard_data():
    metrics = ReportGenerator.get_campaign_metrics()
    settings = load_settings()
    gemini_key = get_gemini_api_key()
    gmail_user, gmail_pass = get_gmail_credentials()

    return {
        "metrics": metrics,
        "system": {
            "email_mode": get_email_mode().upper(),
            "classifier_mode": "GEMINI AI" if gemini_key else "DEMO CLASSIFIER",
            "search_keyword": settings.get("SEARCH_KEYWORD", "Singing Bowls"),
            "has_gmail_credentials": bool(gmail_user and gmail_pass),
            "has_gemini_key": bool(gemini_key)
        }
    }


# ==========================================
# 3. LEADS & SEARCH
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

@app.get("/api/search/demo")
async def search_demo_leads(keyword: str = "Singing Bowls", limit: int = 5):
    search_manager = LeadSearchManager()
    leads = search_manager.discover_leads(keyword=keyword, limit_per_source=limit)
    return {
        "keyword": keyword,
        "total_discovered": len(leads),
        "leads": leads,
        "note": "Demo source adapters are enabled. Production scrapers can be connected independently."
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

@app.post("/api/load-demo")
async def load_demo_leads():
    if not DEMO_BUYERS_CSV.exists():
        raise HTTPException(status_code=404, detail="demo_buyers.csv not found in data directory.")

    try:
        df, err = DataExtractor.process_csv_path(str(DEMO_BUYERS_CSV))
        if err:
            raise HTTPException(status_code=400, detail=err)

        processed_df, stats = EmailValidator.process_and_deduplicate(df)
        processed_df.to_csv(BUYERS_CSV, index=False)

        return {
            "success": True,
            "message": "Loaded fictional demo buyers dataset.",
            "stats": stats,
            "leads": processed_df.to_dict(orient="records")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load demo data: {str(e)}")

@app.post("/api/validate")
async def validate_single_email_endpoint(email: str = Form(...)):
    result = validate_email_address(email)
    return result


# ==========================================
# 5. AI / DEMO CLASSIFICATION
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

    gemini_key = get_gemini_api_key()
    mode_label = "GEMINI MODE" if gemini_key else "DEMO FALLBACK MODE"

    return {
        "mode": mode_label,
        "has_gemini_key": bool(gemini_key),
        "business_count": len(biz_leads),
        "individual_count": len(ind_leads),
        "business_leads": biz_leads,
        "individual_leads": ind_leads
    }

@app.post("/api/classify")
async def run_classification():
    success, mode_label, msg, summary = LeadClassifier.execute_classification()
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    return {
        "success": True,
        "mode": mode_label,
        "message": msg,
        "summary": summary
    }


# ==========================================
# 6. CAMPAIGN DISPATCH
# ==========================================
@app.post("/api/send")
async def send_campaign(payload: SendCampaignRequest):
    results = EmailSender.send_campaign(
        audience=payload.audience,
        subject=payload.subject,
        body_template=payload.body_template,
        attach_presentation=payload.attach_presentation
    )

    return {
        "success": results["sent_count"] > 0 or results["total_targeted"] == 0,
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
    gemini_key = get_gemini_api_key()
    gmail_user, gmail_pass = get_gmail_credentials()
    
    masked_gmail = f"{gmail_user[:3]}***@{gmail_user.split('@')[-1]}" if "@" in gmail_user else ""

    return {
        "settings": settings,
        "status": {
            "gemini_configured": bool(gemini_key),
            "gmail_configured": bool(gmail_user and gmail_pass),
            "masked_gmail": masked_gmail,
            "email_mode": settings.get("EMAIL_MODE", "demo")
        }
    }

@app.post("/api/settings")
async def update_settings(payload: SettingsUpdateRequest):
    current = load_settings()
    
    if payload.SEARCH_KEYWORD is not None:
        current["SEARCH_KEYWORD"] = payload.SEARCH_KEYWORD.strip()
    if payload.EMAIL_MODE is not None:
        current["EMAIL_MODE"] = payload.EMAIL_MODE.strip().lower()
    if payload.SEND_DELAY is not None:
        current["SEND_DELAY"] = max(0, payload.SEND_DELAY)
    if payload.MAX_EMAILS_PER_RUN is not None:
        current["MAX_EMAILS_PER_RUN"] = max(1, payload.MAX_EMAILS_PER_RUN)
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
