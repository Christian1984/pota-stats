"use client";

interface Activation {
  activator: string | null;
  reference: string | null;
  parkName: string | null;
  mode: string | null;
  band: string | null;
  startTime: Date;
  lastSeen: Date;
}

interface Props {
  label: string;
  activations: Activation[];
  loading: boolean;
  onClose: () => void;
}

function fmt(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

function fmtShort(d: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

function sameDay(a: Date, b: Date) {
  const da = new Date(a), db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
}

export function ActivationPanel({ label, activations, loading, onClose }: Props) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide truncate pr-2">
          {label}
        </h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-slate-200 transition-colors shrink-0"
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
            <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <svg className="animate-spin h-5 w-5 text-cyan-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : activations.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
          No activations
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          {(() => {
            const multiPark = new Set(activations.map((a) => a.reference)).size > 1;
            return (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-800">
                  <tr className="text-slate-400 text-left">
                    <th className="pb-2 pr-2 font-medium">Callsign</th>
                    {multiPark && <th className="pb-2 pr-2 font-medium">Park</th>}
                    <th className="pb-2 pr-2 font-medium">Mode</th>
                    <th className="pb-2 pr-2 font-medium">Band</th>
                    <th className="pb-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {activations.map((a, i) => (
                    <tr key={i} className="text-slate-300">
                      <td className="py-1.5 pr-2 font-mono font-semibold text-cyan-400">{a.activator ?? "—"}</td>
                      {multiPark && <td className="py-1.5 pr-2 text-slate-400">{a.reference ?? "—"}</td>}
                      <td className="py-1.5 pr-2">{a.mode || "—"}</td>
                      <td className="py-1.5 pr-2">{a.band || "—"}</td>
                      <td className="py-1.5 text-slate-400">
                        {fmt(a.startTime)}
                        {" → "}
                        {sameDay(a.startTime, a.lastSeen) ? fmtShort(a.lastSeen) : fmt(a.lastSeen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })()}
        </div>
      )}

      <p className="text-slate-500 text-xs mt-2 shrink-0">
        {activations.length} activation{activations.length !== 1 ? "s" : ""}
      </p>
    </div>
  );
}
