# AI-Powered Export Outreach Automation (EXPORT Automation System)

> **An automated production-grade full-stack system that discovers international buyers through live web search APIs, validates contact details, qualifies leads using Google Gemini AI, and executes personalized export outreach through Gmail SMTP with PDF brochure attachments.**

---

## 📌 1. Overview & Primary Workflow

The **EXPORT Automation System** is an end-to-end B2B sales automation platform purpose-built for an export enterprise manufacturing and distributing authentic handcrafted **Himalayan Singing Bowls** and sound healing meditation instruments.

**The system operates API-first without requiring CSV file uploads to discover buyers:**

```text
USER INPUT (Target Product, Country, Buyer Type, Keywords)
        ↓
REAL BUYER SEARCH API (Google Custom Search / Serper / SerpAPI / Tavily)
        ↓
REAL BUSINESS DISCOVERY & PUBLIC WEBSITE CONTACT EXTRACTION
        ↓
EMAIL SYNTAX & DOMAIN VALIDATION (No fabricated emails; missing = null)
        ↓
GEMINI AI LEAD QUALIFICATION (B2B Distributor vs Retail Consumer)
        ↓
PERSONALIZED OUTREACH DRAFTING (Multi-variable template with PDF catalog)
        ↓
USER CONFIRMATION MODAL & REAL GMAIL SMTP TRANSMISSION
        ↓
AUDIT LOGGING & REAL-TIME KPI REPORTING
```

---

## 🎯 2. Problem Statement

Handmade artisan exporters (such as Himalayan Singing Bowls producers) face significant international expansion challenges:
1. **Manual Prospecting Bottlenecks:** Manually researching international distributors, meditation studios, and acoustic wellness importers across global markets (US, UK, Germany, France, Canada, Australia) is slow and non-scalable.
2. **High Bounce Rates & Reputation Damage:** Sending cold emails without rigorous RFC-compliant syntax checking and cross-campaign deduplication harms sender domain reputation.
3. **Generic Impersonal Messaging:** Unsegmented, non-personalized cold outreach fails to establish credibility with overseas enterprise buyers.
4. **Disjointed Outreach Stacks:** Fragmented tools create data silos between search discovery, qualification, catalog dispatch, and audit logging.

---

## 🌟 3. Key Features & Production Architecture

```text
               ┌────────────────────────────────────────────────────────┐
               │    Production Web Application (React 18 + Vite)        │
               │  Dashboard • Discover Buyers • AI Qualify • Send • ... │
               └──────────────────────────┬─────────────────────────────┘
                                          │ HTTP / REST
                                          ▼
               ┌────────────────────────────────────────────────────────┐
               │              FastAPI Backend (backend/main.py)         │
               └──────┬───────────────────┬───────────────────┬─────────┘
                      │                   │                   │
                      ▼                   ▼                   ▼
           ┌──────────────────────┐ ┌───────────────┐ ┌─────────────────┐
           │ Live Search Provider │ │ Gemini AI API │ │ Gmail SMTP TLS  │
           │ (Google CSE / Serper │ │ (Configurable │ │ (Port 587,      │
           │  SerpAPI / Tavily)   │ │  model_name)  │ │  Backoff Retry) │
           └──────────────────────┘ └───────────────┘ └─────────────────┘
                      │                   │                   │
                      ▼                   ▼                   ▼
           ┌────────────────────────────────────────────────────────────┐
           │            Thread-Safe CSV & JSON Persistent Storage        │
           │    buyers.csv • business_emails.csv • sent_log.csv • ...   │
           └────────────────────────────────────────────────────────────┘
```

