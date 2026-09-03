"""
Search Result Parsing Module.
Extracts business entity metadata, domains, countries, and contact points from raw search results.
Inspects public websites when available for contact info without fabricating data.
"""
import re
from urllib.parse import urlparse
from typing import Dict, Any, Optional
import httpx

EMAIL_SNIPPET_REGEX = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
PHONE_REGEX = re.compile(r"(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}")

COUNTRY_KEYWORDS = {
    "united states": "United States",
    "usa": "United States",
    "us": "United States",
    "united kingdom": "United Kingdom",
    "uk": "United Kingdom",
    "germany": "Germany",
    "france": "France",
    "canada": "Canada",
    "australia": "Australia",
    "singapore": "Singapore",
    "uae": "United Arab Emirates",
    "dubai": "United Arab Emirates",
    "switzerland": "Switzerland",
    "netherlands": "Netherlands",
    "spain": "Spain",
    "italy": "Italy",
    "india": "India",
    "japan": "Japan",
    "new zealand": "New Zealand"
}

def clean_company_name(title: str, domain: str) -> str:
    """Extract a clean company / business name from page title and domain."""
    if not title:
        domain_part = domain.split(".")[0]
        return domain_part.replace("-", " ").replace("_", " ").title()

    parts = re.split(r"\s+[-|:•—–]\s+", title)
    candidate = parts[0].strip()
    if len(candidate) > 45 and len(parts) > 1:
        candidate = parts[-1].strip()

    candidate = re.sub(r"(?i)\b(home|welcome to|official site|buy|wholesale|shop online)\b", "", candidate).strip()
    
    if len(candidate) < 3:
        domain_part = domain.split(".")[0]
        return domain_part.replace("-", " ").replace("_", " ").title()
        
    return candidate[:50]

def parse_search_item(item: Dict[str, Any], query_country: Optional[str] = None, query_buyer_type: Optional[str] = None) -> Dict[str, Any]:
    """Parse raw search item into structured business lead attributes."""
    title = str(item.get("title", "")).strip()
    url = str(item.get("link", item.get("url", ""))).strip()
    snippet = str(item.get("snippet", item.get("content", ""))).strip()

    parsed_url = urlparse(url)
    domain = parsed_url.netloc.lower()
    if domain.startswith("www."):
        domain = domain[4:]

    company_name = clean_company_name(title, domain)

    # Detect country
    detected_country = query_country if query_country and query_country.lower() not in ["all", "all countries", ""] else ""
    if not detected_country:
        searchable_text = f"{title} {snippet} {url}".lower()
        for kw, country_name in COUNTRY_KEYWORDS.items():
            if re.search(r"\b" + re.escape(kw) + r"\b", searchable_text):
                detected_country = country_name
                break
    if not detected_country:
        detected_country = "International"

    # Detect email in title/snippet
    email_match = EMAIL_SNIPPET_REGEX.search(f"{title} {snippet}")
    discovered_email = email_match.group(0).lower().rstrip(".,;:!?)'\"") if email_match else ""

    # Detect phone
    phone_match = PHONE_REGEX.search(snippet)
    discovered_phone = phone_match.group(0) if phone_match else ""

    buyer_type = query_buyer_type if query_buyer_type and query_buyer_type.lower() not in ["all", "all buyer types", ""] else "Distributor"

    return {
        "company_name": company_name,
        "website": f"https://{domain}" if domain else url,
        "country": detected_country,
        "buyer_type": buyer_type,
        "contact_name": "Procurement Lead",
        "email": discovered_email,
        "phone": discovered_phone,
        "snippet": snippet,
        "source_url": url,
        "source": "web_search"
    }

async def extract_contact_from_public_website(website_url: str, client: httpx.AsyncClient) -> Dict[str, Optional[str]]:
    """
    Politely inspects public website contact or about page for publicly listed emails.
    Never fabricates data; returns None if not found or unreachable.
    """
    if not website_url or not website_url.startswith("http"):
        return {"email": None, "phone": None}

    parsed = urlparse(website_url)
    base_url = f"{parsed.scheme}://{parsed.netloc}"
    targets = [f"{base_url}/contact", f"{base_url}/about"]

    for target in targets:
        try:
            resp = await client.get(
                target,
                timeout=2.0,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},
                follow_redirects=True
            )
            if resp.status_code == 200:
                html = resp.text
                mailto_match = re.search(r'mailto:([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', html, re.I)
                if mailto_match:
                    found = mailto_match.group(1).lower()
                    if not found.endswith((".png", ".jpg", ".gif", ".webp", ".svg")):
                        return {"email": found, "phone": None}

                email_match = EMAIL_SNIPPET_REGEX.search(html)
                if email_match:
                    found = email_match.group(0).lower()
                    if not found.endswith((".png", ".jpg", ".gif", ".webp", ".svg")):
                        return {"email": found, "phone": None}
        except Exception:
            pass

    return {"email": None, "phone": None}
