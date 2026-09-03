import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Base paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
ASSETS_DIR = BASE_DIR / "assets"
TEMPLATES_DIR = BASE_DIR / "templates"
STATIC_DIR = BASE_DIR / "static"

# Ensure essential directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables
load_dotenv(BASE_DIR / ".env", override=True)

# Data files paths
BUYERS_CSV = DATA_DIR / "buyers.csv"
BUSINESS_EMAILS_CSV = DATA_DIR / "business_emails.csv"
INDIVIDUAL_EMAILS_CSV = DATA_DIR / "individual_emails.csv"
SENT_LOG_CSV = DATA_DIR / "sent_log.csv"
SETTINGS_JSON = DATA_DIR / "settings.json"
DEMO_BUYERS_CSV = DATA_DIR / "demo_buyers.csv"
COMPANY_PRESENTATION_PDF = ASSETS_DIR / "company_presentation.pdf"

# Default application settings
DEFAULT_SETTINGS = {
    "SEARCH_KEYWORD": os.getenv("SEARCH_KEYWORD", "Singing Bowls"),
    "DAILY_SEND_LIMIT": int(os.getenv("DAILY_SEND_LIMIT", 10)),
    "SEND_DELAY": int(os.getenv("SEND_DELAY", 2)),
    "EMAIL_MODE": os.getenv("EMAIL_MODE", "demo"),
}

def load_settings() -> dict:
    """Load settings from JSON file with fallback to default environment settings."""
    if not SETTINGS_JSON.exists():
        save_settings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS.copy()
    
    try:
        with open(SETTINGS_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Ensure defaults for any missing keys
            for k, v in DEFAULT_SETTINGS.items():
                if k not in data:
                    data[k] = v
            return data
    except Exception:
        return DEFAULT_SETTINGS.copy()

def save_settings(settings: dict) -> None:
    """Save non-secret settings to data/settings.json."""
    with open(SETTINGS_JSON, "w", encoding="utf-8") as f:
        json.dump(settings, f, indent=2)

def get_gemini_api_key() -> str:
    """Retrieve Gemini API Key from environment."""
    load_dotenv(BASE_DIR / ".env", override=True)
    return os.getenv("GEMINI_API_KEY", "").strip()

def get_gmail_credentials() -> tuple[str, str]:
    """Retrieve Gmail Email and App Password from environment."""
    load_dotenv(BASE_DIR / ".env", override=True)
    return os.getenv("GMAIL_EMAIL", "").strip(), os.getenv("GMAIL_APP_PASSWORD", "").strip()

def get_email_mode() -> str:
    """Get active email mode from settings or environment."""
    settings = load_settings()
    return settings.get("EMAIL_MODE", os.getenv("EMAIL_MODE", "demo")).lower()