- 🌐 **Live Web Buyer Discovery:** Modular provider architecture connecting to legitimate search APIs (`google_cse`, `serper`, `serpapi`, `tavily`). Discovers company names, domains, contact hints, source URLs, and timestamps.
- 🛡️ **Zero Fake Data Guarantee:** If search API credentials are not configured, the system returns an explicit `SEARCH_PROVIDER_NOT_CONFIGURED` status with helpful setup directions. Missing emails are strictly set to `null` (never fabricated).
- 📧 **Email Syntax Validation & Deduplication:** RFC 5322 domain format checking and cross-campaign deduplication against previous dispatches in [`data/sent_log.csv`](data/sent_log.csv).
- 🤖 **Gemini AI Lead Qualification:** Semantic prompt qualification using configurable Gemini models (`GEMINI_MODEL`, defaulting to `gemini-1.5-flash`) to categorize commercial B2B partners.
- ✉️ **Dynamic Personalization:** Sanitized multi-variable placeholder replacement (`{{company_name}}`, `{{contact_name}}`, `{{country}}`, `{{buyer_type}}`, `{{product}}`) with live preview.
- 📎 **MIME PDF Brochure Attachments:** Automatic attachment verification and packaging of [`assets/company_presentation.pdf`](assets/company_presentation.pdf).
- 🔒 **Production Gmail SMTP Transport:** Authenticated STARTTLS transmission with exponential backoff retries on transient connection failures.
- 🎯 **Send Test Email Capability:** Dedicated test recipient dispatch tab to verify end-to-end delivery to any target inbox before executing bulk campaigns.
- 📊 **Audit Logs & Exportable Analytics:** Persistent tracking in `data/sent_log.csv` with one-click CSV report export.

---

## 💻 4. Tech Stack

### Frontend
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS (Dark SaaS Glassmorphism design system)
- **Routing:** React Router DOM v6
- **Icons:** Lucide React
- **HTTP Client:** Axios

### Backend
- **Framework:** FastAPI (Python 3.10+) + Uvicorn
- **Data Engine:** Pandas, Pydantic v2
- **Email Transport:** `smtplib`, `email.mime`, `email-validator`
- **AI Classification:** Google Generative AI SDK (`google.generativeai`)
- **Search Provider:** HTTP client integrations (`google_cse`, `serper`, `serpapi`, `tavily`)
- **Testing:** Pytest, FastAPI TestClient

---

## 📁 5. Repository Structure

```text
ExportAutomation/
├── .env.example                      # Production environment template
├── .env                              # Active environment credentials
├── README.md                         # Complete project documentation
├── requirements.txt                  # Python dependencies
├── pytest.ini                        # Pytest configuration
├── assets/
│   └── company_presentation.pdf      # Himalayan Singing Bowls export catalog
├── data/
│   ├── buyers.csv                    # Ingested & discovered leads
│   ├── business_emails.csv           # B2B qualified leads
│   ├── individual_emails.csv         # Retail / individual leads
│   ├── sent_log.csv                  # Immutable campaign audit log
│   └── settings.json                 # Non-sensitive runtime settings
├── backend/
│   ├── main.py                       # FastAPI entry point & REST endpoints
│   ├── config.py                     # Configuration & environment loader
│   ├── search/
│   │   ├── base.py                   # BuyerSearchProvider abstract interface
│   │   ├── parser.py                 # Metadata & domain extraction
│   │   ├── normalizer.py             # Schema normalization & timestamps
│   │   └── web_search_provider.py    # Production search API implementation
│   ├── extraction/
│   │   └── data_extractor.py         # CSV parser & column normalizer
│   ├── validation/
│   │   └── email_validator.py        # Email syntax validation & deduplication
│   ├── classification/
│   │   └── gemini_classifier.py      # Gemini AI qualification engine
│   ├── outreach/
│   │   └── gmail_sender.py           # Gmail SMTP dispatcher with retry
│   │   └── attachment_handler.py     # PDF MIME attachment handler
│   ├── logging_module/
│   │   └── activity_logger.py        # Audit logging service
│   └── reports/
│       └── report_generator.py       # Metrics & CSV report generator
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx                   # Layout & global routing
│       ├── services/
│       │   └── api.js                # Centralized Axios API client
│       ├── components/               # UI components (Navbar, Sidebar, StatCard, ...)
│       └── pages/
│           ├── Dashboard.jsx         # Pipeline funnel & KPI overview
│           ├── DiscoverBuyers.jsx    # Live web search buyer discovery (PRIMARY)
│           ├── Upload.jsx            # Lead Store & Optional CSV Import
│           ├── Classification.jsx    # Gemini AI lead segmentation
│           ├── SendCampaign.jsx      # SMTP dispatcher & Test Email
│           ├── Reports.jsx           # Analytics & CSV export
│           └── Settings.jsx          # Service status & parameters
└── tests/
    ├── test_api.py                   # REST API test suite
    ├── test_classification.py        # Gemini classification tests
    ├── test_reports.py               # KPI report tests
    ├── test_search_discovery.py      # Search query, parser & provider tests
    └── test_validation.py            # Email validation & deduplication tests
```

