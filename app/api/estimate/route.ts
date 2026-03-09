import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import {
  validateHPIInput,
  HPIEstimateInput,
  type CurrentMarketStats,
  type HPIDataPoint,
} from '@/lib/estimation/hpi';
import { calculateEquityBridge, getDataEraLabel } from '@/lib/calculation/bridge-calculator';
import { getDataEra, HPI_START_YEAR } from '@/src/data/historic-averages';
import { v4 as uuidv4 } from 'uuid';
import { getWorkspaceBySlug } from '@/lib/workspaces';

async function ensureSessionExists(
  supabase: ReturnType<typeof createServerClient>,
  requestedSessionId?: string | null
) {
  const sessionId = requestedSessionId || uuidv4();

  const { data: existingSession, error: selectError } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .maybeSingle();

  if (selectError) {
    throw selectError;
  }

  if (!existingSession) {
    const { error: insertError } = await supabase.from('sessions').insert({
      id: sessionId,
      metadata: {
        source: 'api/estimate',
      },
    });

    if (insertError) {
      throw insertError;
    }
  }

  return sessionId;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[Estimate API] Received request body:', JSON.stringify(body, null, 2));
    
    const {
      sessionId,
      workspaceSlug,
      region,
      propertyType,
      purchaseYear,
      purchaseMonth,
      purchasePrice,
    } = body;

    console.log('[Estimate API] Parsed values:', {
      sessionId,
      workspaceSlug,
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

    const workspace = workspaceSlug ? await getWorkspaceBySlug(workspaceSlug) : null;

    if (!workspace) {
      return NextResponse.json(
        { error: 'A valid workspace slug is required for estimate generation.' },
        { status: 400 }
      );
    }

    console.log('[Estimate API] Calling calculateEquityBridge with:', estimateInput);

    // Calculate equity using the bridge strategy (handles both eras)
    const result = await calculateEquityBridge(estimateInput, {
      workspaceId: workspace.id,
    });

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
      const persistedSessionId = await ensureSessionExists(supabase, sessionId);
      
      const { error } = await supabase.from('estimates').insert({
        id: estimateId,
        workspace_id: workspace.id,
        session_id: persistedSessionId,
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
        return NextResponse.json(
          { error: 'Failed to store estimate. Please try again.' },
          { status: 500 }
        );
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

    const [subscriberPropertyResponse, agentClientPropertyResponse] = await Promise.all([
      supabase
        .from('subscribers')
        .select('property_data')
        .eq('estimate_id', estimateId)
        .order('subscribed_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('agent_clients')
        .select('property_data')
        .eq('estimate_id', estimateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const subscriberPropertyData =
      (subscriberPropertyResponse.data?.property_data as Record<string, unknown> | undefined) ?? null;
    const agentClientPropertyData =
      (agentClientPropertyResponse.data?.property_data as Record<string, unknown> | undefined) ?? null;
    const persistedPropertyData = subscriberPropertyData ?? agentClientPropertyData;

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

    const liveBridgeResult = await calculateEquityBridge({
      region,
      propertyType,
      purchaseYear: data.purchase_year,
      purchaseMonth: data.purchase_month,
      purchasePrice: data.purchase_price,
    }, {
      workspaceId: data.workspace_id ?? null,
    });

    // Transform database record back to result format
    const result: {
      input: HPIEstimateInput;
      hpiAtPurchase: number;
      hpiCurrent: number;
      hpiCurrentDate: string;
      appreciationFactor: number;
      estimatedCurrentValue: number;
      equityGained: number;
      roiPercent: number;
      hpiTrend: HPIDataPoint[];
      calculatedAt: string;
      scenarios: typeof scenarios;
      dataEra: ReturnType<typeof getDataEra>;
      dataSource: string;
      bridgeNote: string | undefined;
      benchmarkAtPurchase: number | null;
      benchmarkAtPurchaseDate: string | null;
      benchmarkCurrent: number | null;
      benchmarkCurrentDate: string | null;
      currentMarketStats: CurrentMarketStats | undefined;
    } = {
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
      benchmarkAtPurchase: null,
      benchmarkAtPurchaseDate: null,
      benchmarkCurrent: null,
      benchmarkCurrentDate: null,
      currentMarketStats: undefined,
    };

    if (!('error' in liveBridgeResult)) {
      result.hpiAtPurchase = liveBridgeResult.hpiAtPurchase;
      result.hpiCurrent = liveBridgeResult.hpiCurrent;
      result.hpiCurrentDate = liveBridgeResult.hpiCurrentDate;
      result.hpiTrend = liveBridgeResult.hpiTrend;
      result.benchmarkAtPurchase = liveBridgeResult.benchmarkAtPurchase;
      result.benchmarkAtPurchaseDate = liveBridgeResult.benchmarkAtPurchaseDate;
      result.benchmarkCurrent = liveBridgeResult.benchmarkCurrent;
      result.benchmarkCurrentDate = liveBridgeResult.benchmarkCurrentDate;
      result.currentMarketStats = liveBridgeResult.currentMarketStats;
      result.dataSource = liveBridgeResult.dataSource;
      result.bridgeNote = liveBridgeResult.bridgeNote;
    }

    return NextResponse.json({
      estimateId,
      result,
      propertyData: persistedPropertyData,
    });
  } catch (error) {
    console.error('Estimate retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve estimate' },
      { status: 500 }
    );
  }
}
