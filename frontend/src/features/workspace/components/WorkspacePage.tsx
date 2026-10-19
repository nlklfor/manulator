"use client";

// WorkspacePage — detail view of one manuscript page (route: /manuscript/<id>).
// Layout: top bar, image panel on the left, transcription panel on the right.
import Link from "next/link";
import { ChevronRight, Download } from "lucide-react";
import { useLibrary } from "@/features/upload-manuscript/context/LibraryContext";
import { StatusBadge } from "@/features/upload-manuscript/components/StatusBadge";
import { ImageViewer } from "./ImageViewer";
import { TranscriptionPanel } from "./TranscriptionPanel";

interface WorkspacePageProps {
  manuscriptId: string;
}

export function WorkspacePage({ manuscriptId }: WorkspacePageProps) {
  // The library lives in memory (LibraryContext), so we look the page up by id.
  const { libraryEntries, updateEntryStatus } = useLibrary();
  const entry = libraryEntries.find((e) => e.id === manuscriptId);

  // Called by the "Transcribe page" button with the chosen model id.
  // TODO (ML team): call the real transcription API with entry.id and modelId,
  // then store the result. For now it only marks the page as "transcribing".
  function handleTranscribe(modelId: string) {
    void modelId;
    if (entry) updateEntryStatus(entry.id, "transcribing");
  }

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

        {/* Export is not implemented yet, so the button stays disabled */}
        <button
          type="button"
          disabled
          title="Available once the page is transcribed"
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-mt-md bg-mt-accent px-3.5 text-sm font-medium text-mt-accent-fg disabled:cursor-not-allowed disabled:opacity-40"
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
          />
        </section>
        <section aria-label="Transcription" className="flex min-w-0 flex-1 flex-col bg-mt-surface">
          <TranscriptionPanel status={entry.status} onTranscribe={handleTranscribe} />
        </section>
      </div>
    </div>
  );
}
