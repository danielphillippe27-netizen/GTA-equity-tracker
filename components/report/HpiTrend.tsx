'use client';

import { HPITrendChart } from '@/components/results';
import { HPIDataPoint } from '@/lib/estimation/hpi';

interface HpiTrendProps {
  data: HPIDataPoint[];
  purchaseDate: string;
  purchaseHpi: number;
  currentHpi: number;
}

export function HpiTrend({
  data,
  purchaseDate,
  purchaseHpi,
  currentHpi,
}: HpiTrendProps) {
  return (
    <HPITrendChart
      data={data}
      purchaseDate={purchaseDate}
      purchaseHPI={purchaseHpi}
      currentHPI={currentHpi}
      title="Market trend (HPI)"
      description="Tracks benchmark price movement in your area for your home type."
      tooltipContent="Tracks benchmark price movement in your area for your home type."
      height={320}
    />
  );
}
