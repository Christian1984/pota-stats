"use client";

interface Props {
  isFetching: boolean;
  onRefresh: () => void;
}

export function RefreshButton({ isFetching, onRefresh }: Props) {
  if (isFetching) {
    return (
      <span className="ml-1.5 inline-flex items-center text-cyan-500">
        <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </span>
    );
  }

  return (
    <button
      onClick={onRefresh}
      title="Refresh"
      className="ml-1.5 inline-flex items-center text-slate-500 hover:text-cyan-400 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
        <path fillRule="evenodd" d="M13.836 2.477a.75.75 0 0 1 .75.75v3.182a.75.75 0 0 1-.75.75h-3.182a.75.75 0 0 1 0-1.5h1.37l-.84-.841a4.5 4.5 0 0 0-7.08 1.011.75.75 0 0 1-1.31-.73 6 6 0 0 1 9.44-1.347l.842.841V3.227a.75.75 0 0 1 .75-.75Zm-.911 7.5A.75.75 0 0 1 13.199 11a6 6 0 0 1-9.44 1.347l-.842-.841v1.273a.75.75 0 0 1-1.5 0V9.591a.75.75 0 0 1 .75-.75H5.35a.75.75 0 0 1 0 1.5H3.98l.84.841a4.5 4.5 0 0 0 7.08-1.011.75.75 0 0 1 1.025-.273Z" clipRule="evenodd" />
      </svg>
    </button>
  );
}
