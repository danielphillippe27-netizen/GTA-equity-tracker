'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts';
import { HPIDataPoint } from '@/lib/estimation/hpi';
import { InfoTooltip } from '@/components/shared';

interface HPITrendChartProps {
  data: HPIDataPoint[];
  purchaseDate: string;
  purchaseHPI: number;
  currentHPI: number;
  className?: string;
  title?: string;
  description?: string;
  tooltipContent?: string;
  height?: number;
}

// Custom tooltip component
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (active && payload && payload.length) {
    const date = label || '';
    const [year, month] = date.split('-');
    const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-US', { month: 'short' });
    
    return (
      <div className="bg-surface-elevated border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">
          {monthName} {year}
        </p>
        <p className="text-sm font-semibold text-foreground">
          Index: {payload[0].value.toFixed(1)}
        </p>
      </div>
    );
  }
  return null;
}

export function HPITrendChart({
  data,
  purchaseDate,
  purchaseHPI,
  currentHPI,
  className,
  title = 'Market trend',
  description = 'Market index from your purchase date to today',
  tooltipContent,
  height = 256,
}: HPITrendChartProps) {
  // Transform data for chart
  const chartData = useMemo(() => {
    return data.map((point) => ({
      date: point.reportMonth,
      hpi: point.hpiIndex,
      label: formatDateLabel(point.reportMonth),
    }));
  }, [data]);

  // Find min/max for Y axis
  const { minHPI, maxHPI } = useMemo(() => {
    if (chartData.length === 0) return { minHPI: 90, maxHPI: 150 };
    const values = chartData.map((d) => d.hpi);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    return {
      minHPI: Math.floor(min - padding),
      maxHPI: Math.ceil(max + padding),
    };
  }, [chartData]);

  // Find purchase and current data points for reference dots
  const purchasePoint = chartData.find((d) => d.date === purchaseDate);
  const currentPoint = chartData[chartData.length - 1];

  if (chartData.length === 0) {
    return (
      <div className={`p-6 rounded-xl bg-surface border border-border ${className}`}>
        <p className="text-muted-foreground text-center">No trend data available</p>
      </div>
    );
  }

  return (
    <motion.div
      className={`p-6 rounded-2xl bg-surface border border-border ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {description}
          </p>
        </div>
        {tooltipContent ? <InfoTooltip content={tooltipContent} className="mt-1" /> : null}
      </div>

      <div className="w-full" style={{ minHeight: `${height}px`, minWidth: '100px' }}>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="hpiGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={(value) => {
                const [year, month] = value.split('-');
                return `${month}/${year.slice(2)}`;
              }}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[minHPI, maxHPI]}
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value.toFixed(0)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="hpi"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#hpiGradient)"
            />
            {/* Purchase point marker */}
            {purchasePoint && (
              <ReferenceDot
                x={purchasePoint.date}
                y={purchasePoint.hpi}
                r={6}
                fill="#06B6D4"
                stroke="#0B0F14"
                strokeWidth={2}
              />
            )}
            {/* Current point marker */}
            {currentPoint && (
              <ReferenceDot
                x={currentPoint.date}
                y={currentPoint.hpi}
                r={6}
                fill="#3B82F6"
                stroke="#0B0F14"
                strokeWidth={2}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-cyan" />
          <span>Purchase ({purchaseHPI.toFixed(1)})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-blue" />
          <span>Current ({currentHPI.toFixed(1)})</span>
        </div>
      </div>
    </motion.div>
  );
}

// Helper to format date label
function formatDateLabel(reportMonth: string): string {
  const [year, month] = reportMonth.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}
