import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import pytest
from classification.gemini_classifier import LeadClassifier

def test_heuristic_classification_business():
    record = {
        "name": "Sarah Miller",
        "company": "Himalayan Wellness LLC",
        "email": "sarah@himalayanwellness.example",
        "website": "https://himalayanwellness.example"
    }
    result = LeadClassifier.classify_heuristic(record)
    assert result["classification"] == "business"
    assert result["confidence"] >= 0.8
    assert "reason" in result

def test_heuristic_classification_individual():
    record = {
        "name": "Emily Thorne",
        "company": "",
        "email": "emily.thorne@gmail.example",
        "website": ""
    }
    result = LeadClassifier.classify_heuristic(record)
    assert result["classification"] == "individual"
    assert "reason" in result

def test_heuristic_classification_spa_studio():
    record = {
        "name": "Marcus Vance",
        "company": "Sound Bath Healing Studio",
        "email": "marcus@soundbath.example",
        "website": ""
    }
    result = LeadClassifier.classify_heuristic(record)
    assert result["classification"] == "business"
