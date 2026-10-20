"""Chile's slice of Photon's planet dump, slimmed for the address field.

    curl -s https://download1.graphhopper.com/public/photon-dump-planet-1.0-latest.jsonl.zst \
      | zstd -dc | python3 extract.py > cl.jsonl

The dump is sorted by country, so reading stops right after Chile's block. Keeps what the form
searches (streets and addresses/places: `house` and `street`), as a point, with names in Spanish
only, and drops the places no commune can be derived for (the form needs one) and the communes
too small to be a place anybody holds an event in (typos, hamlets). ~10 GB of raw Chile becomes
~720 MB of JSON and a ~350 MB index.
"""
import collections
import json
import re
import sys

MIN_DOCS_PER_COMMUNE = 20
NAMES = ("name", "name:es", "alt_name", "old_name", "short_name", "official_name")
TRANSLATED = re.compile(r"^(.*):[a-z]{2,3}(-[A-Za-z]+)?$")


def commune(address):
    # The same rule as communeOf in app/frontend/components/events/address-input.tsx.
    city, district = address.get("city"), address.get("district")
    return (district or city) if city == "Santiago" else (city or district)


def place(doc):
    content = doc["content"]
    return content[0] if isinstance(content, list) else content


def slim(doc):
    p = place(doc)
    if p.get("address_type") not in ("house", "street"):
        return None
    address = p.get("address", {})
    p["name"] = {k: v for k, v in p.get("name", {}).items() if k in NAMES}
    p["address"] = {k: v for k, v in address.items() if not TRANSLATED.match(k) or k in ("city:es", "state:es")}
    for key in ("extra", "bbox"):
        p.pop(key, None)
    p["geometry"] = {"type": "Point", "coordinates": p["centroid"]}
    return doc


header, kept, count = [], [], collections.Counter()
seen, misses = False, 0
for index, line in enumerate(sys.stdin):
    if index < 2:
        header.append(line)
        continue
    if '"country_code":"cl"' not in line:
        misses += seen
        if misses > 50:
            break
        continue
    seen, misses = True, 0
    doc = slim(json.loads(line))
    if doc:
        kept.append(doc)
        if (c := commune(place(doc)["address"])):
            count[c] += 1

out = sys.stdout
out.writelines(header)
for doc in kept:
    p = place(doc)
    if count[commune(p["address"])] >= MIN_DOCS_PER_COMMUNE and (p.get("name") or p.get("housenumber")):
        out.write(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n")
