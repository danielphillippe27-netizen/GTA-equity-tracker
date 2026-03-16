import { formatCurrency, formatPercent } from '@/lib/constants';
import type {
  SellBuyCalculatorFormValues,
  SellBuyCalculatorResults,
} from '@/types/sell-buy-calculator';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildSummaryRow(label: string, value: string, options?: { negative?: boolean }) {
  return `
    <div class="row">
      <span>${escapeHtml(label)}</span>
      <strong class="${options?.negative ? 'negative' : ''}">${escapeHtml(value)}</strong>
    </div>
  `;
}

function getMortgageModeLabel(mode: SellBuyCalculatorFormValues['financing']['mode']) {
  return mode === 'port' ? 'Keep Your Current Rate' : 'New Mortgage';
}

function getRateLabel(formValues: SellBuyCalculatorFormValues, results: SellBuyCalculatorResults) {
  if (formValues.financing.mode === 'port') {
    return formatPercent(results.financing.mortgagePayment.effectiveRate, 2);
  }

  return formatPercent(formValues.financing.simpleInterestRate, 2);
}

export function buildSellBuyPrintableReportHtml({
  formValues,
  results,
  generatedAt,
}: {
  formValues: SellBuyCalculatorFormValues;
  results: SellBuyCalculatorResults;
  generatedAt: string;
}) {
  const totalSalePayout = results.sale.mortgagePayout + results.sale.totalSellingCosts;
  const cityLabel = formValues.purchase.city.trim() || 'Ontario';

  return `<!doctype html>
<html lang="en-CA">
  <head>
    <meta charset="utf-8" />
    <title>Sell and Buy Results</title>
    <style>
      @page {
        size: letter;
        margin: 18mm;
      }

      :root {
        color-scheme: light;
        --ink: #0f172a;
        --muted: #5b667a;
        --line: #d8dee8;
        --panel: #f5f8fc;
        --panel-strong: #eaf4ff;
        --accent: #0ea5e9;
        --accent-strong: #0369a1;
        --negative: #be123c;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--ink);
        background: #ffffff;
      }

      .report {
        display: grid;
        gap: 18px;
      }

      .hero {
        padding: 28px;
        border: 1px solid #cfe8fb;
        border-radius: 24px;
        background: linear-gradient(135deg, #eff8ff 0%, #ffffff 56%);
      }

      .eyebrow {
        margin: 0;
        font-size: 11px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--accent-strong);
      }

      h1 {
        margin: 10px 0 8px;
        font-size: 30px;
        line-height: 1.15;
      }

      .subhead {
        margin: 0;
        max-width: 700px;
        font-size: 14px;
        line-height: 1.7;
        color: var(--muted);
      }

      .generated {
        margin-top: 10px;
        font-size: 12px;
        color: var(--muted);
      }

      .stats {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
        margin-top: 20px;
      }

      .stat {
        padding: 16px 18px;
        border: 1px solid var(--line);
        border-radius: 18px;
        background: rgba(255, 255, 255, 0.9);
      }

      .stat-label {
        margin: 0;
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .stat-value {
        margin: 8px 0 0;
        font-size: 28px;
        font-weight: 700;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px;
      }

      .card {
        padding: 20px;
        border: 1px solid var(--line);
        border-radius: 20px;
        background: var(--panel);
        break-inside: avoid;
      }

      .card h2 {
        margin: 10px 0 0;
        font-size: 20px;
        line-height: 1.25;
      }

      .card-copy {
        margin: 10px 0 0;
        font-size: 13px;
        line-height: 1.7;
        color: var(--muted);
      }

      .row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 16px;
        padding: 12px 0;
        border-bottom: 1px solid var(--line);
        font-size: 14px;
      }

      .row:last-child {
        border-bottom: 0;
        padding-bottom: 0;
      }

      .row strong {
        text-align: right;
      }

      .negative {
        color: var(--negative);
      }

      .focus {
        margin-top: 16px;
        padding: 16px 18px;
        border-radius: 18px;
        background: var(--panel-strong);
        border: 1px solid #cfe8fb;
      }

      .focus p {
        margin: 0;
      }

      .focus-label {
        font-size: 11px;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent-strong);
      }

      .focus-value {
        margin-top: 6px;
        font-size: 26px;
        font-weight: 700;
      }

      .warnings {
        padding: 18px 20px;
        border: 1px solid #fed7aa;
        border-radius: 20px;
        background: #fff7ed;
      }

      .warnings h2 {
        margin: 0 0 10px;
        font-size: 18px;
      }

      .warnings ul {
        margin: 0;
        padding-left: 18px;
        color: #9a3412;
      }

      .warnings li + li {
        margin-top: 8px;
      }

      .footer {
        font-size: 12px;
        line-height: 1.7;
        color: var(--muted);
      }

      @media print {
        .hero,
        .card,
        .warnings {
          box-shadow: none;
        }
      }

      @media (max-width: 720px) {
        .stats,
        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main class="report">
      <section class="hero">
        <p class="eyebrow">Sell and Buy Calculator</p>
        <h1>Your move breakdown</h1>
        <p class="subhead">
          Sale price ${escapeHtml(formatCurrency(results.sale.grossSalePrice))}, purchase target
          ${escapeHtml(formatCurrency(formValues.purchase.purchasePrice))}, and a projected
          ${escapeHtml(results.insights.moveType)} move in ${escapeHtml(cityLabel)}, Ontario.
        </p>
        <p class="generated">Generated ${escapeHtml(generatedAt)}</p>

        <div class="stats">
          <div class="stat">
            <p class="stat-label">Net Equity</p>
            <p class="stat-value">${escapeHtml(formatCurrency(results.sale.totalNetCashFromSale))}</p>
          </div>
          <div class="stat">
            <p class="stat-label">Mortgage Needed</p>
            <p class="stat-value">${escapeHtml(formatCurrency(results.purchase.totalMortgageNeeded))}</p>
          </div>
          <div class="stat">
            <p class="stat-label">Monthly Mortgage Payment</p>
            <p class="stat-value">${escapeHtml(formatCurrency(results.financing.monthlyMortgagePayment))}</p>
          </div>
          <div class="stat">
            <p class="stat-label">Total Monthly Housing Cost</p>
            <p class="stat-value">${escapeHtml(formatCurrency(results.financing.totalMonthlyHousingCost))}</p>
          </div>
        </div>
      </section>

      <section class="grid">
        <article class="card">
          <p class="eyebrow">Step 1</p>
          <h2>Sell your current home</h2>
          <p class="card-copy">This shows the sale price, the payout on the current mortgage, and the fees deducted before equity is available for your next move.</p>
          ${buildSummaryRow('Selling price', formatCurrency(results.sale.grossSalePrice))}
          ${buildSummaryRow('Mortgage payout', formatCurrency(results.sale.mortgagePayout), { negative: true })}
          ${buildSummaryRow('Realtor commission', formatCurrency(results.commission.baseCommission), { negative: true })}
          ${buildSummaryRow('HST on commission', formatCurrency(results.commission.hstAmount), { negative: true })}
          ${buildSummaryRow('Lawyer fees', formatCurrency(formValues.currentHome.legalFeesOnSale), { negative: true })}
          ${buildSummaryRow('Discharge fee', formatCurrency(formValues.currentHome.mortgageDischargeFee), { negative: true })}
          ${buildSummaryRow('Mortgage penalty', formatCurrency(formValues.currentHome.mortgagePenalty), { negative: true })}
          ${buildSummaryRow('Bridge financing estimate', formatCurrency(formValues.currentHome.bridgeFinancingEstimate), { negative: true })}
          <div class="focus">
            <p class="focus-label">Mortgage + fees</p>
            <p class="focus-value">${escapeHtml(formatCurrency(totalSalePayout))}</p>
          </div>
          <div class="focus">
            <p class="focus-label">Net equity</p>
            <p class="focus-value">${escapeHtml(formatCurrency(results.sale.totalNetCashFromSale))}</p>
          </div>
        </article>

        <article class="card">
          <p class="eyebrow">Step 2</p>
          <h2>Buy your next home</h2>
          <p class="card-copy">Closing costs, land transfer tax, and how much equity you are applying to the next purchase.</p>
          ${buildSummaryRow('Purchase price', formatCurrency(formValues.purchase.purchasePrice))}
          ${buildSummaryRow('Ontario land transfer tax', formatCurrency(results.purchase.landTransferTax.provincialTax))}
          ${results.purchase.landTransferTax.appliesTorontoTax ? buildSummaryRow('Toronto municipal LTT', formatCurrency(results.purchase.landTransferTax.municipalTax)) : ''}
          ${buildSummaryRow('Title insurance and adjustments', formatCurrency(formValues.purchase.titleInsuranceAndAdjustments))}
          ${buildSummaryRow('Additional cash added', formatCurrency(formValues.purchase.additionalCashAdded))}
          ${buildSummaryRow('Equity used', formatCurrency(results.purchase.amountOfEquityUsed))}
          <div class="focus">
            <p class="focus-label">Cash needed to close</p>
            <p class="focus-value">${escapeHtml(formatCurrency(results.purchase.totalCashContribution))}</p>
          </div>
          <div class="focus">
            <p class="focus-label">Mortgage needed</p>
            <p class="focus-value">${escapeHtml(formatCurrency(results.purchase.totalMortgageNeeded))}</p>
          </div>
        </article>

        <article class="card">
          <p class="eyebrow">Step 3</p>
          <h2>Your new mortgage</h2>
          <p class="card-copy">A simple payment view of the financing setup, including the blended rate approximation when you keep the current mortgage.</p>
          ${buildSummaryRow('Mortgage setup', getMortgageModeLabel(formValues.financing.mode))}
          ${buildSummaryRow('Interest rate used', getRateLabel(formValues, results))}
          ${buildSummaryRow('Years left on mortgage', `${formValues.financing.amortizationYears} years`)}
          ${buildSummaryRow('Payment schedule', formValues.financing.paymentFrequency)}
          ${formValues.financing.mode === 'port' ? buildSummaryRow('Amount kept from current mortgage', formatCurrency(results.financing.mortgagePayment.portedBalanceUsed)) : ''}
          ${formValues.financing.mode === 'port' ? buildSummaryRow('New amount borrowed', formatCurrency(results.financing.mortgagePayment.topUpAmount)) : ''}
          ${buildSummaryRow('Monthly mortgage payment', formatCurrency(results.financing.monthlyMortgagePayment))}
          ${buildSummaryRow('Property taxes monthly', formatCurrency(results.financing.propertyTaxesMonthly))}
          ${buildSummaryRow('Condo fees monthly', formatCurrency(results.financing.condoFeesMonthly))}
          <div class="focus">
            <p class="focus-label">Total monthly housing cost</p>
            <p class="focus-value">${escapeHtml(formatCurrency(results.financing.totalMonthlyHousingCost))}</p>
          </div>
          <div class="focus">
            <p class="focus-label">Payment difference vs current</p>
            <p class="focus-value">${escapeHtml(`${results.financing.monthlyPaymentDifference >= 0 ? '+' : '-'}${formatCurrency(Math.abs(results.financing.monthlyPaymentDifference))}`)}</p>
          </div>
        </article>

        <article class="card">
          <p class="eyebrow">Results</p>
          <h2>At a glance</h2>
          <p class="card-copy">A condensed summary you can keep for planning conversations or save as a PDF from the print dialog.</p>
          ${buildSummaryRow('Selling price', formatCurrency(results.sale.grossSalePrice))}
          ${buildSummaryRow('Mortgage + fees', formatCurrency(totalSalePayout))}
          ${buildSummaryRow('Net equity', formatCurrency(results.sale.totalNetCashFromSale))}
          ${buildSummaryRow('Land transfer tax', formatCurrency(results.purchase.landTransferTax.totalTax))}
          ${buildSummaryRow('Cash needed to close', formatCurrency(results.purchase.totalCashContribution))}
          ${buildSummaryRow('Mortgage needed', formatCurrency(results.purchase.totalMortgageNeeded))}
          ${buildSummaryRow('Cash left over after closing', formatCurrency(results.purchase.cashRemainingAfterClose))}
          ${buildSummaryRow('Loan-to-value ratio', formatPercent(results.financing.loanToValueRatio, 1))}
        </article>
      </section>

      ${results.warnings.length > 0 ? `
        <section class="warnings">
          <h2>Things to check</h2>
          <ul>
            ${results.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}
          </ul>
        </section>
      ` : ''}

      <p class="footer">
        Planning estimate only. Final proceeds, taxes, and mortgage qualification depend on your lender, lawyer, property details, and actual closing statements.
      </p>
    </main>
  </body>
</html>`;
}
