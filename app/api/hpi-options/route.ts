import { NextResponse } from 'next/server';
import { getAvailableRegions, getAvailablePropertyTypes } from '@/lib/estimation/hpi';

export async function GET() {
  try {
    const [regions, propertyTypes] = await Promise.all([
      getAvailableRegions(),
      getAvailablePropertyTypes(),
    ]);

    return NextResponse.json({
      regions,
      propertyTypes,
    });
  } catch (error) {
    console.error('Error fetching HPI options:', error);
    return NextResponse.json(
      { error: 'Failed to fetch options' },
      { status: 500 }
    );
  }
}
