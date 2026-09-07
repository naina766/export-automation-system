# -*- coding: utf-8 -*-
"""
Read-only live-search pipeline audit. Does not modify production code or buyers.csv.
Never prints API keys.
"""
import os
import sys
import re
import asyncio
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env", override=True)

import httpx
import pandas as pd

from backend.search.web_search_provider import WebBuyerSearchProvider
from backend.search.parser import parse_search_item, extract_contact_from_public_website
from backend.search.normalizer import normalize_lead_batch


def domain_of(url: str) -> str:
    parsed = urlparse(url or "")
    d = (parsed.netloc or "").lower()
    if d.startswith("www."):
        d = d[4:]
    return d


async def serper_organic(client, api_key, query, num):
    url = "https://google.serper.dev/search"
    headers = {"X-API-KEY": api_key, "Content-Type": "application/json"}
    clean_q = re.sub(r"[()\"']", "", query).strip()
    payload = {"q": clean_q, "num": min(num, 20)}
    res = await client.post(url, headers=headers, json=payload)
    status = res.status_code
    simplified = None
    if res.status_code == 400:
        simplified = " ".join([word for word in clean_q.split() if len(word) > 2][:6])
        res = await client.post(url, headers=headers, json={"q": simplified, "num": min(num, 20)})
        status = res.status_code
    res.raise_for_status()
    data = res.json()
    organic = data.get("organic", []) or []
    items = [
        {"title": item.get("title", ""), "link": item.get("link", ""), "snippet": item.get("snippet", "")}
        for item in organic
    ]
    return {
        "status": status,
        "requested_num": payload["num"],
        "query_used": simplified or clean_q,
        "simplified_fallback": simplified,
        "organic_count": len(organic),
        "items": items,
        "knowledge_graph": bool(data.get("knowledgeGraph")),
        "answer_box": bool(data.get("answerBox")),
        "top_keys": sorted(list(data.keys())),
    }


async def enrich_like_production(parsed_items, limit, client):
    attempted = 0
    successful = 0

    async def enrich_item(item):
        nonlocal attempted, successful
        if not item.get("email") and item.get("website"):
            attempted += 1
            try:
                extra_contact = await extract_contact_from_public_website(item["website"], client)
                if extra_contact.get("email"):
                    item["email"] = extra_contact["email"]
                    successful += 1
                if extra_contact.get("phone") and not item.get("phone"):
                    item["phone"] = extra_contact["phone"]
            except Exception:
                pass
        return item

    after = [dict(x) for x in parsed_items]
    try:
        cap = min(limit, 10)
        tasks = [enrich_item(item) for item in after[:cap]]
        enriched = await asyncio.wait_for(asyncio.gather(*tasks), timeout=3.5)
        after = list(enriched) + after[cap:]
        timed_out = False
    except (asyncio.TimeoutError, Exception):
        timed_out = True
    return after, attempted, successful, timed_out


def report_dedup_removals(parsed_items, provider_source, product_id):
    """Replicate normalize_lead_batch seen_keys logic and record removals."""
    from backend.search.normalizer import normalize_lead

    kept = []
    removed = []
    seen_keys = set()
    for item in parsed_items:
        norm = normalize_lead(item, provider_source=provider_source, product_id=product_id)
        domain = norm.get("website", "").lower().strip()
        email = norm.get("email")
        comp = norm.get("company_name", "").lower().strip()
        key = domain if domain else (email if email else comp)
        if key and key in seen_keys:
            existing = next((k for k in kept if (
                (k.get("website", "").lower().strip() or k.get("email") or k.get("company_name", "").lower().strip()) == key
            )), None)
            removed.append({
                "removed_company": norm.get("company_name"),
                "removed_domain": domain,
                "removed_email": email,
                "existing_company": existing.get("company_name") if existing else None,
                "existing_domain": existing.get("website") if existing else None,
                "reason": f"in-batch key collision on '{key}' (domain preferred, else email, else company)",
            })
            continue
        if key:
            seen_keys.add(key)
        kept.append(norm)
    return kept, removed


