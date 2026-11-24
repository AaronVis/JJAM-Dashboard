import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { TrendingDown, Calendar } from 'lucide-react';
import { calculateBurndownData } from '../utils/burndown';

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err) {
    console.warn('Burndown visual error:', err);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-64 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
          Burn-down chart preview unavailable for current selection.
        </div>
      );
    }
    return this.props.children;
  }
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const dataItem = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-800 space-y-1.5 min-w-[170px]">
        <div className="flex items-center justify-between border-b border-slate-700/80 pb-1 font-semibold text-slate-300">
          <span>Date: {dataItem.date}</span>
          {dataItem.isDemoToday && (
            <span className="bg-blue-600/80 text-white text-[10px] px-1.5 py-0.2 rounded font-mono">
              Today
            </span>
          )}
        </div>
        <div className="flex justify-between items-center text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span> Ideal Remaining:
          </span>
          <span className="font-mono font-bold text-white">{dataItem.idealRemaining}d</span>
        </div>
        {dataItem.actualRemaining !== null && (
          <div className="flex justify-between items-center text-blue-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span> Actual Remaining:
            </span>
            <span className="font-mono font-bold text-white">{dataItem.actualRemaining}d</span>
          </div>
        )}
        {dataItem.actualRemaining !== null && (
          <div className="pt-1 border-t border-slate-800 flex justify-between items-center text-[11px]">
            <span className="text-slate-400">Variance:</span>
            <span className={`font-mono font-bold ${dataItem.actualRemaining > dataItem.idealRemaining ? 'text-rose-400' : 'text-emerald-400'}`}>
              {dataItem.actualRemaining > dataItem.idealRemaining ? `+${(dataItem.actualRemaining - dataItem.idealRemaining).toFixed(1)}d behind` : `${(dataItem.idealRemaining - dataItem.actualRemaining).toFixed(1)}d ahead`}
            </span>
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function BurndownChart({ project, tasks, demoDate }) {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 text-center text-slate-400 text-xs">
        No active tasks found for burn-down chart calculation.
      </div>
    );
  }

  const chartData = calculateBurndownData(project, tasks, demoDate);

  // Find demo date label for ReferenceLine
  const demoPoint = chartData.find((d) => d.isDemoToday);
  const demoDateLabel = demoPoint ? demoPoint.dateLabel : null;

  // Calculate current effort stats
  const totalEffort = tasks.reduce((sum, t) => sum + (Number(t.effortDays) || 1), 0);
  const currentActual = demoPoint?.actualRemaining ?? 0;
  const currentIdeal = demoPoint?.idealRemaining ?? 0;
  const effortVariance = Math.round((currentActual - currentIdeal) * 10) / 10;
  const fillId = `burndown-fill-${React.useId().replace(/:/g, '')}`;

  return (
    <div className="workspace-chart bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Project Burn-down Velocity (Effort Days Remaining)
            </h3>
          </div>
          <p className="text-xs text-slate-500">
            Comparing ideal linear burn-down against actual remaining effort based on % completion.
          </p>
        </div>

        {/* Stats Pill */}
        <div className="flex items-center gap-3 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200/80">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Total Scope</span>
            <span className="workspace-chart-metric font-bold text-slate-800 font-mono">{totalEffort} days</span>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Remaining (Actual)</span>
            <span className="workspace-chart-metric font-bold text-blue-700 font-mono">{currentActual} days</span>
          </div>
          <div className="h-6 w-px bg-slate-200"></div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Schedule Lag</span>
            <span className={`font-bold font-mono ${effortVariance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {effortVariance > 0 ? `+${effortVariance}d lag` : `${Math.abs(effortVariance)}d buffer`}
            </span>
          </div>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="w-full h-72" style={{ minHeight: 280, height: 280 }}>
        <ChartErrorBoundary>
          <ResponsiveContainer width="100%" height="100%" minHeight={250}>
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#ec4899" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis 
                dataKey="dateLabel" 
                stroke="#64748b"
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
              />
              <YAxis 
                stroke="#64748b" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: 'rgba(255,255,255,0.12)' }}
                label={{ value: 'Effort (Days)', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8', offset: 15 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="top" 
                align="right" 
                wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }} 
              />

              <Area
                type="monotone"
                dataKey="actualRemaining"
                fill={`url(#${fillId})`}
                stroke="none"
                legendType="none"
                connectNulls={false}
                isAnimationActive={false}
              />

              {/* Reference Line for Simulated Demo Today */}
              {demoDateLabel && (
                <ReferenceLine 
                  x={demoDateLabel} 
                  stroke="#6c638e" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: 'Demo Date', 
                    position: 'insideTopRight', 
                    fill: '#6c638e',
                    fontSize: 10,
                    fontWeight: 600,
                    offset: 5
                  }} 
                />
              )}

              {/* Ideal Effort Line */}
              <Line
                type="monotone"
                dataKey="idealRemaining"
                name="Ideal Effort (Linear)"
                stroke="rgba(226,232,240,0.5)"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />

              {/* Actual Remaining Effort Line */}
              <Line
                type="monotone"
                dataKey="actualRemaining"
                name="Actual Remaining Effort"
                stroke="#818cf8"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#818cf8', strokeWidth: 1, stroke: '#e0e7ff' }}
                activeDot={{ r: 6, fill: '#818cf8' }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartErrorBoundary>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Timeline bounds: {chartData[0]?.date} to {chartData[chartData.length - 1]?.date}</span>
        </span>
        <span className="text-slate-400">Actual line ceases past demo date ({demoDate})</span>
      </div>
    </div>
  );
}
