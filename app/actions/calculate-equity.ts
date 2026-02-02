'use server';

import { createClient } from '@supabase/supabase-js';
import { HISTORIC_ANNUAL_AVERAGES, ANCHOR_PRICE_2012 } from '@/lib/historic-averages';
import { getLookupKeys } from '@/lib/district-mapping';

// Initialize Supabase Client (Service Role needed for RLS if not authenticated, but Anon is fine for reading public data)
// Using process.env directly since this is server-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseKey);

interface EquityResult {
  estimatedValue: number;
  totalEquityGained: number;
  percentageGrowth: number;
  calculationMethod: 'HPI_Standard' | 'Historic_Bridge';
  debug?: any;
}

export async function calculateEquity(
  purchasePrice: number,
  purchaseDate: Date,
  areaName: string,
  propertyType: string
): Promise<EquityResult | { error: string }> {
  try {
    const purchaseYear = purchaseDate.getFullYear();
    const purchaseMonth = purchaseDate.getMonth() + 1;
    const formattedPurchaseMonth = `${purchaseYear}-${purchaseMonth.toString().padStart(2, '0')}`;
    
    // Normalize Area Name (Handle "Pickering" vs "E13")
    // We use the lookup keys to find ANY match in the DB
    const lookupAreas = getLookupKeys(areaName);

    // --- SCENARIO A: Modern Era (2012+) ---
    if (purchaseYear >= 2012) {
      // 1. Get Purchase HPI
      const { data: purchaseData, error: pError } = await supabase
        .from('market_hpi')
        .select('hpi_index')
        .in('area_name', lookupAreas)
        .eq('property_category', propertyType)
        .eq('report_month', formattedPurchaseMonth)
        .maybeSingle(); // Use maybeSingle to avoid 406 error if multiple rows match (shouldn't due to unique constraint, but safe)

      if (pError || !purchaseData) {
        // Fallback: Try finding closest month? Or error out.
        console.error('HPI not found for purchase date:', formattedPurchaseMonth, areaName);
        return { error: `No HPI data found for ${areaName} in ${formattedPurchaseMonth}` };
      }

      const purchaseHPI = purchaseData.hpi_index;

      // 2. Get Current HPI (Most Recent)
      const { data: currentData, error: cError } = await supabase
        .from('market_hpi')
        .select('hpi_index, report_month')
        .in('area_name', lookupAreas)
        .eq('property_category', propertyType)
        .order('report_month', { ascending: false })
        .limit(1)
        .single();

      if (cError || !currentData) {
        return { error: `No current HPI data found for ${areaName}` };
      }

      const currentHPI = currentData.hpi_index;

      // 3. Calculate
      const currentValue = purchasePrice * (currentHPI / purchaseHPI);

      return {
        estimatedValue: Math.round(currentValue),
        totalEquityGained: Math.round(currentValue - purchasePrice),
        percentageGrowth: parseFloat(((currentValue - purchasePrice) / purchasePrice * 100).toFixed(2)),
        calculationMethod: 'HPI_Standard'
      };
    }

    // --- SCENARIO B: Bridge Era (< 2012) ---
    else {
      // Leg 1: Historic Growth (Purchase -> 2012)
      const historicAvg = HISTORIC_ANNUAL_AVERAGES[purchaseYear];
      
      if (!historicAvg) {
        return { error: `No historic data available for year ${purchaseYear}` };
      }

      // How much did the general market grow from PurchaseYear to 2012?
      const historicGrowthFactor = ANCHOR_PRICE_2012 / historicAvg;
      const estimatedValueIn2012 = purchasePrice * historicGrowthFactor;

      // Leg 2: Local Growth (2012 -> Now)
      // Get Jan 2012 HPI for this specific area
      const { data: hpi2012Data, error: h2012Error } = await supabase
        .from('market_hpi')
        .select('hpi_index')
        .in('area_name', lookupAreas)
        .eq('property_category', propertyType)
        .eq('report_month', '2012-01') // Anchor point
        .maybeSingle();

      // Get Current HPI
      const { data: currentData, error: cError } = await supabase
        .from('market_hpi')
        .select('hpi_index')
        .in('area_name', lookupAreas)
        .eq('property_category', propertyType)
        .order('report_month', { ascending: false })
        .limit(1)
        .single();

      if (!hpi2012Data || !currentData) {
        // Fallback: If local data is missing for 2012 (unlikely), 
        // we could just return the 2012 estimate adjusted by general inflation?
        // But for now, let's error to be safe.
        return { error: `Missing HPI bridge data for ${areaName} (Need Jan 2012 & Current)` };
      }

      const hpi2012 = hpi2012Data.hpi_index;
      const currentHPI = currentData.hpi_index;
      
      const modernGrowthFactor = currentHPI / hpi2012;

      // Final Calc
      const currentValue = estimatedValueIn2012 * modernGrowthFactor;

      return {
        estimatedValue: Math.round(currentValue),
        totalEquityGained: Math.round(currentValue - purchasePrice),
        percentageGrowth: parseFloat(((currentValue - purchasePrice) / purchasePrice * 100).toFixed(2)),
        calculationMethod: 'Historic_Bridge',
        debug: {
          purchaseYear,
          historicAvg,
          historicGrowthFactor,
          estimatedValueIn2012,
          hpi2012,
          currentHPI,
          modernGrowthFactor
        }
      };
    }

  } catch (err: any) {
    console.error('Calculation Error:', err);
    return { error: err.message || 'Unknown error occurred' };
  }
}
