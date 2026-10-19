"use client";

// WorkspacePage — detail view of one manuscript page (route: /manuscript/<id>).
// Layout: top bar, image panel on the left, transcription panel on the right.
// The transcription panel is filled in a later commit.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useLibrary } from "@/features/upload-manuscript/context/LibraryContext";
import { StatusBadge } from "@/features/upload-manuscript/components/StatusBadge";
import { ImageViewer } from "./ImageViewer";

interface WorkspacePageProps {
  manuscriptId: string;
}

export function WorkspacePage({ manuscriptId }: WorkspacePageProps) {
  // The library lives in memory (LibraryContext), so we look the page up by id.
  const { libraryEntries } = useLibrary();
  const entry = libraryEntries.find((e) => e.id === manuscriptId);

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
          {/* Transcription panel comes in a later commit */}
        </section>
      </div>
    </div>
  );
}
