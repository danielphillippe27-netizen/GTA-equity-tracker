#!/usr/bin/env python3
"""Regression checks for generated TRREB taxonomy artifacts."""

from __future__ import annotations

import json
from pathlib import Path


DEFAULT_TAXONOMY_PATH = Path("src/data/trreb-taxonomy.json")
EXPECTED_STATS = {
    "zones": 7,
    "municipalities": 65,
    "neighborhoods": 463,
    "hpi_summary_styles": 12,
    "market_watch_aliases": 12,
}


def load_taxonomy(path: Path) -> dict:
    return json.loads(path.read_text())


def assert_equal(actual, expected, message: str) -> None:
    if actual != expected:
        raise AssertionError(f"{message}: expected {expected!r}, got {actual!r}")


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def find_one(rows: list[dict], predicate, message: str) -> dict:
    for row in rows:
        if predicate(row):
            return row
    raise AssertionError(message)


def main() -> None:
    taxonomy = load_taxonomy(DEFAULT_TAXONOMY_PATH)

    for key, expected in EXPECTED_STATS.items():
        assert_equal(taxonomy["stats"][key], expected, f"Unexpected count for {key}")

    area_slug_keys = set()
    for row in taxonomy["zones"] + taxonomy["municipalities"] + taxonomy["neighborhoods"]:
        key = (row["area_level"], row["parent_id"], row["slug"])
        assert_true(key not in area_slug_keys, f"Duplicate area slug scope detected: {key}")
        area_slug_keys.add(key)

    property_slug_keys = set()
    for row in taxonomy["property_types"]["estimate_selectable"]:
        key = row["slug"]
        assert_true(key not in property_slug_keys, f"Duplicate selectable property slug: {key}")
        property_slug_keys.add(key)

    alias_keys = set()
    for row in taxonomy["aliases"]["areas"] + taxonomy["aliases"]["property_types"]:
        key = (row["entity_type"], row["entity_id"], row["alias_slug"])
        assert_true(key not in alias_keys, f"Duplicate alias row detected: {key}")
        alias_keys.add(key)

    stouffville = find_one(
        taxonomy["municipalities"],
        lambda row: row["display_name"] == "Whitchurch-Stouffville",
        "Whitchurch-Stouffville municipality missing",
    )
    assert_equal(
        stouffville["market_hpi_lookup"],
        "Stouffville",
        "Whitchurch-Stouffville market lookup mismatch",
    )

    bradford = find_one(
        taxonomy["municipalities"],
        lambda row: row["display_name"] == "Bradford West Gwillimbury",
        "Bradford West Gwillimbury municipality missing",
    )
    assert_equal(
        bradford["market_hpi_lookup"],
        "Bradford",
        "Bradford West Gwillimbury market lookup mismatch",
    )

    stouffville_alias = find_one(
        taxonomy["aliases"]["areas"],
        lambda row: row["entity_id"] == stouffville["id"] and row["alias"] == "Stouffville",
        "Stouffville alias row missing",
    )
    assert_equal(
        stouffville_alias["confidence"],
        "normalized",
        "Stouffville alias confidence should be normalized",
    )

    bradford_alias = find_one(
        taxonomy["aliases"]["areas"],
        lambda row: row["entity_id"] == bradford["id"] and row["alias"] == "Bradford",
        "Bradford alias row missing",
    )
    assert_equal(
        bradford_alias["confidence"],
        "normalized",
        "Bradford alias confidence should be normalized",
    )

    selectable_ids = {
        row["canonical_name"]: row["id"]
        for row in taxonomy["property_types"]["estimate_selectable"]
    }
    for source_name, canonical_name in {
        "Link": "Semi-Detached",
        "Att/Row/Twnhouse": "Townhouse",
        "Att/Row/Townhouse": "Townhouse",
        "Condo Townhouse": "Townhouse",
        "Condo Apartment": "Condo Apt",
        "Co-op Apt": "Condo Apt",
        "Det Condo": "Detached",
        "Detached Condo": "Detached",
    }.items():
        alias = find_one(
            taxonomy["aliases"]["property_types"],
            lambda row, source_name=source_name: row["alias"] == source_name,
            f"Property alias missing: {source_name}",
        )
        assert_equal(
            alias["entity_id"],
            selectable_ids[canonical_name],
            f"Property alias mismatch for {source_name}",
        )

    for row in taxonomy["property_types"]["market_watch_aliases"]:
        assert_true(
            row["canonical_id"] is not None,
            f"Market Watch alias missing canonical_id: {row['source_name']}",
        )

    composite = find_one(
        taxonomy["property_types"]["hpi_summary_styles"],
        lambda row: row["source_name"] == "Composite",
        "Composite HPI summary style missing",
    )
    assert_true(composite["canonical_id"] is None, "Composite should remain non-selectable")

    print("TRREB taxonomy verification passed")


if __name__ == "__main__":
    main()
