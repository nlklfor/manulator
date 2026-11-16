"use client";

// WorkspacePage — detail view of one manuscript page (route: /manuscript/<id>).
// Layout: top bar, image panel on the left, transcription panel on the right.
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Download, Languages, ScanLine } from "lucide-react";
import { useLibrary } from "@/features/upload-manuscript/context/LibraryContext";
import { StatusBadge } from "@/features/upload-manuscript/components/StatusBadge";
import { ImageViewer } from "./ImageViewer";
import { TranscriptionPanel } from "./TranscriptionPanel";
import { TranslationPanel } from "./TranslationPanel";
import { processManuscript } from "@/features/workspace/api/process-manuscript";
import { saveLineCorrection } from "@/features/workspace/api/correct-line";
import {
  translateManuscript,
  translationPlan,
  type Translation,
  type TranslationType,
} from "@/features/workspace/api/translate-manuscript";
import { mergeProcessResult, toTranscriptionLines } from "../transcription";

interface WorkspacePageProps {
  manuscriptId: string;
}

export function WorkspacePage({ manuscriptId }: WorkspacePageProps) {
  // The library lives in memory (LibraryContext), so we look the page up by id.
  const { libraryEntries, isLoading, updateEntryStatus, updateEntryTranscription } = useLibrary();
  const entry = libraryEntries.find((e) => e.id === manuscriptId);

  const transcription = entry?.transcription;
  const lines = useMemo(() => toTranscriptionLines(transcription), [transcription]);
  // The line selected in the list; its outline is highlighted on the scan
  const [selectedN, setSelectedN] = useState<number | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [view, setView] = useState<"transcription" | "translation">("transcription");
  // The translation is not saved by the backend yet, so it lives only in this page
  const [translation, setTranslation] = useState<Translation | null>(null);
  const [translationType, setTranslationType] = useState<TranslationType>("text");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [isTranslationOutdated, setIsTranslationOutdated] = useState(false);
  // Counts translation requests, so the result of an outdated request is ignored
  const translationRequestRef = useRef(0);

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

  // Translates the transcribed page. A failed translation keeps the old one (if any)
  // and never changes the transcription.
  async function handleTranslate() {
    if (!entry || isTranslating) return;
    const request = ++translationRequestRef.current;
    setView("translation");
    setIsTranslating(true);
    setTranslateError(null);
    try {
      const result = await translateManuscript(entry.id, translationPlan(translationType));
      if (request !== translationRequestRef.current) return;
      setTranslation(result);
      setIsTranslationOutdated(false);
    } catch (error) {
      if (request !== translationRequestRef.current) return;
      setTranslateError(
        error instanceof Error ? error.message : "Could not translate the page. Please try again.",
      );
    } finally {
      if (request === translationRequestRef.current) setIsTranslating(false);
    }
  }

  // Forgets the translation, e.g. when the page is transcribed again
  function resetTranslation() {
    translationRequestRef.current++;
    setTranslation(null);
    setIsTranslating(false);
    setTranslateError(null);
    setIsTranslationOutdated(false);
  }

  // Saves a corrected line through the backend. The workspace and the library show the
  // text only after the backend has stored it. Throws on failure, so the editor keeps
  // the entered text and shows the error.
  async function handleSaveLine(n: number, text: string) {
    if (!entry?.transcription) return;
    const id = entry.id;
    const saved = await saveLineCorrection(id, n - 1, text);
    updateEntryTranscription(
      id,
      entry.transcription.map((l) => (l.index === saved.index ? { ...l, text: saved.text } : l)),
    );
    updateEntryStatus(id, saved.status);
    if (translation) setIsTranslationOutdated(true);
  }

  // Go back to the empty state, so the user can pick a model and run it again
  function handleReTranscribe() {
    if (!entry) return;
    updateEntryTranscription(entry.id, null);
    updateEntryStatus(entry.id, "uploaded");
    setSelectedN(null);
    resetTranslation();
    setView("transcription");
  }

  const isTranscribed = entry?.status === "transcribed" || entry?.status === "corrected";

  if (!entry && isLoading) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center gap-3 text-sm text-mt-text-muted"
      >
        <span
          className="h-5 w-5 animate-spin rounded-full border-2 border-mt-accent border-r-transparent"
          aria-hidden="true"
        />
        Loading manuscript…
      </div>
    );
  }

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

        {isTranscribed && (
          <button
            type="button"
            onClick={() => void handleTranslate()}
            disabled={isTranslating}
            className="inline-flex h-9 items-center gap-1.5 rounded-mt-md border border-mt-border-strong bg-mt-raised px-3.5 text-sm font-medium text-mt-text hover:bg-mt-hover disabled:cursor-wait disabled:opacity-60"
          >
            {isTranslating ? (
              <span
                className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
                aria-hidden="true"
              />
            ) : (
              <Languages className="h-4 w-4" aria-hidden="true" />
            )}
            {isTranslating ? "Translating…" : "Translate"}
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
        <section
          aria-label={view === "translation" ? "Translation" : "Transcription"}
          className="flex min-w-0 flex-1 flex-col bg-mt-surface"
        >
          {/* Temporary view switch, replaced by the tabs of #175 */}
          <div
            role="group"
            aria-label="Which view to show"
            className="flex shrink-0 gap-0.5 border-b border-mt-border px-4 pt-2"
          >
            {(["transcription", "translation"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setView(v)}
                className={`-mb-px h-9 border-b-2 px-3 text-sm font-medium ${
                  view === v
                    ? "border-mt-accent text-mt-text"
                    : "border-transparent text-mt-text-muted hover:text-mt-text"
                }`}
              >
                {v === "transcription" ? "Transcription" : "Translation"}
              </button>
            ))}
          </div>

          {view === "transcription" ? (
            <TranscriptionPanel
              status={entry.status}
              lines={lines}
              selectedN={selectedN}
              onSelectLine={setSelectedN}
              onSaveLine={handleSaveLine}
              onTranscribe={handleTranscribe}
              error={transcribeError}
            />
          ) : (
            <TranslationPanel
              isTranscribed={isTranscribed}
              translationType={translationType}
              onTranslationTypeChange={setTranslationType}
              translation={translation}
              isTranslating={isTranslating}
              error={translateError}
              isOutdated={isTranslationOutdated}
              onTranslate={() => void handleTranslate()}
            />
          )}
        </section>
      </div>
    </div>
  );
}
