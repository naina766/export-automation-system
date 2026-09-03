"""
Search Module with Source-Adapter Architecture.
Provides modular demo search adapters simulating Google, LinkedIn, and Directory lead discovery.
"""
from typing import List, Dict, Any

class BaseSearchAdapter:
    """Base interface for lead discovery source adapters."""
    def __init__(self, source_name: str):
        self.source_name = source_name

    def search(self, keyword: str, limit: int = 5) -> List[Dict[str, str]]:
        raise NotImplementedError("Source adapters must implement search method.")

class GoogleSearchAdapter(BaseSearchAdapter):
    def __init__(self):
        super().__init__("Google")

    def search(self, keyword: str, limit: int = 5) -> List[Dict[str, str]]:
        demo_leads = [
            {
                "name": "Sarah Miller",
                "company": "Himalayan Wellness LLC",
                "email": "sarah@himalayanwellness.example",
                "website": "https://himalayanwellness.example",
                "country": "USA",
                "source": "Google",
                "category": "Wholesale Importer"
            },
            {
                "name": "Marcus Vance",
                "company": "Yoga & Sound Sanctuary",
                "email": "marcus@yogavibrations.example",
                "website": "https://yogavibrations.example",
                "country": "Canada",
                "source": "Google",
                "category": "Meditation Studio"
            },
            {
                "name": "Emily Thorne",
                "company": "",
                "email": "emily.thorne@gmail.example",
                "website": "",
                "country": "USA",
                "source": "Google",
                "category": "Personal Collector"
            }
        ]
        return demo_leads[:limit]

class LinkedInSearchAdapter(BaseSearchAdapter):
    def __init__(self):
        super().__init__("LinkedIn")

    def search(self, keyword: str, limit: int = 5) -> List[Dict[str, str]]:
        demo_leads = [
            {
                "name": "David Kumar",
                "company": "Zen Imports UK",
                "email": "david@zenimports.example",
                "website": "https://zenimports.example",
                "country": "UK",
                "source": "LinkedIn",
                "category": "B2B Distributor"
            },
            {
                "name": "John Smith",
                "company": "Global Crafts Wholesalers",
                "email": "john@globalcrafts.example",
                "website": "https://globalcrafts.example",
                "country": "Australia",
                "source": "LinkedIn",
                "category": "Crafts Trading"
            },
            {
                "name": "Lisa Chang",
                "company": "",
                "email": "lisa.chang@mindfulspirit.example",
                "website": "",
                "country": "Singapore",
                "source": "LinkedIn",
                "category": "Individual Practitioner"
            }
        ]
        return demo_leads[:limit]

class DirectorySearchAdapter(BaseSearchAdapter):
    def __init__(self):
        super().__init__("Directory")

    def search(self, keyword: str, limit: int = 5) -> List[Dict[str, str]]:
        demo_leads = [
            {
                "name": "Elena Rostova",
                "company": "Sound Bath Healing GMBH",
                "email": "elena@soundbathhealing.example",
                "website": "https://soundbathhealing.example",
                "country": "Germany",
                "source": "Directory",
                "category": "Acoustic Therapy Center"
            },
            {
                "name": "Robert Taylor",
                "company": "Alpine Sound Importers",
                "email": "robert@alpinesound.example",
                "website": "https://alpinesound.example",
                "country": "Switzerland",
                "source": "Directory",
                "category": "Import/Export Trading"
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
