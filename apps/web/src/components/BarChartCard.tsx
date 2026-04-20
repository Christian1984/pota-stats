"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface Props {
  title: string;
  data: { label: string; count: number }[];
  loading?: boolean;
}

export function BarChartCard({ title, data, loading }: Props) {
  return (
    <div className="rounded-xl bg-slate-800 p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
        {title}
      </h2>
      {loading ? (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
          Loading…
        </div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
          No data
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "none",
                borderRadius: 8,
                color: "#e2e8f0",
                fontSize: 12,
              }}
              cursor={{ fill: "#1e293b" }}
            />
            <Bar dataKey="count" fill="#22d3ee" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