---

## 🚀 6. Installation & Quickstart

### Step 1: Clone Repository & Set Up Backend

```bash
cd ExportAutomation

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Step 2: Configure Environment (`.env`)

Create a `.env` file in the root directory:

```env
# 1. Search Provider (google_cse, serper, serpapi, tavily)
SEARCH_PROVIDER=google_cse
SEARCH_API_KEY=your_search_api_key
SEARCH_ENGINE_ID=your_custom_search_engine_cx_id

# 2. Gemini AI Lead Qualification
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash

# 3. Gmail SMTP Transport
GMAIL_EMAIL=your_export_sales_email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# 4. Campaign Parameters
SEARCH_KEYWORD=Himalayan Sound Healing Bowls
SEND_DELAY=1
MAX_EMAILS_PER_RUN=25
DAILY_SEND_LIMIT=100
```

#### How to Obtain Google Custom Search JSON API Credentials:
1. Go to [Google Cloud Console](https://console.cloud.google.com/) and enable the **Custom Search API**.
2. Create an API Key under **APIs & Services > Credentials** -> Set as `SEARCH_API_KEY`.
3. Go to [Google Programmable Search Engine](https://programmablesearchengine.google.com/), create an engine searching the entire web (`Search the entire web: ON`), and copy the Search Engine ID (`cx`) -> Set as `SEARCH_ENGINE_ID`.

### Step 3: Launch Backend Server

```bash
uvicorn backend.main:app --reload --port 8000
```

API documentation is available at `http://localhost:8000/docs`.

### Step 4: Install & Launch Frontend

```bash
cd frontend
npm install
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🧪 7. Running Automated Tests

Run the full pytest suite:

```bash
pytest tests/ -v
```

All external search and Gemini API calls are properly mocked during test execution to ensure fast, zero-credit automated testing.

---

## 🧭 8. Manual End-to-End Testing Procedure

1. **Start Services:** Launch backend on port 8000 and frontend on port 5173.
2. **Navigate to Discover Buyers (`/discover`):**
   - Target Product: `Himalayan Sound Healing Bowls`
   - Country: `United States`
   - Buyer Type: `Distributor`
   - Keywords: `sound healing, meditation, wellness, singing bowls`
   - Limit: `10`
   - Click **"Search Live Buyers"**.
3. **Verify Discovery:** Discovered leads appear with company name, domain, clickable website, detected country, email status (`VALID_FORMAT` or `MISSING`), and clickable source URLs.
4. **Run AI Qualification (`/classify`):**
   - Click **"Run Gemini AI Qualification"**.
   - Gemini qualifies leads into B2B Distributors vs Individual buyers with numerical scores and rationale.
5. **Send Campaign / Test Email (`/send`):**
   - Switch to **"Send Test Email"** tab, enter your test email address.
   - Click **"Send Email"**.
   - In the confirmation modal, review recipient, subject, and PDF attachment, then click **"Send Email"**.
6. **Verify Delivery & Reports (`/reports`):**
   - Check `data/sent_log.csv` and the Reports page to verify successful dispatch logged in the audit trail.
