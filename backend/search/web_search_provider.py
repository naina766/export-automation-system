"""
Live Web Buyer Search Provider.
Communicates with external Search APIs (Serper, Brave, Tavily, SerpAPI, Google Custom Search).
Provides real-time discovery of international B2B buyers without scraping or demo data.
"""
import os
import sys
import re
import asyncio
from urllib.parse import urlparse
import httpx
from typing import List, Dict, Any, Optional, Union

from backend.search.base import BuyerSearchProvider
from backend.search.parser import parse_search_item, extract_contact_from_public_website
from backend.search.normalizer import normalize_lead_batch
from backend.config import get_search_provider_config

class SearchProviderNotConfiguredError(Exception):
    """Raised when external search API credentials are not configured."""
    pass

class SearchProviderAPIError(Exception):
    """Raised when the external search API fails, times out, or returns an error."""
    pass

class UnsupportedSearchProviderError(Exception):
    """Raised when an unrecognized search provider is configured."""
    pass

class WebBuyerSearchProvider(BuyerSearchProvider):
    """
    Production-grade Search Provider connecting to legitimate search APIs.
    Supported providers: serper, brave, tavily, serpapi, google_cse.
    """
    SUPPORTED_PROVIDERS = {"serper", "brave", "tavily", "serpapi", "google_cse"}

    def __init__(self):
        config = get_search_provider_config()
        self.provider = config.get("provider", "serper").lower()
        self.api_key = config.get("api_key", "")
        self.engine_id = config.get("engine_id", "")

    def is_configured(self) -> bool:
        """
        Check if required API credentials exist and are not unconfigured placeholder strings.
        """
        if self.provider not in self.SUPPORTED_PROVIDERS:
            return False
        if not self.api_key:
            return False
        # Treat template placeholders as unconfigured
        key_lower = self.api_key.lower().strip()
        if key_lower.startswith("your_") or key_lower in ["placeholder", "none", "null", "test_key_unconfigured"]:
            return False
        
        # Google CSE requires both API key and search engine ID
        if self.provider == "google_cse":
            if not self.engine_id:
                return False
            cx_lower = self.engine_id.lower().strip()
            if cx_lower.startswith("your_") or cx_lower in ["placeholder", "none", "null"]:
                return False
        return True

    @staticmethod
    def _clean_query_text(text: str) -> str:
        cleaned = re.sub(r"[()\"']", "", text or "")
        return re.sub(r"\s+", " ", cleaned).strip()

    @staticmethod
    def _intent_phrases(buyer_type: Optional[str]) -> List[str]:
        """Map UI buyer type to short search intents. Never append redundant 'wholesale importer'."""
        raw = (buyer_type or "").strip()
        lower = raw.lower()
        if not raw or lower in {"all", "all buyer types"}:
            return ["wholesale", "importer", "distributor"]
        if "wholesale importer" in lower or ( "wholesale" in lower and "import" in lower):
            return ["wholesale", "importer", "distributor"]
        if "import" in lower:
            return ["importer", "wholesale", "distributor"]
        if "distribut" in lower:
            return ["distributor", "wholesale", "importer"]
        if "retail" in lower:
            return ["retailer", "wholesale", "distributor"]
        return [raw, "wholesale", "distributor"]

    @staticmethod
    def _sanitize_search_keywords(keywords: Optional[Union[str, List[str]]]) -> Optional[str]:
        """
        Sanitizes user-provided search keywords to form the primary search subject.
        Strips query injection characters, search operators, and collapses whitespace.
        Ignores catalog keyword dumps (multi-item lists or comma-separated lists).
        """
        if not keywords:
            return None

        if isinstance(keywords, list):
            # If multiple items (e.g. catalog keyword list), do not treat as a single user search keyword
            if len(keywords) != 1:
                return None
            candidate = str(keywords[0] or "").strip()
        else:
            candidate = str(keywords).strip()

        # If empty, comma-separated dump (catalog keyword list), or overly long, reject as user search keyword
        if not candidate or "," in candidate or len(candidate) > 80:
            return None

        # Strip HTML tags if present
        candidate = re.sub(r"<[^>]*>", " ", candidate)
        # Sanitize query injection characters: quotes, parens, brackets, angle brackets, backticks, semicolons, backslashes
        cleaned = re.sub(r"[()\"'<>`{};\\]", " ", candidate)
        # Strip search operator prefixes like site:, filetype:, inurl:
        cleaned = re.sub(r"\b(site|filetype|inurl|allinurl|link):[^\s]+", " ", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        if not cleaned:
            return None

        return cleaned[:60]

    def build_search_queries(
        self,
        product: str,
        country: Optional[str] = None,
        buyer_type: Optional[str] = None,
        keywords: Optional[Union[str, List[str]]] = None
    ) -> List[str]:
        """
        Focused queries for buyer discovery.
        If user explicitly provides search keywords, those keywords become the PRIMARY SEARCH SUBJECT.
        If keywords are empty/unspecified, falls back to the active catalog product.
        """
        clean_product = (product or "Singing Bowls").strip()
        user_keyword_subject = self._sanitize_search_keywords(keywords)
        search_subject = user_keyword_subject or clean_product

        country_part = ""
        if country and country.lower() not in ["all", "all countries", ""]:
            country_part = country.strip()

        queries: List[str] = []
        for intent in self._intent_phrases(buyer_type)[:3]:
            parts = [search_subject, intent]
            if country_part:
                parts.append(country_part)
            q = self._clean_query_text(" ".join(parts))
            if q and q not in queries:
                queries.append(q)

        return queries[:3]

    def build_search_query(
        self,
        product: str,
        country: Optional[str] = None,
        buyer_type: Optional[str] = None,
        keywords: Optional[Union[str, List[str]]] = None
    ) -> str:
        """Primary query string (first focused query)."""
        queries = self.build_search_queries(product, country, buyer_type, keywords)
        clean_fallback = self._sanitize_search_keywords(keywords) or (product or "Singing Bowls")
        return queries[0] if queries else self._clean_query_text(clean_fallback)

    @staticmethod
    def _canonical_result_key(item: Dict[str, Any]) -> str:
        link = str(item.get("link") or item.get("url") or "").strip()
        parsed = urlparse(link)
        host = (parsed.netloc or "").lower()
        if host.startswith("www."):
            host = host[4:]
        path = (parsed.path or "/").rstrip("/") or "/"
        return f"{host}{path}" if host else link.lower()

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
        Never fabricates demo data or fake buyer records.
        """
        # Reload config in case environment was updated at runtime
        config = get_search_provider_config()
        self.provider = config.get("provider", "serper").lower()
        self.api_key = config.get("api_key", "")
        self.engine_id = config.get("engine_id", "")

        if self.provider not in self.SUPPORTED_PROVIDERS:
            raise UnsupportedSearchProviderError(
                f"Unsupported search provider: {self.provider}. Supported: {', '.join(sorted(self.SUPPORTED_PROVIDERS))}"
            )

        if not self.is_configured():
            if self.provider == "google_cse":
                raise SearchProviderNotConfiguredError(
                    "Search provider is not configured. Add SEARCH_API_KEY and SEARCH_ENGINE_ID in the backend environment."
                )
            raise SearchProviderNotConfiguredError(
                f"Search provider '{self.provider}' is not configured. Add a valid SEARCH_API_KEY in the backend environment."
            )

        queries = self.build_search_queries(product, country, buyer_type, keywords)
        raw_items: List[Dict[str, Any]] = []

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                async def run_provider_query(q: str) -> List[Dict[str, Any]]:
                    if self.provider == "brave":
                        return await self._search_brave(client, q, limit)
                    if self.provider == "tavily":
                        return await self._search_tavily(client, q, limit)
                    if self.provider == "serpapi":
                        return await self._search_serpapi(client, q, limit)
                    if self.provider == "google_cse":
                        return await self._search_google_cse(client, q, limit)
                    return await self._search_serper(client, q, limit)

                seen_keys = set()
                for q in queries:
                    batch = await run_provider_query(q)
                    for item in batch:
                        key = self._canonical_result_key(item)
                        if key and key in seen_keys:
                            continue
                        if key:
                            seen_keys.add(key)
                        raw_items.append(item)
                    if len(raw_items) >= max(limit, 10):
                        break

                if not raw_items:
                    fallback_subject = self._sanitize_search_keywords(keywords) or (product or "Singing Bowls")
                    fallback_query = self._clean_query_text(f"{fallback_subject} wholesale {country or ''}")
                    raw_items = await run_provider_query(fallback_query)

                parsed_items = [parse_search_item(item, country, buyer_type) for item in raw_items]

                enrich_timeout = float(os.getenv("SEARCH_ENRICH_TIMEOUT", "12"))
                enrich_conc = int(os.getenv("SEARCH_ENRICH_CONCURRENCY", "5"))
                sem = asyncio.Semaphore(max(1, min(enrich_conc, 8)))

                async def enrich_item(item):
                    if item.get("email") or not item.get("website"):
                        return item
                    async with sem:
                        try:
                            extra_contact = await asyncio.wait_for(
                                extract_contact_from_public_website(item["website"], client),
                                timeout=6.0
                            )
                            discovered_email = extra_contact.get("email")
                            if discovered_email:
                                item["email"] = discovered_email
                            if extra_contact.get("phone") and not item.get("phone"):
                                item["phone"] = extra_contact["phone"]
                        except Exception:
                            pass
                    return item

                try:
                    cap = min(len(parsed_items), max(limit, 10))
                    await asyncio.wait_for(
                        asyncio.gather(*[enrich_item(item) for item in parsed_items[:cap]]),
                        timeout=max(4.0, enrich_timeout)
                    )
                except (asyncio.TimeoutError, Exception):
                    # Keep parsed rows even if enrichment is slow or incomplete
                    pass


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

    async def _search_serper(self, client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
        """Query Serper.dev Google Search API (Fast, Developer-Friendly, 2,500 Free Queries)."""
        url = "https://google.serper.dev/search"
        headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}
        clean_q = re.sub(r"[()\"']", "", query).strip()
        payload = {"q": clean_q, "num": min(limit, 20)}
        res = await client.post(url, headers=headers, json=payload)
        
        # If query pattern is restricted on free tier, fallback to simplified keywords
        if res.status_code == 400:
            simplified = " ".join([word for word in clean_q.split() if len(word) > 2][:6])
            res = await client.post(url, headers=headers, json={"q": simplified, "num": min(limit, 20)})

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


    async def _search_brave(self, client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
        """Query Brave Search API (Independent Web Index with Free Tier)."""
        url = "https://api.search.brave.com/res/v1/web/search"
        headers = {
            "Accept": "application/json",
            "Accept-Encoding": "gzip",
            "X-Subscription-Token": self.api_key
        }
        params = {"q": query, "count": min(limit, 20)}
        res = await client.get(url, headers=headers, params=params)
        res.raise_for_status()
        data = res.json()
        items = data.get("web", {}).get("results", [])
        return [
            {
                "title": item.get("title", ""),
                "link": item.get("url", ""),
                "snippet": item.get("description", "")
            }
            for item in items
        ]

    async def _search_tavily(self, client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
        """Query Tavily Search API (Dedicated AI Agent Search)."""
        url = "https://api.tavily.com/search"
        payload = {"api_key": self.api_key, "query": query, "max_results": min(limit, 20)}
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

    async def _search_serpapi(self, client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
        """Query SerpAPI."""
        url = "https://serpapi.com/search.json"
        params = {"api_key": self.api_key, "q": query, "num": min(limit, 20), "engine": "google"}
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

    async def _search_google_cse(self, client: httpx.AsyncClient, query: str, limit: int) -> List[Dict[str, Any]]:
        """Query Google Custom Search JSON API (Used if configured)."""
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
