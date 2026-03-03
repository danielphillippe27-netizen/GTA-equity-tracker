import taxonomy from '@/src/data/trreb-taxonomy.json';

type Taxonomy = typeof taxonomy;
type Zone = Taxonomy['zones'][number];
type Municipality = Taxonomy['municipalities'][number];
type Neighborhood = Taxonomy['neighborhoods'][number];
type SelectablePropertyType = Taxonomy['property_types']['estimate_selectable'][number];
type AreaAlias = Taxonomy['aliases']['areas'][number];
type PropertyAlias = Taxonomy['aliases']['property_types'][number];
type TaxonomyArea = Zone | Municipality | Neighborhood;

const areaById = new Map<string, TaxonomyArea>();
const municipalityById = new Map<string, Municipality>();
const municipalityLookup = new Map<string, Municipality>();
const areaLookup = new Map<string, TaxonomyArea>();
const selectablePropertyTypeById = new Map<string, SelectablePropertyType>();
const propertyTypeLookup = new Map<string, string>();
const propertyTypeIdLookup = new Map<string, string>();

for (const zone of taxonomy.zones) {
  areaById.set(zone.id, zone);
  areaLookup.set(zone.display_name.toLowerCase(), zone);
  if (zone.source_name) {
    areaLookup.set(zone.source_name.toLowerCase(), zone);
  }
}

for (const municipality of taxonomy.municipalities) {
  areaById.set(municipality.id, municipality);
  municipalityById.set(municipality.id, municipality);
  areaLookup.set(municipality.display_name.toLowerCase(), municipality);
  municipalityLookup.set(municipality.display_name.toLowerCase(), municipality);
  if (municipality.source_name) {
    areaLookup.set(municipality.source_name.toLowerCase(), municipality);
    municipalityLookup.set(municipality.source_name.toLowerCase(), municipality);
  }
  if (municipality.market_hpi_lookup) {
    areaLookup.set(municipality.market_hpi_lookup.toLowerCase(), municipality);
    municipalityLookup.set(municipality.market_hpi_lookup.toLowerCase(), municipality);
  }
}

for (const neighborhood of taxonomy.neighborhoods) {
  areaById.set(neighborhood.id, neighborhood);
  areaLookup.set(neighborhood.display_name.toLowerCase(), neighborhood);
  if (neighborhood.source_name) {
    areaLookup.set(neighborhood.source_name.toLowerCase(), neighborhood);
  }
}

for (const propertyType of taxonomy.property_types.estimate_selectable) {
  selectablePropertyTypeById.set(propertyType.id, propertyType);
  propertyTypeLookup.set(propertyType.display_name.toLowerCase(), propertyType.canonical_name);
  propertyTypeLookup.set(propertyType.canonical_name.toLowerCase(), propertyType.canonical_name);
  propertyTypeIdLookup.set(propertyType.display_name.toLowerCase(), propertyType.id);
  propertyTypeIdLookup.set(propertyType.canonical_name.toLowerCase(), propertyType.id);
}

for (const alias of taxonomy.aliases.areas as AreaAlias[]) {
  const area = areaById.get(alias.entity_id);
  if (area) {
    areaLookup.set(alias.alias.toLowerCase(), area);
  }

  if (alias.entity_type === 'municipality') {
    const municipality = municipalityById.get(alias.entity_id);
    if (municipality) {
      municipalityLookup.set(alias.alias.toLowerCase(), municipality);
    }
  }
}

for (const alias of taxonomy.aliases.property_types as PropertyAlias[]) {
  const propertyType = selectablePropertyTypeById.get(alias.entity_id);
  if (propertyType) {
    propertyTypeLookup.set(alias.alias.toLowerCase(), propertyType.canonical_name);
    propertyTypeIdLookup.set(alias.alias.toLowerCase(), propertyType.id);
  }
}

export const TRREB_ZONE_OPTIONS = taxonomy.zones.map((zone) => zone.display_name);

export const ESTIMATE_AREA_OPTIONS = taxonomy.municipalities
  .filter((municipality) => municipality.supports_market_hpi)
  .map((municipality) => municipality.display_name);

export const ESTIMATE_PROPERTY_TYPE_OPTIONS = taxonomy.property_types.estimate_selectable.map(
  (propertyType) => propertyType.display_name
);

export const TRREB_NEIGHBORHOODS = taxonomy.neighborhoods as Neighborhood[];
export const TRREB_MUNICIPALITIES = taxonomy.municipalities as Municipality[];
export const TRREB_TAXONOMY_STATS = taxonomy.stats;

export function normalizeAreaNameForDataLookup(name: string): string {
  const lookup = municipalityLookup.get(name.trim().toLowerCase());
  return lookup?.market_hpi_lookup ?? name;
}

export function getAreaTaxonomy(name: string): TaxonomyArea | null {
  return areaLookup.get(name.trim().toLowerCase()) ?? null;
}

export function getAreaTaxonomyById(id: string): TaxonomyArea | null {
  return areaById.get(id) ?? null;
}

export function getAreaIdForMarketData(name: string): string | null {
  return getAreaTaxonomy(name)?.id ?? null;
}

export function getRegionAndNeighborhoodIds(name: string): {
  areaId: string;
  regionId: string;
  neighborhoodId: string | null;
} | null {
  const area = getAreaTaxonomy(name);
  if (!area) {
    return null;
  }

  if (area.area_level === 'neighborhood') {
    return {
      areaId: area.id,
      regionId: area.parent_id ?? area.id,
      neighborhoodId: area.id,
    };
  }

  return {
    areaId: area.id,
    regionId: area.id,
    neighborhoodId: null,
  };
}

export function normalizePropertyTypeForHpi(name: string): string | null {
  return propertyTypeLookup.get(name.trim().toLowerCase()) ?? null;
}

export function getPropertyTypeIdForMarketData(name: string): string | null {
  return propertyTypeIdLookup.get(name.trim().toLowerCase()) ?? null;
}

export function getMunicipalityTaxonomy(name: string): Municipality | null {
  return municipalityLookup.get(name.trim().toLowerCase()) ?? null;
}

export function getSelectablePropertyTypes(): SelectablePropertyType[] {
  return [...taxonomy.property_types.estimate_selectable];
}
