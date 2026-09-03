import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "backend"))

import pandas as pd
import pytest
from validation.email_validator import EmailValidator, validate_email_address

def test_validate_single_email():
    res = validate_email_address("BUYER@HIMALAYANCRAFTS.COM")
    assert res["valid"] is True
    assert res["normalized_email"] == "buyer@himalayancrafts.com"

    # Verify placeholder/test domains are rejected
    assert validate_email_address("test@example.com")["valid"] is False
    assert validate_email_address("test@reserved.example")["valid"] is False

    res = validate_email_address("invalid-email-address")
    assert res["valid"] is False

    res = validate_email_address("")
    assert res["valid"] is False

def test_process_and_deduplicate():
    sample_data = {
        "name": ["Alice", "Alice Dup", "Bob", "Empty Email"],
        "company": ["Zen Imports", "Zen Imports", "Global Crafts", "No Email Corp"],
        "email": ["alice@buyerimports.com", "ALICE@BUYERIMPORTS.COM", "invalid-email", ""],
        "website": ["https://zenimports.com", "https://zenimports.com", "", ""],
        "country": ["USA", "USA", "UK", "Germany"],
        "source": ["Google", "Google", "LinkedIn", "Directory"]
    }
    df = pd.DataFrame(sample_data)
    processed_df, stats = EmailValidator.process_and_deduplicate(df)

    assert stats["total_records"] == 4
    assert stats["valid_records"] == 1
    assert stats["duplicates_removed"] == 1
    assert stats["invalid_records"] == 1
    assert stats["missing_records"] == 1

    assert bool(processed_df.iloc[0]["is_duplicate"]) is False
    assert bool(processed_df.iloc[1]["is_duplicate"]) is True
