import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyReports } from '@/lib/monthly-reports';

export const maxDuration = 300;

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return process.env.NODE_ENV !== 'production';
  }

  const authorizationHeader = request.headers.get('authorization');
  return authorizationHeader === `Bearer ${cronSecret}`;
}

function parseLimit(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

async function handleRequest(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun =
    searchParams.get('dryRun') === '1' || searchParams.get('dryRun') === 'true';
  const limit = parseLimit(searchParams.get('limit'));
  const subscriberId = searchParams.get('subscriberId') || undefined;

  try {
    const summary = await runMonthlyReports({
      dryRun,
      limit,
      subscriberId,
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error('[Monthly Reports Cron] Failed to process monthly reports:', error);
    return NextResponse.json(
      {
        error: 'Failed to process monthly reports',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}
