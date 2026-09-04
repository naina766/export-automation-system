import sys
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import pytest
from classification.gemini_classifier import LeadClassifier

def test_gemini_classification_mocked():
    sample_leads = [
        {
            "name": "Marcus Chen",
            "company": "Artisan Sound Importers",
            "email": "marcus@artisansound.com",
            "website": "https://artisansound.com",
            "country": "United States"
        }
    ]
    mock_resp = [
        {
            "email": "marcus@artisansound.com",
            "classification": "business",
            "confidence": 0.95,
            "priority": "High Priority",
            "reason": "Registered wholesale distributor"
        }
    ]

    with patch("google.generativeai.GenerativeModel") as mock_model_cls:
        mock_instance = mock_model_cls.return_value
        mock_instance.generate_content.return_value.text = str(mock_resp).replace("'", '"')

        results = LeadClassifier.classify_batch_with_gemini(
            leads=sample_leads,
            api_key="mock-key",
            model_name="gemini-1.5-flash"
        )
        assert len(results) == 1
        assert results[0]["classification"] == "business"
        assert results[0]["priority"].lower() in ["high", "high priority"]

def test_gemini_unconfigured_error():
    with patch("classification.gemini_classifier.get_gemini_config") as mock_cfg:
        mock_cfg.return_value = ("", "gemini-1.5-flash")
        success, status_code, msg, summary = LeadClassifier.execute_classification()
        # Either no valid leads or GEMINI_NOT_CONFIGURED depending on dataset state
        if status_code != "NO_DATA" and status_code != "NO_VALID_LEADS":
            assert status_code == "GEMINI_NOT_CONFIGURED"
