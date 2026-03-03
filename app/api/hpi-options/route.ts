import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import {
  ESTIMATE_AREA_OPTIONS,
  ESTIMATE_PROPERTY_TYPE_OPTIONS,
  TRREB_NEIGHBORHOODS,
  TRREB_MUNICIPALITIES,
  getSelectablePropertyTypes,
} from '@/lib/trreb-taxonomy';

type AreaOption = {
  id: string;
  display_name: string;
  slug: string;
  parent_id: string | null;
  parent_display_name: string | null;
  level: string;
  kind: string;
  market_hpi_lookup: string | null;
};

type PropertyTypeOption = {
  id: string;
  display_name: string;
  slug: string;
  canonical_name: string | null;
  hpi_lookup_name: string | null;
  sort_order: number;
};

type NeighborhoodOption = {
  id: string;
  display_name: string;
  slug: string;
  parent_id: string;
  parent_display_name: string;
  level: string;
  kind: string;
};

type OptionsPayload = {
  regions: string[];
  propertyTypes: string[];
  regionOptions: AreaOption[];
  propertyTypeOptions: PropertyTypeOption[];
  neighborhoodOptions: NeighborhoodOption[];
};

const CACHE_TTL_MS = 10 * 60 * 1000;

let cachedPayload: OptionsPayload | null = null;
let cachedAt = 0;

function buildFallbackPayload(): OptionsPayload {
  return {
    regions: ESTIMATE_AREA_OPTIONS,
    propertyTypes: ESTIMATE_PROPERTY_TYPE_OPTIONS,
    regionOptions: TRREB_MUNICIPALITIES.filter((option) => option.supports_market_hpi).map(
      (option) => ({
        id: option.id,
        display_name: option.display_name,
        slug: option.slug,
        parent_id: option.parent_id,
        parent_display_name: option.parent_display_name,
        level: option.area_level,
        kind: option.area_kind,
        market_hpi_lookup: option.market_hpi_lookup,
      })
    ),
    propertyTypeOptions: getSelectablePropertyTypes().map((option) => ({
      id: option.id,
      display_name: option.display_name,
      slug: option.slug,
      canonical_name: option.canonical_name,
      hpi_lookup_name: option.hpi_lookup_name,
      sort_order: option.sort_order,
    })),
    neighborhoodOptions: TRREB_NEIGHBORHOODS.map((option) => ({
      id: option.id,
      display_name: option.display_name,
      slug: option.slug,
      parent_id: option.parent_id,
      parent_display_name: option.parent_display_name,
      level: option.area_level,
      kind: option.area_kind,
    })),
  };
}

export async function GET() {
  try {
    const now = Date.now();
    if (cachedPayload && now - cachedAt < CACHE_TTL_MS) {
      return NextResponse.json(cachedPayload, {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
        },
      });
    }

    const supabase = createServerClient();

    const [
      { data: areaOptions, error: areasError },
      { data: propertyTypeOptions, error: propertyTypesError },
      { data: neighborhoodOptions, error: neighborhoodsError },
    ] =
      await Promise.all([
        supabase
          .from('v_trreb_selectable_areas')
          .select(
            'id, display_name, slug, parent_id, parent_display_name, level, kind, market_hpi_lookup'
          )
          .order('display_name', { ascending: true }),
        supabase
          .from('v_trreb_selectable_property_types')
          .select('id, display_name, slug, canonical_name, hpi_lookup_name, sort_order')
          .order('sort_order', { ascending: true }),
        supabase
          .from('trreb_area_taxonomy')
          .select(
            'id, display_name, slug, parent_id, parent_display_name, area_level, area_kind'
          )
          .eq('area_level', 'neighborhood')
          .order('parent_display_name', { ascending: true })
          .order('display_name', { ascending: true }),
      ]);

    if (areasError || propertyTypesError || neighborhoodsError) {
      console.warn('Falling back to local taxonomy for HPI options:', {
        areasError,
        propertyTypesError,
        neighborhoodsError,
      });
      const fallbackPayload = buildFallbackPayload();
      cachedPayload = fallbackPayload;
      cachedAt = now;

      return NextResponse.json(fallbackPayload, {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
          'X-HPI-Options-Source': 'fallback',
        },
      });
    }

    const payload: OptionsPayload = {
      regions: (areaOptions ?? []).map((option) => option.display_name),
      propertyTypes: (propertyTypeOptions ?? []).map((option) => option.display_name),
      regionOptions: (areaOptions ?? []) as AreaOption[],
      propertyTypeOptions: (propertyTypeOptions ?? []) as PropertyTypeOption[],
      neighborhoodOptions: ((neighborhoodOptions ?? []).map((option) => ({
        id: option.id,
        display_name: option.display_name,
        slug: option.slug,
        parent_id: option.parent_id,
        parent_display_name: option.parent_display_name,
        level: option.area_level,
        kind: option.area_kind,
      })) ?? []) as NeighborhoodOption[],
    };

    cachedPayload = payload;
    cachedAt = now;

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
        'X-HPI-Options-Source': 'supabase',
      },
    });
  } catch (error) {
    console.error('Error fetching HPI options:', error);
    return NextResponse.json(buildFallbackPayload(), {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
        'X-HPI-Options-Source': 'fallback',
      },
    });
  }
}
