"""
Abstract Base Class for Buyer Search Providers.
Defines the contract for external search integrations (Google CSE, Serper, SerpAPI, Tavily).
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, Union

class BuyerSearchProvider(ABC):
    """Abstract interface for all live B2B buyer discovery search providers."""
    
    @abstractmethod
    def build_search_query(
        self,
        product: str,
        country: Optional[str] = None,
        buyer_type: Optional[str] = None,
        keywords: Optional[Union[str, List[str]]] = None
    ) -> str:
        """Construct an optimized B2B query string from parameters."""
        pass

    @abstractmethod
    async def search(
        self,
        product: str,
        country: Optional[str] = None,
        buyer_type: Optional[str] = None,
        keywords: Optional[Union[str, List[str]]] = None,
        limit: int = 10,
        product_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute search query against external provider API and return normalized buyer records.
        """
        pass
