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

def test_test_email_accounting_separation():
    metrics = ReportGenerator.get_campaign_metrics()
    assert "test_sends" in metrics
    assert "pipeline_stages" in metrics
    # Production outreach equals production successful sends
    assert metrics["pipeline_stages"]["outreach"] == metrics["successful_sends"]
    if metrics["emails_attempted"] == 0:
        assert metrics["success_rate"] is None
        assert metrics["campaigns_count"] == 0
