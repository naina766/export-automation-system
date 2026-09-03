"""
EXPORT Automation System - FastAPI Main Application
AI-assisted B2B lead discovery, validation, classification, and outreach platform for Singing Bowls exporters.
"""
from pathlib import Path
from typing import Optional
import shutil
import pandas as pd
from fastapi import FastAPI, Request, Form, UploadFile, File, Response
from fastapi.responses import HTMLResponse, RedirectResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from config import (
    BASE_DIR,
    DATA_DIR,
    STATIC_DIR,
    TEMPLATES_DIR,
    BUYERS_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV,
    SENT_LOG_CSV,
    SETTINGS_JSON,
    DEMO_BUYERS_CSV,
    COMPANY_PRESENTATION_PDF,
    load_settings,
    save_settings,
    get_gemini_api_key,
    get_gmail_credentials,
    get_email_mode
)
from extraction.data_extractor import DataExtractor
from validation.email_validator import EmailValidator
from classification.gemini_classifier import LeadClassifier
from outreach.attachment_handler import AttachmentHandler
from outreach.gmail_sender import EmailSender, DEFAULT_SUBJECT, DEFAULT_BODY
from logging_module.activity_logger import ActivityLogger
from reports.report_generator import ReportGenerator

# Ensure storage directories
DATA_DIR.mkdir(parents=True, exist_ok=True)
ActivityLogger.ensure_log_file()

# Initialize FastAPI app
app = FastAPI(
    title="EXPORT Automation System",
    description="Singing Bowls Export Automation MVP",
    version="1.0.0"
)

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

# Templates engine
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

def get_base_template_context(request: Request, active_page: str, page_heading: str) -> dict:
    """Provides common context variables across all Jinja2 views."""
    settings = load_settings()
    gemini_key = get_gemini_api_key()
    gmail_user, _ = get_gmail_credentials()
    
    return {
        "request": request,
        "active_page": active_page,
        "page_heading": page_heading,
        "email_mode": get_email_mode(),
        "search_keyword": settings.get("SEARCH_KEYWORD", "Singing Bowls"),
        "gemini_active": bool(gemini_key),
        "gmail_user": gmail_user
    }


# ==========================================
# 1. DASHBOARD ROUTE
# ==========================================
@app.get("/", response_class=HTMLResponse)
async def dashboard_view(request: Request):
    ctx = get_base_template_context(request, "dashboard", "Dashboard Overview")
    ctx["metrics"] = ReportGenerator.get_campaign_metrics()
    return templates.TemplateResponse(request=request, name="index.html", context=ctx)


# ==========================================
# 2. UPLOAD & INGESTION ROUTES
# ==========================================
@app.get("/upload", response_class=HTMLResponse)
async def upload_page(request: Request, success: Optional[str] = None):
    ctx = get_base_template_context(request, "upload", "Upload Buyer Leads")
    
    buyers = []
    if BUYERS_CSV.exists():
        try:
            df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
            buyers = df.to_dict(orient="records")
        except Exception:
            buyers = []
            
    ctx["buyers"] = buyers
    if success == "demo_loaded":
        ctx["alert_message"] = "Sample demo buyers dataset successfully loaded and validated!"
        ctx["alert_type"] = "success"
        
    return templates.TemplateResponse(request=request, name="upload.html", context=ctx)

@app.post("/upload", response_class=HTMLResponse)
async def handle_csv_upload(request: Request, file: UploadFile = File(...)):
    ctx = get_base_template_context(request, "upload", "Upload Buyer Leads")
    
    if not file.filename.lower().endswith(".csv"):
        ctx["alert_message"] = "Invalid file type. Please upload a standard .csv file."
        ctx["alert_type"] = "danger"
        ctx["buyers"] = []
        return templates.TemplateResponse(request=request, name="upload.html", context=ctx)

    try:
        content = await file.read()
        df, err = DataExtractor.process_csv_file(content)
        if err:
            ctx["alert_message"] = err
            ctx["alert_type"] = "danger"
            ctx["buyers"] = []
            return templates.TemplateResponse(request=request, name="upload.html", context=ctx)

        # Validate and deduplicate
        processed_df, stats = EmailValidator.process_and_deduplicate(df)
        
        # Save to data/buyers.csv
        processed_df.to_csv(BUYERS_CSV, index=False)

        ctx["alert_message"] = f"Successfully imported {stats['total_records']} records ({stats['valid_emails']} valid emails, {stats['duplicates_removed']} duplicates removed)."
        ctx["alert_type"] = "success"
        ctx["upload_stats"] = stats
        ctx["buyers"] = processed_df.to_dict(orient="records")

    except Exception as e:
        ctx["alert_message"] = f"Error processing file: {str(e)}"
        ctx["alert_type"] = "danger"
        ctx["buyers"] = []

    return templates.TemplateResponse(request=request, name="upload.html", context=ctx)

