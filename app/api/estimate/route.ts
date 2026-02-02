import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { validateHPIInput, HPIEstimateInput, getBenchmarkPrice, getCurrentBenchmarkPrice } from '@/lib/estimation/hpi';
import { calculateEquityBridge, getDataEraLabel } from '@/lib/calculation/bridge-calculator';
import { getDataEra, HPI_START_YEAR } from '@/src/data/historic-averages';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Estimate API] Received request body:', JSON.stringify(body, null, 2));
    
    const {
      sessionId,
      region,
      propertyType,
      purchaseYear,
      purchaseMonth,
      purchasePrice,
    } = body;

    console.log('[Estimate API] Parsed values:', {
      sessionId,
      region,
      propertyType,
      purchaseYear,
      purchaseMonth,
      purchasePrice,
    });

    // Validate input
    const validation = validateHPIInput({
      region,
      propertyType,
      purchaseYear,
      purchaseMonth,
      purchasePrice,
    });

    console.log('[Estimate API] Validation result:', JSON.stringify(validation, null, 2));

    if (!validation.valid) {
      console.error('[Estimate API] Validation failed:', validation.errors);
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Build estimate input
    const estimateInput: HPIEstimateInput = {
      region,
      propertyType,
      purchaseYear,
      purchaseMonth,
      purchasePrice,
    };

    console.log('[Estimate API] Calling calculateEquityBridge with:', estimateInput);

    // Calculate equity using the bridge strategy (handles both eras)
    const result = await calculateEquityBridge(estimateInput);

    console.log('[Estimate API] Bridge calculation result:', JSON.stringify(result, null, 2));

    // Check for calculation errors
    if ('error' in result) {
      console.error('[Estimate API] Calculation error:', result.error);
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Generate estimate ID
    const estimateId = uuidv4();

    // Determine calculation version based on data era
    const dataEra = getDataEra(purchaseYear);
    const calculationVersion = dataEra === 'historic' ? '3.0-bridge-historic' : '3.0-bridge-hpi';

    // Store in database if Supabase is configured
    if (isSupabaseServerConfigured()) {
      const supabase = createServerClient();
      
      const { error } = await supabase.from('estimates').insert({
        id: estimateId,
        session_id: sessionId || uuidv4(),
        address: `${region} - ${propertyType}`,
        purchase_year: result.input.purchaseYear,
        purchase_month: result.input.purchaseMonth,
        purchase_price: result.input.purchasePrice,
        down_payment_percent: 0,
        estimated_value_low: result.scenarios.soft.value,
        estimated_value_mid: result.estimatedCurrentValue,
        estimated_value_high: result.scenarios.hot.value,
        estimated_equity_low: result.scenarios.soft.equity,
        estimated_equity_mid: result.equityGained,
        estimated_equity_high: result.scenarios.hot.equity,
        remaining_mortgage: 0,
        original_loan_amount: 0,
        interest_rate_used: 0,
        market_phase: 'balanced',
        purchase_index: result.appreciationFactor,
        calculation_version: calculationVersion,
      });

      if (error) {
        console.error('Failed to store estimate:', error);
        // Continue anyway - return the calculated result
      }
    }

    return NextResponse.json({
      estimateId,
      result,
    });
  } catch (error) {
    console.error('Estimate calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate estimate. Please try again.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estimateId = searchParams.get('id');

    if (!estimateId) {
      return NextResponse.json(
        { error: 'Estimate ID is required' },
        { status: 400 }
      );
    }

    if (!isSupabaseServerConfigured()) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 503 }
      );
    }

    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('estimates')
      .select('*')
      .eq('id', estimateId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Estimate not found' },
        { status: 404 }
      );
    }

    // Parse region and property type from address field (backward compatible)
    const addressParts = data.address.split(' - ');
    const region = addressParts[0] || '';
    const propertyType = addressParts[1] || '';

    // Determine data era from purchase year
    const purchaseYear = data.purchase_year;
    const dataEra = getDataEra(purchaseYear);
    const isBridgeEstimate = data.calculation_version?.startsWith('3.0');

    // Calculate scenarios from stored data
    const baseValue = data.estimated_value_mid;
    const purchasePrice = data.purchase_price;
    
    const scenarios = {
      hot: {
        value: data.estimated_value_high || Math.round(baseValue * 1.04),
        equity: data.estimated_equity_high || Math.round(baseValue * 1.04) - purchasePrice,
        adjustment: 4,
        label: 'If Market Heats Up',
      },
      balanced: {
        value: baseValue,
        equity: data.estimated_equity_mid,
        adjustment: 0,
        label: 'Current Estimate',
      },
      soft: {
        value: data.estimated_value_low || Math.round(baseValue * 0.92),
        equity: data.estimated_equity_low || Math.round(baseValue * 0.92) - purchasePrice,
        adjustment: -8,
        label: 'If Market Softens',
      },
    };

    // Fetch regional benchmark prices in parallel
    const [benchmarkAtPurchaseResult, benchmarkCurrentResult] = await Promise.all([
      getBenchmarkPrice(region, propertyType, data.purchase_year, data.purchase_month),
      getCurrentBenchmarkPrice(region, propertyType),
    ]);

    // Transform database record back to result format
    const result = {
      input: {
        region,
        propertyType,
        purchaseYear: data.purchase_year,
        purchaseMonth: data.purchase_month,
        purchasePrice: data.purchase_price,
      },
      hpiAtPurchase: isBridgeEstimate ? 100 : 0,
      hpiCurrent: isBridgeEstimate ? data.purchase_index * 100 : 0,
      hpiCurrentDate: new Date().toISOString().slice(0, 7),
      appreciationFactor: data.purchase_index,
      estimatedCurrentValue: data.estimated_value_mid,
      equityGained: data.estimated_equity_mid,
      roiPercent: Math.round((data.purchase_index - 1) * 100 * 10) / 10,
      hpiTrend: [],
      calculatedAt: data.created_at,
      scenarios,
      // Bridge-specific fields
      dataEra,
      dataSource: getDataEraLabel(purchaseYear),
      bridgeNote: purchaseYear < HPI_START_YEAR 
        ? `Using synthetic index based on TRREB average price trends for years prior to ${HPI_START_YEAR}.`
        : undefined,
      // Regional benchmark prices
      benchmarkAtPurchase: benchmarkAtPurchaseResult?.price ?? null,
      benchmarkAtPurchaseDate: benchmarkAtPurchaseResult?.date ?? null,
      benchmarkCurrent: benchmarkCurrentResult?.price ?? null,
      benchmarkCurrentDate: benchmarkCurrentResult?.date ?? null,
    };

    return NextResponse.json({ estimateId, result });
  } catch (error) {
    console.error('Estimate retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve estimate' },
      { status: 500 }
    );
  }
}
