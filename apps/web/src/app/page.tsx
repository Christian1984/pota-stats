"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { BarChartCard } from "@/components/BarChartCard";
import { trpc } from "@/lib/trpc";
import { BAND_ORDER, DOW_LABELS, HOUR_LABELS } from "@/lib/labels";

const SpotMap = dynamic(
  () => import("@/components/SpotMap").then((m) => m.SpotMap),
  { ssr: false, loading: () => <div className="h-96 flex items-center justify-center text-slate-500">Loading map…</div> }
);

const PRESETS = [
  { label: "1d",   days: 1 },
  { label: "7d",   days: 7 },
  { label: "30d",  days: 30 },
  { label: "90d",  days: 90 },
  { label: "1y",   days: 365 },
] as const;

type PresetLabel = (typeof PRESETS)[number]["label"] | "custom";

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function Dashboard() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [preset, setPreset] = useState<PresetLabel>("30d");
  const [customFrom, setCustomFrom] = useState(() => toISODate(new Date(Date.now() - 30 * 86_400_000)));
  const [customTo, setCustomTo]   = useState(() => toISODate(new Date()));

  const { from, to } = useMemo(() => {
    if (preset === "custom") {
      return {
        from: new Date(customFrom).toISOString(),
        to:   new Date(customTo + "T23:59:59").toISOString(),
      };
    }
    const days = PRESETS.find((p) => p.label === preset)?.days ?? 30;
    return {
      from: new Date(Date.now() - days * 86_400_000).toISOString(),
      to:   new Date().toISOString(),
    };
  }, [preset, customFrom, customTo]);

  const utils    = trpc.useUtils();
  const stats    = trpc.spots.stats.useQuery();
  const byHour   = trpc.spots.byHour.useQuery({ from, to, timezone });
  const byWeekday = trpc.spots.byWeekday.useQuery({ from, to, timezone });
  const byBand   = trpc.spots.byBand.useQuery({ from, to });
  const byMode   = trpc.spots.byMode.useQuery({ from, to });
  const byRegion = trpc.spots.byRegion.useQuery({ from, to });
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

  const modeData = (byMode.data ?? []).map((r) => ({ label: r.mode, count: r.count }));
  const regionData = (byRegion.data ?? []).map((r) => ({ label: r.region, count: r.count }));

  const lastUpdated = stats.data?.lastInserted
    ? new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" })
        .format(new Date(stats.data.lastInserted))
    : "—";

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">POTA Stats</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {stats.data?.total?.toLocaleString() ?? "…"} spots · last updated {lastUpdated}
            <button
              onClick={() => utils.spots.invalidate()}
              title="Refresh"
              className="ml-1.5 inline-flex items-center text-slate-500 hover:text-cyan-400 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.011.75.75 0 0 1-1.31-.73 6 6 0 0 1 9.44-1.347l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.347l-.842-.841v1.273a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.84.841a4.5 4.5 0 0 0 7.08-1.011.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
              </svg>
            </button>
          </p>
        </div>

        {/* Range filter */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Range</span>
            <div className="flex rounded-lg overflow-hidden border border-slate-700">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPreset(p.label)}
                  className={`px-3 py-1.5 text-sm transition-colors ${
                    preset === p.label
                      ? "bg-cyan-500 text-slate-900 font-semibold"
                      : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setPreset("custom")}
                className={`px-3 py-1.5 text-sm transition-colors ${
                  preset === "custom"
                    ? "bg-cyan-500 text-slate-900 font-semibold"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          {preset === "custom" && (
            <div className="flex items-center gap-2 text-sm">
              <input
                type="date"
                value={customFrom}
                max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
              <span className="text-slate-500">→</span>
              <input
                type="date"
                value={customTo}
                min={customFrom}
                max={toISODate(new Date())}
                onChange={(e) => setCustomTo(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded-md px-2 py-1 text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <BarChartCard title="Spots by Hour (local time)" data={hourData}   loading={byHour.isLoading} />
        <BarChartCard title="Spots by Weekday"           data={dowData}    loading={byWeekday.isLoading} />
        <BarChartCard title="Spots by Band"              data={bandData}   loading={byBand.isLoading} />
        <BarChartCard title="Spots by Mode"              data={modeData}   loading={byMode.isLoading} />
        <div className="md:col-span-2">
          <BarChartCard title="Top Regions" data={regionData} loading={byRegion.isLoading} />
        </div>
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
