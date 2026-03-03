#!/usr/bin/env python3
"""Import simple TRREB archive data into Supabase."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import time
import unicodedata
from pathlib import Path

import pdfplumber
import requests


DEFAULT_HPI_DIR = Path("/Volumes/Untitled 2/TRREB HPI INDEX")
DEFAULT_MARKET_WATCH_DIR = Path("/Volumes/Untitled 2/TRREB MARKET WATCH")
DEFAULT_HISTORIC_PDF = Path("/Volumes/Untitled 2/TRREB HISTORIC/TRREB HISTORIC PDF.pdf")
DEFAULT_TAXONOMY_JSON = Path("src/data/trreb-taxonomy.json")

HPI_PROPERTY_TYPES = ["Composite", "Detached", "Semi-Detached", "Townhouse", "Condo Apt"]
MARKET_WATCH_PAGE_TYPE_MAP = {
    "Detached": "Detached",
    "Semi-Detached": "Semi-Detached",
    "Att/Row/Townhouse": "Townhouse",
    "Condo Townhouse": "Townhouse",
    "Condo Apartment": "Condo Apt",
    "Link": "Semi-Detached",
    "Co-Op Apartment": "Condo Apt",
    "Detached Condo": "Detached",
    "Co-Ownership Apartment": "Condo Apt",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hpi-dir", type=Path, default=DEFAULT_HPI_DIR)
    parser.add_argument("--market-watch-dir", type=Path, default=DEFAULT_MARKET_WATCH_DIR)
    parser.add_argument("--historic-pdf", type=Path, default=DEFAULT_HISTORIC_PDF)
    parser.add_argument("--taxonomy-json", type=Path, default=DEFAULT_TAXONOMY_JSON)
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def load_env() -> tuple[str, str]:
    env_path = Path(".env.local")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key, value)

    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        raise RuntimeError("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
    return url.rstrip("/"), key


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    lowered = ascii_value.lower()
    lowered = lowered.replace("&", " and ")
    return re.sub(r"[^a-z0-9]+", "-", lowered).strip("-")


def parse_int(value: str | None) -> int | None:
    if value is None:
        return None
    digits = re.sub(r"[^0-9-]", "", value)
    return int(digits) if digits else None


def parse_decimal(value: str | None) -> float | None:
    if value is None:
        return None
    cleaned = re.sub(r"[^0-9.\-]", "", value)
    if cleaned.count(".") > 1:
        first = cleaned.find(".")
        cleaned = cleaned[: first + 1] + cleaned[first + 1 :].replace(".", "")
    return float(cleaned) if cleaned not in {"", "-", ".", "-."} else None


def infer_report_month(path: Path) -> str:
    match = re.search(r"(\d{4})-(\d{2})", path.name)
    if not match:
        raise ValueError(f"Unable to infer report month from {path}")
    return f"{match.group(1)}-{match.group(2)}"


def report_month_to_period(report_month: str) -> str:
    return f"{report_month}-01"


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def chunked(rows: list[dict], size: int):
    for index in range(0, len(rows), size):
        yield rows[index : index + size]


def dedupe_rows(rows: list[dict], keys: tuple[str, ...]) -> list[dict]:
    deduped: dict[tuple[object, ...], dict] = {}
    for row in rows:
        deduped[tuple(row[key] for key in keys)] = row
    return list(deduped.values())


def load_taxonomy(path: Path) -> tuple[dict[str, dict], dict[str, str], dict[str, dict]]:
    taxonomy = json.loads(path.read_text())

    area_by_id: dict[str, dict] = {}
    area_lookup: dict[str, str] = {}
    for collection in ("zones", "municipalities", "neighborhoods"):
        for record in taxonomy[collection]:
            area_by_id[record["id"]] = record
            for candidate in {
                record["display_name"],
                record["canonical_name"],
                record["source_name"],
                record.get("market_hpi_lookup"),
            }:
                if candidate:
                    area_lookup.setdefault(slugify(candidate), record["id"])

    alias_priority = {"zone": 0, "municipality": 1, "neighborhood": 2}
    for alias in sorted(
        taxonomy["aliases"]["areas"],
        key=lambda record: alias_priority.get(record["entity_type"], 99),
    ):
        area_lookup.setdefault(slugify(alias["alias"]), alias["entity_id"])

    property_type_by_name: dict[str, str] = {}
    property_by_id: dict[str, dict] = {}
    for record in taxonomy["property_types"]["estimate_selectable"]:
        property_by_id[record["id"]] = record
        for candidate in {
            record["display_name"],
            record["canonical_name"],
            record.get("hpi_lookup_name"),
        }:
            if candidate:
                property_type_by_name[slugify(candidate)] = record["id"]

    for alias in taxonomy["aliases"]["property_types"]:
        if alias["entity_id"] not in property_by_id:
            continue
        property_type_by_name[slugify(alias["alias"])] = alias["entity_id"]

    return area_by_id, area_lookup, property_type_by_name


def resolve_area(name: str, area_lookup: dict[str, str], area_by_id: dict[str, dict]) -> str | None:
    area_id = area_lookup.get(slugify(name))
    if not area_id:
        return None
    return area_id


def extract_hpi_rows(
    pdf_path: Path,
    area_lookup: dict[str, str],
    area_by_id: dict[str, dict],
    property_type_by_name: dict[str, str],
) -> list[dict]:
    report_month = infer_report_month(pdf_path)
    period = report_month_to_period(report_month)
    source_hash = file_sha256(pdf_path)
    rows: list[dict] = []
    text = subprocess.run(
        ["pdftotext", "-layout", str(pdf_path), "-"],
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line or "Index Benchmark" in line or "FOCUS ON THE MLS" in line:
            continue
        if line in {"ALL TRREB AREAS", "CITY OF TORONTO"}:
            continue
        tokens = line.split()
        numeric_start = None
        for index, token in enumerate(tokens):
            candidate = token.replace("$", "").replace(",", "").replace("%", "")
            try:
                float(candidate)
                numeric_start = index
                break
            except ValueError:
                continue
        if numeric_start is None or numeric_start == 0:
            continue
        area_name = " ".join(tokens[:numeric_start])
        resolved = resolve_area(area_name, area_lookup, area_by_id)
        if not resolved:
            continue
        numeric_tokens = tokens[numeric_start:]
        for offset in range(0, len(numeric_tokens) // 3):
            property_name = HPI_PROPERTY_TYPES[offset]
            if property_name == "Composite":
                continue
            property_type_id = property_type_by_name.get(slugify(property_name))
            if not property_type_id:
                continue
            hpi_index = parse_decimal(numeric_tokens[offset * 3])
            benchmark_price = parse_decimal(numeric_tokens[offset * 3 + 1])
            if hpi_index is None or benchmark_price is None:
                continue
            rows.append(
                {
                    "period": period,
                    "area_id": resolved,
                    "property_type_id": property_type_id,
                    "hpi_index": hpi_index,
                    "benchmark_price": benchmark_price,
                    "source_doc_id": pdf_path.name,
                    "source_hash": source_hash,
                }
            )
    return rows


def parse_market_watch_property_page(
    page_text: str,
    period: str,
    property_type_id: str,
    source_doc_id: str,
    source_hash: str,
    area_lookup: dict[str, str],
    area_by_id: dict[str, dict],
) -> dict[tuple[str, str, str], dict]:
    aggregates: dict[tuple[str, str, str], dict] = {}
    for raw_line in page_text.splitlines():
        line = re.sub(r"\s+", " ", raw_line.replace("\t", " ")).strip()
        if not line or line.startswith("Toronto Regional Real Estate Board"):
            continue
        if line.startswith("SUMMARY OF EXISTING HOME TRANSACTIONS"):
            continue
        if line in {
            "ALL TRREB AREAS",
            "Sales Dollar Volume Average Price Median Price New Listings Active Listings Avg. SP/LP Avg. LDOM",
        }:
            continue
        if line.startswith("Market Watch, ") or line.startswith("Copyright "):
            continue
        tokens = line.split()
        numeric_start = next((i for i, token in enumerate(tokens) if re.search(r"\d", token)), None)
        if numeric_start is None or numeric_start == 0:
            continue
        area_name = " ".join(tokens[:numeric_start])
        resolved = resolve_area(area_name, area_lookup, area_by_id)
        if not resolved:
            continue
        metrics = tokens[numeric_start:]
        if len(metrics) < 8:
            continue
        sales = parse_int(metrics[0])
        avg_sold_price = parse_decimal(metrics[2])
        new_listings = parse_int(metrics[4])
        active_listings = parse_int(metrics[5])
        dom = parse_decimal(metrics[7])
        if sales is None:
            continue
        key = (period, resolved, property_type_id)
        aggregate = aggregates.setdefault(
            key,
            {
                "period": period,
                "area_id": resolved,
                "property_type_id": property_type_id,
                "sales": 0,
                "new_listings": 0,
                "active_listings": 0,
                "avg_sold_price_weighted": 0.0,
                "dom_weighted": 0.0,
                "source_doc_id": source_doc_id,
                "source_hash": source_hash,
            },
        )
        aggregate["sales"] += sales
        aggregate["new_listings"] += new_listings or 0
        aggregate["active_listings"] += active_listings or 0
        if avg_sold_price is not None:
            aggregate["avg_sold_price_weighted"] += avg_sold_price * sales
        if dom is not None:
            aggregate["dom_weighted"] += dom * sales
    return aggregates


def extract_market_watch_rows(
    pdf_path: Path,
    area_lookup: dict[str, str],
    area_by_id: dict[str, dict],
    property_type_by_name: dict[str, str],
) -> list[dict]:
    report_month = infer_report_month(pdf_path)
    period = report_month_to_period(report_month)
    source_hash = file_sha256(pdf_path)
    aggregates: dict[tuple[str, str, str], dict] = {}
    with pdfplumber.open(pdf_path) as pdf:
        # The normalized region/property-type table only makes sense for the
        # modern 20+ page reports that contain dedicated pages per home type.
        if len(pdf.pages) < 23:
            return []

        for page_index in range(6, min(len(pdf.pages), 23), 2):
            page = pdf.pages[page_index]
            lines = (page.extract_text() or "").splitlines()
            if len(lines) < 2:
                continue
            title = lines[1].strip()
            if "SUMMARY OF EXISTING HOME TRANSACTIONS" not in title:
                continue
            if "City of Toronto Municipal Breakdown" in (lines[2] if len(lines) > 2 else ""):
                continue
            match = re.search(
                r"SUMMARY OF EXISTING HOME TRANSACTIONS (.+), [A-Za-z]+ \d{4}",
                title,
            )
            if not match:
                continue
            source_property = match.group(1).strip()
            canonical_name = MARKET_WATCH_PAGE_TYPE_MAP.get(source_property)
            if not canonical_name:
                continue
            property_type_id = property_type_by_name.get(slugify(canonical_name))
            if not property_type_id:
                continue
            page_aggregates = parse_market_watch_property_page(
                page.extract_text() or "",
                period,
                property_type_id,
                pdf_path.name,
                source_hash,
                area_lookup,
                area_by_id,
            )
            for key, record in page_aggregates.items():
                aggregate = aggregates.setdefault(key, record)
                if aggregate is record:
                    continue
                aggregate["sales"] += record["sales"]
                aggregate["new_listings"] += record["new_listings"]
                aggregate["active_listings"] += record["active_listings"]
                aggregate["avg_sold_price_weighted"] += record["avg_sold_price_weighted"]
                aggregate["dom_weighted"] += record["dom_weighted"]

    rows: list[dict] = []
    for record in aggregates.values():
        sales = record["sales"]
        if sales <= 0:
            continue
        new_listings = record["new_listings"] or None
        active_listings = record["active_listings"] or None
        rows.append(
            {
                "period": record["period"],
                "area_id": record["area_id"],
                "property_type_id": record["property_type_id"],
                "sales": sales,
                "new_listings": new_listings,
                "active_listings": active_listings,
                "avg_sold_price": round(record["avg_sold_price_weighted"] / sales, 2)
                if record["avg_sold_price_weighted"] > 0
                else None,
                "dom": round(record["dom_weighted"] / sales, 2)
                if record["dom_weighted"] > 0
                else None,
                "snlr": round((sales / new_listings) * 100, 2) if new_listings else None,
                "moi": round(active_listings / sales, 2) if active_listings else None,
                "source_doc_id": record["source_doc_id"],
                "source_hash": record["source_hash"],
            }
        )
    return rows


def extract_historic_rows(pdf_path: Path) -> list[dict]:
    text_chunks = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text_chunks.append(page.extract_text() or "")
    text = "\n".join(text_chunks)
    source_hash = file_sha256(pdf_path)
    rows = []
    seen: set[int] = set()
    for year_str, sales_str, price_str in re.findall(
        r"\b(19\d{2}|20\d{2})\s+([\d,]+)\s+\$([\d,]+)",
        text,
    ):
        year = int(year_str)
        if year in seen:
            continue
        seen.add(year)
        rows.append(
            {
                "report_year": year,
                "sales": parse_int(sales_str),
                "avg_price": parse_decimal(price_str),
                "source_doc_id": pdf_path.name,
                "source_hash": source_hash,
            }
        )
    rows.sort(key=lambda row: row["report_year"])
    return rows


class SupabaseRestClient:
    def __init__(self, base_url: str, service_key: str, batch_size: int):
        self.base_url = base_url
        self.headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Connection": "close",
        }
        self.batch_size = batch_size

    def delete_all(self, table: str, filter_column: str) -> None:
        response = requests.delete(
            f"{self.base_url}/rest/v1/{table}",
            params={filter_column: "not.is.null"},
            headers={**self.headers, "Prefer": "return=minimal"},
            timeout=120,
        )
        if response.status_code not in {200, 204}:
            raise RuntimeError(f"Failed to wipe {table}: {response.status_code} {response.text}")

    def upsert(self, table: str, rows: list[dict], on_conflict: str) -> None:
        if not rows:
            return
        batches = list(chunked(rows, self.batch_size))
        total = len(batches)
        for index, batch in enumerate(batches, start=1):
            if index == 1 or index % 25 == 0 or index == total:
                print(f"[Upload {table}] batch {index}/{total}", flush=True)
            attempt = 0
            while True:
                attempt += 1
                try:
                    response = requests.post(
                        f"{self.base_url}/rest/v1/{table}",
                        params={"on_conflict": on_conflict},
                        headers={
                            **self.headers,
                            "Prefer": "resolution=merge-duplicates,return=minimal",
                        },
                        data=json.dumps(batch),
                        timeout=120,
                    )
                except requests.exceptions.RequestException as exc:
                    if attempt >= 5:
                        raise RuntimeError(f"Failed to upsert {table} batch {index}/{total}: {exc}") from exc
                    wait_seconds = attempt * 2
                    print(
                        f"[Upload {table}] batch {index}/{total} retry {attempt}/5 after network error: {exc}",
                        flush=True,
                    )
                    time.sleep(wait_seconds)
                    continue

                if response.status_code in {200, 201, 204}:
                    break

                if response.status_code >= 500 and attempt < 5:
                    wait_seconds = attempt * 2
                    print(
                        f"[Upload {table}] batch {index}/{total} retry {attempt}/5 after {response.status_code}",
                        flush=True,
                    )
                    time.sleep(wait_seconds)
                    continue

                raise RuntimeError(
                    f"Failed to upsert {table} batch {index}/{total}: {response.status_code} {response.text}"
                )


def main() -> None:
    args = parse_args()
    area_by_id, area_lookup, property_type_by_name = load_taxonomy(args.taxonomy_json)

    hpi_files = sorted(args.hpi_dir.glob("*.pdf"))
    market_watch_files = sorted(args.market_watch_dir.glob("*.pdf"))
    if not hpi_files:
        raise RuntimeError(f"No HPI PDFs found in {args.hpi_dir}")
    if not market_watch_files:
        raise RuntimeError(f"No Market Watch PDFs found in {args.market_watch_dir}")

    print(f"HPI PDFs: {len(hpi_files)}", flush=True)
    print(f"Market Watch PDFs: {len(market_watch_files)}", flush=True)
    print(f"Historic PDF: {args.historic_pdf}", flush=True)

    hpi_rows = []
    for index, pdf_path in enumerate(hpi_files, start=1):
        print(f"[HPI {index}/{len(hpi_files)}] {pdf_path.name}", flush=True)
        hpi_rows.extend(
            extract_hpi_rows(pdf_path, area_lookup, area_by_id, property_type_by_name)
        )

    market_watch_rows = []
    for index, pdf_path in enumerate(market_watch_files, start=1):
        print(f"[Market Watch {index}/{len(market_watch_files)}] {pdf_path.name}", flush=True)
        market_watch_rows.extend(
            extract_market_watch_rows(pdf_path, area_lookup, area_by_id, property_type_by_name)
        )

    print("[Historic] Parsing annual PDF", flush=True)
    historic_rows = extract_historic_rows(args.historic_pdf)

    raw_hpi_count = len(hpi_rows)
    raw_market_watch_count = len(market_watch_rows)
    hpi_rows = dedupe_rows(hpi_rows, ("period", "area_id", "property_type_id"))
    market_watch_rows = dedupe_rows(
        market_watch_rows,
        ("period", "area_id", "property_type_id"),
    )

    summary = {
        "market_hpi_rows": len(hpi_rows),
        "market_hpi_rows_removed_as_duplicates": raw_hpi_count - len(hpi_rows),
        "market_watch_monthly_rows": len(market_watch_rows),
        "market_watch_rows_removed_as_duplicates": raw_market_watch_count - len(market_watch_rows),
        "historic_annual_rows": len(historic_rows),
        "hpi_months": len({row["period"] for row in hpi_rows}),
        "market_watch_months": len({row["period"] for row in market_watch_rows}),
    }
    print(json.dumps(summary, indent=2))

    if not args.apply:
        return

    print("Applying to Supabase...", flush=True)
    base_url, service_key = load_env()
    client = SupabaseRestClient(base_url, service_key, args.batch_size)
    print("Clearing existing rows...", flush=True)
    client.delete_all("market_hpi", "period")
    client.delete_all("market_watch_monthly", "period")
    client.delete_all("trreb_historic_annual", "report_year")

    print("Uploading market_hpi...", flush=True)
    client.upsert("market_hpi", hpi_rows, "period,area_id,property_type_id")
    print("Uploading market_watch_monthly...", flush=True)
    client.upsert("market_watch_monthly", market_watch_rows, "period,area_id,property_type_id")
    print("Uploading trreb_historic_annual...", flush=True)
    client.upsert("trreb_historic_annual", historic_rows, "report_year")
    print("Import complete.", flush=True)


if __name__ == "__main__":
    main()