async def diagnose_query(label, query, limit, country, buyer_type, product_id, do_enrich):
    api_key = os.getenv("SEARCH_API_KEY", "").strip()
    print("\n" + "=" * 72)
    print(f"CASE: {label}")
    print(f"QUERY: {query}")
    print(f"LIMIT: {limit}  ENRICH: {do_enrich}")
    print("=" * 72)

    async with httpx.AsyncClient(timeout=20.0) as client:
        serper = await serper_organic(client, api_key, query, limit)
        print(f"Serper HTTP status: {serper['status']}")
        print(f"Serper requested num: {serper['requested_num']}")
        print(f"Query actually sent: {serper['query_used']}")
        print(f"400 simplified fallback used: {bool(serper['simplified_fallback'])}")
        print(f"Serper response keys: {serper['top_keys']}")
        print(f"Serper raw organic result count: {serper['organic_count']}")
        print(f"knowledgeGraph present: {serper['knowledge_graph']}  answerBox present: {serper['answer_box']}")

        for i, item in enumerate(serper["items"], 1):
            title = (item.get("title") or "").encode("ascii", "replace").decode("ascii")
            snippet = (item.get("snippet") or "")[:240].encode("ascii", "replace").decode("ascii")
            print(f"\n{i}. title: {title}")
            print(f"   URL: {item['link']}")
            print(f"   snippet: {snippet}")

        raw_items = serper["items"]
        parsed_items = [parse_search_item(item, country, buyer_type) for item in raw_items]
        parsed_with_email = sum(1 for p in parsed_items if p.get("email"))
        print(f"\nParsed results: {len(parsed_items)} (emails in snippet: {parsed_with_email})")
        print("Parser did not drop items for missing email." if len(parsed_items) == len(raw_items) else "PARSER DROPPED ITEMS")

        if do_enrich:
            after_enrich, attempted, successful, timed_out = await enrich_like_production(parsed_items, limit, client)
            print(f"Enrichment attempted: {attempted}")
            print(f"Enrichment successful (found email): {successful}")
            print(f"Enrichment wait_for timed out / exception: {timed_out}")
            print(f"Final after enrichment list length: {len(after_enrich)}")
        else:
            after_enrich = parsed_items
            attempted = successful = 0
            timed_out = False
            print("Enrichment skipped for this case.")

        unique_domains = sorted({domain_of(p.get("website") or p.get("source_url") or "") for p in after_enrich if (p.get("website") or p.get("source_url"))})
        print(f"Unique domains after parse/enrich: {len(unique_domains)}")
        for d in unique_domains:
            print(f"  - {d}")

        kept, removed = report_dedup_removals(after_enrich, "serper", product_id)
        print(f"\nBefore normalization/dedup: {len(after_enrich)}")
        print(f"After normalize_lead_batch equivalent: {len(kept)}")
        print(f"Removed as in-batch duplicates: {len(removed)}")
        for r in removed:
            rc = str(r["removed_company"] or "").encode("ascii", "replace").decode("ascii")
            ec = str(r["existing_company"] or "").encode("ascii", "replace").decode("ascii")
            print(f"  Removed company: {rc}")
            print(f"  Removed domain: {r['removed_domain']}")
            print(f"  Existing company: {ec}")
            print(f"  Existing domain: {r['existing_domain']}")
            print(f"  Reason: {r['reason']}")
            print()

        sliced = kept[:limit]
        valid = [l for l in sliced if l.get("email") and (l.get("email_status") == "valid" or l.get("syntax_valid") is True) and not l.get("is_duplicate")]
        missing = [l for l in sliced if not l.get("email") or l.get("email_status") == "missing"]
        invalid = [l for l in sliced if l.get("email") and (l.get("email_status") == "invalid" or l.get("syntax_valid") is False)]
        print(f"After [:limit] slice ({limit}): {len(sliced)}")
        print(f"Valid email: {len(valid)}  Missing email: {len(missing)}  Invalid email: {len(invalid)}")
        for i, l in enumerate(sliced, 1):
            name = str(l.get("company_name") or "").encode("ascii", "replace").decode("ascii")
            print(f"  {i}. {name} | {l.get('website')} | email={l.get('email')} | status={l.get('email_status')}")

        return {
            "label": label,
            "query": query,
            "raw": serper["organic_count"],
            "parsed": len(parsed_items),
            "unique_domains": len(unique_domains),
            "normalized": len(kept),
            "after_limit": len(sliced),
            "valid": len(valid),
            "missing": len(missing),
            "invalid": len(invalid),
            "removed": removed,
            "enrich_attempted": attempted,
            "enrich_success": successful,
        }


