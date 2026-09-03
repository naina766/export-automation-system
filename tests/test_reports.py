import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import pytest
from reports.report_generator import ReportGenerator

def test_campaign_metrics_structure():
    metrics = ReportGenerator.get_campaign_metrics()
    assert isinstance(metrics, dict)
    assert "total_leads" in metrics
    assert "valid_emails" in metrics
    assert "business_leads" in metrics
    assert "successful_sends" in metrics
    assert "success_rate" in metrics

def test_report_csv_generation():
    csv_text = ReportGenerator.generate_csv_report_string()
    assert "EXPORT AUTOMATION SYSTEM" in csv_text
    assert "KPI SUMMARY" in csv_text
    assert "Delivery Success Rate" in csv_text
