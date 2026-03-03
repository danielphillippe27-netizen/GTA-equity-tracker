CREATE OR REPLACE VIEW v_trreb_selectable_areas AS
SELECT
  id,
  display_name,
  slug,
  parent_id,
  parent_display_name,
  area_level AS level,
  area_kind AS kind,
  market_hpi_lookup
FROM trreb_area_taxonomy
WHERE area_level = 'municipality'
  AND supports_market_hpi = true
ORDER BY display_name;

CREATE OR REPLACE VIEW v_trreb_selectable_property_types AS
SELECT
  id,
  display_name,
  slug,
  canonical_name,
  hpi_lookup_name,
  sort_order
FROM trreb_property_type_taxonomy
WHERE is_selectable = true
ORDER BY sort_order, display_name;

CREATE OR REPLACE FUNCTION fn_trreb_slugify(input_value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
RETURNS NULL ON NULL INPUT
AS $$
  SELECT trim(BOTH '-' FROM regexp_replace(lower(trim(input_value)), '[^a-z0-9]+', '-', 'g'));
$$;

CREATE OR REPLACE FUNCTION fn_trreb_normalize_area(input_value TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
RETURNS NULL ON NULL INPUT
AS $$
  WITH normalized_input AS (
    SELECT
      lower(trim(input_value)) AS raw_value,
      fn_trreb_slugify(input_value) AS slug_value
  ),
  candidate_alias AS (
    SELECT
      a.entity_id,
      CASE a.confidence
        WHEN 'exact' THEN 0
        WHEN 'normalized' THEN 1
        WHEN 'fuzzy' THEN 2
        ELSE 3
      END AS confidence_rank,
      CASE
        WHEN lower(a.alias) = ni.raw_value THEN 0
        WHEN a.alias_slug = ni.slug_value THEN 1
        ELSE 2
      END AS match_rank
    FROM trreb_taxonomy_aliases a
    CROSS JOIN normalized_input ni
    JOIN v_trreb_selectable_areas sa ON sa.id = a.entity_id
    WHERE a.entity_type = 'municipality'
      AND (
        lower(a.alias) = ni.raw_value
        OR a.alias_slug = ni.slug_value
      )
  ),
  candidate_area AS (
    SELECT
      sa.id AS entity_id,
      0 AS confidence_rank,
      CASE
        WHEN lower(sa.display_name) = ni.raw_value THEN 0
        WHEN sa.slug = ni.slug_value THEN 1
        WHEN fn_trreb_slugify(sa.market_hpi_lookup) = ni.slug_value THEN 2
        ELSE 3
      END AS match_rank
    FROM v_trreb_selectable_areas sa
    CROSS JOIN normalized_input ni
    WHERE lower(sa.display_name) = ni.raw_value
      OR sa.slug = ni.slug_value
      OR fn_trreb_slugify(sa.market_hpi_lookup) = ni.slug_value
  )
  SELECT entity_id
  FROM (
    SELECT * FROM candidate_alias
    UNION ALL
    SELECT * FROM candidate_area
  ) candidates
  ORDER BY match_rank, confidence_rank, entity_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION fn_trreb_normalize_property_type(input_value TEXT)
RETURNS TEXT
LANGUAGE SQL
STABLE
RETURNS NULL ON NULL INPUT
AS $$
  WITH normalized_input AS (
    SELECT
      lower(trim(input_value)) AS raw_value,
      fn_trreb_slugify(input_value) AS slug_value
  ),
  candidate_alias AS (
    SELECT
      a.entity_id,
      CASE a.confidence
        WHEN 'exact' THEN 0
        WHEN 'normalized' THEN 1
        WHEN 'fuzzy' THEN 2
        ELSE 3
      END AS confidence_rank,
      CASE
        WHEN lower(a.alias) = ni.raw_value THEN 0
        WHEN a.alias_slug = ni.slug_value THEN 1
        ELSE 2
      END AS match_rank
    FROM trreb_taxonomy_aliases a
    CROSS JOIN normalized_input ni
    JOIN v_trreb_selectable_property_types sp ON sp.id = a.entity_id
    WHERE a.entity_type = 'property_type'
      AND (
        lower(a.alias) = ni.raw_value
        OR a.alias_slug = ni.slug_value
      )
  ),
  candidate_property AS (
    SELECT
      sp.id AS entity_id,
      0 AS confidence_rank,
      CASE
        WHEN lower(sp.display_name) = ni.raw_value THEN 0
        WHEN sp.slug = ni.slug_value THEN 1
        WHEN fn_trreb_slugify(sp.hpi_lookup_name) = ni.slug_value THEN 2
        ELSE 3
      END AS match_rank
    FROM v_trreb_selectable_property_types sp
    CROSS JOIN normalized_input ni
    WHERE lower(sp.display_name) = ni.raw_value
      OR sp.slug = ni.slug_value
      OR fn_trreb_slugify(sp.hpi_lookup_name) = ni.slug_value
  )
  SELECT entity_id
  FROM (
    SELECT * FROM candidate_alias
    UNION ALL
    SELECT * FROM candidate_property
  ) candidates
  ORDER BY match_rank, confidence_rank, entity_id
  LIMIT 1;
$$;