@app.post("/load-demo-data")
async def load_demo_data():
    """Quick helper endpoint to populate demo_buyers.csv into data/buyers.csv."""
    if not DEMO_BUYERS_CSV.exists():
        return {"success": False, "message": "Demo data file not found."}

    try:
        df, err = DataExtractor.process_csv_path(str(DEMO_BUYERS_CSV))
        if err:
            return {"success": False, "message": err}

        processed_df, stats = EmailValidator.process_and_deduplicate(df)
        processed_df.to_csv(BUYERS_CSV, index=False)
        return {"success": True, "stats": stats}
    except Exception as e:
        return {"success": False, "message": str(e)}


# ==========================================
# 3. AI / DEMO CLASSIFICATION ROUTES
# ==========================================
@app.get("/classify", response_class=HTMLResponse)
async def classify_page(request: Request):
    ctx = get_base_template_context(request, "classify", "Lead Segmentation & Classification")
    ctx["gemini_key_present"] = bool(get_gemini_api_key())
    
    business_leads, individual_leads = [], []
    if BUSINESS_EMAILS_CSV.exists():
        try:
            business_leads = pd.read_csv(BUSINESS_EMAILS_CSV, dtype=str).fillna("").to_dict(orient="records")
        except Exception:
            pass
            
    if INDIVIDUAL_EMAILS_CSV.exists():
        try:
            individual_leads = pd.read_csv(INDIVIDUAL_EMAILS_CSV, dtype=str).fillna("").to_dict(orient="records")
        except Exception:
            pass

    ctx["business_leads"] = business_leads
    ctx["individual_leads"] = individual_leads
    return templates.TemplateResponse(request=request, name="classify.html", context=ctx)

@app.post("/classify", response_class=HTMLResponse)
async def run_classification(request: Request):
    ctx = get_base_template_context(request, "classify", "Lead Segmentation & Classification")
    ctx["gemini_key_present"] = bool(get_gemini_api_key())

    success, mode_label, msg, summary = LeadClassifier.execute_classification()

    if success:
        ctx["alert_message"] = f"[{mode_label}] {msg}"
        ctx["alert_type"] = "success"
        ctx["business_leads"] = summary.get("business_records", [])
        ctx["individual_leads"] = summary.get("individual_records", [])
    else:
        ctx["alert_message"] = msg
        ctx["alert_type"] = "warning"
        ctx["business_leads"] = []
        ctx["individual_leads"] = []

    return templates.TemplateResponse(request=request, name="classify.html", context=ctx)


# ==========================================
# 4. SEND CAMPAIGN ROUTES
# ==========================================
@app.get("/send", response_class=HTMLResponse)
async def send_campaign_page(request: Request):
    ctx = get_base_template_context(request, "send", "Outreach Campaign Dispatcher")
    
    # Check audience counts
    biz_count, ind_count, total_count = 0, 0, 0
    if BUSINESS_EMAILS_CSV.exists():
        biz_count = len(pd.read_csv(BUSINESS_EMAILS_CSV, dtype=str))
    if INDIVIDUAL_EMAILS_CSV.exists():
        ind_count = len(pd.read_csv(INDIVIDUAL_EMAILS_CSV, dtype=str))
    if BUYERS_CSV.exists():
        total_count = len(pd.read_csv(BUYERS_CSV, dtype=str))

    ctx["audience_counts"] = {
        "business": biz_count,
        "individual": ind_count,
        "all": total_count
    }
    
    exists, _, _ = AttachmentHandler.get_presentation_status()
    ctx["presentation_exists"] = exists
    ctx["selected_audience"] = "business"
    ctx["subject"] = DEFAULT_SUBJECT
    ctx["body_template"] = DEFAULT_BODY
    return templates.TemplateResponse(request=request, name="send.html", context=ctx)