def analyze_buyers_csv(product_id):
    path = ROOT / "data" / "buyers.csv"
    print("\n" + "=" * 72)
    print("BUYERS.CSV AUDIT (read-only)")
    print("=" * 72)
    df = pd.read_csv(path, dtype=str, encoding="utf-8").fillna("")
    print(f"Total records (all products): {len(df)}")
    if "product_id" in df.columns:
        sub = df[df["product_id"] == product_id]
    else:
        sub = df
    print(f"Records for product_id={product_id}: {len(sub)}")

    def nonempty(s):
        return s.astype(str).str.strip().ne("") & ~s.astype(str).str.lower().isin(["none", "null", "nan"])

    email_col = sub["email"] if "email" in sub.columns else pd.Series([""] * len(sub))
    status_col = sub["email_status"].str.lower() if "email_status" in sub.columns else pd.Series([""] * len(sub))
    syntax_col = sub["syntax_valid"].astype(str).str.lower() if "syntax_valid" in sub.columns else pd.Series([""] * len(sub))
    dup_col = sub["is_duplicate"].astype(str).str.lower() if "is_duplicate" in sub.columns else pd.Series(["false"] * len(sub))

    has_email = nonempty(email_col)
    missing = (~has_email) | (status_col == "missing")
    valid = has_email & ((status_col == "valid") | (syntax_col == "true")) & (dup_col != "true")
    invalid = has_email & ((status_col == "invalid") | (syntax_col == "false"))
    dups = dup_col == "true"

    print(f"Valid email: {int(valid.sum())}")
    print(f"Missing email: {int(missing.sum())}")
    print(f"Invalid email: {int(invalid.sum())}")
    print(f"Duplicates flagged: {int(dups.sum())}")
    if "company_name" in sub.columns:
        print("Sample companies:")
        for _, row in sub.head(15).iterrows():
            print(f"  - {row.get('company_name') or row.get('company')} | {row.get('email')} | {row.get('email_status')} | {row.get('website')}")


async def main():
    key = os.getenv("SEARCH_API_KEY", "").strip()
    if not key or key.lower().startswith("your_"):
        print("SEARCH_API_KEY is not configured; cannot call Serper.")
        return
    print(f"SEARCH_PROVIDER={os.getenv('SEARCH_PROVIDER', 'serper')}")
    print(f"SEARCH_API_KEY present: True (length={len(key)})")

    provider = WebBuyerSearchProvider()
    product = "Himalayan Sound Healing Bowls"
    product_id = "himalayan-sound-healing-bowls"
    limit = 25

    # Payload after ProductContext hydrates catalog defaults
    catalog_country = "United States"
    catalog_buyer_type = "Wholesale Importer"
    catalog_keywords = "Himalayan sound healing bowls, sound healing bowls wholesale, Tibetan singing bowls importer, meditation bowls distributor"
    q_catalog = provider.build_search_query(product, catalog_country, catalog_buyer_type, catalog_keywords)
    print("\nFRONTEND (after product catalog hydrate) generated query:")
    print(repr(q_catalog))

    # Payload from DiscoverBuyers.jsx useState defaults before/if catalog not applied
    default_country = "United States"
    default_buyer_type = "Distributor"
    default_keywords = "sound healing, meditation, wellness, singing bowls"
    q_default = provider.build_search_query(product, default_country, default_buyer_type, default_keywords)
    print("FRONTEND (jsx initial useState defaults) generated query:")
    print(repr(q_default))

    main_result = await diagnose_query(
        "A. Catalog-hydrated Discover Buyers payload (most likely live UI)",
        q_catalog,
        limit,
        catalog_country,
        catalog_buyer_type,
        product_id,
        do_enrich=True,
    )

    await diagnose_query(
        "B. JSX initial defaults (Distributor + short keywords)",
        q_default,
        limit,
        default_country,
        default_buyer_type,
        product_id,
        do_enrich=False,
    )

    broader = [
        "Himalayan Sound Healing Bowls",
        "Himalayan Sound Healing Bowls wholesale",
        "Himalayan Sound Healing Bowls distributor",
        "Himalayan Sound Healing Bowls importer",
        "Himalayan Sound Healing Bowls United States",
        "Himalayan Sound Healing Bowls wholesale distributor United States",
    ]
    print("\n" + "#" * 72)
    print("STEP 11 - CONTROLLED BROADER QUERIES (no website enrichment)")
    print("#" * 72)
    rows = [main_result]
    for q in broader:
        rows.append(await diagnose_query(
            f"Broader: {q}",
            q,
            10,
            "United States",
            "Distributor",
            product_id,
            do_enrich=False,
        ))

    print("\n" + "=" * 72)
    print("CONTROLLED QUERY SUMMARY")
    print("=" * 72)
    print(f"{'Query':<70} {'Raw':>4} {'Dom':>4} {'Norm':>5}")
    for r in rows:
        print(f"{r['query'][:70]:<70} {r['raw']:>4} {r['unique_domains']:>4} {r['normalized']:>5}")

    analyze_buyers_csv(product_id)


if __name__ == "__main__":
    asyncio.run(main())
