# EXPORT AUTOMATION SYSTEM — SINGING BOWLS

> **AI-assisted B2B lead discovery, validation, classification, and outreach platform built with FastAPI, Python, React.js, Vite, Tailwind CSS, and Google Gemini AI.**

---

## 📌 1. Project Overview

The **EXPORT Automation System** is an end-to-end full-stack export automation platform purpose-built for an export enterprise selling authentic handcrafted **Himalayan Singing Bowls** and acoustic meditation instruments.

The system automates the complete B2B export outreach pipeline:
1. **Buyer Discovery & Upload:** Ingest raw international buyer leads via CSV or modular source adapters (Google, LinkedIn, Directories).
2. **Data Extraction & Normalization:** Standardizes column headers and sanitizes data.
3. **Email Validation & Deduplication:** Lightweight syntax verification via `email-validator` and suppression against previous outreach logs (`sent_log.csv`).
4. **AI Lead Classification:** Segments contacts into **B2B Wholesale Businesses** vs **Individual Retail Buyers** using Google Gemini 1.5 Flash AI, with intelligent **Demo Heuristic Fallback** for zero-credential operation.
5. **Campaign Composition & Personalization:** Dynamically customizes email copy (`{{buyer_name}}`, `{{company_name}}`, `{{country}}`) and attaches verified export product brochures (`assets/company_presentation.pdf`).
6. **Safe Email Outreach:** Dispatches via Gmail SMTP or simulates deliveries in zero-risk **Demo Mode** (`status=DEMO_SENT`).
7. **Audit Logging & Campaign Analytics:** Real-time KPI performance tracking with one-click downloadable CSV reports.

---

## 🚀 2. Architecture & Pipeline Workflow

```text
       Lead Ingestion (CSV Upload / Demo Search Adapters)
                              │
                              ▼
           Data Extraction & Column Normalization
                              │
                              ▼
             Email Validation & Deduplication
                              │
                              ▼
          Gemini 1.5 AI / Heuristic Classification
                 ╱                        ╲
       B2B Business Leads          Individual Buyers
                 ╲                        ╱
                              ▼
            Audience Targeting & Personalization
                              │
                              ▼
         Outreach Dispatch (Safe Demo / Gmail SMTP)
                              │
                              ▼
            Activity Logger (data/sent_log.csv)
                              │
                              ▼
           Real-Time Analytics & CSV Export Report
```

---

## 🛠️ 3. Technology Stack

### Frontend
- **Framework:** React 18 with Vite
- **Styling:** Tailwind CSS + Custom Dark Theme Glassmorphism
- **Routing:** React Router v6
- **Icons:** Lucide React
- **HTTP Client:** Axios

### Backend
- **Framework:** Python 3.10+, FastAPI, Uvicorn
- **Data & Processing:** Pandas, Pydantic, Python-Dotenv
- **Validation:** Email-Validator, Regular Expressions
- **AI & NLP:** Google Gemini 1.5 Flash (`google-generativeai` / `google-genai`)
- **Email Transport:** Python `smtplib` (STARTTLS / Gmail App Password)
- **PDF Generation:** ReportLab
- **Testing:** PyTest

### Storage
- Flat-file CSV & JSON persistence (`data/*.csv`, `data/settings.json`)

---

## 📁 4. Project Structure

