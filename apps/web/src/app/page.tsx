"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { BarChartCard } from "@/components/BarChartCard";
import { trpc } from "@/lib/trpc";
import { BAND_ORDER, DOW_LABELS, HOUR_LABELS } from "@/lib/labels";

const SpotMap = dynamic(
  () => import("@/components/SpotMap").then((m) => m.SpotMap),
  { ssr: false, loading: () => <div className="h-96 flex items-center justify-center text-slate-500">Loading map…</div> }
);

const DAY_OPTIONS = [7, 30, 90, 365] as const;

export default function Dashboard() {
  const [days, setDays] = useState<number>(30);

  const stats = trpc.spots.stats.useQuery();
  const byHour = trpc.spots.byHour.useQuery({ days });
  const byWeekday = trpc.spots.byWeekday.useQuery({ days });
  const byBand = trpc.spots.byBand.useQuery({ days });
  const byRegion = trpc.spots.byRegion.useQuery({ days });
  const mapPoints = trpc.spots.mapPoints.useQuery({ limit: 2000 });

  const hourData = HOUR_LABELS.map((label, i) => ({
    label,
    count: byHour.data?.find((r) => r.hour === i)?.count ?? 0,
  }));

  const dowData = DOW_LABELS.map((label, i) => ({
    label,
    count: byWeekday.data?.find((r) => r.dow === i)?.count ?? 0,
  }));

  const bandData = BAND_ORDER.map((label) => ({
    label,
    count: byBand.data?.find((r) => r.band === label)?.count ?? 0,
  })).filter((r) => r.count > 0);

  const regionData = (byRegion.data ?? []).map((r) => ({
    label: r.region,
    count: r.count,
  }));

  const lastUpdated = stats.data?.lastInserted
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(stats.data.lastInserted))
    : "—";

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">POTA Stats</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {stats.data?.total?.toLocaleString() ?? "…"} spots · last updated {lastUpdated}
          </p>
        </div>

        {/* Day filter */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-sm">Show last</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-700">
            {DAY_OPTIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  days === d
                    ? "bg-cyan-500 text-slate-900 font-semibold"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <BarChartCard
          title="Spots by Hour (UTC)"
          data={hourData}
          loading={byHour.isLoading}
        />
        <BarChartCard
          title="Spots by Weekday"
          data={dowData}
          loading={byWeekday.isLoading}
        />
        <BarChartCard
          title="Spots by Band"
          data={bandData}
          loading={byBand.isLoading}
        />
        <BarChartCard
          title="Top Regions"
          data={regionData}
          loading={byRegion.isLoading}
        />
      </div>

      {/* Map */}
      <div className="rounded-xl bg-slate-800 p-4">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-3">
          Park Locations
        </h2>
        <SpotMap points={mapPoints.data ?? []} />
      </div>
    </main>
  );
}
