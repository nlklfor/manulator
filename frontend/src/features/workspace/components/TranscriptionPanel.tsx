"use client";

// TranscriptionPanel — right panel of the workspace.
// It shows one of three states, depending on the page status:
//   "uploaded"                -> empty state: pick a recognition model and start
//   "transcribing"            -> waiting for the HTR model
//   "transcribed"/"corrected" -> the editable list of lines
import { useState } from "react";
import { ScanLine } from "lucide-react";
import type { UploadStatus } from "@/features/upload-manuscript/types/upload";
import type { TranscriptionLine } from "../types";
import { NothingToReview, TranscriptionLines } from "./TranscriptionLines";

// Placeholder list. The ML team replaces it with the models the backend offers.
const HTR_MODELS = [
  { id: "default", label: "Default HTR model" },
  { id: "latin-medieval", label: "Latin medieval" },
  { id: "carolingian", label: "Carolingian minuscule" },
  { id: "gothic", label: "Gothic cursive" },
] as const;

interface TranscriptionPanelProps {
  status: UploadStatus;
  lines: TranscriptionLine[]; // filled by the transcription flow (ML team)
  onSaveLine: (n: number, text: string) => void;
  // Called with the id of the model the user picked
  onTranscribe: (modelId: string) => void;
}

export function TranscriptionPanel({
  status,
  lines,
  onSaveLine,
  onTranscribe,
}: TranscriptionPanelProps) {
  const [modelId, setModelId] = useState<string>(HTR_MODELS[0].id);
  const [lineFilter, setLineFilter] = useState<"all" | "review">("all");

  const isUploaded = status === "uploaded";
  const isTranscribing = status === "transcribing";
  const isTranscribed = status === "transcribed" || status === "corrected";

  // Lines that still contain words the model was unsure about
  const reviewCount = lines.filter((l) => l.lowConfWords.length > 0).length;
  const visibleLines =
    lineFilter === "review" ? lines.filter((l) => l.lowConfWords.length > 0) : lines;

  return (
    <>
      {/* Panel header */}
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-mt-border px-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[15px] font-semibold text-mt-text">Transcription</h2>
          <span className="text-xs text-mt-text-subtle">
            {isTranscribed
              ? `${lines.length} lines · ${reviewCount ? `${reviewCount} to review` : "all reviewed"}`
              : isTranscribing
                ? "Working…"
                : "No text yet"}
          </span>
        </div>

        {/* Filter: all lines / only lines with uncertain words */}
        {isTranscribed && (
          <div
            role="group"
            aria-label="Which lines to show"
            className="flex gap-0.5 rounded-mt-md bg-mt-sunken p-0.5"
          >
            {(["all", "review"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={lineFilter === f}
                onClick={() => setLineFilter(f)}
                className={`h-7 rounded px-2.5 text-xs font-medium ${
                  lineFilter === f
                    ? "bg-mt-raised text-mt-text shadow-sm"
                    : "text-mt-text-muted hover:text-mt-text"
                }`}
              >
                {f === "all" ? "All lines" : "Needs review"}
                {f === "review" && (
                  <span className="ml-1 font-mono text-[10px] opacity-75">{reviewCount}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty state: nothing transcribed yet */}
      {isUploaded && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-mt-accent-soft text-mt-accent-text">
            <ScanLine className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h3 className="text-lg font-semibold text-mt-text">Not transcribed yet</h3>
            <p className="max-w-xs text-sm text-mt-text-muted">
              Run handwriting recognition to find the lines of text on this page and turn them into
              an editable transcription.
            </p>
          </div>

          {/* Recognition model selector */}
          <div className="flex w-full max-w-[280px] flex-col gap-1.5 text-left">
            <label htmlFor="htr-model" className="text-sm font-medium text-mt-text">
              Recognition model
            </label>
            <div className="relative">
              <select
                id="htr-model"
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="h-10 w-full cursor-pointer appearance-none rounded-mt-md border border-mt-border-strong bg-mt-raised pl-3 pr-9 text-sm text-mt-text focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-mt-accent"
              >
                {HTR_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              {/* Chevron (the native arrow is hidden by appearance-none) */}
              <svg
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-mt-text-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onTranscribe(modelId)}
            className="inline-flex h-10 items-center gap-2 rounded-mt-md bg-mt-accent px-5 text-sm font-medium text-mt-accent-fg hover:bg-mt-accent-hover"
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            Transcribe page
          </button>
          <p className="text-xs text-mt-text-subtle">Every line stays editable afterwards.</p>
        </div>
      )}

      {/* Waiting for the HTR model */}
      {isTranscribing && (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span
            className="h-7 w-7 animate-spin rounded-full border-2 border-mt-accent border-r-transparent"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-mt-text">Transcribing…</p>
          <p className="text-xs text-mt-text-subtle">
            Waiting for the HTR model to return results.
          </p>
        </div>
      )}

      {/* Finished transcription */}
      {isTranscribed &&
        (lines.length === 0 ? (
          <p className="p-8 text-center text-sm text-mt-text-muted">No lines to show yet.</p>
        ) : visibleLines.length === 0 ? (
          <NothingToReview />
        ) : (
          <TranscriptionLines lines={visibleLines} onSaveLine={onSaveLine} />
        ))}
    </>
  );
}
