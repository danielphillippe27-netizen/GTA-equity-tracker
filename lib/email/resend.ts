import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

interface SendWelcomeEmailParams {
  to: string;
  name: string;
  estimatedValue: number;
  equityGained: number;
  region: string;
  propertyType: string;
}

interface SendMonthlyReportParams {
  to: string;
  name: string;
  estimatedValue: number;
  previousValue: number;
  equityGained: number;
  netEquity: number;
  region: string;
  propertyType: string;
  marketChange: number;
}

/**
 * Format currency for email display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Send welcome email when user first subscribes
 */
export async function sendWelcomeEmail({
  to,
  name,
  estimatedValue,
  equityGained,
  region,
  propertyType,
}: SendWelcomeEmailParams) {
  const firstName = name.split(' ')[0] || 'there';

  try {
    const { data, error } = await resend.emails.send({
      from: `GTA Equity Tracker <${FROM_EMAIL}>`,
      to: [to],
      subject: `Welcome to GTA Equity Tracker - Your ${region} ${propertyType} Report`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to GTA Equity Tracker</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0F14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom: 30px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                GTA Equity Tracker
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 16px; padding: 40px;">
              <h2 style="margin: 0 0 10px; color: #ffffff; font-size: 28px;">
                Hey ${firstName}! 👋
              </h2>
              <p style="margin: 0 0 30px; color: #94a3b8; font-size: 16px; line-height: 1.6;">
                You're now tracking your equity position for your <strong style="color: #ffffff;">${region} ${propertyType}</strong>.
              </p>
              
              <!-- Stats Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(0, 0, 0, 0.3); border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">
                    <p style="margin: 0 0 5px; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Estimated Value</p>
                    <p style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">${formatCurrency(estimatedValue)}</p>
                  </td>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0 0 5px; color: #94a3b8; font-size: 12px; text-transform: uppercase;">Equity Gained</p>
                    <p style="margin: 0; color: #22c55e; font-size: 24px; font-weight: 700;">+${formatCurrency(equityGained)}</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0 0 20px; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                <strong style="color: #ffffff;">What happens next?</strong><br>
                Every month, we'll send you an updated equity report as the market changes. No login required — just open your email.
              </p>
              
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                Stay wealthy,<br>
                <strong style="color: #ffffff;">GTA Equity Tracker</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 30px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                You're receiving this because you signed up at GTA Equity Tracker.
              </p>
              <p style="margin: 10px 0 0; color: #64748b; font-size: 12px;">
                <a href="#" style="color: #64748b;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error('[Resend] Welcome email error:', error);
      return { success: false, error };
    }

    console.log('[Resend] Welcome email sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[Resend] Welcome email exception:', error);
    return { success: false, error };
  }
}

/**
 * Send monthly equity report
 */
export async function sendMonthlyReport({
  to,
  name,
  estimatedValue,
  previousValue,
  equityGained,
  netEquity,
  region,
  propertyType,
  marketChange,
}: SendMonthlyReportParams) {
  const firstName = name.split(' ')[0] || 'there';
  const valueChange = estimatedValue - previousValue;
  const valueChangePercent = ((valueChange / previousValue) * 100).toFixed(1);
  const isUp = valueChange >= 0;

  try {
    const { data, error } = await resend.emails.send({
      from: `GTA Equity Tracker <${FROM_EMAIL}>`,
      to: [to],
      subject: `Your ${region} Equity Update: ${isUp ? '📈' : '📉'} ${isUp ? '+' : ''}${valueChangePercent}% this month`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0B0F14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0F14; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px;">
          <!-- Header -->
          <tr>
            <td style="padding-bottom: 30px;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                GTA Equity Tracker
              </h1>
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(6, 182, 212, 0.1)); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 16px; padding: 40px;">
              <h2 style="margin: 0 0 10px; color: #ffffff; font-size: 24px;">
                ${firstName}, here's your monthly update ${isUp ? '📈' : '📉'}
              </h2>
              <p style="margin: 0 0 30px; color: #94a3b8; font-size: 16px;">
                ${region} • ${propertyType}
              </p>
              
              <!-- Main Value -->
              <div style="text-align: center; margin-bottom: 30px;">
                <p style="margin: 0 0 5px; color: #94a3b8; font-size: 14px;">Estimated Current Value</p>
                <p style="margin: 0; font-size: 42px; font-weight: 700; background: linear-gradient(135deg, #3B82F6, #06B6D4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                  ${formatCurrency(estimatedValue)}
                </p>
                <p style="margin: 10px 0 0; color: ${isUp ? '#22c55e' : '#ef4444'}; font-size: 18px; font-weight: 600;">
                  ${isUp ? '↑' : '↓'} ${formatCurrency(Math.abs(valueChange))} (${isUp ? '+' : ''}${valueChangePercent}%)
                </p>
              </div>
              
              <!-- Stats Grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(0, 0, 0, 0.3); border-radius: 12px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 15px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">
                    <p style="margin: 0 0 5px; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Total Equity</p>
                    <p style="margin: 0; color: #22c55e; font-size: 18px; font-weight: 700;">${formatCurrency(equityGained)}</p>
                  </td>
                  <td style="padding: 15px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">
                    <p style="margin: 0 0 5px; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Net Equity</p>
                    <p style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 700;">${formatCurrency(netEquity)}</p>
                  </td>
                  <td style="padding: 15px; text-align: center;">
                    <p style="margin: 0 0 5px; color: #94a3b8; font-size: 11px; text-transform: uppercase;">Market</p>
                    <p style="margin: 0; color: ${marketChange >= 0 ? '#22c55e' : '#ef4444'}; font-size: 18px; font-weight: 700;">${marketChange >= 0 ? '+' : ''}${marketChange.toFixed(1)}%</p>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 0; color: #94a3b8; font-size: 14px;">
                See you next month,<br>
                <strong style="color: #ffffff;">GTA Equity Tracker</strong>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding-top: 30px; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 12px;">
                <a href="#" style="color: #64748b;">Unsubscribe</a> • <a href="#" style="color: #64748b;">Update preferences</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    if (error) {
      console.error('[Resend] Monthly report error:', error);
      return { success: false, error };
    }

    console.log('[Resend] Monthly report sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('[Resend] Monthly report exception:', error);
    return { success: false, error };
  }
}

export { resend };
