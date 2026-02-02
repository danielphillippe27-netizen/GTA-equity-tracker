import dotenv from 'dotenv';
import path from 'path';

// Load env vars BEFORE importing the module that uses them
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testCalculation() {
  // Dynamic import to ensure env vars are loaded first
  const { calculateEquity } = await import('../app/actions/calculate-equity');

  console.log('🧪 Testing Equity Calculation (Bridge Method)...\n');

  // Scenario: Bought in 1993 for $150k in Clarington
  const price = 150000;
  const date = new Date('1993-06-15');
  const area = 'Clarington';
  const type = 'Detached';

  console.log(`Scenario: Bought ${type} in ${area} for $${price.toLocaleString()} in ${date.getFullYear()}`);

  const result = await calculateEquity(price, date, area, type);

  if ('error' in result) {
    console.error('❌ Failed:', result.error);
  } else {
    console.log('\n✅ Result:');
    console.log(`   Estimated Value (2025): $${result.estimatedValue.toLocaleString()}`);
    console.log(`   Total Equity Gained:    $${result.totalEquityGained.toLocaleString()}`);
    console.log(`   Growth:                 ${result.percentageGrowth}%`);
    console.log(`   Method Used:            ${result.calculationMethod}`);
    
    if (result.debug) {
      console.log('\n🔍 Debug Info (The Bridge Logic):');
      console.log(`   - 1993 GTA Average:     $${result.debug.historicAvg.toLocaleString()}`);
      console.log(`   - 2012 Anchor Price:    $${497298}`);
      console.log(`   - Historic Growth:      x${result.debug.historicGrowthFactor.toFixed(2)}`);
      console.log(`   - Est Value in 2012:    $${Math.round(result.debug.estimatedValueIn2012).toLocaleString()}`);
      console.log(`   - Local HPI (Jan 2012): ${result.debug.hpi2012}`);
      console.log(`   - Local HPI (Current):  ${result.debug.currentHPI}`);
      console.log(`   - Modern Growth:        x${result.debug.modernGrowthFactor.toFixed(2)}`);
    }
  }
}

testCalculation();
