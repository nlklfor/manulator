"use client";

// SummaryPanel — a short English summary of the translated page, made by the language
// model set in the ML service. The backend saves it, so it is still there after a reload.
import { CircleAlert, ScrollText } from "lucide-react";

interface SummaryPanelProps {
  isTranslated: boolean; // the summary is made from the saved translation
  summary: string | null;
  isSummarizing: boolean;
  error: string | null;
  onSummarize: () => void;
}

export function SummaryPanel({
  isTranslated,
  summary,
  isSummarizing,
  error,
  onSummarize,
}: SummaryPanelProps) {
  return (
    <>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-mt-border px-4">
        <h2 className="text-[15px] font-semibold text-mt-text">Summary</h2>
        <span className="text-xs text-mt-text-subtle">
          {isSummarizing ? "Working…" : summary ? "English" : "No summary yet"}
        </span>
        {summary && !isSummarizing && (
          <button
            type="button"
            onClick={onSummarize}
            className="ml-auto inline-flex h-7 items-center gap-1.5 rounded-mt-md border border-mt-border-strong bg-mt-raised px-2.5 text-xs font-medium text-mt-text hover:bg-mt-hover"
          >
            <ScrollText className="h-3.5 w-3.5" aria-hidden="true" />
            Summarize again
          </button>
        )}
      </div>

      {isSummarizing ? (
        <div
          role="status"
          className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center"
        >
          <span
            className="h-7 w-7 animate-spin rounded-full border-2 border-mt-accent border-r-transparent"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-mt-text">Summarizing…</p>
          <p className="text-xs text-mt-text-subtle">This can take a minute.</p>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-3 overflow-auto p-4">
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-mt-md bg-mt-danger-bg px-3 py-2.5 text-sm text-mt-danger-fg"
            >
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                <strong className="font-semibold">Summary failed.</strong> {error}
              </span>
            </div>
          )}

          {summary ? (
            <p lang="en" className="text-[15px] leading-7 text-mt-text">
              {summary}
            </p>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mt-sunken text-mt-text-subtle">
                <ScrollText className="h-7 w-7" aria-hidden="true" />
              </div>
              {isTranslated ? (
                <>
                  <strong className="text-sm font-semibold text-mt-text">
                    Summarize the translation
                  </strong>
                  <span className="max-w-xs text-xs text-mt-text-muted">
                    A short summary: what kind of text it is, who is involved, what, where and when.
                  </span>
                  <button
                    type="button"
                    onClick={onSummarize}
                    className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
                  >
                    <ScrollText className="h-4 w-4" aria-hidden="true" />
                    Summarize
                  </button>
                </>
              ) : (
                <>
                  <strong className="text-sm font-semibold text-mt-text">
                    Nothing to summarize yet
                  </strong>
                  <span className="max-w-xs text-xs text-mt-text-muted">
                    Translate the page first. The summary is made from the translation.
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}
