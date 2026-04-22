"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface DataItem {
  label: string;
  count: number;
  filteredCount: number;
  filterValue?: string;
}

interface Props {
  title: string;
  data: DataItem[];
  loading?: boolean;
  isOwner?: boolean;
  activeValue?: string;
  filterActive?: boolean;
  animate?: boolean;
  onBarClick?: (value: string) => void;
}

export function BarChartCard({
  title,
  data,
  loading,
  isOwner,
  activeValue,
  filterActive,
  animate = true,
  onBarClick,
}: Props) {
  const showStacked = filterActive && !isOwner;
  const chartMode = isOwner ? "owner" : showStacked ? "stacked" : "plain";
  const chartData = showStacked
    ? data.map((d) => ({
        ...d,
        remainingCount: Math.max(0, (d.count ?? 0) - (d.filteredCount ?? 0)),
      }))
    : data;

  return (
    <div className="rounded-xl bg-slate-800 p-4 flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">{title}</h2>
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <svg
            className="animate-spin h-6 w-6 text-cyan-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        </div>
      ) : data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-slate-500 text-sm">No data</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            key={chartMode}
            data={chartData}
            margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "#1e293b",
                border: "none",
                borderRadius: 8,
                color: "#e2e8f0",
                fontSize: 12,
              }}
              itemStyle={{ color: "#22d3ee" }}
              cursor={{ fill: "#1e293b" }}
              formatter={
                showStacked
                  ? (value, name) =>
                      name === "filteredCount"
                        ? [value, "Filtered"]
                        : name === "remainingCount"
                          ? [value, "Other"]
                          : [value, "Count"]
                  : undefined
              }
            />
            {isOwner ? (
              <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {data.map((item) => {
                  const val = item.filterValue ?? item.label;
                  return (
                    <Cell
                      key={item.label}
                      fill={val === activeValue ? "#22d3ee" : "#475569"}
                      style={{ cursor: "pointer" }}
                      onClick={() => onBarClick?.(val)}
                    />
                  );
                })}
              </Bar>
            ) : showStacked ? (
              [
                <Bar
                  key="filtered"
                  dataKey="filteredCount"
                  stackId="s"
                  fill="#22d3ee"
                  radius={[0, 0, 0, 0]}
                  isAnimationActive={false}
                  style={{ cursor: "pointer" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(d: any) => onBarClick?.(d.filterValue ?? d.label)}
                />,
                <Bar
                  key="remaining"
                  dataKey="remainingCount"
                  stackId="s"
                  fill="#64748b"
                  radius={[3, 3, 0, 0]}
                  isAnimationActive={false}
                  style={{ cursor: "pointer" }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onClick={(d: any) => onBarClick?.(d.filterValue ?? d.label)}
                />,
              ]
            ) : (
              <Bar
                dataKey="count"
                fill="#22d3ee"
                radius={[3, 3, 0, 0]}
                isAnimationActive={animate}
                style={{ cursor: onBarClick ? "pointer" : undefined }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onClick={(d: any) => onBarClick?.(d.filterValue ?? d.label)}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