```text
ExportAutomation/
├── backend/
│   ├── main.py                     # FastAPI REST API endpoints & CORS middleware
│   ├── config.py                   # Central configuration, paths & env loader
│   ├── requirements.txt            # Python backend dependencies
│   │
│   ├── search/
│   │   ├── __init__.py
│   │   └── demo_search.py          # Google, LinkedIn & Directory search adapters
│   │
│   ├── extraction/
│   │   ├── __init__.py
│   │   └── data_extractor.py       # Header alias mapping & CSV sanitization
│   │
│   ├── validation/
│   │   ├── __init__.py
│   │   └── email_validator.py      # Syntax checks, deduplication & suppression
│   │
│   ├── classification/
│   │   ├── __init__.py
│   │   └── gemini_classifier.py    # Gemini 1.5 Flash & Heuristic Fallback engine
│   │
│   ├── outreach/
│   │   ├── __init__.py
│   │   ├── attachment_handler.py   # PDF attachment verification & packaging
│   │   └── gmail_sender.py         # Personalization, Demo simulation & Gmail SMTP
│   │
│   ├── logging_module/
│   │   ├── __init__.py
│   │   └── activity_logger.py      # Append-only logger for sent_log.csv
│   │
│   └── reports/
│       ├── __init__.py
│       └── report_generator.py     # Metrics aggregator & CSV report exporter
│
├── frontend/
│   ├── package.json                # Frontend dependencies & scripts
│   ├── vite.config.js              # Vite server & proxy configuration
│   ├── tailwind.config.js          # Tailwind CSS theme & extensions
│   ├── index.html                  # HTML entry point
│   └── src/
│       ├── main.jsx                # React root entry point
│       ├── App.jsx                 # Routing & global responsive layout
│       ├── services/
│       │   └── api.js              # Centralized Axios API service
│       ├── components/
│       │   ├── Sidebar.jsx         # Navigation drawer & mode indicators
│       │   ├── Navbar.jsx          # Top navigation bar
│       │   ├── StatCard.jsx        # Metric KPI cards
│       │   ├── StatusBadge.jsx     # Semantic status badges
│       │   ├── DataTable.jsx       # Reusable responsive table
│       │   ├── PipelineFunnel.jsx  # Visual pipeline step indicator
│       │   ├── Notification.jsx    # Alert banner component
│       │   └── LoadingSpinner.jsx  # Loading spinner animation
│       ├── pages/
│       │   ├── Dashboard.jsx       # Real-time overview & recent activity
│       │   ├── Upload.jsx          # Drag & drop CSV upload & demo data loader
│       │   ├── Classification.jsx  # AI segmentation into Business & Individual
│       │   ├── SendCampaign.jsx    # Campaign composer, preview & dispatcher
│       │   ├── Reports.jsx         # Performance analytics & CSV export
│       │   └── Settings.jsx        # Runtime settings & credential status
│       └── styles/
│           └── index.css           # Tailwind base styles & glassmorphism
│
├── data/
│   ├── demo_buyers.csv             # Realistic sample buyer dataset
│   ├── buyers.csv                  # Current active buyer leads
│   ├── business_emails.csv         # B2B classified leads
│   ├── individual_emails.csv       # Individual consumer leads
│   ├── sent_log.csv                # Historical outreach activity log
│   └── settings.json               # Persistent runtime settings
│
├── assets/
│   ├── generate_pdf.py             # Script to generate product catalog PDF
│   └── company_presentation.pdf    # Singing Bowls wholesale export brochure
│
├── tests/
│   ├── test_api.py                 # FastAPI REST endpoint tests
│   ├── test_validation.py          # Email syntax & deduplication tests
│   ├── test_classification.py      # AI & Heuristic classification tests
│   └── test_reports.py             # Analytics & success rate calculation tests
│
├── .env.example                    # Template environment variables
├── .env                            # Local environment configuration
├── .gitignore                      # Git ignore rules
└── README.md                       # Comprehensive documentation
```

---

## ⚡ 5. Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

---

### Backend Setup

1. **Navigate to the backend folder:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   Create `.env` in the root or `backend/`:
   ```bash
   cp .env.example .env
   ```

4. **Start the FastAPI Backend Server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend API will run at **`http://localhost:8000`** (Swagger docs at **`http://localhost:8000/docs`**).

---

### Frontend Setup

1. **Open a new terminal and navigate to `frontend`:**
   ```bash
   cd frontend
   ```

2. **Install npm dependencies:**
   ```bash
   npm install
   ```

3. **Start the Vite development server:**
   ```bash
   npm run dev
   ```
   The React dashboard will run at **`http://localhost:5173`**.

---

## ⚙️ 6. Environment Configuration (`.env`)

