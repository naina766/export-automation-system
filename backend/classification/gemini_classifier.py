"""
Gemini AI Lead Classification & Heuristic Fallback Engine.
Classifies leads into 'business' or 'individual' with structured confidence and rationale.
"""
import json
import re
from typing import List, Dict, Any, Tuple
import pandas as pd
from config import (
    BUYERS_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV,
    get_gemini_api_key
)

BUSINESS_KEYWORDS = [
    "import", "imports", "export", "exports", "trading", "wellness",
    "retail", "store", "shop", "distributor", "wholesale", "crafts",
    "company", "ltd", "inc", "llc", "corp", "gmbh", "studio",
    "sanctuary", "healing", "spa", "boutique", "center", "artisans"
]

class LeadClassifier:
    """Performs lead segmentation with Gemini AI and Heuristic fallback."""

    @staticmethod
    def classify_heuristic(lead: Dict[str, Any]) -> Dict[str, Any]:
        """
        Rule-based heuristic classifier for Demo Mode:
        Inspects company, domain, website, and commercial keywords.
        """
        company = str(lead.get("company", "")).strip()
        email = str(lead.get("email", "")).strip().lower()
        website = str(lead.get("website", "")).strip()
        name = str(lead.get("name", "")).strip()

        # Public personal email domains
        personal_webmails = ["@gmail.", "@yahoo.", "@hotmail.", "@outlook.", "@icloud.", "@aol.", "@proton.", "@me."]
        is_personal_email = any(dom in email for dom in personal_webmails)

        company_lower = company.lower()
        found_keywords = [kw for kw in BUSINESS_KEYWORDS if kw in company_lower]

        if company and len(company) >= 2:
            if found_keywords:
                return {
                    "classification": "business",
                    "confidence": 0.95,
                    "reason": f"Matched commercial entity keywords: {', '.join(found_keywords[:2])}"
                }
            if website or not is_personal_email:
                return {
                    "classification": "business",
                    "confidence": 0.88,
                    "reason": "Corporate domain / website present for entity"
                }
            return {
                "classification": "business",
                "confidence": 0.80,
                "reason": "Registered company entity provided"
            }

        if website and len(website) > 4:
            return {
                "classification": "business",
                "confidence": 0.75,
                "reason": "Commercial web presence identified"
            }

        if is_personal_email or not company:
            return {
                "classification": "individual",
                "confidence": 0.90,
                "reason": "Personal webmail address without company registration"
            }

        return {
            "classification": "individual",
            "confidence": 0.70,
            "reason": "Individual consumer profile"
        }

    @classmethod
    def classify_batch_with_gemini(cls, leads: List[Dict[str, Any]], api_key: str) -> List[Dict[str, Any]]:
        """Call Google Gemini 1.5 API to classify list of leads."""
        prompt = (
            "You are an expert B2B lead classification AI for a Himalayan Singing Bowls export company.\n"
            "Analyze each contact and classify as either 'business' or 'individual'.\n"
            "For each lead, provide:\n"
            "- 'email': the lead email\n"
            "- 'classification': 'business' or 'individual'\n"
            "- 'confidence': float between 0.0 and 1.0\n"
            "- 'reason': brief 1-sentence explanation\n\n"
            "Return ONLY a valid JSON array of objects.\n\n"
            f"Leads data:\n{json.dumps(leads, indent=2)}"
        )

        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt)
            raw_text = response.text.strip()

            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```[a-zA-Z]*\n", "", raw_text)
                raw_text = re.sub(r"\n```$", "", raw_text)

            parsed = json.loads(raw_text)
            if isinstance(parsed, list):
                return parsed
        except Exception as e:
            print(f"Gemini API request failed: {e}. Falling back to demo heuristics.")

        # Heuristic fallback on error
        return [
            {
                "email": lead.get("email", ""),
                **cls.classify_heuristic(lead)
            }
            for lead in leads
        ]

    @classmethod
    def execute_classification(cls) -> Tuple[bool, str, str, Dict[str, Any]]:
        """
        Classifies leads in data/buyers.csv and partitions them into:
        - data/business_emails.csv
        - data/individual_emails.csv
        """
        if not BUYERS_CSV.exists():
            return False, "N/A", "No buyers.csv found. Please upload leads first.", {}

        try:
            df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
        except Exception as e:
            return False, "N/A", f"Error reading buyers.csv: {str(e)}", {}

        # Filter valid leads that are not duplicates
        valid_mask = (df.get("email_status", "valid") == "valid") & \
                     (df.get("is_duplicate", "False").astype(str).str.lower() != "true") & \
                     (df.get("valid", "True").astype(str).str.lower() != "false")
        
        valid_df = df[valid_mask].copy()

        if valid_df.empty:
            return False, "N/A", "No valid un-duplicated buyer leads available for classification.", {}

        api_key = get_gemini_api_key()
        is_demo = not bool(api_key)
        mode_label = "DEMO FALLBACK MODE" if is_demo else "GEMINI MODE"

        leads_to_classify = valid_df[["name", "company", "email", "website", "country"]].to_dict(orient="records")

        if is_demo:
            results = [
                {
                    "email": lead.get("email", ""),
                    **cls.classify_heuristic(lead)
                }
                for lead in leads_to_classify
            ]
            msg = "Classified contacts using Demo Fallback heuristic engine."
        else:
            try:
                results = cls.classify_batch_with_gemini(leads_to_classify, api_key)
                msg = f"Successfully classified {len(results)} contacts using Google Gemini 1.5 Flash AI."
            except Exception as e:
                results = [
                    {
                        "email": lead.get("email", ""),
                        **cls.classify_heuristic(lead)
                    }
                    for lead in leads_to_classify
                ]
                mode_label = "DEMO FALLBACK MODE"
                msg = f"Gemini API error ({str(e)}). Switched to Demo Fallback engine."

        # Map results
        result_map = {item.get("email", "").lower(): item for item in results}

        valid_df["classification"] = valid_df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("classification", "individual")
        )
        valid_df["confidence"] = valid_df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("confidence", 0.85)
        )
        valid_df["reason"] = valid_df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("reason", "Standard classification")
        )

        # Split and save
        business_df = valid_df[valid_df["classification"] == "business"]
        individual_df = valid_df[valid_df["classification"] == "individual"]

        business_df.to_csv(BUSINESS_EMAILS_CSV, index=False)
        individual_df.to_csv(INDIVIDUAL_EMAILS_CSV, index=False)

        # Update main buyers.csv
        df["classification"] = df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("classification", "")
        )
        df["confidence"] = df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("confidence", "")
        )
        df["reason"] = df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("reason", "")
        )
        df.to_csv(BUYERS_CSV, index=False)

        summary = {
            "mode": mode_label,
            "total_classified": len(valid_df),
            "business_count": len(business_df),
            "individual_count": len(individual_df),
            "business_leads": business_df.to_dict(orient="records"),
            "individual_leads": individual_df.to_dict(orient="records")
        }

        return True, mode_label, msg, summary
