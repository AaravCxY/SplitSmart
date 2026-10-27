import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { toMajorUnits, formatCurrency } from '../utils/formatters';

const BAR_COLORS = [
  '#16a34a', // emerald
  '#0284c7', // sky
  '#6366f1', // indigo
  '#d97706', // amber
  '#a855f7', // purple
  '#ec4899', // pink
  '#eab308', // yellow
  '#64748b'  // slate
];

export default function CategoryChart({ data = [], currency = 'INR' }) {
  if (!data || data.length === 0) {
    return (
      <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs">
        <p>No category spending data yet.</p>
      </div>
    );
  }

  const chartData = data.map((item) => ({
    name: item.category,
    amount: toMajorUnits(item.totalMinor),
    count: item.count
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-xl text-xs">
          <p className="font-bold text-slate-800">{d.name}</p>
          <p className="text-emerald-700 font-extrabold text-sm mt-0.5">
            {formatCurrency(d.amount * 100, currency)}
          </p>
          <p className="text-slate-400 text-[11px] mt-0.5">{d.count} transaction(s)</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-56 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(val) => `${currency === 'INR' ? '₹' : '$'}${val}`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