@app.post("/send", response_class=HTMLResponse)
async def execute_send_campaign(
    request: Request,
    audience: str = Form("business"),
    subject: str = Form(DEFAULT_SUBJECT),
    body_template: str = Form(DEFAULT_BODY),
    attach_presentation: Optional[str] = Form(None)
):
    ctx = get_base_template_context(request, "send", "Outreach Campaign Dispatcher")
    
    is_attached = (attach_presentation == "true")
    results = EmailSender.send_campaign(
        audience=audience,
        subject=subject,
        body_template=body_template,
        attach_presentation=is_attached
    )

    ctx["send_results"] = results
    ctx["selected_audience"] = audience
    ctx["subject"] = subject
    ctx["body_template"] = body_template
    ctx["attach_presentation"] = is_attached
    
    exists, _, _ = AttachmentHandler.get_presentation_status()
    ctx["presentation_exists"] = exists

    # Audience counts
    biz_count = len(pd.read_csv(BUSINESS_EMAILS_CSV, dtype=str)) if BUSINESS_EMAILS_CSV.exists() else 0
    ind_count = len(pd.read_csv(INDIVIDUAL_EMAILS_CSV, dtype=str)) if INDIVIDUAL_EMAILS_CSV.exists() else 0
    total_count = len(pd.read_csv(BUYERS_CSV, dtype=str)) if BUYERS_CSV.exists() else 0
    ctx["audience_counts"] = {"business": biz_count, "individual": ind_count, "all": total_count}

    if results["sent_count"] > 0:
        ctx["alert_message"] = f"Campaign executed successfully! Dispatched to {results['sent_count']} recipients ({results['mode'].upper()} Mode)."
        ctx["alert_type"] = "success"
    else:
        ctx["alert_message"] = "Campaign execution completed with 0 sends. " + " ".join(results["messages"])
        ctx["alert_type"] = "warning"

    return templates.TemplateResponse(request=request, name="send.html", context=ctx)


# ==========================================
# 5. REPORTS & DOWNLOAD ROUTES
# ==========================================
@app.get("/report", response_class=HTMLResponse)
async def report_page(request: Request):
    ctx = get_base_template_context(request, "report", "Campaign Performance Reports")
    ctx["metrics"] = ReportGenerator.get_campaign_metrics()
    return templates.TemplateResponse(request=request, name="report.html", context=ctx)

@app.get("/download-report")
async def download_report_csv():
    report_csv = ReportGenerator.generate_csv_report_string()
    return Response(
        content=report_csv,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=singing_bowls_export_report.csv"}
    )


# ==========================================
# 6. SETTINGS ROUTES
# ==========================================
@app.get("/settings", response_class=HTMLResponse)
async def settings_page(request: Request):
    ctx = get_base_template_context(request, "settings", "System Settings")
    ctx["settings"] = load_settings()
    
    gemini_key = get_gemini_api_key()
    gmail_user, gmail_pass = get_gmail_credentials()
    
    ctx["gemini_configured"] = bool(gemini_key)
    ctx["gmail_configured"] = bool(gmail_user and gmail_pass)
    ctx["masked_gmail"] = f"{gmail_user[:3]}***@{gmail_user.split('@')[-1]}" if "@" in gmail_user else ""

    return templates.TemplateResponse(request=request, name="settings.html", context=ctx)

@app.post("/settings", response_class=HTMLResponse)
async def update_settings(
    request: Request,
    search_keyword: str = Form("Singing Bowls"),
    daily_send_limit: int = Form(10),
    send_delay: int = Form(2),
    email_mode: str = Form("demo")
):
    ctx = get_base_template_context(request, "settings", "System Settings")
    
    new_settings = {
        "SEARCH_KEYWORD": search_keyword.strip(),
        "DAILY_SEND_LIMIT": max(1, daily_send_limit),
        "SEND_DELAY": max(0, send_delay),
        "EMAIL_MODE": email_mode.lower()
    }
    
    save_settings(new_settings)
    ctx["settings"] = new_settings
    ctx["alert_message"] = "Settings updated successfully."
    ctx["alert_type"] = "success"
    
    gemini_key = get_gemini_api_key()
    gmail_user, gmail_pass = get_gmail_credentials()
    ctx["gemini_configured"] = bool(gemini_key)
    ctx["gmail_configured"] = bool(gmail_user and gmail_pass)
    ctx["masked_gmail"] = f"{gmail_user[:3]}***@{gmail_user.split('@')[-1]}" if "@" in gmail_user else ""

    return templates.TemplateResponse(request=request, name="settings.html", context=ctx)
