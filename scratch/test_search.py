import os, sys, httpx, asyncio
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))
load_dotenv(ROOT / ".env")

async def test_search():
    from search.web_search_provider import WebBuyerSearchProvider
    provider = WebBuyerSearchProvider()
    results = await provider.search(
        product="Himalayan Sound Healing Bowls",
        country="Germany",
        buyer_type="Wholesale Importer",
        limit=10
    )
    print(f"\nTotal Germany results returned: {len(results)}")
    for i, r in enumerate(results, 1):
        print(f"{i}. Company: {r.get('company_name')} | Email: {r.get('email')} | Status: {r.get('email_status')} | Website: {r.get('website')}")

asyncio.run(test_search())
