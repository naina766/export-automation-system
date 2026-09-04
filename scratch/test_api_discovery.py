import httpx

try:
    res = httpx.get("http://localhost:8000/api/health", timeout=5.0)
    print("Health Status:", res.status_code, res.json())
except Exception as e:
    print("Health Error:", e)

try:
    payload = {
        "product": "Himalayan Sound Healing Bowls",
        "country": "United States",
        "buyer_type": "Distributor",
        "keywords": "sound healing, meditation",
        "limit": 10,
        "auto_ingest": True
    }
    res = httpx.post("http://localhost:8000/api/discovery", json=payload, timeout=25.0)
    print("Discovery Status:", res.status_code)
    print("Discovery Response:", res.json())
except Exception as e:
    print("Discovery Request Error:", e)
