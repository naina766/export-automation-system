"""
Product Catalog Manager for EXPORT Automation System.
Loads, validates, and manages multi-product export configurations.
"""
import json
import re
from pathlib import Path
from typing import List, Dict, Any, Optional

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
DATA_DIR = PROJECT_ROOT / "data"
PRODUCTS_JSON = DATA_DIR / "products.json"

DEFAULT_SEED_PRODUCTS = [
    {
        "id": "himalayan-sound-healing-bowls",
        "name": "Himalayan Sound Healing Bowls",
        "description": "Authentic hand-hammered 7-metal acoustic healing bowls forged in the Himalayas for certified sound therapists, meditation centers, and holistic distributors.",
        "keywords": [
            "Himalayan sound healing bowls",
            "sound healing bowls wholesale",
            "Tibetan singing bowls importer",
            "meditation bowls distributor"
        ],
        "buyer_types": [
            "Wholesale Importer",
            "Distributor",
            "Wellness Studio",
            "Sound Healing Center",
            "Metaphysical Retailer"
        ],
        "target_countries": [
            "United States",
            "United Kingdom",
            "Germany",
            "Canada",
            "Australia"
        ],
        "email_subject_template": "Export Supply Partnership: {{product_name}} for {{company_name}}",
        "email_body_template": "Hello {{contact_name}},\n\nI am reaching out regarding {{company_name}} in {{country}}.\n\nAs a premier direct exporter of authentic {{product_name}}, we partner with leading wellness distributors and specialty retailers across {{country}}.\n\nWe would welcome the opportunity to supply your organization with export-grade inventory directly from our artisans.\n\nPlease find our catalog and B2B pricing schedule attached.\n\nBest regards,\nExport Sales Team",
        "catalog_path": "assets/company_presentation.pdf",
        "active": True
    },
    {
        "id": "tibetan-singing-bowls",
        "name": "Tibetan Singing Bowls",
        "description": "Traditional hand-crafted Tibetan singing bowls tuned to fundamental chakra frequencies, suited for Buddhist centers, yoga studios, and spiritual gift retailers.",
        "keywords": [
            "Tibetan singing bowls wholesale",
            "traditional singing bowls distributor",
            "Buddhist singing bowls supplier",
            "chakra singing bowls wholesale"
        ],
        "buyer_types": [
            "Wholesale Importer",
            "Distributor",
            "Yoga & Meditation Studio",
            "Gift Retailer"
        ],
        "target_countries": [
            "United States",
            "Germany",
            "France",
            "United Kingdom",
            "Japan"
        ],
        "email_subject_template": "B2B Export Inquiry: Authentic {{product_name}} for {{company_name}}",
        "email_body_template": "Hello {{contact_name}},\n\nWe noticed {{company_name}}'s focus on mindfulness and wellness products in {{country}}.\n\nOur workshop exports certified authentic {{product_name}} crafted using traditional alloy compositions. We offer reliable international freight and competitive distributor tiers.\n\nAttached is our current catalog for your review.\n\nWarm regards,\nInternational Trade Department",
        "catalog_path": "assets/company_presentation.pdf",
        "active": False
    },
    {
        "id": "crystal-singing-bowls",
        "name": "Crystal Singing Bowls",
        "description": "High-purity quartz crystal singing bowls tuned precisely to 432Hz and 528Hz solfeggio scales for modern sound baths and holistic clinics.",
        "keywords": [
            "quartz crystal singing bowls wholesale",
            "crystal singing bowl distributor",
            "432hz sound bowl supplier",
            "crystal bowl sound healing wholesale"
        ],
        "buyer_types": [
            "Distributor",
            "Wholesale Importer",
            "Sound Bath Studio",
            "Holistic Health Clinic"
        ],
        "target_countries": [
            "United States",
            "Australia",
            "Canada",
            "United Kingdom",
            "Netherlands"
        ],
        "email_subject_template": "Wholesale Partnership: Precision {{product_name}} for {{company_name}}",
        "email_body_template": "Hello {{contact_name}},\n\nI hope this email finds you well at {{company_name}}.\n\nWe specialize in bulk manufacturing and export of high-purity {{product_name}} with accurate frequency calibration (432Hz / 528Hz).\n\nIf {{company_name}} is interested in expanding your inventory with direct factory margins, please review our attached catalog.\n\nBest regards,\nOEM Export Coordinator",
        "catalog_path": "assets/company_presentation.pdf",
        "active": False
    },
    {
        "id": "meditation-bowls",
        "name": "Meditation Bowls",
        "description": "Compact etched meditation and mindfulness singing bowls with wooden strikers and silk cushions, ideal for retail gift chains and mindfulness subscription boxes.",
        "keywords": [
            "meditation singing bowls wholesale",
            "mindfulness singing bowls supplier",
            "meditation gift sets bulk",
            "yoga meditation bowls importer"
        ],
        "buyer_types": [
            "Retail Chain Buyer",
            "Wholesale Importer",
            "Gift Distributor",
            "Mindfulness Center"
        ],
        "target_countries": [
            "United States",
            "Canada",
            "United Kingdom",
            "Germany",
            "Singapore"
        ],
        "email_subject_template": "Direct Supply of Handcrafted {{product_name}} — {{company_name}}",
        "email_body_template": "Hello {{contact_name}},\n\nReaching out from our Himalayan artisan export facility regarding {{company_name}}.\n\nWe produce artisan-packaged {{product_name}} with high consumer appeal and complete accessory sets (cushion + striker). We provide custom branding and export shipping to {{country}}.\n\nPlease find our presentation and wholesale volume discounts attached.\n\nBest regards,\nCommercial Outreach Team",
        "catalog_path": "assets/company_presentation.pdf",
        "active": False
    },
    {
        "id": "handcrafted-brass-singing-bowls",
        "name": "Handcrafted Brass Singing Bowls",
        "description": "Heavy-gauge brass alloy singing bowls with antique etched motifs and long sustain, designed for acoustic sound therapy and cultural craft importers.",
        "keywords": [
            "brass singing bowls wholesale",
            "handcrafted brass singing bowl exporter",
            "etched singing bowls distributor",
            "brass meditation bowls supplier"
        ],
        "buyer_types": [
            "Wholesale Importer",
            "Distributor",
            "Cultural Craft Retailer",
            "Acoustic Therapy Center"
        ],
        "target_countries": [
            "United States",
            "Germany",
            "United Kingdom",
            "Spain",
            "Switzerland"
        ],
        "email_subject_template": "Export Opportunity: {{product_name}} for {{company_name}}",
        "email_body_template": "Hello {{contact_name}},\n\nI am contacting you on behalf of our export workshop regarding prospective supply for {{company_name}} in {{country}}.\n\nOur authentic {{product_name}} offer resonant sustain and handcrafted artisan finishes that perform exceptionally well in premium retail and therapeutic settings.\n\nOur catalog is attached for your review. We look forward to connecting.\n\nSincerely,\nLead Export Representative",
        "catalog_path": "assets/company_presentation.pdf",
        "active": False
    }
]

