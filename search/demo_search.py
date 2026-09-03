"""
Search Module with Source-Adapter Architecture.
Provides demo search adapters for Google, LinkedIn, and Trade Directories.
"""
from typing import List, Dict, Any

class BaseSearchAdapter:
    """Base interface for all lead discovery source adapters."""
    def __init__(self, source_name: str):
        self.source_name = source_name

    def search(self, keyword: str, limit: int = 5) -> List[Dict[str, str]]:
        raise NotImplementedError("Source adapters must implement search method.")

class GoogleSearchAdapter(BaseSearchAdapter):
    def __init__(self):
        super().__init__("Google")

    def search(self, keyword: str, limit: int = 5) -> List[Dict[str, str]]:
        # Demo leads discovered via Google search
        demo_leads = [
            {
                "buyer_name": "Sarah Miller",
                "company_name": "Himalayan Wellness LLC",
                "email": "sarah@himalayanwellness.example",
                "website": "https://himalayanwellness.example",
                "country": "USA",
                "source_platform": "Google"
            },
            {
                "buyer_name": "Marcus Vance",
                "company_name": "Yoga & Meditation Studio",
                "email": "marcus@yogavibrations.example",
                "website": "https://yogavibrations.example",
                "country": "Canada",
                "source_platform": "Google"
            },
            {
                "buyer_name": "Emily Thorne",
                "company_name": "",
                "email": "emily.thorne@gmail.example",
                "website": "",
                "country": "USA",
                "source_platform": "Google"
            }
        ]
        return demo_leads[:limit]

class LinkedInSearchAdapter(BaseSearchAdapter):
    def __init__(self):
        super().__init__("LinkedIn")

    def search(self, keyword: str, limit: int = 5) -> List[Dict[str, str]]:
        demo_leads = [
            {
                "buyer_name": "David Kumar",
                "company_name": "Zen Imports UK",
                "email": "david@zenimports.example",
                "website": "https://zenimports.example",
                "country": "UK",
                "source_platform": "LinkedIn"
            },
            {
                "buyer_name": "John Smith",
                "company_name": "Global Crafts Wholesalers",
                "email": "john@globalcrafts.example",
                "website": "https://globalcrafts.example",
                "country": "Australia",
                "source_platform": "LinkedIn"
            },
            {
                "buyer_name": "Lisa Chang",
                "company_name": "",
                "email": "lisa.chang@mindfulspirit.example",
                "website": "",
                "country": "Singapore",
                "source_platform": "LinkedIn"
            }
        ]
        return demo_leads[:limit]

class DirectorySearchAdapter(BaseSearchAdapter):
    def __init__(self):
        super().__init__("Directory")

    def search(self, keyword: str, limit: int = 5) -> List[Dict[str, str]]:
        demo_leads = [
            {
                "buyer_name": "Elena Rostova",
                "company_name": "Sound Bath Healing Sanctuary",
                "email": "elena@soundbathhealing.example",
                "website": "https://soundbathhealing.example",
                "country": "Germany",
                "source_platform": "Directory"
            },
            {
                "buyer_name": "Robert Taylor",
                "company_name": "Alpine Sound Importers",
                "email": "robert@alpinesound.example",
                "website": "https://alpinesound.example",
                "country": "Switzerland",
                "source_platform": "Directory"
            }
        ]
        return demo_leads[:limit]

class LeadSearchManager:
    """Orchestrates multi-source search across active adapters."""
    def __init__(self):
        self.adapters = [
            GoogleSearchAdapter(),
            LinkedInSearchAdapter(),
            DirectorySearchAdapter()
        ]

    def discover_leads(self, keyword: str = "Singing Bowls", limit_per_source: int = 5) -> List[Dict[str, str]]:
        results = []
        for adapter in self.adapters:
            try:
                leads = adapter.search(keyword, limit=limit_per_source)
                results.extend(leads)
            except Exception as e:
                print(f"Error executing search on {adapter.source_name}: {e}")
        return results
