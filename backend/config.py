import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Backend and Project Root directories
BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BACKEND_DIR.parent

DATA_DIR = PROJECT_ROOT / "data"
ASSETS_DIR = PROJECT_ROOT / "assets"

# Ensure essential directories exist
DATA_DIR.mkdir(parents=True, exist_ok=True)
ASSETS_DIR.mkdir(parents=True, exist_ok=True)

# Load environment variables
load_dotenv(PROJECT_ROOT / ".env", override=True)
load_dotenv(BACKEND_DIR / ".env", override=True)

# Data files paths
BUYERS_CSV = DATA_DIR / "buyers.csv"
BUSINESS_EMAILS_CSV = DATA_DIR / "business_emails.csv"
INDIVIDUAL_EMAILS_CSV = DATA_DIR / "individual_emails.csv"
SENT_LOG_CSV = DATA_DIR / "sent_log.csv"
SETTINGS_JSON = DATA_DIR / "settings.json"
COMPANY_PRESENTATION_PDF = ASSETS_DIR / "company_presentation.pdf"

# Default application settings
DEFAULT_SETTINGS = {
    "SEARCH_KEYWORD": os.getenv("SEARCH_KEYWORD", "Himalayan Sound Healing Bowls"),
    "SEND_DELAY": int(os.getenv("SEND_DELAY", 1)),
    "MAX_EMAILS_PER_RUN": int(os.getenv("MAX_EMAILS_PER_RUN", 25)),
    "DAILY_SEND_LIMIT": int(os.getenv("DAILY_SEND_LIMIT", 100)),
    "SMTP_HOST": os.getenv("SMTP_HOST", "smtp.gmail.com"),
    "SMTP_PORT": int(os.getenv("SMTP_PORT", 587)),
}

def load_settings() -> dict:
    """Load settings from JSON file with fallback to default environment settings."""
    if not SETTINGS_JSON.exists():
        save_settings(DEFAULT_SETTINGS)
        return DEFAULT_SETTINGS.copy()
    
    try:
        with open(SETTINGS_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
            # Remove legacy demo keys if present
            data.pop("EMAIL_MODE", None)
            for k, v in DEFAULT_SETTINGS.items():
                if k not in data:
                    data[k] = v
            return data
    except Exception:
        return DEFAULT_SETTINGS.copy()

def save_settings(settings: dict) -> None:
    """Save non-secret settings to data/settings.json."""
    # Ensure secrets and legacy keys are never stored
    safe_settings = {k: v for k, v in settings.items() if k not in ["GMAIL_APP_PASSWORD", "GEMINI_API_KEY", "SEARCH_API_KEY", "EMAIL_MODE"]}
    with open(SETTINGS_JSON, "w", encoding="utf-8") as f:
        json.dump(safe_settings, f, indent=2)

def get_search_provider_config() -> dict:
    """Retrieve external search provider configuration from environment."""
    load_dotenv(PROJECT_ROOT / ".env", override=True)
    load_dotenv(BACKEND_DIR / ".env", override=True)
    provider = os.getenv("SEARCH_PROVIDER", "serper").strip().lower()
    return {
        "provider": provider,
        "api_key": os.getenv("SEARCH_API_KEY", "").strip(),
        "engine_id": os.getenv("SEARCH_ENGINE_ID", "").strip(),
        "cx_id": os.getenv("SEARCH_ENGINE_ID", "").strip()
    }

def get_gemini_config() -> tuple[str, str]:
    """Retrieve Gemini API Key and configured Model from environment."""
    load_dotenv(PROJECT_ROOT / ".env", override=True)
    load_dotenv(BACKEND_DIR / ".env", override=True)
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    model_name = os.getenv("GEMINI_MODEL", "gemini-1.5-flash").strip()
    return api_key, model_name

def get_gmail_credentials() -> tuple[str, str]:
    """Retrieve Gmail Email and App Password from environment."""
    load_dotenv(PROJECT_ROOT / ".env", override=True)
    load_dotenv(BACKEND_DIR / ".env", override=True)
    user = os.getenv("GMAIL_EMAIL", "").strip()
    pwd = os.getenv("GMAIL_APP_PASSWORD", "").replace(" ", "").strip()
    return user, pwd

def get_target_product() -> str:
    """Retrieve default target product from environment or settings."""
    load_dotenv(PROJECT_ROOT / ".env", override=True)
    load_dotenv(BACKEND_DIR / ".env", override=True)
    return os.getenv("SEARCH_KEYWORD", "Himalayan Sound Healing Bowls").strip()

