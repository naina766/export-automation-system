"""
Live Web Buyer Search Provider.
Communicates with external Search APIs (Google Custom Search, Serper, SerpAPI, Tavily).
Provides real-time discovery of international B2B buyers without scraping or demo data.
"""
import os
import sys
from pathlib import Path
import httpx
from typing import List, Dict, Any, Optional, Union

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent
for p in [str(BACKEND_DIR), str(ROOT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from backend.search.base import BuyerSearchProvider
    from backend.search.parser import parse_search_item, extract_contact_from_public_website
    from backend.search.normalizer import normalize_lead_batch
except ImportError:
    try:
        from search.base import BuyerSearchProvider
        from search.parser import parse_search_item, extract_contact_from_public_website
        from search.normalizer import normalize_lead_batch
    except ImportError:
        from .base import BuyerSearchProvider
        from .parser import parse_search_item, extract_contact_from_public_website
        from .normalizer import normalize_lead_batch

from config import get_search_provider_config

class SearchProviderNotConfiguredError(Exception):
    """Raised when external search API credentials are not configured."""
    pass

class SearchProviderAPIError(Exception):
    """Raised when the external search API fails, times out, or returns an error."""
    pass

class WebBuyerSearchProvider(BuyerSearchProvider):
    """
    Production-grade Search Provider connecting to legitimate search APIs.
    """

    def __init__(self):
        config = get_search_provider_config()
        self.provider = config.get("provider", "google_cse").lower()
        self.api_key = config.get("api_key", "")
        self.engine_id = config.get("engine_id", "")

    def is_configured(self) -> bool:
        """Check if required API credentials exist."""
        if not self.api_key:
            return False
        if self.provider == "google_cse" and not self.engine_id:
            return False
        return True

    def build_search_query(
        self,
        product: str,
        country: Optional[str] = None,
        buyer_type: Optional[str] = None,
        keywords: Optional[Union[str, List[str]]] = None
    ) -> str:
        """Construct an optimized B2B query string."""
        terms = [f'"{product.strip()}"'] if product else ['"Singing Bowls"']
        
        # Add buyer type intention
        if buyer_type and buyer_type.lower() not in ["all", "all buyer types", ""]:
            terms.append(f'("{buyer_type}" OR wholesale OR distributor OR importer)')
        else:
            terms.append('(wholesale OR distributor OR importer OR "sound healing studio")')

        # Add target country
        if country and country.lower() not in ["all", "all countries", ""]:
            terms.append(f'"{country.strip()}"')

        # Add keywords (list or string)
        if keywords:
            if isinstance(keywords, list):
                kw_str = " ".join([f'"{k.strip()}"' if " " in k.strip() else k.strip() for k in keywords if k.strip()])
                if kw_str:
                    terms.append(kw_str)
            elif isinstance(keywords, str) and keywords.strip():
                terms.append(keywords.strip())

        return " ".join(terms)

    async def search(
        self,
        product: str = "Himalayan Sound Healing Bowls",
        country: Optional[str] = None,
        buyer_type: Optional[str] = None,
        keywords: Optional[Union[str, List[str]]] = None,
        limit: int = 10,
        product_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Executes live external search via configured provider.
        """
        # Reload config in case environment was updated at runtime
        config = get_search_provider_config()
        self.provider = config.get("provider", "google_cse").lower()
        self.api_key = config.get("api_key", "")
        self.engine_id = config.get("engine_id", "")

        if not self.is_configured():
            raise SearchProviderNotConfiguredError(
                "Search provider is not configured. Add SEARCH_API_KEY and SEARCH_ENGINE_ID in the backend environment."
            )

        query = self.build_search_query(product, country, buyer_type, keywords)
        raw_items = []

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                if self.provider == "google_cse":
                    raw_items = await self._search_google_cse(client, query, limit)
                elif self.provider == "serper":
                    raw_items = await self._search_serper(client, query, limit)
                elif self.provider == "serpapi":
                    raw_items = await self._search_serpapi(client, query, limit)
                elif self.provider == "tavily":
                    raw_items = await self._search_tavily(client, query, limit)
                else:
                    raw_items = await self._search_google_cse(client, query, limit)

                parsed_items = [parse_search_item(item, country, buyer_type) for item in raw_items]

                # Inspect public websites for contact info when snippet lacks email
                for item in parsed_items[:limit]:
                    if not item.get("email") and item.get("website"):
                        extra_contact = await extract_contact_from_public_website(item["website"], client)
                        if extra_contact.get("email"):
                            item["email"] = extra_contact["email"]
                        if extra_contact.get("phone") and not item.get("phone"):
                            item["phone"] = extra_contact["phone"]

        except httpx.TimeoutException:
            raise SearchProviderAPIError("Live search request timed out. Please try again.")
        except httpx.HTTPStatusError as e:
            raise SearchProviderAPIError(f"Search API returned error HTTP {e.response.status_code}: {e.response.text}")
        except Exception as e:
            if isinstance(e, (SearchProviderNotConfiguredError, SearchProviderAPIError)):
                raise
            raise SearchProviderAPIError(f"Failed to query live search provider: {str(e)}")

        normalized_leads = normalize_lead_batch(parsed_items, provider_source=self.provider, product_id=product_id)
        return normalized_leads[:limit]

    async def _search_google_cse(self, client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
        """Query Google Custom Search JSON API."""
        url = "https://www.googleapis.com/customsearch/v1"
        params = {
            "key": self.api_key,
            "cx": self.engine_id,
            "q": query,
            "num": min(limit, 10)
        }
        res = await client.get(url, params=params)
        res.raise_for_status()
        data = res.json()
        items = data.get("items", [])
        return [
            {
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", "")
            }
            for item in items
        ]

    async def _search_serper(self, client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
        """Query Serper.dev Google Search API."""
        url = "https://google.serper.dev/search"
        headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}
        payload = {"q": query, "num": limit}
        res = await client.post(url, headers=headers, json=payload)
        res.raise_for_status()
        data = res.json()
        items = data.get("organic", [])
        return [
            {
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", "")
            }
            for item in items
        ]

    async def _search_serpapi(self, client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
        """Query SerpAPI."""
        url = "https://serpapi.com/search.json"
        params = {"api_key": self.api_key, "q": query, "num": limit, "engine": "google"}
        res = await client.get(url, params=params)
        res.raise_for_status()
        data = res.json()
        items = data.get("organic_results", [])
        return [
            {
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", "")
            }
            for item in items
        ]

    async def _search_tavily(self, client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
        """Query Tavily Search API."""
        url = "https://api.tavily.com/search"
        payload = {"api_key": self.api_key, "query": query, "max_results": limit}
        res = await client.post(url, json=payload)
        res.raise_for_status()
        data = res.json()
        items = data.get("results", [])
        return [
            {
                "title": item.get("title", ""),
                "link": item.get("url", ""),
                "snippet": item.get("content", "")
            }
            for item in items
        ]