| Variable | Description | Default |
|---|---|---|
| `EMAIL_MODE` | Email dispatch mode (`demo` or `smtp`) | `demo` |
| `GEMINI_API_KEY` | Google Gemini API Key (Leave empty to use Demo Heuristic mode) | `""` |
| `GMAIL_EMAIL` | Gmail account for live SMTP outreach | `""` |
| `GMAIL_APP_PASSWORD` | 16-character Gmail App Password | `""` |
| `SMTP_HOST` | SMTP server host | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SEND_DELAY` | Delay between consecutive email sends in seconds | `2` |
| `MAX_EMAILS_PER_RUN` | Maximum emails per campaign batch | `50` |

---

## 🛡️ 7. Zero-Risk Demo Mode vs Live SMTP Mode

### Demo Mode (`EMAIL_MODE=demo` — Default)
- **Zero Network Risk:** Never connects to external SMTP servers or contacts real mailboxes.
- Generates personalized emails, records timestamp and status as `DEMO_SENT`.
- Logs all attempts to `data/sent_log.csv`.
- Displays real-time generated email previews with substituted variables.

### Live SMTP Mode (`EMAIL_MODE=smtp`)
- Connects to Gmail SMTP (`smtp.gmail.com:587`, STARTTLS) with `GMAIL_EMAIL` and `GMAIL_APP_PASSWORD`.
- If credentials are not provided, it automatically falls back safely to Demo Mode with an alert.

---

## 📡 8. REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status and active mode |
| `GET` | `/api/dashboard` | Dashboard KPI metrics, pipeline counts, and system status |
| `GET` | `/api/leads` | Retrieve all current leads from `data/buyers.csv` |
| `POST` | `/api/upload` | Upload, normalize, validate, and deduplicate a CSV file |
| `POST` | `/api/load-demo` | Ingest sample `data/demo_buyers.csv` dataset |
| `POST` | `/api/validate` | Validate a single email address |
| `GET` | `/api/classification` | Retrieve classified business and individual leads |
| `POST` | `/api/classify` | Execute Gemini AI / Demo Fallback classification |
| `POST` | `/api/send` | Launch outreach campaign (Demo simulation or SMTP) |
| `GET` | `/api/activity` | Retrieve recent send logs from `data/sent_log.csv` |
| `GET` | `/api/report` | Retrieve campaign analytics and success rate |
| `GET` | `/api/report/download` | Download full campaign report as CSV |
| `GET` | `/api/settings` | Retrieve runtime settings and credential status |
| `POST` | `/api/settings` | Update runtime settings in `data/settings.json` |
| `GET` | `/api/search/demo` | Query modular source adapters for leads |

---

## 🧪 9. Automated Testing

Run the PyTest test suite:
```bash
pytest -v
```

### Test Coverage:
- `test_api.py`: Validates all FastAPI REST endpoints (`/health`, `/dashboard`, `/upload`, `/classify`, `/send`, `/report`, `/settings`).
- `test_validation.py`: Tests email syntax validation, case normalization, and batch deduplication.
- `test_classification.py`: Tests heuristic fallback classification logic for business vs individual profiles.
- `test_reports.py`: Tests KPI calculation, success rate formulas, and CSV report export.

---

## 🎯 10. Complete End-to-End Demo Workflow

1. Open **`http://localhost:5173`** in your browser.
2. Navigate to **Lead Upload** and click **⚡ Load Demo Buyers Dataset**.
3. Inspect the normalized leads table with validation and deduplication badges.
4. Navigate to **AI Classification** and click **Run Lead Classification**.
5. Observe the split into **B2B Business Leads** and **Individual Leads**.
6. Navigate to **Send Campaign**, select **Business Only**, edit the template with `{{buyer_name}}` and `{{company_name}}`, and review the live preview.
7. Click **Launch Safe Demo Send** and view generated outbox previews.
8. Navigate to **Reports** to see updated KPI cards, visual charts, and click **Download Full CSV Report**.
9. Navigate to **Settings** to customize keyword, delay, rate limits, or toggle email mode.
