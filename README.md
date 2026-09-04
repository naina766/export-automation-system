# 🚀 Export Automation System

> **Production-Grade B2B Buyer Discovery, Validation, AI Qualification, and Multi-Product Outreach Automation**

An end-to-end sales intelligence and cold outreach platform built for export manufacturers, international trade representatives, and global distributors.

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-2.5_Flash-8E75C2?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/)
[![Serper](https://img.shields.io/badge/Serper-Live_Search_API-4285F4?style=flat-square&logo=google&logoColor=white)](https://serper.dev/)
[![Gmail](https://img.shields.io/badge/Gmail-STARTTLS_SMTP-EA4335?style=flat-square&logo=gmail&logoColor=white)](https://workspace.google.com/)
[![Pytest](https://img.shields.io/badge/Pytest-62_Passed-0A9EDC?style=flat-square&logo=pytest&logoColor=white)](https://docs.pytest.org/)

**GitHub Repository:** [https://github.com/naina766/export-automation-system](https://github.com/naina766/export-automation-system)

---

## 📌 Executive Summary

The **Export Automation System** automates the labor-intensive B2B export sales development cycle into a structured, single-pane-of-glass SaaS application. It replaces manual directory lookups, unverified lead lists, and generic mail merges with a rigorous 6-stage pipeline:

```text
Product Selection
       ↓
Live Buyer Discovery (Serper.dev Google Index)
       ↓
Public Website & Contact Extraction (SSRF-Protected)
       ↓
RFC Email Validation & Multi-Field Deduplication
       ↓
Gemini AI Commercial Qualification & Fit Scoring
       ↓
Personalized Outreach (Product-Specific PDF Catalogs)
       ↓
Gmail STARTTLS SMTP Dispatch & Delivery Auditing
       ↓
Real-Time Funnel Analytics & Reporting
```

The system is designed with **strict server-side hard gates**: unvalidated emails, unqualified prospects, duplicate recipients, and cross-product lead mismatches are programmatically blocked before any email can be dispatched.

---

## 🎯 The Problem

1. **High Friction in Global Market Expansion:** Identifying verified wholesale importers, distributors, and acoustic wellness studios across international markets requires hours of manual search per territory.
2. **Contact Hygiene Deficits:** Web listings frequently present malformed addresses, generic info inboxes, or broken syntax that damage sender domain reputation.
3. **Relevance & Context Gap:** Conventional mail-merge tools blast one-size-fits-all emails, failing to tailor proposals to specific product categories, countries, or buyer personas.
4. **Outreach Collision & Multi-Product Chaos:** When exporting diverse product lines (e.g. *Himalayan Sound Healing Bowls* vs. *Crystal Singing Bowls*), teams risk sending incorrect brochures or duplicate proposals to the same account.

---

## 💡 The Solution & Architecture

```text
+-----------------------------------------------------------------------------------+
|                              REACT 18 + VITE FRONTEND                             |
|  [Dashboard]  [Discover Buyers]  [Validation]  [AI Qualify]  [Campaigns]  [Reports]|
+------------------------------------------+----------------------------------------+
                                           | REST JSON (Axios, VITE_API_BASE_URL)
                                           v
+-----------------------------------------------------------------------------------+
|                               FASTAPI REST BACKEND                                |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | LeadService & Finite State Machine (DISCOVERED -> VALID -> AI_QUALIFIED)    |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  +-----------------------+   +------------------------+   +--------------------+  |
|  | SearchProvider Engine |   | Public Website Parser  |   | Email Validator    |  |
|  | (Serper / Brave / CSE)|   | (SSRF Guard + Timeout) |   | (RFC Syntax & Dup) |  |
|  +-----------------------+   +------------------------+   +--------------------+  |
|                                                                                   |
|  +-----------------------+   +------------------------+   +--------------------+  |
|  | Gemini AI Classifier  |   | Product Catalog Engine |   | Gmail SMTP Sender  |  |
|  | (Pydantic Schema)     |   | (Multi-Product & PDFs) |   | (Daily/Run Limits) |  |
|  +-----------------------+   +------------------------+   +--------------------+  |
+---------------------+-------------------+-------------------+---------------------+
                      |                   |                   |
                      v                   v                   v
             [Serper Search API]   [Google Gemini AI]   [Gmail SMTP Port 587]
```

---

## 🔄 Official 6-Stage Pipeline

### Stage 1: Product Selection & Live Discovery
- **API-First Search:** Queries the live **Serper.dev** Google Search index dynamically formulated from active product keywords, target country, and buyer persona (e.g., `Himalayan Sound Healing Bowls wholesale distributor United States`).
- **Zero Fabrication:** The system never fabricates contact names (`contact_name = null` in backend; displayed as `"Company Team"` in UI).
- **Graceful Fallback:** If search credentials are not configured, an explicit configuration error is raised.

### Stage 2: SSRF-Protected Website & Contact Extraction
- **Targeted Probing:** Concurrently inspects `https://domain.com/`, `/contact`, `/pages/contact`, `/contact-us`, and `/about` with a strict `2.0s` timeout per site.
- **SSRF Hard Filters:** `is_safe_url` blocks loopback (`127.0.0.1`), cloud metadata IPs (`169.254.169.254`), internal subnets (`10.0.0.0/8`, `192.168.0.0/16`), and unsafe schemes.
- **Junk Filtering:** Strips tracker/CDN dummy emails (`example.com`, `sentry.io`, `shopify.com`, `wixpress.com`).

### Stage 3: Email Validation & Deduplication Gate
- **Validation Standard:** RFC 5322 syntax validation. Only leads with a **Valid Email** enter the primary usable buyer list (`"X Valid Buyers Found"`).
- **Multi-Field Deduplication:** Deduplicates leads across normalized email, domain name, and company title.
- **Diagnostics Partitioning:** Unusable records (Missing Email, Invalid Syntax, Duplicate) are safely partitioned to an Excluded tab for audit visibility.

### Stage 4: Gemini AI Qualification
- **Strict Pre-Condition:** Gemini AI classification runs **only** on validated, non-duplicate leads.
- **Structured Schema (Pydantic):**
  ```json
  {
    "classification": "qualified",
    "buyer_type": "Wholesale Importer",
    "priority": "high",
    "score": 92,
    "confidence": 0.95,
    "reason": "Established wellness distributor with multi-location sound bath facilities."
  }
  ```
- **Safety Gate:** API failures or malformed outputs default to `needs_review` and are blocked from sending.

### Stage 5: Gmail Outreach & Campaign Dispatch
- **Personalization Engine:** Dynamically injects `{{product_name}}`, `{{company_name}}`, `{{country}}`, and `{{contact_name}}`. If contact name is missing, it safely falls back to `Hello {{company_name}} Team`.
- **Product-Specific PDF Catalogs:** Attaches the active product's official PDF catalog (e.g. `company_presentation.pdf`) via Base64 MIME.
- **Server-Side Hard Gates:**
  1. Lead must have valid email syntax.
  2. Lead must be AI-qualified.
  3. Lead must match the campaign's `product_id`.
  4. Lead must not be marked `is_demo=True` (`HTTP 422`).
  5. Lead must not have been previously sent.
  6. Campaign must be within cumulative `DAILY_SEND_LIMIT` and `MAX_EMAILS_PER_RUN`.

### Stage 6: Tracking & Reporting
- **Audit Logging:** Logs every delivery attempt to `data/sent_log.csv` (`SENT` vs `FAILED`) with timestamps, recipient, and error details (passwords/keys are never logged).
- **Funnel Analytics:** Real-time visual funnels and conversion breakdowns computed strictly from production data.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 5.4, Tailwind CSS, Axios, Lucide | High-performance SPA with responsive dark mode and state synchronization |
| **Backend** | FastAPI, Python 3.10+, Pydantic 2.6, Pandas | Asynchronous REST API, strict request/response schemas, and data manipulation |
| **AI Layer** | Google Gemini API (`gemini-2.5-flash`) | Structured JSON commercial qualification and scoring |
| **Search Engine** | Serper.dev (Google Search Index) | Fast, live B2B prospect discovery with multi-country indexing |
| **Outreach** | Gmail SMTP (Port 587, STARTTLS) | Authenticated, encrypted business email delivery using Google App Passwords |
| **Testing** | Pytest, HTTPX TestClient | 62 automated unit, integration, and E2E security tests |

---

## 📁 Repository Structure

```text
export-automation-system/
├── backend/
│   ├── classification/         # Gemini AI qualification & schema validation
│   ├── extraction/             # CSV ingestion & HTML contact extraction
│   ├── leads/                  # LeadService repository & finite state machine
│   ├── logging_module/         # Activity audit logger
│   ├── outreach/               # Gmail SMTP sender & PDF attachment handler
│   ├── products/               # Multi-product catalog manager
│   ├── reports/                # Campaign metrics & CSV report generator
│   ├── search/                 # Serper provider, query builder, parser & SSRF guard
│   ├── validation/             # RFC email validator & deduplication engine
│   ├── config.py               # Centralized configuration & environment loader
│   ├── main.py                 # FastAPI REST API endpoints
│   └── requirements.txt        # Backend dependencies
│
├── frontend/
│   ├── src/
│   │   ├── components/         # PipelineStepper, PipelineFunnel, Navbar, StatusBadges
│   │   ├── context/            # ProductContext (active product global state)
│   │   ├── pages/              # Discover, Ingest, Qualify, Send, Reports, Settings
│   │   ├── services/           # Axios API client & error handler
│   │   ├── App.jsx             # SPA routing
│   │   └── main.jsx            # React root bootstrap
│   ├── package.json
│   └── vite.config.js
│
├── assets/                     # Product catalog presentation decks (PDF)
├── data/                       # Structured storage (products.json, buyers.csv, sent_log.csv)
├── tests/                      # Automated test suite (62 passing tests)
├── .env.example                # Sample environment template
├── pytest.ini                  # Pytest configuration
└── README.md                   # System documentation
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | System health check and service readiness status |
| `GET` | `/api/products` | List all catalog products and active export line |
| `POST` | `/api/products/{id}/activate` | Activate specified export product line |
| `POST` | `/api/search` | Live buyer discovery via configured search API |
| `GET` | `/api/leads` | List leads (filterable by `product_id`) |
| `GET` | `/api/leads/{id}` | Retrieve specific lead record |
| `PATCH`| `/api/leads/{id}` | Update lead fields with automatic re-validation |
| `DELETE`| `/api/leads/{id}` | Delete lead record |
| `POST` | `/api/leads/extract` | Re-attempt extraction on company website |
| `POST` | `/api/leads/validate` | Validate single email syntax |
| `POST` | `/api/leads/classify` | Execute Gemini AI qualification on validated leads |
| `POST` | `/api/campaigns` | Dispatch campaign with server-side qualification hard gates |
| `GET` | `/api/campaigns` | Get campaign history and summary metrics |
| `GET` | `/api/reports` | Get production analytics funnel and metrics |

---

## 🚀 Getting Started

### 1. Clone & Setup Backend
```bash
git clone https://github.com/naina766/export-automation-system.git
cd export-automation-system

python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

pip install -r backend/requirements.txt
```

### 2. Setup Frontend
```bash
cd frontend
npm install
cd ..
```

### 3. Configure Environment
Copy `.env.example` to `.env` in the project root:
```bash
cp .env.example .env
```
Fill in your credentials:
```env
SEARCH_PROVIDER=serper
SEARCH_API_KEY=your_serper_api_key_here

GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

GMAIL_EMAIL=your_export_sales_email@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop

DAILY_SEND_LIMIT=100
MAX_EMAILS_PER_RUN=25

FRONTEND_URL=http://localhost:5173
VITE_API_BASE_URL=http://localhost:8000/api
```

### 4. Run Locally
**Terminal 1 (Backend):**
```bash
cd backend
uvicorn main:app --reload --port 8000
```
*API docs available at `http://localhost:8000/docs`.*

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```
*Web application opens at `http://localhost:5173`.*

---

## 🧪 Test Suite & Verification

Run the full automated test suite:
```bash
pytest -v
```

```text
============================= test session starts =============================
platform win32 -- Python 3.14.0, pytest-9.1.1
collected 62 items

tests/test_api.py ....................                                  [ 32%]
tests/test_classification.py ..                                         [ 35%]
tests/test_pipeline_e2e_requirements.py ..................              [ 64%]
tests/test_products.py ...                                               [ 69%]
tests/test_reports.py ...                                                [ 74%]
tests/test_search_discovery.py ..............                            [ 96%]
tests/test_validation.py ..                                              [100%]

============================= 62 passed in 4.03s ==============================
```

Verify frontend production build:
```bash
cd frontend
npm run build
# Output: built in ~9s (0 errors)
```

---

## 🔐 Security & Compliance

- **Zero Secret Exposure:** `GMAIL_APP_PASSWORD`, `GEMINI_API_KEY`, and `SEARCH_API_KEY` are strictly server-side and never returned to the frontend.
- **SSRF Prevention:** Strict hostname and IP address validation rejecting loopback, link-local, and private address blocks.
- **Strict CORS Policy:** Backend CORS explicitly bounds allowed origins to the configured `FRONTEND_URL`.
- **Demo Outreach Containment:** Demonstration workflows are marked with `is_demo=True` and blocked from live dispatch (`HTTP 422: DEMO_DATA_OUTREACH_BLOCKED`).

---

## 👩‍💻 Author

**Naina Varshney**  
B.Tech — Computer Science & Engineering (Data Science)  
Ajay Kumar Garg Engineering College, Ghaziabad  
GitHub: [https://github.com/naina766](https://github.com/naina766)
