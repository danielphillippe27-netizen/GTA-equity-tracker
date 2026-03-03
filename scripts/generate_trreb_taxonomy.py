#!/usr/bin/env python3
"""Generate TRREB area/property taxonomy JSON and Supabase seed SQL."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import pdfplumber

try:
    import camelot
except ImportError:  # pragma: no cover - optional at runtime
    camelot = None


DEFAULT_HPI_PDF = Path(
    "/Users/danielphillippe/Desktop/Feb 27th/TRREB_MLS_HPI_Benchmark_Summary_Report_0126.pdf"
)
DEFAULT_MARKET_WATCH_PDF = Path("/Users/danielphillippe/Desktop/Feb 27th/mw2601.pdf")
DEFAULT_MARKET_WATCH_ARCHIVE = Path("/Volumes/Untitled 2/TRREB MARKET WATCH")
DEFAULT_JSON_OUT = Path("src/data/trreb-taxonomy.json")
DEFAULT_SQL_OUT = Path("supabase/seeds/trreb_taxonomy_seed.sql")


ZONE_DISPLAY_NAMES = {
    "Dufferin": "Dufferin County",
    "Durham": "Durham Region",
    "Halton": "Halton Region",
    "Peel": "Peel Region",
    "Simcoe": "Simcoe County",
    "Toronto": "City of Toronto",
    "York": "York Region",
}

MUNICIPALITY_DISPLAY_NAMES = {
    "Bradford": "Bradford West Gwillimbury",
    "Stouffville": "Whitchurch-Stouffville",
}

MUNICIPALITY_MARKET_HPI_LOOKUPS = {
    "Bradford West Gwillimbury": "Bradford",
    "Whitchurch-Stouffville": "Stouffville",
}

MARKET_WATCH_PATTERNS = [
    "Detached",
    "Semi-Detached",
    "Townhouse",
    "Att/Row/Twnhouse",
    "Att/Row/Townhouse",
    "Condo Townhouse",
    "Condo Apt",
    "Condo Apartment",
    "Link",
    "Det Condo",
    "Detached Condo",
    "Co-op Apt",
]

MARKET_WATCH_MAPPINGS = [
    ("Detached", "Detached", "Detached", None),
    ("Semi-Detached", "Semi-Detached", "Semi-Detached", None),
    ("Townhouse", "Townhouse", "Townhouse", None),
    (
        "Att/Row/Twnhouse",
        "Townhouse",
        "Townhouse",
        "Collapsed into Townhouse to match the regional HPI dataset.",
    ),
    (
        "Att/Row/Townhouse",
        "Townhouse",
        "Townhouse",
        "Spelling variant used in later Market Watch files.",
    ),
    (
        "Condo Townhouse",
        "Townhouse",
        "Townhouse",
        "Collapsed into Townhouse because the regional HPI table has no separate condo-townhouse series.",
    ),
    ("Condo Apt", "Condo Apt", "Condo Apt", None),
    ("Condo Apartment", "Condo Apt", "Condo Apt", "Display-name variant of Condo Apt."),
    (
        "Co-op Apt",
        "Condo Apt",
        "Condo Apt",
        "Best-fit proxy because the regional HPI table does not separate co-ops.",
    ),
    (
        "Link",
        "Semi-Detached",
        "Semi-Detached",
        "Closest HPI proxy because the regional HPI table has no Link series.",
    ),
    (
        "Det Condo",
        "Detached",
        "Detached",
        "Collapsed into Detached because the regional HPI table has no detached-condo series.",
    ),
    ("Detached Condo", "Detached", "Detached", "Spelling variant of Det Condo."),
]

HPI_STYLE_PROXY_MAP = {
    "1 Storey": (
        "Detached",
        "Detached-style HPI summary bucket; proxied into Detached for regional HPI lookups.",
    ),
    "1 Storey Attached": (
        "Semi-Detached",
        "Attached-style HPI summary bucket; proxied into Semi-Detached for regional HPI lookups.",
    ),
    "1 Storey Detached": ("Detached", None),
    "2 Storey": (
        "Detached",
        "Detached-style HPI summary bucket; proxied into Detached for regional HPI lookups.",
    ),
    "2 Storey Attached": (
        "Semi-Detached",
        "Attached-style HPI summary bucket; proxied into Semi-Detached for regional HPI lookups.",
    ),
    "2 Storey Detached": ("Detached", None),
    "Apartment": ("Condo Apt", None),
    "Composite": (
        None,
        "Cross-type aggregate benchmark; keep for reporting but do not expose as a selectable user property type.",
    ),
    "Single Family": (
        "Detached",
        "Best-fit proxy because the regional HPI dataset uses Detached rather than Single Family.",
    ),
    "Single Family Attached": (
        "Semi-Detached",
        "Attached single-family bucket; proxied into Semi-Detached for regional HPI lookups.",
    ),
    "Single Family Detached": ("Detached", None),
    "Townhouse": ("Townhouse", None),
}


STYLE_RE = re.compile(r"^\s*(.+?)\s{2,}Benchmark\s+Index\s*$")
ZONE_RE = re.compile(r"^\s{2}Zone:\s*(.+?)\s{2,}[\d,]")
MUNI_RE = re.compile(r"^\s{2}Municipality:\s*(.+?)\s{2,}[\d,]")
HOOD_RE = re.compile(r"^\s{4}(.+?)\s{2,}[\d,]")
TORONTO_CODE_RE = re.compile(r"^Toronto [CEW]\d{2}$")
VALUE_ROW_RE = re.compile(r"^(?P<label>.+?)\s+\$?[-\d,]+(?:\.\d+)?(?:\s+[-\d.,%]+.*)?$")
HPI_STYLE_NAMES = set(HPI_STYLE_PROXY_MAP.keys())
SKIP_HPI_LABELS = {
    "Benchmark Index",
    "Price (HPI)",
    "% Changes",
    "One Month",
    "Three Months",
    "Six Months",
    "One Year",
    "Three Years",
    "Five Years",
    "Ten Years",
    "Page",
}


def normalize_pdf_line(line: str) -> str:
    return re.sub(r"\s+", " ", line).strip()


def extract_pdf_lines_pdfplumber(pdf_path: Path, max_pages: int | None = None) -> list[list[str]]:
    pages: list[list[str]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages[:max_pages]:
            text = page.extract_text(x_tolerance=2, y_tolerance=3) or ""
            pages.append(
                [normalized for line in text.splitlines() if (normalized := normalize_pdf_line(line))]
            )
    return pages


def extract_label_from_value_row(line: str) -> str | None:
    match = VALUE_ROW_RE.match(line)
    if not match:
        return None

    label = normalize_pdf_line(match.group("label"))
    if label in SKIP_HPI_LABELS or label.startswith("Page "):
        return None

    return label


def extract_prefixed_label(line: str, prefix: str) -> str | None:
    if not line.startswith(prefix):
        return None

    label = line[len(prefix) :].strip()
    return extract_label_from_value_row(label) or label


def extract_market_watch_text_pdfplumber(pdf_path: Path, max_pages: int = 3) -> str:
    return "\n".join("\n".join(page_lines) for page_lines in extract_pdf_lines_pdfplumber(pdf_path, max_pages))


def extract_market_watch_text_camelot(pdf_path: Path, pages: str = "1-3") -> str:
    if camelot is None:
        return ""

    try:
        tables = camelot.read_pdf(str(pdf_path), pages=pages, flavor="lattice")
    except Exception:
        return ""

    table_blocks = []
    for table in tables:
        rows = []
        for row in table.df.fillna("").values.tolist():
            cleaned = [normalize_pdf_line(str(cell).replace("\n", " ")) for cell in row]
            cleaned = [cell for cell in cleaned if cell]
            if cleaned:
                rows.append(" ".join(cleaned))
        if rows:
            table_blocks.append("\n".join(rows))

    return "\n\n".join(table_blocks)


def sql_quote(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def json_sql(value: dict) -> str:
    return sql_quote(json.dumps(value, separators=(",", ":"), sort_keys=True)) + "::jsonb"


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    normalized = normalized.lower()
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized).strip("-")
    return normalized


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def infer_report_month(path: Path) -> str:
    name = path.name
    hpi_match = re.search(r"_(\d{2})(\d{2})\.pdf$", name)
    if hpi_match:
        mm, yy = hpi_match.group(1), hpi_match.group(2)
        return f"{2000 + int(yy):04d}-{int(mm):02d}"

    mw_match = re.search(r"mw(\d{2})(\d{2})\.pdf$", name)
    if mw_match:
        yy, mm = int(mw_match.group(1)), int(mw_match.group(2))
        year = 1900 + yy if yy >= 90 else 2000 + yy
        return f"{year:04d}-{mm:02d}"

    raise RuntimeError(f"Cannot infer report month from {name}")


def report_month_to_effective_from(report_month: str) -> str:
    return f"{report_month}-01"


def municipality_display_name(source_name: str) -> str:
    return MUNICIPALITY_DISPLAY_NAMES.get(source_name, source_name)


def municipality_market_lookup(display_name: str, source_name: str) -> str:
    return MUNICIPALITY_MARKET_HPI_LOOKUPS.get(display_name, source_name)


def municipality_aliases(source_name: str, display_name: str) -> list[str]:
    aliases = {source_name, display_name, municipality_market_lookup(display_name, source_name)}
    if source_name.startswith("Toronto "):
        aliases.add(source_name.replace("Toronto ", ""))
    return sorted(aliases)


def zone_id_for_source(source_name: str) -> str:
    return f"zone:{slugify(source_name)}"


def municipality_id_for_source(zone_source_name: str, municipality_source_name: str) -> str:
    return f"municipality:{slugify(zone_source_name)}:{slugify(municipality_source_name)}"


def neighborhood_id_for_source(
    zone_source_name: str, municipality_source_name: str, neighborhood_name: str
) -> str:
    return (
        f"neighborhood:{slugify(zone_source_name)}:{slugify(municipality_source_name)}"
        f":{slugify(neighborhood_name)}"
    )


def parse_hpi_summary(pdf_path: Path) -> tuple[list[dict], list[dict], list[dict], list[str]]:
    report_month = infer_report_month(pdf_path)
    effective_from = report_month_to_effective_from(report_month)
    source_document_id = pdf_path.name
    source_document_hash = file_sha256(pdf_path)

    current_style: str | None = None
    current_zone: str | None = None
    current_muni: str | None = None

    styles_seen: set[str] = set()
    zones_seen: set[str] = set()
    municipality_zones: dict[str, str] = {}
    neighborhood_styles: dict[tuple[str, str, str], set[str]] = defaultdict(set)

    for page_lines in extract_pdf_lines_pdfplumber(pdf_path):
        for index, line in enumerate(page_lines):
            next_line = page_lines[index + 1] if index + 1 < len(page_lines) else ""

            if line in HPI_STYLE_NAMES and next_line.startswith("Benchmark"):
                if line != current_style:
                    current_zone = None
                    current_muni = None
                current_style = line
                styles_seen.add(current_style)
                continue

            zone_name = extract_prefixed_label(line, "Zone:")
            if zone_name:
                current_zone = zone_name
                zones_seen.add(current_zone)
                continue

            municipality_name = extract_prefixed_label(line, "Municipality:")
            if municipality_name:
                current_muni = municipality_name
                if current_zone is None:
                    raise RuntimeError(f"Missing zone before municipality {current_muni}")
                municipality_zones[current_muni] = current_zone
                continue

            if current_style and current_zone and current_muni:
                hood_name = extract_label_from_value_row(line)
                if hood_name:
                    neighborhood_styles[(current_zone, current_muni, hood_name)].add(current_style)

    zone_records = []
    zone_id_by_source: dict[str, str] = {}
    for zone_name in sorted(zones_seen):
        display_name = ZONE_DISPLAY_NAMES.get(zone_name, zone_name)
        zone_slug = slugify(display_name)
        zone_id = zone_id_for_source(zone_name)
        zone_id_by_source[zone_name] = zone_id
        zone_records.append(
            {
                "id": zone_id,
                "lookup_key": f"zone:{zone_name}",
                "source_name": zone_name,
                "canonical_name": display_name,
                "display_name": display_name,
                "slug": zone_slug,
                "level": "zone",
                "area_level": "zone",
                "area_kind": "zone",
                "parent_id": None,
                "parent_display_name": None,
                "zone_name": display_name,
                "zone_display_name": display_name,
                "market_hpi_lookup": None,
                "supports_market_hpi": False,
                "supports_hpi_summary": True,
                "effective_from": effective_from,
                "effective_to": None,
                "source_document_id": source_document_id,
                "source_document_hash": source_document_hash,
                "metadata": {"source_zone_name": zone_name},
            }
        )

    municipality_records = []
    municipality_id_by_source: dict[str, str] = {}
    for source_name, zone_name in sorted(
        municipality_zones.items(),
        key=lambda item: (ZONE_DISPLAY_NAMES.get(item[1], item[1]), municipality_display_name(item[0])),
    ):
        display_name = municipality_display_name(source_name)
        municipality_slug = slugify(display_name)
        municipality_id = municipality_id_for_source(zone_name, source_name)
        municipality_id_by_source[source_name] = municipality_id
        zone_display_name = ZONE_DISPLAY_NAMES.get(zone_name, zone_name)
        area_kind = "district" if TORONTO_CODE_RE.match(source_name) else "municipality"
        municipality_records.append(
            {
                "id": municipality_id,
                "lookup_key": f"municipality:{display_name}",
                "source_name": source_name,
                "canonical_name": display_name,
                "display_name": display_name,
                "slug": municipality_slug,
                "level": "municipality",
                "area_level": "municipality",
                "area_kind": area_kind,
                "parent_id": zone_id_by_source[zone_name],
                "parent_display_name": zone_display_name,
                "zone_name": zone_display_name,
                "zone_display_name": zone_display_name,
                "market_hpi_lookup": municipality_market_lookup(display_name, source_name),
                "supports_market_hpi": True,
                "supports_hpi_summary": True,
                "aliases": municipality_aliases(source_name, display_name),
                "effective_from": effective_from,
                "effective_to": None,
                "source_document_id": source_document_id,
                "source_document_hash": source_document_hash,
                "metadata": {"source_zone_name": zone_name},
            }
        )

    neighborhood_records = []
    for zone_name, municipality_source_name, neighborhood_name in sorted(
        neighborhood_styles.keys(),
        key=lambda item: (
            ZONE_DISPLAY_NAMES.get(item[0], item[0]),
            municipality_display_name(item[1]),
            item[2],
        ),
    ):
        municipality_display = municipality_display_name(municipality_source_name)
        neighborhood_slug = slugify(neighborhood_name)
        zone_display_name = ZONE_DISPLAY_NAMES.get(zone_name, zone_name)
        neighborhood_records.append(
            {
                "id": neighborhood_id_for_source(
                    zone_name, municipality_source_name, neighborhood_name
                ),
                "lookup_key": f"neighborhood:{municipality_display}:{neighborhood_name}",
                "source_name": neighborhood_name,
                "canonical_name": neighborhood_name,
                "display_name": neighborhood_name,
                "slug": neighborhood_slug,
                "level": "neighborhood",
                "area_level": "neighborhood",
                "area_kind": "neighborhood",
                "parent_id": municipality_id_by_source[municipality_source_name],
                "parent_display_name": municipality_display,
                "zone_name": zone_display_name,
                "zone_display_name": zone_display_name,
                "municipality_source_name": municipality_source_name,
                "municipality_display_name": municipality_display,
                "market_hpi_lookup": municipality_market_lookup(
                    municipality_display, municipality_source_name
                ),
                "supports_market_hpi": False,
                "supports_hpi_summary": True,
                "hpi_summary_styles": sorted(
                    neighborhood_styles[(zone_name, municipality_source_name, neighborhood_name)]
                ),
                "effective_from": effective_from,
                "effective_to": None,
                "source_document_id": source_document_id,
                "source_document_hash": source_document_hash,
                "metadata": {"source_zone_name": zone_name},
            }
        )

    return zone_records, municipality_records, neighborhood_records, sorted(styles_seen)


def scan_market_watch_categories(archive_dir: Path) -> dict[str, int]:
    counts = {pattern: 0 for pattern in MARKET_WATCH_PATTERNS}
    for pdf_path in sorted(archive_dir.glob("*.pdf")):
        combined_text = extract_market_watch_text_camelot(pdf_path, pages="1-3")
        if not combined_text:
            combined_text = extract_market_watch_text_pdfplumber(pdf_path, max_pages=3)

        lower_text = combined_text.lower()
        for pattern in MARKET_WATCH_PATTERNS:
            if pattern.lower() in lower_text:
                counts[pattern] += 1

    return counts


def build_property_type_payload(
    hpi_styles: Iterable[str],
    market_watch_counts: dict[str, int],
    hpi_pdf: Path,
    market_watch_pdf: Path,
) -> dict:
    hpi_effective_from = report_month_to_effective_from(infer_report_month(hpi_pdf))
    hpi_hash = file_sha256(hpi_pdf)
    hpi_doc = hpi_pdf.name

    market_watch_effective_from = report_month_to_effective_from(infer_report_month(market_watch_pdf))
    market_watch_hash = file_sha256(market_watch_pdf)
    market_watch_doc = market_watch_pdf.name

    estimate_selectable = [
        {
            "id": "property-type:detached",
            "display_name": "Detached",
            "canonical_name": "Detached",
            "source_name": "Detached",
            "hpi_lookup_name": "Detached",
            "slug": "detached",
            "sort_order": 1,
            "effective_from": hpi_effective_from,
            "effective_to": None,
            "source_document_id": hpi_doc,
            "source_document_hash": hpi_hash,
        },
        {
            "id": "property-type:semi-detached",
            "display_name": "Semi-Detached",
            "canonical_name": "Semi-Detached",
            "source_name": "Semi-Detached",
            "hpi_lookup_name": "Semi-Detached",
            "slug": "semi-detached",
            "sort_order": 2,
            "effective_from": hpi_effective_from,
            "effective_to": None,
            "source_document_id": hpi_doc,
            "source_document_hash": hpi_hash,
        },
        {
            "id": "property-type:townhouse",
            "display_name": "Townhouse",
            "canonical_name": "Townhouse",
            "source_name": "Townhouse",
            "hpi_lookup_name": "Townhouse",
            "slug": "townhouse",
            "sort_order": 3,
            "effective_from": hpi_effective_from,
            "effective_to": None,
            "source_document_id": hpi_doc,
            "source_document_hash": hpi_hash,
        },
        {
            "id": "property-type:condo-apt",
            "display_name": "Condo Apt",
            "canonical_name": "Condo Apt",
            "source_name": "Condo Apt",
            "hpi_lookup_name": "Condo Apt",
            "slug": "condo-apt",
            "sort_order": 4,
            "effective_from": hpi_effective_from,
            "effective_to": None,
            "source_document_id": hpi_doc,
            "source_document_hash": hpi_hash,
        },
    ]
    canonical_id_by_name = {
        row["canonical_name"]: row["id"] for row in estimate_selectable
    }

    market_watch_aliases = []
    for sort_order, (source_name, canonical_name, lookup_name, notes) in enumerate(
        MARKET_WATCH_MAPPINGS, start=1
    ):
        market_watch_aliases.append(
            {
                "id": f"property-type-alias:market-watch:{slugify(source_name)}",
                "source_name": source_name,
                "canonical_name": canonical_name,
                "canonical_id": canonical_id_by_name[canonical_name],
                "display_name": canonical_name,
                "hpi_lookup_name": lookup_name,
                "slug": slugify(source_name),
                "sort_order": sort_order,
                "files_seen": market_watch_counts.get(source_name, 0),
                "notes": notes,
                "effective_from": market_watch_effective_from,
                "effective_to": None,
                "source_document_id": market_watch_doc,
                "source_document_hash": market_watch_hash,
            }
        )

    hpi_summary_styles = []
    for sort_order, source_name in enumerate(sorted(hpi_styles), start=1):
        canonical_name, notes = HPI_STYLE_PROXY_MAP.get(
            source_name, (None, "No normalization rule defined.")
        )
        hpi_summary_styles.append(
            {
                "id": f"property-type-alias:hpi-summary:{slugify(source_name)}",
                "source_name": source_name,
                "canonical_name": canonical_name,
                "canonical_id": canonical_id_by_name.get(canonical_name),
                "display_name": canonical_name,
                "hpi_lookup_name": canonical_name,
                "slug": slugify(source_name),
                "sort_order": sort_order,
                "notes": notes,
                "effective_from": hpi_effective_from,
                "effective_to": None,
                "source_document_id": hpi_doc,
                "source_document_hash": hpi_hash,
            }
        )

    return {
        "estimate_selectable": estimate_selectable,
        "market_watch_aliases": market_watch_aliases,
        "hpi_summary_styles": hpi_summary_styles,
    }


def build_alias_payload(taxonomy: dict) -> dict:
    def append_alias(
        rows: list[dict],
        seen: set[tuple[str, str, str]],
        *,
        alias: str | None,
        entity_id: str,
        entity_type: str,
        source: str,
        confidence: str,
        effective_from: str,
        effective_to: str | None,
        source_document_id: str,
        source_document_hash: str,
        notes: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        if alias is None:
            return

        cleaned_alias = alias.strip()
        if not cleaned_alias:
            return

        alias_slug = slugify(cleaned_alias)
        key = (entity_type, entity_id, alias_slug)
        if key in seen:
            return

        rows.append(
            {
                "id": f"alias:{entity_type}:{entity_id}:{alias_slug}",
                "alias": cleaned_alias,
                "alias_slug": alias_slug,
                "entity_id": entity_id,
                "entity_type": entity_type,
                "source": source,
                "confidence": confidence,
                "notes": notes,
                "metadata": metadata or {},
                "effective_from": effective_from,
                "effective_to": effective_to,
                "source_document_id": source_document_id,
                "source_document_hash": source_document_hash,
            }
        )
        seen.add(key)

    area_aliases: list[dict] = []
    area_seen: set[tuple[str, str, str]] = set()

    for zone in taxonomy["zones"]:
        for alias in {zone["display_name"], zone["source_name"]}:
            append_alias(
                area_aliases,
                area_seen,
                alias=alias,
                entity_id=zone["id"],
                entity_type="zone",
                source="hpi_summary",
                confidence="exact",
                effective_from=zone["effective_from"],
                effective_to=zone["effective_to"],
                source_document_id=zone["source_document_id"],
                source_document_hash=zone["source_document_hash"],
            )

    for municipality in taxonomy["municipalities"]:
        for alias in municipality["aliases"]:
            confidence = (
                "normalized"
                if alias == municipality["market_hpi_lookup"] and alias != municipality["display_name"]
                else "exact"
            )
            source = (
                "market_hpi"
                if alias == municipality["market_hpi_lookup"] and alias != municipality["source_name"]
                else "hpi_summary"
            )
            append_alias(
                area_aliases,
                area_seen,
                alias=alias,
                entity_id=municipality["id"],
                entity_type="municipality",
                source=source,
                confidence=confidence,
                effective_from=municipality["effective_from"],
                effective_to=municipality["effective_to"],
                source_document_id=municipality["source_document_id"],
                source_document_hash=municipality["source_document_hash"],
            )

    for neighborhood in taxonomy["neighborhoods"]:
        append_alias(
            area_aliases,
            area_seen,
            alias=neighborhood["display_name"],
            entity_id=neighborhood["id"],
            entity_type="neighborhood",
            source="hpi_summary",
            confidence="exact",
            effective_from=neighborhood["effective_from"],
            effective_to=neighborhood["effective_to"],
            source_document_id=neighborhood["source_document_id"],
            source_document_hash=neighborhood["source_document_hash"],
            metadata={"parent_id": neighborhood["parent_id"]},
        )

    property_aliases: list[dict] = []
    property_seen: set[tuple[str, str, str]] = set()
    for row in taxonomy["property_types"]["estimate_selectable"]:
        append_alias(
            property_aliases,
            property_seen,
            alias=row["display_name"],
            entity_id=row["id"],
            entity_type="property_type",
            source="estimate_ui",
            confidence="exact",
            effective_from=row["effective_from"],
            effective_to=row["effective_to"],
            source_document_id=row["source_document_id"],
            source_document_hash=row["source_document_hash"],
        )

    for group_name, source in (
        ("market_watch_aliases", "market_watch"),
        ("hpi_summary_styles", "hpi_summary"),
    ):
        for row in taxonomy["property_types"][group_name]:
            if row["canonical_id"]:
                confidence = (
                    "exact" if row["source_name"] == row["canonical_name"] else "normalized"
                )
            else:
                confidence = "exact"
            append_alias(
                property_aliases,
                property_seen,
                alias=row["source_name"],
                entity_id=row["canonical_id"] or row["id"],
                entity_type="property_type",
                source=source,
                confidence=confidence,
                effective_from=row["effective_from"],
                effective_to=row["effective_to"],
                source_document_id=row["source_document_id"],
                source_document_hash=row["source_document_hash"],
                notes=row["notes"],
                metadata={
                    "alias_record_id": row["id"],
                    "canonical_name": row["canonical_name"],
                    "hpi_lookup_name": row["hpi_lookup_name"],
                },
            )

    return {"areas": area_aliases, "property_types": property_aliases}


def build_taxonomy_payload(hpi_pdf: Path, market_watch_pdf: Path, market_watch_archive: Path) -> dict:
    zones, municipalities, neighborhoods, hpi_styles = parse_hpi_summary(hpi_pdf)
    market_watch_counts = scan_market_watch_categories(market_watch_archive)
    property_types = build_property_type_payload(
        hpi_styles, market_watch_counts, hpi_pdf, market_watch_pdf
    )

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_files": {
            "hpi_summary_pdf": str(hpi_pdf),
            "market_watch_pdf": str(market_watch_pdf),
            "market_watch_archive": str(market_watch_archive),
        },
        "zones": zones,
        "municipalities": municipalities,
        "neighborhoods": neighborhoods,
        "property_types": property_types,
    }
    payload["aliases"] = build_alias_payload(payload)
    payload["stats"] = {
        "zones": len(zones),
        "municipalities": len(municipalities),
        "neighborhoods": len(neighborhoods),
        "hpi_summary_styles": len(hpi_styles),
        "market_watch_aliases": len(property_types["market_watch_aliases"]),
        "area_aliases": len(payload["aliases"]["areas"]),
        "property_type_aliases": len(payload["aliases"]["property_types"]),
    }
    return payload


def render_seed_sql(taxonomy: dict) -> str:
    lines = [
        "CREATE TABLE IF NOT EXISTS trreb_area_taxonomy (",
        "  id TEXT PRIMARY KEY,",
        "  lookup_key TEXT NOT NULL UNIQUE,",
        "  source_system TEXT NOT NULL,",
        "  area_level TEXT NOT NULL,",
        "  area_kind TEXT NOT NULL,",
        "  area_name TEXT NOT NULL,",
        "  canonical_name TEXT NOT NULL,",
        "  display_name TEXT NOT NULL,",
        "  slug TEXT NOT NULL,",
        "  parent_id TEXT,",
        "  parent_display_name TEXT,",
        "  zone_name TEXT NOT NULL,",
        "  market_hpi_lookup TEXT,",
        "  supports_market_hpi BOOLEAN NOT NULL DEFAULT false,",
        "  supports_hpi_summary BOOLEAN NOT NULL DEFAULT false,",
        "  effective_from DATE NOT NULL,",
        "  effective_to DATE,",
        "  source_document_id TEXT NOT NULL,",
        "  source_document_hash TEXT NOT NULL,",
        "  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,",
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
        ");",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_trreb_area_taxonomy_level_parent_slug ON trreb_area_taxonomy(area_level, parent_id, slug);",
        "CREATE INDEX IF NOT EXISTS idx_trreb_area_taxonomy_level_slug ON trreb_area_taxonomy(area_level, slug);",
        "CREATE INDEX IF NOT EXISTS idx_trreb_area_taxonomy_parent_id ON trreb_area_taxonomy(parent_id);",
        "CREATE INDEX IF NOT EXISTS idx_trreb_area_taxonomy_market_hpi_lookup ON trreb_area_taxonomy(market_hpi_lookup);",
        "",
        "CREATE TABLE IF NOT EXISTS trreb_property_type_taxonomy (",
        "  id TEXT PRIMARY KEY,",
        "  lookup_key TEXT NOT NULL UNIQUE,",
        "  source_system TEXT NOT NULL,",
        "  source_name TEXT NOT NULL,",
        "  canonical_id TEXT,",
        "  canonical_name TEXT,",
        "  display_name TEXT,",
        "  slug TEXT NOT NULL,",
        "  hpi_lookup_name TEXT,",
        "  is_selectable BOOLEAN NOT NULL DEFAULT false,",
        "  sort_order INT NOT NULL DEFAULT 0,",
        "  source_file_count INT,",
        "  effective_from DATE NOT NULL,",
        "  effective_to DATE,",
        "  source_document_id TEXT NOT NULL,",
        "  source_document_hash TEXT NOT NULL,",
        "  notes TEXT,",
        "  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,",
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
        ");",
        "CREATE INDEX IF NOT EXISTS idx_trreb_property_type_taxonomy_canonical_name ON trreb_property_type_taxonomy(canonical_name);",
        "CREATE INDEX IF NOT EXISTS idx_trreb_property_type_taxonomy_canonical_id ON trreb_property_type_taxonomy(canonical_id);",
        "CREATE INDEX IF NOT EXISTS idx_trreb_property_type_taxonomy_slug ON trreb_property_type_taxonomy(slug);",
        "",
        "CREATE TABLE IF NOT EXISTS trreb_taxonomy_aliases (",
        "  id TEXT PRIMARY KEY,",
        "  alias TEXT NOT NULL,",
        "  alias_slug TEXT NOT NULL,",
        "  entity_id TEXT NOT NULL,",
        "  entity_type TEXT NOT NULL,",
        "  source_system TEXT NOT NULL,",
        "  confidence TEXT NOT NULL,",
        "  notes TEXT,",
        "  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,",
        "  effective_from DATE NOT NULL,",
        "  effective_to DATE,",
        "  source_document_id TEXT NOT NULL,",
        "  source_document_hash TEXT NOT NULL,",
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()",
        ");",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_trreb_taxonomy_aliases_type_entity_slug ON trreb_taxonomy_aliases(entity_type, entity_id, alias_slug);",
        "CREATE INDEX IF NOT EXISTS idx_trreb_taxonomy_aliases_type_slug ON trreb_taxonomy_aliases(entity_type, alias_slug);",
        "CREATE INDEX IF NOT EXISTS idx_trreb_taxonomy_aliases_entity_id ON trreb_taxonomy_aliases(entity_id);",
        "",
        "ALTER TABLE trreb_area_taxonomy ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE trreb_property_type_taxonomy ENABLE ROW LEVEL SECURITY;",
        "ALTER TABLE trreb_taxonomy_aliases ENABLE ROW LEVEL SECURITY;",
        "",
        "DROP POLICY IF EXISTS \"Public read access\" ON trreb_area_taxonomy;",
        "CREATE POLICY \"Public read access\" ON trreb_area_taxonomy FOR SELECT USING (true);",
        "DROP POLICY IF EXISTS \"Public read access\" ON trreb_property_type_taxonomy;",
        "CREATE POLICY \"Public read access\" ON trreb_property_type_taxonomy FOR SELECT USING (true);",
        "DROP POLICY IF EXISTS \"Public read access\" ON trreb_taxonomy_aliases;",
        "CREATE POLICY \"Public read access\" ON trreb_taxonomy_aliases FOR SELECT USING (true);",
        "",
    ]

    for record in taxonomy["zones"] + taxonomy["municipalities"] + taxonomy["neighborhoods"]:
        metadata = record["metadata"].copy()
        if "aliases" in record:
            metadata["aliases"] = record["aliases"]
        if "hpi_summary_styles" in record:
            metadata["hpi_summary_styles"] = record["hpi_summary_styles"]
        parent_display_name = record.get("parent_display_name")
        lines.append(
            "INSERT INTO trreb_area_taxonomy "
            "(id, lookup_key, source_system, area_level, area_kind, area_name, canonical_name, display_name, slug, parent_id, parent_display_name, zone_name, market_hpi_lookup, supports_market_hpi, supports_hpi_summary, effective_from, effective_to, source_document_id, source_document_hash, metadata) "
            f"VALUES ({sql_quote(record['id'])}, {sql_quote(record['lookup_key'])}, 'trreb_taxonomy', {sql_quote(record['area_level'])}, {sql_quote(record['area_kind'])}, {sql_quote(record['source_name'])}, {sql_quote(record['canonical_name'])}, {sql_quote(record['display_name'])}, {sql_quote(record['slug'])}, {'NULL' if record['parent_id'] is None else sql_quote(record['parent_id'])}, {'NULL' if parent_display_name is None else sql_quote(parent_display_name)}, {sql_quote(record['zone_name'])}, {'NULL' if record['market_hpi_lookup'] is None else sql_quote(record['market_hpi_lookup'])}, {'true' if record['supports_market_hpi'] else 'false'}, {'true' if record['supports_hpi_summary'] else 'false'}, {sql_quote(record['effective_from'])}, {'NULL' if record['effective_to'] is None else sql_quote(record['effective_to'])}, {sql_quote(record['source_document_id'])}, {sql_quote(record['source_document_hash'])}, {json_sql(metadata)}) "
            "ON CONFLICT (id) DO UPDATE SET "
            "lookup_key = EXCLUDED.lookup_key, "
            "source_system = EXCLUDED.source_system, "
            "area_level = EXCLUDED.area_level, "
            "area_kind = EXCLUDED.area_kind, "
            "area_name = EXCLUDED.area_name, "
            "canonical_name = EXCLUDED.canonical_name, "
            "display_name = EXCLUDED.display_name, "
            "slug = EXCLUDED.slug, "
            "parent_id = EXCLUDED.parent_id, "
            "parent_display_name = EXCLUDED.parent_display_name, "
            "zone_name = EXCLUDED.zone_name, "
            "market_hpi_lookup = EXCLUDED.market_hpi_lookup, "
            "supports_market_hpi = EXCLUDED.supports_market_hpi, "
            "supports_hpi_summary = EXCLUDED.supports_hpi_summary, "
            "effective_from = EXCLUDED.effective_from, "
            "effective_to = EXCLUDED.effective_to, "
            "source_document_id = EXCLUDED.source_document_id, "
            "source_document_hash = EXCLUDED.source_document_hash, "
            "metadata = EXCLUDED.metadata;"
        )

    lines.append("")
    property_records = (
        taxonomy["property_types"]["estimate_selectable"]
        + taxonomy["property_types"]["market_watch_aliases"]
        + taxonomy["property_types"]["hpi_summary_styles"]
    )
    for record in property_records:
        lookup_key = (
            f"estimate_ui:{record['display_name']}"
            if record["id"].startswith("property-type:")
            else (
                f"market_watch:{record['source_name']}"
                if ":market-watch:" in record["id"]
                else f"hpi_summary:{record['source_name']}"
            )
        )
        source_system = (
            "estimate_ui"
            if record["id"].startswith("property-type:")
            else "market_watch"
            if ":market-watch:" in record["id"]
            else "hpi_summary"
        )
        source_name = record.get("source_name", record["display_name"])
        metadata = {}
        if record.get("canonical_id"):
            metadata["canonical_id"] = record["canonical_id"]
        if record.get("files_seen") is not None:
            metadata["files_seen"] = record["files_seen"]
        lines.append(
            "INSERT INTO trreb_property_type_taxonomy "
            "(id, lookup_key, source_system, source_name, canonical_id, canonical_name, display_name, slug, hpi_lookup_name, is_selectable, sort_order, source_file_count, effective_from, effective_to, source_document_id, source_document_hash, notes, metadata) "
            f"VALUES ({sql_quote(record['id'])}, {sql_quote(lookup_key)}, {sql_quote(source_system)}, {sql_quote(source_name)}, {'NULL' if record.get('canonical_id') is None else sql_quote(record['canonical_id'])}, {'NULL' if record['canonical_name'] is None else sql_quote(record['canonical_name'])}, {'NULL' if record['display_name'] is None else sql_quote(record['display_name'])}, {sql_quote(record['slug'])}, {'NULL' if record['hpi_lookup_name'] is None else sql_quote(record['hpi_lookup_name'])}, {'true' if record['id'].startswith('property-type:') else 'false'}, {record['sort_order']}, {'NULL' if record.get('files_seen') is None else record['files_seen']}, {sql_quote(record['effective_from'])}, {'NULL' if record['effective_to'] is None else sql_quote(record['effective_to'])}, {sql_quote(record['source_document_id'])}, {sql_quote(record['source_document_hash'])}, {'NULL' if record.get('notes') is None else sql_quote(record['notes'])}, {json_sql(metadata)}) "
            "ON CONFLICT (id) DO UPDATE SET "
            "lookup_key = EXCLUDED.lookup_key, "
            "source_system = EXCLUDED.source_system, "
            "source_name = EXCLUDED.source_name, "
            "canonical_id = EXCLUDED.canonical_id, "
            "canonical_name = EXCLUDED.canonical_name, "
            "display_name = EXCLUDED.display_name, "
            "slug = EXCLUDED.slug, "
            "hpi_lookup_name = EXCLUDED.hpi_lookup_name, "
            "is_selectable = EXCLUDED.is_selectable, "
            "sort_order = EXCLUDED.sort_order, "
            "source_file_count = EXCLUDED.source_file_count, "
            "effective_from = EXCLUDED.effective_from, "
            "effective_to = EXCLUDED.effective_to, "
            "source_document_id = EXCLUDED.source_document_id, "
            "source_document_hash = EXCLUDED.source_document_hash, "
            "notes = EXCLUDED.notes, "
            "metadata = EXCLUDED.metadata;"
        )

    lines.append("")
    for record in taxonomy["aliases"]["areas"] + taxonomy["aliases"]["property_types"]:
        lines.append(
            "INSERT INTO trreb_taxonomy_aliases "
            "(id, alias, alias_slug, entity_id, entity_type, source_system, confidence, notes, metadata, effective_from, effective_to, source_document_id, source_document_hash) "
            f"VALUES ({sql_quote(record['id'])}, {sql_quote(record['alias'])}, {sql_quote(record['alias_slug'])}, {sql_quote(record['entity_id'])}, {sql_quote(record['entity_type'])}, {sql_quote(record['source'])}, {sql_quote(record['confidence'])}, {'NULL' if record['notes'] is None else sql_quote(record['notes'])}, {json_sql(record.get('metadata', {}))}, {sql_quote(record['effective_from'])}, {'NULL' if record['effective_to'] is None else sql_quote(record['effective_to'])}, {sql_quote(record['source_document_id'])}, {sql_quote(record['source_document_hash'])}) "
            "ON CONFLICT (id) DO UPDATE SET "
            "alias = EXCLUDED.alias, "
            "alias_slug = EXCLUDED.alias_slug, "
            "entity_id = EXCLUDED.entity_id, "
            "entity_type = EXCLUDED.entity_type, "
            "source_system = EXCLUDED.source_system, "
            "confidence = EXCLUDED.confidence, "
            "notes = EXCLUDED.notes, "
            "metadata = EXCLUDED.metadata, "
            "effective_from = EXCLUDED.effective_from, "
            "effective_to = EXCLUDED.effective_to, "
            "source_document_id = EXCLUDED.source_document_id, "
            "source_document_hash = EXCLUDED.source_document_hash;"
        )

    return "\n".join(lines) + "\n"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--hpi-pdf", type=Path, default=DEFAULT_HPI_PDF)
    parser.add_argument("--market-watch-pdf", type=Path, default=DEFAULT_MARKET_WATCH_PDF)
    parser.add_argument("--market-watch-archive", type=Path, default=DEFAULT_MARKET_WATCH_ARCHIVE)
    parser.add_argument("--json-out", type=Path, default=DEFAULT_JSON_OUT)
    parser.add_argument("--sql-out", type=Path, default=DEFAULT_SQL_OUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    taxonomy = build_taxonomy_payload(
        args.hpi_pdf,
        args.market_watch_pdf,
        args.market_watch_archive,
    )

    args.json_out.parent.mkdir(parents=True, exist_ok=True)
    args.sql_out.parent.mkdir(parents=True, exist_ok=True)
    args.json_out.write_text(json.dumps(taxonomy, indent=2) + "\n")
    args.sql_out.write_text(render_seed_sql(taxonomy))

    print(
        json.dumps(
            {
                "json_out": str(args.json_out),
                "sql_out": str(args.sql_out),
                "stats": taxonomy["stats"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
