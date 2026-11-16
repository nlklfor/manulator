"use client";

// SummaryPanel — placeholder until the backend can summarize a page.
import { ScrollText } from "lucide-react";

export function SummaryPanel() {
  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-mt-border px-4">
        <h2 className="text-[15px] font-semibold text-mt-text">Summary</h2>
        <span className="text-xs text-mt-text-subtle">Not available yet</span>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mt-sunken text-mt-text-subtle">
          <ScrollText className="h-7 w-7" aria-hidden="true" />
        </div>
        <strong className="text-sm font-semibold text-mt-text">Summaries are coming soon</strong>
        <span className="max-w-xs text-xs text-mt-text-muted">
          A short summary of the page will be shown here.
        </span>
      </div>
    </>
  );
}
