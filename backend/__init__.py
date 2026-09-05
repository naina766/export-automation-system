"""
Export Automation System — Canonical Backend Package.
"""
import sys
import importlib

# Canonical submodules to register identically in sys.modules
_MODULES = [
    "config",
    "search.base",
    "search.parser",
    "search.normalizer",
    "search.web_search_provider",
    "search",
    "outreach.attachment_handler",
    "outreach.gmail_sender",
    "outreach",
    "validation.email_validator",
    "validation",
    "classification.gemini_classifier",
    "classification",
    "reports.report_generator",
    "reports",
    "products.catalog",
    "products",
    "leads.lead_service",
    "leads",
    "logging_module.activity_logger",
    "logging_module",
    "extraction.data_extractor",
    "extraction",
    "main"
]

for _name in _MODULES:
    _canonical = f"backend.{_name}"
    try:
        _mod = importlib.import_module(_canonical)
        sys.modules[_name] = _mod
    except Exception:
        pass


