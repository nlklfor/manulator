"use client";

// WorkspacePage — detail view of one manuscript page (route: /manuscript/<id>).
// Layout: top bar, image panel on the left, transcription panel on the right.
import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, ScanLine } from "lucide-react";
import { useLibrary } from "@/features/upload-manuscript/context/LibraryContext";
import { StatusBadge } from "@/features/upload-manuscript/components/StatusBadge";
import { ImageViewer } from "./ImageViewer";
import { TranscriptionPanel } from "./TranscriptionPanel";
import { processManuscript } from "@/features/workspace/api/process-manuscript";
import { mergeProcessResult, toTranscriptionLines } from "../transcription";

interface WorkspacePageProps {
  manuscriptId: string;
}

export function WorkspacePage({ manuscriptId }: WorkspacePageProps) {
  // The library lives in memory (LibraryContext), so we look the page up by id.
  const { libraryEntries, updateEntryStatus, updateEntryTranscription } = useLibrary();
  const entry = libraryEntries.find((e) => e.id === manuscriptId);

  const transcription = entry?.transcription;
  const lines = useMemo(() => toTranscriptionLines(transcription), [transcription]);
  // The line selected in the list; its outline is highlighted on the scan
  const [selectedN, setSelectedN] = useState<number | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // For now the plan is to just transcribe the page
  const processPlan = {
    steps: [],
    plan: "Transcribe",
    options: {},
  };

  // Runs line detection + transcription. On failure the page goes back to
  // "uploaded" and shows the error, so the user can start again.
  function handleTranscribe(modelId: string) {
    if (!entry) return;
    const id = entry.id;
    void modelId;

    function fail(message: string) {
      setTranscribeError(message);
      updateEntryStatus(id, "uploaded");
    }

    setTranscribeError(null);
    updateEntryStatus(id, "transcribing");
    processManuscript(id, processPlan)
      .then((result) => {
        if (!result.success) {
          fail(result.message ?? "The model could not read this page. Please try again.");
          return;
        }
        updateEntryTranscription(id, mergeProcessResult(result.data));
        updateEntryStatus(id, "transcribed");
      })
      .catch((error: Error) => fail(error.message));
  }

  // Store a corrected line and mark the page as corrected
  function handleSaveLine(n: number, text: string) {
    if (!entry?.transcription) return;
    updateEntryTranscription(
      entry.id,
      entry.transcription.map((l) => (l.index === n - 1 ? { ...l, text } : l)),
    );
    updateEntryStatus(entry.id, "corrected");
  }

  // Go back to the empty state, so the user can pick a model and run it again
  function handleReTranscribe() {
    if (!entry) return;
    updateEntryTranscription(entry.id, null);
    updateEntryStatus(entry.id, "uploaded");
    setSelectedN(null);
  }

  const isTranscribed = entry?.status === "transcribed" || entry?.status === "corrected";

  // Unknown id, e.g. after a browser refresh (the library is not persisted yet)
  if (!entry) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-12 text-center">
        <p className="text-lg font-semibold text-mt-text">Manuscript not found</p>
        <p className="text-sm text-mt-text-muted">
          This page may have been deleted or the link is invalid.
        </p>
        <Link
          href="/"
          className="text-sm font-medium text-mt-accent-text underline underline-offset-4"
        >
          ← Back to Library
        </Link>
      </div>
    );
  }

  return (
    // Fixed full-screen layer, so the workspace covers the dashboard sidebar
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-mt-bg">
      {/* Top bar: breadcrumb back to the library + status */}
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-mt-border bg-mt-surface px-4">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 text-sm text-mt-text-subtle"
        >
          <Link href="/" className="hover:text-mt-text hover:underline">
            Library
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span className="max-w-[240px] truncate font-semibold text-mt-text">
            {entry.fileName}
          </span>
        </nav>
        <StatusBadge status={entry.status} />

        {isTranscribed && (
          <button
            type="button"
            onClick={handleReTranscribe}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-mt-md border border-mt-border-strong bg-mt-raised px-3.5 text-sm font-medium text-mt-text hover:bg-mt-hover"
          >
            <ScanLine className="h-4 w-4" aria-hidden="true" />
            Re-transcribe
          </button>
        )}

        {/* Export is not implemented yet, so the button stays disabled */}
        <button
          type="button"
          disabled
          title="Available once the page is transcribed"
          className={`${isTranscribed ? "" : "ml-auto "}inline-flex h-9 items-center gap-1.5 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export
        </button>
      </header>

      {/* Two panels */}
      <div className="flex min-h-0 flex-1">
        <section
          aria-label="Page image"
          className="flex w-[56%] shrink-0 flex-col border-r border-mt-border bg-mt-sunken"
        >
          <ImageViewer
            src={entry.previewUrl}
            fileName={entry.fileName}
            isPdf={entry.fileType === "application/pdf"}
            lines={lines}
            selectedN={selectedN}
          />
        </section>
        <section aria-label="Transcription" className="flex min-w-0 flex-1 flex-col bg-mt-surface">
          <TranscriptionPanel
            status={entry.status}
            lines={lines}
            selectedN={selectedN}
            onSelectLine={setSelectedN}
            onSaveLine={handleSaveLine}
            onTranscribe={handleTranscribe}
            error={transcribeError}
          />
        </section>
      </div>
    </div>
  );
}
