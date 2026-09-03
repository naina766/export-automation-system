"""
Gemini AI Lead Classification Engine.
Segments discovered leads into 'business' (B2B wholesale) vs 'individual' (retail consumer)
and assigns actionable priority tiers (High, Medium, Low, Not Relevant), scores (0-100), and categories.
"""
import json
import re
from typing import List, Dict, Any, Tuple, Optional
import pandas as pd
from config import (
    BUYERS_CSV,
    BUSINESS_EMAILS_CSV,
    INDIVIDUAL_EMAILS_CSV,
    get_gemini_config,
    get_target_product
)

class LeadClassifier:
    """Performs lead segmentation using Google Gemini Generative AI."""

    @classmethod
    def classify_batch_with_gemini(
        cls,
        leads: List[Dict[str, Any]],
        api_key: str,
        model_name: str = "gemini-1.5-flash",
        product: str = "Himalayan Sound Healing Bowls"
    ) -> List[Dict[str, Any]]:
        """Call Google Gemini API using configurable model to qualify export leads."""
        prompt = (
            f"You are an expert B2B international export qualification AI for: '{product}'.\n"
            "Analyze each real business lead below and classify them for international export outreach.\n\n"
            "For each lead, return a JSON object with EXACTLY these fields:\n"
            "- 'email': string (must match the input lead email or id)\n"
            "- 'category': string (e.g. 'distributor', 'wholesaler', 'importer', 'wellness_studio', 'retailer', 'individual')\n"
            "- 'qualification': string ('high', 'medium', 'low', or 'not_relevant')\n"
            "- 'score': integer between 0 and 100 representing export buyer fit\n"
            "- 'reason': concise 1-sentence qualification rationale explaining why this buyer fits\n"
            "- 'recommended_action': string ('contact', 'review', or 'skip')\n"
            "- 'classification': string ('business' or 'individual')\n"
            "- 'priority': string ('High Priority', 'Medium Priority', 'Low Priority', or 'Not Relevant')\n"
            "- 'confidence': float between 0.0 and 1.0\n\n"
            "Return ONLY a valid JSON array of objects without markdown formatting or backticks.\n\n"
            f"Input Leads:\n{json.dumps(leads, indent=2)}"
        )

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt)
        raw_text = response.text.strip()

        if raw_text.startswith("```"):
            raw_text = re.sub(r"^```[a-zA-Z]*\n", "", raw_text)
            raw_text = re.sub(r"\n```$", "", raw_text)

        parsed = json.loads(raw_text)
        if isinstance(parsed, list):
            return parsed
        raise ValueError("Invalid JSON array response from Gemini API")

    @classmethod
    def execute_classification(
        cls,
        product_id: Optional[str] = None,
        product_name: Optional[str] = None
    ) -> Tuple[bool, str, str, Dict[str, Any]]:
        """
        Classifies leads in data/buyers.csv using Gemini AI and partitions them into:
        - data/business_emails.csv
        - data/individual_emails.csv
        """
        if not BUYERS_CSV.exists():
            return False, "NO_DATA", "No buyers.csv found. Please discover leads first.", {}

        try:
            df = pd.read_csv(BUYERS_CSV, dtype=str).fillna("")
        except Exception as e:
            return False, "ERROR", f"Error reading buyers.csv: {str(e)}", {}

        if df.empty:
            return False, "NO_DATA", "No buyer records available. Run live search to discover international buyers.", {}

        # Filter valid leads that are not duplicates
        valid_mask = (df.get("email_status", "valid") == "valid") & \
                     (df.get("is_duplicate", "False").astype(str).str.lower() != "true") & \
                     (df.get("valid", "True").astype(str).str.lower() != "false")
        
        valid_df = df[valid_mask].copy()

        if valid_df.empty:
            return False, "NO_VALID_LEADS", "No valid un-duplicated buyer leads available for classification.", {}

        api_key, model_name = get_gemini_config()
        if not api_key:
            return False, "GEMINI_NOT_CONFIGURED", "Gemini API key is not configured. Please set GEMINI_API_KEY in the backend environment to enable AI lead qualification.", {}

        # Resolve active product from catalog
        try:
            from products.catalog import ProductCatalog
            if product_id:
                prod = ProductCatalog.get_product(product_id) or ProductCatalog.get_active_product()
            else:
                prod = ProductCatalog.get_active_product()
            resolved_product = product_name or prod.get("name") or get_target_product()
            resolved_description = prod.get("description", "")
        except Exception:
            resolved_product = product_name or get_target_product()
            resolved_description = ""

        product_context = f"{resolved_product} ({resolved_description})" if resolved_description else resolved_product

        leads_to_classify = []
        for _, row in valid_df.iterrows():
            leads_to_classify.append({
                "company": str(row.get("company", row.get("company_name", ""))).strip(),
                "website": str(row.get("website", "")).strip(),
                "country": str(row.get("country", "")).strip(),
                "buyer_type": str(row.get("buyer_type", "Distributor")).strip(),
                "snippet": str(row.get("snippet", "")).strip(),
                "product": resolved_product,
                "email": str(row.get("email", "")).strip()
            })

        try:
            results = cls.classify_batch_with_gemini(
                leads_to_classify,
                api_key=api_key,
                model_name=model_name,
                product=resolved_product
            )
            msg = f"Successfully qualified {len(results)} contacts using Google Gemini ({model_name})."
        except Exception as e:
            return False, "GEMINI_ERROR", f"Gemini API qualification error: {str(e)}", {}

        # Map results by email
        result_map = {str(item.get("email", "")).lower(): item for item in results}

        valid_df["classification"] = valid_df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("classification", "business")
        )
        valid_df["confidence"] = valid_df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("confidence", 0.85)
        )
        valid_df["reason"] = valid_df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("reason", "Qualified by Gemini AI")
        )
        valid_df["priority"] = valid_df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("priority", "High Priority")
        )
        valid_df["ai_score"] = valid_df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("score", 85)
        )
        valid_df["ai_category"] = valid_df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("category", "distributor")
        )

        # Split and save
        business_df = valid_df[valid_df["classification"] == "business"]
        individual_df = valid_df[valid_df["classification"] == "individual"]

        business_df.to_csv(BUSINESS_EMAILS_CSV, index=False)
        individual_df.to_csv(INDIVIDUAL_EMAILS_CSV, index=False)

        # Update main buyers.csv with classification results
        df["classification"] = df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("classification", "")
        )
        df["confidence"] = df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("confidence", "")
        )
        df["reason"] = df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("reason", "")
        )
        df["priority"] = df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("priority", "")
        )
        df["ai_score"] = df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("score", "")
        )
        df["ai_category"] = df["email"].apply(
            lambda e: result_map.get(str(e).lower(), {}).get("category", "")
        )
        df.to_csv(BUYERS_CSV, index=False)

        summary = {
            "mode": f"GEMINI ({model_name})",
            "total_classified": len(valid_df),
            "business_count": len(business_df),
            "individual_count": len(individual_df),
            "business_leads": business_df.to_dict(orient="records"),
            "individual_leads": individual_df.to_dict(orient="records"),
            "qualification_results": results
        }

        return True, "SUCCESS", msg, summary
