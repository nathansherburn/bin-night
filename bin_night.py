#!/usr/bin/env python3
"""
Monash Council bin collection checker.

Uses the undocumented Monash Council API (reverse engineered from
https://www.monash.vic.gov.au/Waste-Sustainability/Bin-Collection/When-we-collect-your-bins)

Two-step API:
  1. GET https://www.monash.vic.gov.au/api/v1/myarea/search?keywords=<address>
     -> returns JSON with Items[0].Id (geolocation ID)
  2. GET https://www.monash.vic.gov.au/ocapi/Public/myarea/wasteservices?geolocationid=<id>&ocsvclang=en-AU
     -> returns JSON with responseContent (HTML snippet) containing collection dates
"""

import datetime
import sys
import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.monash.vic.gov.au"
DEFAULT_ADDRESS = "2a Donald Street Mount Waverley"


def get_bin_collection(address: str) -> list[dict]:
    session = requests.Session()

    # Step 1: resolve address to a geolocation ID
    r = session.get(
        f"{BASE_URL}/api/v1/myarea/search",
        params={"keywords": address},
    )
    r.raise_for_status()
    data = r.json()

    items = data.get("Items", [])
    if not items:
        raise ValueError(f"No address results found for: {address!r}")

    geoid = items[0]["Id"]

    # Step 2: fetch waste services for that location
    r = session.get(
        f"{BASE_URL}/ocapi/Public/myarea/wasteservices",
        params={"geolocationid": geoid, "ocsvclang": "en-AU"},
    )
    r.raise_for_status()
    html = r.json()["responseContent"]

    # Parse the returned HTML snippet
    soup = BeautifulSoup(html, "html.parser")
    collections = []

    for article in soup.find_all("article"):
        heading = article.find("h3")
        next_service = article.find("div", class_="next-service")
        if not heading or not next_service:
            continue

        waste_type = heading.get_text(strip=True)
        date_str = next_service.get_text(strip=True)
        try:
            date = datetime.datetime.strptime(date_str, "%a %d/%m/%Y").date()
        except ValueError:
            date = None

        collections.append({"type": waste_type, "next_collection": date, "raw": date_str})

    return collections


def notify_message(collections: list[dict]) -> str | None:
    today = datetime.date.today()
    due = [
        c for c in collections
        if c["next_collection"] and (c["next_collection"] - today).days <= 1
    ]
    if not due:
        return None
    types = " + ".join(c["type"] for c in sorted(due, key=lambda x: x["type"]))
    return f"Put out tonight: {types}"


def main():
    notify = "--notify" in sys.argv
    output_json = "--json" in sys.argv
    args = [a for a in sys.argv[1:] if a not in ("--notify", "--json")]
    address = " ".join(args) if args else DEFAULT_ADDRESS

    try:
        collections = get_bin_collection(address)
    except requests.HTTPError as e:
        print(f"HTTP error: {e}", file=sys.stderr)
        sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    if output_json:
        import json
        print(json.dumps({
            "address": address,
            "fetchedAt": datetime.datetime.utcnow().isoformat() + "Z",
            "collections": [
                {
                    "type": c["type"],
                    "nextCollection": c["next_collection"].isoformat() if c["next_collection"] else None,
                    "raw": c["raw"],
                }
                for c in collections
            ],
        }, indent=2))
        return

    if notify:
        msg = notify_message(collections)
        if msg:
            print(msg)
        return

    if not collections:
        print("No collection data returned.")
        return

    today = datetime.date.today()
    print(f"\nBin collection schedule (today is {today.strftime('%a %d/%m/%Y')}):\n")
    for c in sorted(collections, key=lambda x: x["next_collection"] or datetime.date.max):
        days_away = (c["next_collection"] - today).days if c["next_collection"] else None
        when = (
            "TODAY" if days_away == 0
            else "tomorrow" if days_away == 1
            else f"in {days_away} days"
            if days_away is not None else "unknown"
        )
        print(f"  {c['type']:<25} {c['raw']}  ({when})")


if __name__ == "__main__":
    main()