def slugify(text: str) -> str:
    """Convert a name to a URL-safe lowercase slug."""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_-]+", "-", text)
    return text.strip("-")

class ProductCatalog:
    @staticmethod
    def get_products_file() -> Path:
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if not PRODUCTS_JSON.exists():
            with open(PRODUCTS_JSON, "w", encoding="utf-8") as f:
                json.dump(DEFAULT_SEED_PRODUCTS, f, indent=2)
        return PRODUCTS_JSON

    @classmethod
    def list_products(cls) -> List[Dict[str, Any]]:
        file_path = cls.get_products_file()
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                products = json.load(f)
                if not isinstance(products, list):
                    return DEFAULT_SEED_PRODUCTS
                return products
        except Exception:
            return DEFAULT_SEED_PRODUCTS

    @classmethod
    def save_products(cls, products: List[Dict[str, Any]]) -> None:
        file_path = cls.get_products_file()
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(products, f, indent=2)

    @classmethod
    def get_product(cls, product_id: str) -> Optional[Dict[str, Any]]:
        products = cls.list_products()
        for p in products:
            if p.get("id") == product_id:
                return p
        return None

    @classmethod
    def get_active_product(cls) -> Dict[str, Any]:
        products = cls.list_products()
        for p in products:
            if p.get("active") is True:
                return p
        # Fallback to first product
        if products:
            return products[0]
        return DEFAULT_SEED_PRODUCTS[0]

    @classmethod
    def set_active_product(cls, product_id: str) -> Optional[Dict[str, Any]]:
        products = cls.list_products()
        matched = None
        for p in products:
            if p.get("id") == product_id:
                p["active"] = True
                matched = p
            else:
                p["active"] = False
        
        if matched:
            cls.save_products(products)
            return matched
        return None

    @classmethod
    def add_product(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        products = cls.list_products()
        raw_name = data.get("name", "").strip()
        if not raw_name:
            raise ValueError("Product name is required")
        
        base_id = slugify(data.get("id") or raw_name)
        new_id = base_id
        counter = 1
        existing_ids = {p.get("id") for p in products}
        while new_id in existing_ids:
            new_id = f"{base_id}-{counter}"
            counter += 1

        new_product = {
            "id": new_id,
            "name": raw_name,
            "description": data.get("description", "").strip(),
            "keywords": data.get("keywords", [raw_name]) if isinstance(data.get("keywords"), list) else [k.strip() for k in str(data.get("keywords", "")).split(",") if k.strip()],
            "buyer_types": data.get("buyer_types", ["Wholesale Importer", "Distributor"]) if isinstance(data.get("buyer_types"), list) else [b.strip() for b in str(data.get("buyer_types", "")).split(",") if b.strip()],
            "target_countries": data.get("target_countries", ["United States", "United Kingdom", "Germany"]) if isinstance(data.get("target_countries"), list) else [c.strip() for c in str(data.get("target_countries", "")).split(",") if c.strip()],
            "email_subject_template": data.get("email_subject_template") or f"Export Partnership: {{{{product_name}}}} for {{{{company_name}}}}",
            "email_body_template": data.get("email_body_template") or (
                "Hello {{contact_name}},\n\n"
                "I am reaching out regarding {{company_name}} in {{country}}.\n\n"
                "As an established direct exporter of authentic {{product_name}}, we would be delighted to explore a wholesale supply partnership with your organization.\n\n"
                "Please find our export catalog and specifications attached.\n\n"
                "Best regards,\nExport Sales Team"
            ),
            "catalog_path": data.get("catalog_path", "assets/company_presentation.pdf"),
            "active": bool(data.get("active", False))
        }

        # If this new product is set active, deactivate others
        if new_product["active"]:
            for p in products:
                p["active"] = False

        products.append(new_product)
        cls.save_products(products)
        return new_product

    @classmethod
    def update_product(cls, product_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        products = cls.list_products()
        target = None
        for p in products:
            if p.get("id") == product_id:
                target = p
                break
        
        if not target:
            return None

        for field in [
            "name", "description", "keywords", "buyer_types",
            "target_countries", "email_subject_template",
            "email_body_template", "catalog_path"
        ]:
            if field in updates and updates[field] is not None:
                val = updates[field]
                if field in ["keywords", "buyer_types", "target_countries"] and isinstance(val, str):
                    target[field] = [item.strip() for item in val.split(",") if item.strip()]
                else:
                    target[field] = val

        if "active" in updates and updates["active"] is not None:
            is_active = bool(updates["active"])
            if is_active:
                for p in products:
                    p["active"] = (p.get("id") == product_id)
            else:
                target["active"] = False

        cls.save_products(products)
        return target

    @classmethod
    def delete_product(cls, product_id: str) -> bool:
        products = cls.list_products()
        initial_len = len(products)
        products = [p for p in products if p.get("id") != product_id]
        if len(products) == initial_len:
            return False

        # If the deleted product was active, activate the first remaining
        has_active = any(p.get("active") for p in products)
        if not has_active and products:
            products[0]["active"] = True

        cls.save_products(products)
        return True
