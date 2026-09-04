import os
import httpx
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("SEARCH_API_KEY")
print(f"API Key: {api_key[:6]}...{api_key[-4:] if api_key else 'None'}")

queries = [
    '"Himalayan Sound Healing Bowls" ("Distributor" OR wholesale OR distributor OR importer) "United States"',
    'Himalayan Sound Healing Bowls wholesale distributor importer "United States"',
    'Himalayan singing bowls wholesale distributor USA',
    'sound healing bowl distributor USA'
]

for q in queries:
    print(f"\n--- Testing query: {q} ---")
    try:
        res = httpx.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
            json={"q": q, "num": 10},
            timeout=10.0
        )
        print(f"Status: {res.status_code}")
        data = res.json()
        organic = data.get("organic", [])
        print(f"Organic results count: {len(organic)}")
        if organic:
            for item in organic[:3]:
                print(" - Title:", item.get("title"))
                print("   Link:", item.get("link"))
    except Exception as e:
        print(f"Error: {e}")
