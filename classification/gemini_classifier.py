"""
Gemini AI Lead Classification Module.
Categorizes leads into 'business' or 'individual' with intelligent heuristic fallback in Demo Mode.
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

class LeadClassifier:
    """Classifies buyers into business vs individual buyers using Gemini or heuristic fallback."""

    @staticmethod
    def classify_heuristic(record: Dict[str, Any]) -> str:
        """
        Rule-based heuristic classifier for Demo Mode:
        - Evaluates presence and structure of company_name
        - Evaluates email domain (e.g. gmail/yahoo vs corporate domain)
        - Evaluates website presence
        """
        company = str(record.get("company_name", "")).strip()
        email = str(record.get("email", "")).strip().lower()
        website = str(record.get("website", "")).strip()

        # Obvious individual public webmail domains without company
        public_domains = ["@gmail.", "@yahoo.", "@hotmail.", "@outlook.", "@icloud.", "@aol.", "@proton."]
        is_public_email = any(dom in email for dom in public_domains)

        # Company keywords
        biz_indicators = ["ltd", "inc", "llc", "corp", "gmbh", "imports", "exports", "wholesale", 
                          "studio", "sanctuary", "wellness", "traders", "crafts", "healing", "spa", "store"]
        
        has_biz_keywords = any(kw in company.lower() for kw in biz_indicators)

        if company and len(company) > 2:
            if has_biz_keywords or not is_public_email or website:
                return "business"
            return "business"
        
        if is_public_email and not company:
            return "individual"

        if website and len(website) > 5:
            return "business"

        return "individual"

    @classmethod
    def classify_with_gemini(cls, leads: List[Dict[str, Any]], api_key: str) -> List[Dict[str, str]]:
        """Call Gemini API to classify list of leads."""
        prompt = (
            "You are an expert B2B lead classification assistant for a Singing Bowls export company.\n"
            "Analyze the following contacts and classify each contact as either 'business' or 'individual'.\n"
            "Criteria:\n"
            "- 'business': Company names, importers, studios, wellness centers, wholesalers, corporate domain emails.\n"
            "- 'individual': Personal buyers, hobbyists, or entries with purely personal emails and no company entity.\n\n"
            "Return ONLY a valid JSON array of objects with keys 'email' and 'classification' ('business' | 'individual').\n\n"
            f"Contacts:\n{json.dumps(leads, indent=2)}"
        )

        # Try using google.generativeai or google-genai
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-1.5-flash')
            response = model.generate_content(prompt)
            raw_text = response.text.strip()
            
            # Clean markdown code blocks if wrapped
            if raw_text.startswith("```"):
                raw_text = re.sub(r"^```[a-zA-Z]*\n", "", raw_text)
                raw_text = re.sub(r"\n```$", "", raw_text)

            parsed = json.loads(raw_text)
            if isinstance(parsed, list):
                return parsed
        except Exception as e:
            print(f"Gemini API execution error: {e}. Falling back to demo heuristic.")
            
        # Fallback if API response failed or unparsable
        return [{"email": lead.get("email", ""), "classification": cls.classify_heuristic(lead)} for lead in leads]

    @classmethod
    def execute_classification(cls) -> Tuple[bool, str, str, Dict[str, Any]]:
        """
        Loads valid, non-duplicate buyers from data/buyers.csv,
        runs Gemini / Demo classification, and saves:
        - data/business_emails.csv
        - data/individual_emails.csv
        Returns (success, mode_name, message, summary_dict)
        """
        if not BUYERS_CSV.exists():
            return False, "N/A", "No buyers.csv found. Please upload leads first.", {}

        try:
            df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
        except Exception as e:
            return False, "N/A", f"Error reading buyers.csv: {str(e)}", {}

        # Filter valid leads that are not duplicates
        valid_df = df[
            (df.get("email_status", "valid") == "valid") & 
            (df.get("is_duplicate", "False").astype(str).str.lower() != "true")
        ].copy()

        if valid_df.empty:
            return False, "N/A", "No valid un-duplicated buyer leads to classify.", {}

        api_key = get_gemini_api_key()
        is_demo_mode = not bool(api_key)
        mode_label = "DEMO MODE (Heuristic)" if is_demo_mode else "GEMINI AI"

        leads_to_classify = valid_df[["buyer_name", "company_name", "email", "website", "country"]].to_dict(orient="records")

        if is_demo_mode:
            results = [{"email": lead.get("email", ""), "classification": cls.classify_heuristic(lead)} for lead in leads_to_classify]
            status_msg = "Gemini API key is not configured. Processed using Demo Mode heuristic classifier."
        else:
            try:
                results = cls.classify_with_gemini(leads_to_classify, api_key)
                status_msg = f"Successfully classified {len(results)} leads using Gemini AI."
            except Exception as e:
                results = [{"email": lead.get("email", ""), "classification": cls.classify_heuristic(lead)} for lead in leads_to_classify]
                mode_label = "DEMO MODE (Fallback)"
                status_msg = f"Gemini API error ({str(e)}). Fallen back to Demo Mode heuristic classifier."

        # Map results back to dataframe
        class_map = {item.get("email", "").lower(): item.get("classification", "individual").lower() for item in results}
        
        valid_df["classification"] = valid_df["email"].apply(lambda e: class_map.get(str(e).lower(), "individual"))

        # Split and save
        business_df = valid_df[valid_df["classification"] == "business"]
        individual_df = valid_df[valid_df["classification"] == "individual"]

        business_df.to_csv(BUSINESS_EMAILS_CSV, index=False)
        individual_df.to_csv(INDIVIDUAL_EMAILS_CSV, index=False)

        # Also update main buyers.csv with classification
        df["classification"] = df["email"].apply(lambda e: class_map.get(str(e).lower(), ""))
        df.to_csv(BUYERS_CSV, index=False)

        summary = {
            "total_classified": len(valid_df),
            "business_count": len(business_df),
            "individual_count": len(individual_df),
            "business_records": business_df.to_dict(orient="records"),
            "individual_records": individual_df.to_dict(orient="records")
        }

        return True, mode_label, status_msg, summary
